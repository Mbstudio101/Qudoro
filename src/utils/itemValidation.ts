import { NgnItem, EhrChart, EhrLabRow, EhrFlag } from '../types/ngn';
import { validateNgnItem } from './ngnGrading';
import { isAnswerMatch } from './answerMatch';

/**
 * Deterministic item validation.
 *
 * Everything here is a *mechanical* check — no clinical judgment, no model
 * calls, no heuristics that can be confidently wrong. Each rule either fires on
 * a fact about the item's structure or it doesn't. That makes this layer safe to
 * block publishing on, unlike the keyword classifier in `nursingConstants.ts`.
 *
 * Clinical correctness (is this rationale medically true?) is a separate,
 * non-deterministic problem and deliberately lives outside this file.
 *
 * ## Relationship to `validateNgnItem`
 *
 * `ngnGrading.validateNgnItem` already covers *authoring completeness* — "add
 * at least 4 options", "mark the correct condition". This file does not repeat
 * those. It adds the two classes that completeness checks miss:
 *
 *  - **Referential integrity** — answer keys pointing at tokens the author has
 *    since deleted. The item looks complete and grades wrong.
 *  - **Discrimination** — items where every option is correct, which award full
 *    marks for any input.
 *
 * …plus EHR clinical-data consistency, which has no equivalent anywhere else.
 * {@link validateItem} composes both so the UI shows one list.
 */

export type FindingSeverity = 'error' | 'warning';

export interface ValidationFinding {
  severity: FindingSeverity;
  /** Stable slug so the UI can group/filter without matching on prose. */
  code: string;
  message: string;
  /** Sub-item this points at (row id, blank id, lab row id…) when applicable. */
  target?: string;
}

const err = (code: string, message: string, target?: string): ValidationFinding => ({
  severity: 'error',
  code,
  message,
  target,
});

const warn = (code: string, message: string, target?: string): ValidationFinding => ({
  severity: 'warning',
  code,
  message,
  target,
});

const blank = (s: string | null | undefined): boolean => !s || !s.trim();

// ── NGN referential integrity & discrimination ─────────────────────────────
//
// Completeness rules ("mark the correct condition", "add at least 4 options")
// live in `ngnGrading.validateNgnItem` and are not repeated here.

const ngnIntegrity = (item: NgnItem): ValidationFinding[] => {
  const out: ValidationFinding[] = [];

  switch (item.kind) {
    case 'bowtie': {
      const conditionIds = new Set(item.conditions.map((c) => c.id));
      const actionIds = new Set(item.actions.map((t) => t.id));
      const paramIds = new Set(item.parameters.map((t) => t.id));

      if (item.correctCondition && !conditionIds.has(item.correctCondition)) {
        out.push(err('bowtie.stale-condition', 'The correct condition points at a choice that has been deleted.'));
      }
      item.correctActions
        .filter((id) => !actionIds.has(id))
        .forEach((id) => out.push(err('bowtie.stale-action', 'The answer key references a deleted action.', id)));
      item.correctParameters
        .filter((id) => !paramIds.has(id))
        .forEach((id) => out.push(err('bowtie.stale-parameter', 'The answer key references a deleted parameter.', id)));
      break;
    }

    case 'matrix': {
      item.rows.forEach((row) => {
        if (row.correct.some((i) => i < 0 || i >= item.columns.length)) {
          out.push(err('matrix.column-range', 'This row marks a column that no longer exists.', row.id));
        }
      });
      break;
    }

    case 'cloze': {
      // Placeholders must be exactly 1…n, contiguous, matching blanks.length —
      // otherwise a blank is either unreachable or renders with no dropdown.
      const found = [...item.template.matchAll(/\[\[(\d+)\]\]/g)].map((m) => Number(m[1]));
      const unique = [...new Set(found)].sort((a, b) => a - b);

      if (unique.length !== item.blanks.length) {
        out.push(
          err(
            'cloze.count-mismatch',
            `The sentence has ${unique.length} placeholder(s) but ${item.blanks.length} blank(s) are set up.`,
          ),
        );
      }
      unique.forEach((n, i) => {
        if (n !== i + 1) {
          out.push(
            err('cloze.non-contiguous', `Placeholders must run 1…n with no gaps — found [[${n}]] where [[${i + 1}]] was expected.`),
          );
        }
      });
      if (found.length !== unique.length) {
        out.push(warn('cloze.duplicate-placeholder', 'The same placeholder number is used more than once.'));
      }

      item.blanks.forEach((b, i) => {
        if (b.correctIndex < 0 || b.correctIndex >= b.options.length) {
          out.push(err('cloze.correct-range', `Blank ${i + 1} points at a choice that no longer exists.`, b.id));
        }
        const filled = b.options.filter((o) => !blank(o));
        if (new Set(filled.map((o) => o.trim().toLowerCase())).size !== filled.length) {
          out.push(warn('cloze.duplicate-options', `Blank ${i + 1} has two identical choices.`, b.id));
        }
      });
      break;
    }

    case 'highlight': {
      const pool =
        item.variant === 'text' ? item.segments : item.tableRows.flatMap((r) => r.cells.filter((c) => c.selectable));
      if (pool.length > 0 && pool.every((s) => s.correct)) {
        out.push(warn('highlight.all-correct', 'Every selectable part is correct — selecting everything scores full marks.'));
      }
      break;
    }

    case 'dragdrop': {
      const tokenIds = new Set(item.tokens.filter((t) => !blank(t.text)).map((t) => t.id));
      const placed = new Map<string, number>();

      item.zones.forEach((zone) => {
        zone.correct.forEach((id) => {
          if (!tokenIds.has(id)) {
            out.push(err('dragdrop.stale-token', 'The answer key references a deleted or empty option.', zone.id));
          }
          placed.set(id, (placed.get(id) ?? 0) + 1);
        });
      });

      // A token in two zones is ambiguous for `category` and incoherent for `sequence`.
      [...placed.entries()]
        .filter(([, n]) => n > 1)
        .forEach(([id]) => out.push(err('dragdrop.token-reused', 'The same option is the answer for two different zones.', id)));

      if (item.variant === 'sequence' && item.zones.length > 1) {
        out.push(warn('dragdrop.sequence-zones', 'Sequence items normally use a single ordered zone.'));
      }
      if (tokenIds.size > 0 && tokenIds.size === placed.size) {
        out.push(warn('dragdrop.no-distractors', 'Every option belongs in a zone — there are no distractors left over.'));
      }
      break;
    }

    case 'multi-response': {
      const filled = item.options.filter((o) => !blank(o.text));
      const correct = filled.filter((o) => o.correct);

      if (filled.length > 0 && correct.length === filled.length) {
        out.push(warn('mr.all-correct', 'Every option is correct — selecting all of them scores full marks.'));
      }
      if (new Set(filled.map((o) => o.text.trim().toLowerCase())).size !== filled.length) {
        out.push(warn('mr.duplicate-options', 'Two options have the same text.'));
      }
      break;
    }
  }

  return out;
};

// ── EHR clinical-data rules ────────────────────────────────────────────────

/** Parses "3.5-5.0", "3.5 – 5.0", "< 100", "> 40" into bounds. */
const parseRange = (reference: string): { low?: number; high?: number } | null => {
  const text = reference.replace(/,/g, '').trim();

  const between = text.match(/(-?\d+(?:\.\d+)?)\s*[-–—to]+\s*(-?\d+(?:\.\d+)?)/i);
  if (between) return { low: Number(between[1]), high: Number(between[2]) };

  const under = text.match(/[<≤]\s*(-?\d+(?:\.\d+)?)/);
  if (under) return { high: Number(under[1]) };

  const over = text.match(/[>≥]\s*(-?\d+(?:\.\d+)?)/);
  if (over) return { low: Number(over[1]) };

  return null;
};

/** Pulls the leading number out of a result like "5.8 mEq/L" or "12,000". */
const parseResult = (result: string): number | null => {
  const m = result.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

const expectedFlag = (value: number, low?: number, high?: number): EhrFlag => {
  if (high !== undefined && value > high) return 'high';
  if (low !== undefined && value < low) return 'low';
  return 'normal';
};

const validateLabRow = (row: EhrLabRow): ValidationFinding[] => {
  if (blank(row.test)) return [err('lab.no-test', 'Lab row has no test name.', row.id)];
  if (blank(row.result) || blank(row.reference)) return [];

  const range = parseRange(row.reference);
  const value = parseResult(row.result);
  if (!range || value === null) return [];

  const expected = expectedFlag(value, range.low, range.high);

  // `critical` is an author's judgment call about severity — it always implies
  // out-of-range, but we don't second-guess which direction is critical.
  if (row.flag === 'critical') {
    return expected === 'normal'
      ? [err('lab.critical-in-range', `${row.test} is flagged critical but ${row.result} sits inside ${row.reference}.`, row.id)]
      : [];
  }

  if (row.flag !== expected) {
    return [
      err(
        'lab.flag-mismatch',
        `${row.test} is flagged "${row.flag}" but ${row.result} against ${row.reference} reads as "${expected}".`,
        row.id,
      ),
    ];
  }
  return [];
};

const validateEhr = (ehr: EhrChart): ValidationFinding[] => {
  if (!ehr.enabled) return [];
  const out: ValidationFinding[] = [];

  if (blank(ehr.patient.name) && blank(ehr.patient.age)) {
    out.push(warn('ehr.thin-patient', 'EHR chart is enabled but the patient header is empty.'));
  }
  const populated =
    !blank(ehr.hp) || ehr.orders.length > 0 || ehr.notes.length > 0 || ehr.labs.length > 0 || ehr.flowsheets.rows.length > 0;
  if (!populated) {
    out.push(warn('ehr.empty', 'EHR chart is enabled but every tab is empty.'));
  }

  ehr.labs.forEach((row) => out.push(...validateLabRow(row)));

  ehr.flowsheets.rows.forEach((row) => {
    if (row.values.length !== ehr.flowsheets.columns.length) {
      out.push(
        err(
          'ehr.flowsheet-width',
          `Flowsheet row "${row.label || 'untitled'}" has ${row.values.length} value(s) for ${ehr.flowsheets.columns.length} column(s).`,
          row.id,
        ),
      );
    }
  });

  return out;
};

// ── Entry point ────────────────────────────────────────────────────────────

/**
 * Every NGN check in one list: the authoring-completeness rules from
 * `ngnGrading.validateNgnItem` (as errors, since the item cannot be answered
 * without them) followed by the integrity and discrimination rules above.
 *
 * This is what the NGN editor renders — it only has the `NgnItem` in hand, not
 * the surrounding question, so it cannot use {@link validateItem}.
 */
export const validateNgnFull = (item: NgnItem): ValidationFinding[] => [
  ...validateNgnItem(item).map((message) => err('ngn.incomplete', message)),
  ...ngnIntegrity(item),
];

export interface ValidatableItem {
  content: string;
  rationale: string;
  answer: string[];
  options?: string[];
  correctOptionIndices?: number[];
  ngn?: NgnItem;
  ehr?: EhrChart;
}

/**
 * Runs every deterministic rule against an item.
 *
 * Errors are defects that make the item unanswerable or self-contradictory —
 * safe to block publishing on. Warnings are quality smells that a human should
 * look at but may legitimately accept.
 */
export const validateItem = (item: ValidatableItem): ValidationFinding[] => {
  const out: ValidationFinding[] = [];

  if (blank(item.content)) out.push(err('item.no-stem', 'Question has no stem.'));
  if (blank(item.rationale)) {
    out.push(err('item.no-rationale', 'Question has no rationale — a learner cannot learn from a bare answer.'));
  }

  if (item.ngn) {
    out.push(...validateNgnFull(item.ngn));
  } else if (item.options && item.options.length > 0) {
    const options = item.options;
    const filled = options.filter((o) => !blank(o));
    if (filled.length < 2) out.push(err('mcq.thin-options', 'Multiple choice needs at least two non-empty options.'));

    // Classic MCQs in this app key their answer by *text* in `answer`, not by
    // index — `correctOptionIndices` is an optional refinement. An item counts
    // as answered if either is populated.
    const byIndex = item.correctOptionIndices?.length ? item.correctOptionIndices : null;
    const byText = item.answer.filter((a) => !blank(a));

    if (!byIndex && byText.length === 0) {
      out.push(err('mcq.no-correct', 'No correct answer is marked.'));
    }
    byIndex
      ?.filter((i) => i < 0 || i >= options.length)
      .forEach(() => out.push(err('mcq.correct-range', 'The answer key points past the end of the options list.')));

    // An answer whose text matches no option is unreachable — the learner can
    // never select it, so the item can never be scored correct.
    if (!byIndex) {
      byText
        .filter((a) => !filled.some((o) => isAnswerMatch(a, o)))
        .forEach((a) =>
          out.push(err('mcq.answer-not-an-option', `The correct answer “${a}” does not match any of the options.`)),
        );
    }

    if (new Set(filled.map((o) => o.trim().toLowerCase())).size !== filled.length) {
      out.push(warn('mcq.duplicate-options', 'Two options have the same text.'));
    }
  }

  if (item.ehr) out.push(...validateEhr(item.ehr));

  return out;
};

export const hasBlockingError = (findings: ValidationFinding[]): boolean =>
  findings.some((f) => f.severity === 'error');

/** Convenience for list views: `{ errors, warnings }` counts. */
export const summarize = (findings: ValidationFinding[]) => ({
  errors: findings.filter((f) => f.severity === 'error').length,
  warnings: findings.filter((f) => f.severity === 'warning').length,
});
