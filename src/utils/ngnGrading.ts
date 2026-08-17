import {
  NgnItem,
  NgnResponse,
  NgnScoring,
  NgnHighlightSegment,
  NgnToken,
} from '../types/ngn';

/**
 * Grading for NGN item formats.
 *
 * Every format reduces to "how many of N sub-items did the learner get right",
 * so the whole engine returns the same {@link NgnScore} shape. Practice uses
 * `ratio` for partial credit and `correct` for the spaced-repetition box.
 */
export interface NgnScore {
  earned: number;
  possible: number;
  /** earned / possible, clamped to 0…1. `0` when the item has no answer key. */
  ratio: number;
  /** True only when the learner matched the key exactly. */
  correct: boolean;
}

const emptyScore = (possible = 0): NgnScore => ({
  earned: 0,
  possible,
  ratio: 0,
  correct: false,
});

const finalize = (earned: number, possible: number, exact: boolean): NgnScore => {
  if (possible <= 0) return emptyScore();
  const clamped = Math.max(0, Math.min(earned, possible));
  return {
    earned: clamped,
    possible,
    ratio: clamped / possible,
    correct: exact,
  };
};

/**
 * Applies the chosen scoring model to a set of independent picks.
 * `hits` = correct picks made, `misses` = incorrect picks made,
 * `possible` = number of picks in the key.
 */
const scorePicks = (
  scoring: NgnScoring,
  hits: number,
  misses: number,
  possible: number,
): NgnScore => {
  const exact = hits === possible && misses === 0;
  if (scoring === 'all-or-nothing') {
    return finalize(exact ? possible : 0, possible, exact);
  }
  if (scoring === 'plus-minus') {
    return finalize(hits - misses, possible, exact);
  }
  return finalize(hits, possible, exact);
};

const sameNumberSet = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((v) => b.includes(v));

export const gradeNgn = (item: NgnItem, response: NgnResponse | null | undefined): NgnScore => {
  if (!response || response.kind !== item.kind) return emptyScore(ngnMaxPoints(item));

  switch (item.kind) {
    case 'bowtie': {
      if (response.kind !== 'bowtie') return emptyScore();
      const possible =
        (item.correctCondition ? 1 : 0) +
        item.correctActions.length +
        item.correctParameters.length;
      if (possible === 0) return emptyScore();

      const conditionHit = !!item.correctCondition && response.condition === item.correctCondition;
      const conditionMiss = !!response.condition && !conditionHit;

      // Unfilled slots are stored as empty strings — they are "not answered",
      // never a wrong pick, so they must not subtract under +/− scoring.
      const chosenActions = response.actions.filter(Boolean);
      const actionHits = chosenActions.filter((id) => item.correctActions.includes(id)).length;
      const actionMisses = chosenActions.length - actionHits;

      const chosenParams = response.parameters.filter(Boolean);
      const paramHits = chosenParams.filter((id) => item.correctParameters.includes(id)).length;
      const paramMisses = chosenParams.length - paramHits;

      const hits = (conditionHit ? 1 : 0) + actionHits + paramHits;
      const misses = (conditionMiss ? 1 : 0) + actionMisses + paramMisses;
      return scorePicks(item.scoring, hits, misses, possible);
    }

    case 'matrix': {
      if (response.kind !== 'matrix') return emptyScore();
      const keyed = item.rows.filter((r) => r.correct.length > 0);
      if (keyed.length === 0) return emptyScore();
      // Each row is an independent 0/1 decision — a row counts only when the
      // learner's picks match that row's key exactly.
      const hits = keyed.filter((row) =>
        sameNumberSet(response.rows[row.id] || [], row.correct),
      ).length;
      const exact = hits === keyed.length;
      if (item.scoring === 'all-or-nothing') {
        return finalize(exact ? keyed.length : 0, keyed.length, exact);
      }
      return finalize(hits, keyed.length, exact);
    }

    case 'cloze': {
      if (response.kind !== 'cloze') return emptyScore();
      const answerable = item.blanks.filter((b) => b.options.some((o) => o.trim()));
      if (answerable.length === 0) return emptyScore();
      const hits = answerable.filter((b) => response.blanks[b.id] === b.correctIndex).length;
      const exact = hits === answerable.length;
      if (item.scoring === 'all-or-nothing') {
        return finalize(exact ? answerable.length : 0, answerable.length, exact);
      }
      return finalize(hits, answerable.length, exact);
    }

    case 'highlight': {
      if (response.kind !== 'highlight') return emptyScore();
      const correctIds = highlightCorrectIds(item);
      if (correctIds.length === 0) return emptyScore();
      const hits = response.selected.filter((id) => correctIds.includes(id)).length;
      const misses = response.selected.length - hits;
      return scorePicks(item.scoring, hits, misses, correctIds.length);
    }

    case 'dragdrop': {
      if (response.kind !== 'dragdrop') return emptyScore();
      const possible = item.zones.reduce((sum, z) => sum + z.correct.length, 0);
      if (possible === 0) return emptyScore();

      let hits = 0;
      let misses = 0;
      for (const zone of item.zones) {
        const placed = response.zones[zone.id] || [];
        if (item.variant === 'sequence') {
          // Position matters: credit each slot that holds the right token.
          // Empty slots are unanswered, not wrong.
          zone.correct.forEach((tokenId, idx) => {
            if (placed[idx] === tokenId) hits += 1;
          });
          misses += placed.filter((id, idx) => !!id && zone.correct[idx] !== id).length;
        } else {
          const zoneHits = placed.filter((id) => zone.correct.includes(id)).length;
          hits += zoneHits;
          misses += placed.length - zoneHits;
        }
      }
      const exact = hits === possible && misses === 0;
      if (item.scoring === 'all-or-nothing') return finalize(exact ? possible : 0, possible, exact);
      if (item.scoring === 'plus-minus') return finalize(hits - misses, possible, exact);
      return finalize(hits, possible, exact);
    }

    case 'multi-response':
    default: {
      if (response.kind !== 'multi-response') return emptyScore();
      const correctIds = item.options.filter((o) => o.correct).map((o) => o.id);
      if (correctIds.length === 0) return emptyScore();
      const hits = response.selected.filter((id) => correctIds.includes(id)).length;
      const misses = response.selected.length - hits;
      return scorePicks(item.scoring, hits, misses, correctIds.length);
    }
  }
};

/** Total points an item is worth — used to show "3 / 5" before grading. */
export const ngnMaxPoints = (item: NgnItem): number => {
  switch (item.kind) {
    case 'bowtie':
      return (
        (item.correctCondition ? 1 : 0) +
        item.correctActions.length +
        item.correctParameters.length
      );
    case 'matrix':
      return item.rows.filter((r) => r.correct.length > 0).length;
    case 'cloze':
      return item.blanks.filter((b) => b.options.some((o) => o.trim())).length;
    case 'highlight':
      return highlightCorrectIds(item).length;
    case 'dragdrop':
      return item.zones.reduce((sum, z) => sum + z.correct.length, 0);
    case 'multi-response':
    default:
      return item.options.filter((o) => o.correct).length;
  }
};

export const highlightCorrectIds = (item: NgnItem): string[] => {
  if (item.kind !== 'highlight') return [];
  if (item.variant === 'table') {
    return item.tableRows.flatMap((row) =>
      row.cells.filter((c) => c.selectable && c.correct).map((c) => c.id),
    );
  }
  return item.segments.filter((s) => s.correct).map((s) => s.id);
};

/** Whether the learner has engaged enough for "Check Answer" to be meaningful. */
export const isNgnAnswered = (item: NgnItem, response: NgnResponse | null | undefined): boolean => {
  if (!response || response.kind !== item.kind) return false;
  switch (response.kind) {
    case 'bowtie':
      return (
        !!response.condition || response.actions.some(Boolean) || response.parameters.some(Boolean)
      );
    case 'matrix':
      return Object.values(response.rows).some((v) => v.length > 0);
    case 'cloze':
      return Object.values(response.blanks).some((v) => v !== null && v !== undefined);
    case 'highlight':
      return response.selected.length > 0;
    case 'dragdrop':
      return Object.values(response.zones).some((v) => v.some(Boolean));
    case 'multi-response':
    default:
      return response.selected.length > 0;
  }
};

const tokenText = (tokens: NgnToken[], id: string): string =>
  tokens.find((t) => t.id === id)?.text?.trim() || '';

/**
 * Human-readable answer key. Stored on `Question.answer` so flashcard views,
 * session reviews, and exports keep working for NGN items without knowing
 * anything about the NGN payload.
 */
export const summarizeNgnAnswer = (item: NgnItem): string[] => {
  switch (item.kind) {
    case 'bowtie': {
      const lines: string[] = [];
      if (item.correctCondition) {
        lines.push(`${item.conditionLabel}: ${tokenText(item.conditions, item.correctCondition)}`);
      }
      if (item.correctActions.length) {
        lines.push(
          `${item.actionsLabel}: ${item.correctActions.map((id) => tokenText(item.actions, id)).filter(Boolean).join(', ')}`,
        );
      }
      if (item.correctParameters.length) {
        lines.push(
          `${item.parametersLabel}: ${item.correctParameters.map((id) => tokenText(item.parameters, id)).filter(Boolean).join(', ')}`,
        );
      }
      return lines.filter(Boolean);
    }
    case 'matrix':
      return item.rows
        .filter((r) => r.correct.length > 0 && r.text.trim())
        .map((r) => `${r.text.trim()} → ${r.correct.map((i) => item.columns[i]).filter(Boolean).join(', ')}`);
    case 'cloze':
      return item.blanks
        .map((b, i) => {
          const text = (b.options[b.correctIndex] || '').trim();
          return text ? `Blank ${i + 1}: ${text}` : '';
        })
        .filter(Boolean);
    case 'highlight': {
      if (item.variant === 'table') {
        return item.tableRows
          .flatMap((row) => row.cells.filter((c) => c.selectable && c.correct).map((c) => c.text.trim()))
          .filter(Boolean);
      }
      return item.segments.filter((s) => s.correct).map((s) => s.text.trim()).filter(Boolean);
    }
    case 'dragdrop':
      return item.zones
        .filter((z) => z.correct.length > 0)
        .map((z) => `${z.label || 'Zone'}: ${z.correct.map((id) => tokenText(item.tokens, id)).filter(Boolean).join(' → ')}`);
    case 'multi-response':
    default:
      return item.options.filter((o) => o.correct).map((o) => o.text.trim()).filter(Boolean);
  }
};

/**
 * Readable rendering of what the learner actually chose. Stored in the session's
 * `userSelections` so the results review can show "your answer" for NGN items
 * the same way it does for multiple choice.
 */
export const describeNgnResponse = (item: NgnItem, response: NgnResponse | null): string[] => {
  if (!response || response.kind !== item.kind) return [];

  switch (item.kind) {
    case 'bowtie': {
      if (response.kind !== 'bowtie') return [];
      const lines: string[] = [];
      if (response.condition) {
        lines.push(`${item.conditionLabel}: ${tokenText(item.conditions, response.condition)}`);
      }
      const actions = response.actions.map((id) => tokenText(item.actions, id)).filter(Boolean);
      if (actions.length) lines.push(`${item.actionsLabel}: ${actions.join(', ')}`);
      const params = response.parameters.map((id) => tokenText(item.parameters, id)).filter(Boolean);
      if (params.length) lines.push(`${item.parametersLabel}: ${params.join(', ')}`);
      return lines;
    }
    case 'matrix': {
      if (response.kind !== 'matrix') return [];
      return item.rows
        .filter((r) => (response.rows[r.id] || []).length > 0)
        .map(
          (r) =>
            `${r.text.trim()} → ${(response.rows[r.id] || []).map((i) => item.columns[i]).filter(Boolean).join(', ')}`,
        );
    }
    case 'cloze': {
      if (response.kind !== 'cloze') return [];
      return item.blanks
        .map((b, i) => {
          const picked = response.blanks[b.id];
          if (picked === null || picked === undefined) return '';
          const text = (b.options[picked] || '').trim();
          return text ? `Blank ${i + 1}: ${text}` : '';
        })
        .filter(Boolean);
    }
    case 'highlight': {
      if (response.kind !== 'highlight') return [];
      const lookup = new Map<string, string>();
      if (item.variant === 'table') {
        item.tableRows.forEach((row) => row.cells.forEach((c) => lookup.set(c.id, c.text)));
      } else {
        item.segments.forEach((s) => lookup.set(s.id, s.text));
      }
      return response.selected.map((id) => (lookup.get(id) || '').trim()).filter(Boolean);
    }
    case 'dragdrop': {
      if (response.kind !== 'dragdrop') return [];
      return item.zones
        .filter((z) => (response.zones[z.id] || []).some(Boolean))
        .map(
          (z) =>
            `${z.label || 'Zone'}: ${(response.zones[z.id] || [])
              .map((id) => tokenText(item.tokens, id))
              .filter(Boolean)
              .join(item.variant === 'sequence' ? ' → ' : ', ')}`,
        );
    }
    case 'multi-response':
    default: {
      if (response.kind !== 'multi-response') return [];
      return response.selected
        .map((id) => (item.options.find((o) => o.id === id)?.text || '').trim())
        .filter(Boolean);
    }
  }
};

/**
 * Authoring validation. Returns a list of problems that would make the item
 * unanswerable or ungradable; an empty list means the item is ready to save.
 */
export const validateNgnItem = (item: NgnItem): string[] => {
  const problems: string[] = [];
  const filled = (tokens: NgnToken[]) => tokens.filter((t) => t.text.trim());

  switch (item.kind) {
    case 'bowtie': {
      if (filled(item.conditions).length < 2) problems.push('Add at least 2 condition choices.');
      if (filled(item.actions).length < item.actionSlots + 1) {
        problems.push(`Add at least ${item.actionSlots + 1} action choices so there are distractors.`);
      }
      if (filled(item.parameters).length < item.parameterSlots + 1) {
        problems.push(`Add at least ${item.parameterSlots + 1} parameter choices so there are distractors.`);
      }
      if (!item.correctCondition) problems.push('Mark the correct condition.');
      if (item.correctActions.length !== item.actionSlots) {
        problems.push(`Mark exactly ${item.actionSlots} correct action${item.actionSlots === 1 ? '' : 's'}.`);
      }
      if (item.correctParameters.length !== item.parameterSlots) {
        problems.push(`Mark exactly ${item.parameterSlots} correct parameter${item.parameterSlots === 1 ? '' : 's'}.`);
      }
      break;
    }
    case 'matrix': {
      if (item.columns.filter((c) => c.trim()).length < 2) problems.push('Add at least 2 columns.');
      const rows = item.rows.filter((r) => r.text.trim());
      if (rows.length < 2) problems.push('Add at least 2 rows.');
      if (rows.some((r) => r.correct.length === 0)) problems.push('Every row needs a correct answer marked.');
      if (item.perRow === 'single' && rows.some((r) => r.correct.length > 1)) {
        problems.push('Single-select rows can only have one correct column.');
      }
      break;
    }
    case 'cloze': {
      const used = clozePlaceholderIndexes(item.template);
      if (used.length === 0) problems.push('Add at least one [[1]] placeholder to the sentence.');
      item.blanks.forEach((b, i) => {
        if (b.options.filter((o) => o.trim()).length < 2) {
          problems.push(`Blank ${i + 1} needs at least 2 choices.`);
        }
        if (!(b.options[b.correctIndex] || '').trim()) {
          problems.push(`Blank ${i + 1} needs a correct choice selected.`);
        }
      });
      break;
    }
    case 'highlight': {
      if (item.variant === 'text') {
        if (item.segments.length < 2) problems.push('Split the passage into at least 2 selectable parts.');
        if (!item.segments.some((s) => s.correct)) problems.push('Mark at least one part as correct.');
      } else {
        const selectable = item.tableRows.flatMap((r) => r.cells.filter((c) => c.selectable));
        if (selectable.length < 2) problems.push('Make at least 2 table cells selectable.');
        if (!selectable.some((c) => c.correct)) problems.push('Mark at least one cell as correct.');
      }
      break;
    }
    case 'dragdrop': {
      if (filled(item.tokens).length < 3) problems.push('Add at least 3 draggable options.');
      if (item.zones.length === 0) problems.push('Add at least one drop zone.');
      if (item.zones.every((z) => z.correct.length === 0)) problems.push('Assign the correct options to a zone.');
      if (item.variant === 'category' && item.zones.some((z) => !z.label.trim())) {
        problems.push('Every category needs a label.');
      }
      break;
    }
    case 'multi-response':
    default: {
      const options = item.options.filter((o) => o.text.trim());
      if (options.length < 4) problems.push('Add at least 4 options.');
      if (options.filter((o) => o.correct).length < 2) problems.push('Mark at least 2 correct options.');
      if (item.maxSelections > 0 && item.maxSelections < options.filter((o) => o.correct).length) {
        problems.push('The selection limit is lower than the number of correct answers.');
      }
      break;
    }
  }
  return problems;
};

/** 1-based placeholder numbers used in a cloze template, in order of appearance. */
export const clozePlaceholderIndexes = (template: string): number[] => {
  const found: number[] = [];
  const re = /\[\[(\d+)\]\]/g;
  let match = re.exec(template);
  while (match) {
    const n = Number.parseInt(match[1], 10);
    if (Number.isFinite(n) && !found.includes(n)) found.push(n);
    match = re.exec(template);
  }
  return found;
};

/** Splits a cloze template into literal text and `{ blank: n }` markers. */
export const parseClozeTemplate = (
  template: string,
): Array<{ type: 'text'; value: string } | { type: 'blank'; index: number }> => {
  const parts: Array<{ type: 'text'; value: string } | { type: 'blank'; index: number }> = [];
  const re = /\[\[(\d+)\]\]/g;
  let last = 0;
  let match = re.exec(template);
  while (match) {
    if (match.index > last) parts.push({ type: 'text', value: template.slice(last, match.index) });
    parts.push({ type: 'blank', index: Number.parseInt(match[1], 10) });
    last = match.index + match[0].length;
    match = re.exec(template);
  }
  if (last < template.length) parts.push({ type: 'text', value: template.slice(last) });
  return parts;
};

/**
 * Splits a passage into selectable highlight segments. Existing segments keep
 * their `correct` flag when their text is unchanged, so re-splitting after a
 * typo fix doesn't wipe the answer key.
 */
export const splitPassage = (
  passage: string,
  mode: 'sentence' | 'line' | 'word',
  previous: NgnHighlightSegment[] = [],
): Omit<NgnHighlightSegment, 'id'>[] => {
  let pieces: string[];
  if (mode === 'line') {
    pieces = passage.split(/\r?\n/);
  } else if (mode === 'word') {
    pieces = passage.split(/(\s+)/);
  } else {
    // Keep the terminating punctuation with its sentence.
    pieces = passage.split(/(?<=[.!?])\s+/);
  }

  const kept = new Map<string, boolean>();
  previous.forEach((s) => kept.set(s.text.trim(), s.correct));

  return pieces
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ text, correct: kept.get(text) || false }));
};
