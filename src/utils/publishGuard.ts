import { ValidationFinding, validateItem, hasBlockingError } from './itemValidation';
import type { Question } from '../store/useStore';

/**
 * Intake controls for the Discover marketplace.
 *
 * Anything a user publishes is redistributed by Qudoro, which makes the intake
 * path — not the author — the place where liability actually lands. Three gates
 * run here:
 *
 *  1. **Attestation.** The publisher must state where the content came from.
 *     An unclaimed set cannot be published at all.
 *  2. **Item validity.** Items with blocking defects (see `itemValidation`)
 *     never reach other users' banks.
 *  3. **Third-party screening.** Text carrying the fingerprints of a commercial
 *     question bank is surfaced before it ships, not after a notice arrives.
 *
 * None of this is legal advice and none of it is a guarantee. It is the
 * difference between "a user uploaded infringing content" and "we distributed
 * it with no controls", which is the distinction that matters for safe harbour.
 */

/** What a publisher can honestly claim about a set's origin. */
export type ContentOrigin =
  | 'original'      // the publisher wrote it
  | 'licensed'      // used under a license the publisher holds
  | 'public-domain' // PD or an open license permitting redistribution
  | 'adapted';      // derived from an openly-licensed source, materially changed

export const CONTENT_ORIGIN_LABELS: Record<ContentOrigin, string> = {
  original: 'I wrote these questions myself',
  licensed: 'I hold a license that permits redistribution',
  'public-domain': 'Public domain or openly licensed (CC0, CC BY, …)',
  adapted: 'Adapted from an openly-licensed source',
};

/** Origins that require the publisher to name the source. */
const ORIGINS_NEEDING_SOURCE: ContentOrigin[] = ['licensed', 'public-domain', 'adapted'];

export interface ContentAttestation {
  origin: ContentOrigin;
  /** Required for every origin except `original`. */
  sourceNote?: string;
  /** Publisher confirmed they have the right to redistribute. */
  confirmed: boolean;
  attestedAt: number;
}

// ── Third-party content screening ──────────────────────────────────────────

/**
 * Names of commercial NCLEX banks. Their appearance inside question text is a
 * strong signal the item was lifted — authors do not normally cite a competitor
 * mid-rationale. Reported as a warning, not a block, because a legitimate
 * citation ("Saunders lists three phases…") is possible.
 */
const VENDOR_MARKERS = [
  'naxlex', 'nursedive', 'uworld', 'u-world', 'ati testing', 'atitesting',
  'kaplan nursing', 'hesi', 'saunders', 'nclex mastery', 'simplenursing',
  'simple nursing', 'nurseslabs', 'nurse plus', 'lippincott', 'archer review',
  'bootcamp.com', 'mark klimek', 'remar review', 'nursing.com', 'lecturio',
];

/**
 * Boilerplate that only travels with copied material. If a rights notice is
 * still embedded in the text, the text was taken from somewhere that asserted
 * rights over it — that is a block, not a warning.
 */
const RIGHTS_MARKERS = [
  'all rights reserved',
  'reproduced with permission',
  'may not be reproduced',
  'unauthorized reproduction',
  'copyright ©',
  '© 20',
  'confidential and proprietary',
  'do not distribute',
];

/** NCSBN asserts rights over live exam content; recalled items are not usable. */
const RECALL_MARKERS = [
  'actual nclex question',
  'real nclex question',
  'from my nclex',
  'i saw this on the nclex',
  'remembered from the exam',
  'exam recall',
];

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsMarker = (haystack: string, marker: string): boolean =>
  new RegExp(marker.includes(' ') ? escapeRe(marker) : `\\b${escapeRe(marker)}\\b`, 'i').test(haystack);

export interface ScreenResult {
  vendors: string[];
  rights: string[];
  recall: string[];
}

/** Scans a blob of set text for third-party-content fingerprints. */
export const screenText = (text: string): ScreenResult => {
  const haystack = text.toLowerCase();
  return {
    vendors: VENDOR_MARKERS.filter((m) => containsMarker(haystack, m)),
    rights: RIGHTS_MARKERS.filter((m) => containsMarker(haystack, m)),
    recall: RECALL_MARKERS.filter((m) => containsMarker(haystack, m)),
  };
};

// ── The gate ───────────────────────────────────────────────────────────────

const err = (code: string, message: string): ValidationFinding => ({ severity: 'error', code, message });
const warn = (code: string, message: string): ValidationFinding => ({ severity: 'warning', code, message });

export interface PublishCheck {
  findings: ValidationFinding[];
  /** False when any finding is an error — the publish button stays disabled. */
  canPublish: boolean;
}

/**
 * Runs every intake gate over a set about to be published.
 *
 * `questions` are the local questions being shared. `attestation` may be
 * `null` while the publisher is still filling in the form.
 */
export const checkSetForPublish = (
  questions: Pick<Question, 'id' | 'content' | 'rationale' | 'answer' | 'options' | 'ngn' | 'ehr'>[],
  attestation: ContentAttestation | null,
): PublishCheck => {
  const findings: ValidationFinding[] = [];

  if (questions.length === 0) {
    findings.push(err('publish.empty', 'This set has no questions.'));
  }

  // 1 — attestation
  if (!attestation) {
    findings.push(err('publish.no-attestation', 'State where this content came from before publishing.'));
  } else {
    if (!attestation.confirmed) {
      findings.push(err('publish.unconfirmed', 'Confirm you have the right to redistribute this content.'));
    }
    if (ORIGINS_NEEDING_SOURCE.includes(attestation.origin) && !attestation.sourceNote?.trim()) {
      findings.push(
        err('publish.no-source', `Naming the source is required when the origin is "${CONTENT_ORIGIN_LABELS[attestation.origin]}".`),
      );
    }
  }

  // 2 — item validity
  const invalid = questions.filter((q) => hasBlockingError(validateItem(q)));
  if (invalid.length > 0) {
    findings.push(
      err(
        'publish.invalid-items',
        `${invalid.length} question${invalid.length === 1 ? '' : 's'} ${invalid.length === 1 ? 'has' : 'have'} unresolved problems. Fix them before sharing.`,
      ),
    );
  }

  // 3 — third-party screening
  const corpus = questions
    .map((q) => `${q.content} ${q.rationale} ${(q.options || []).join(' ')} ${q.answer.join(' ')}`)
    .join('\n');
  const screen = screenText(corpus);

  if (screen.rights.length > 0) {
    findings.push(
      err(
        'publish.rights-notice',
        `This content still carries a rights notice (“${screen.rights[0]}”). It belongs to someone else and cannot be shared here.`,
      ),
    );
  }
  if (screen.recall.length > 0) {
    findings.push(
      err(
        'publish.exam-recall',
        `This content is described as recalled from a live exam (“${screen.recall[0]}”). NCSBN’s agreement prohibits sharing real items.`,
      ),
    );
  }
  if (screen.vendors.length > 0) {
    findings.push(
      warn(
        'publish.vendor-mention',
        `Mentions a commercial question bank (${screen.vendors.join(', ')}). Fine if you are citing it — not fine if the questions came from it.`,
      ),
    );
  }

  return { findings, canPublish: !findings.some((f) => f.severity === 'error') };
};

/** Builds the attestation record stored alongside a published set. */
export const makeAttestation = (
  origin: ContentOrigin,
  sourceNote: string,
  confirmed: boolean,
): ContentAttestation => ({
  origin,
  sourceNote: sourceNote.trim() || undefined,
  confirmed,
  attestedAt: Date.now(),
});
