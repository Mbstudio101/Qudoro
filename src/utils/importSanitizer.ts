import { cleanMcqText, parseLabeledMcq } from './mcqParser';

export type ImportedTerm = {
  term: string;
  def: string;
};

const normalizeLineSpaces = (value: string): string =>
  value
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();

const labelToDisplay = (label: string): string =>
  /^\d+$/.test(label) ? `${label}.` : `${label.toUpperCase()}.`;

const normalizeRawText = (value: string): string =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b\u200c\u200d\u200e\u200f\u2060\ufeff]/g, '')
    .replace(/\t/g, ' ')
    .trim();

/**
 * Insert newline breaks before option markers in text packed on one line.
 *
 * Strategy:
 *  1. After sentence-ending punctuation (? . !) → break before ANY option marker
 *     (handles the very common "Question? A. Opt A B. Opt B" pattern)
 *  2. After ANY word character (including uppercase) and whitespace → break before
 *     B–Z / 2+ option markers. This handles "Opt A B. Opt B" where the last char
 *     before the next marker may be uppercase (e.g. the letter A in "Option A").
 */
const insertPackedOptionBreaks = (value: string): string =>
  value
    // Rule 1 – break before first option (A or 1) when preceded by sentence punctuation
    .replace(
      /([?.!])\s*(\(?[A-Za-z]\)|[A-Za-z][).:-]|[0-9]{1,2}[).:-])\s*/g,
      '$1\n$2 ',
    )
    // Rule 2 – break before B–Z / 2+ markers after any word character
    // Extending boundary to include uppercase fixes "Option A B. …" → "Option A\nB. …"
    .replace(
      /([A-Za-z0-9"'])(\s+)(\(?[B-Za-z]\)|[B-Z][).:-]|[b-z][).:-]|(?:1[0-9]|[2-9])[).:-])(\s*)/g,
      '$1\n$3 ',
    );

const formatParsedMcq = (parsed: NonNullable<ReturnType<typeof parseLabeledMcq>>): string => {
  const stem = cleanMcqText(parsed.stem);
  const options = parsed.options.map(
    (opt, idx) =>
      `${labelToDisplay(parsed.labels[idx] || String(idx + 1))} ${cleanMcqText(opt)}`,
  );
  return normalizeLineSpaces([stem, ...options].join('\n'));
};

const canonicalizeMcqFront = (front: string): string => {
  // First attempt: parse as-is
  const parsed = parseLabeledMcq(front, { allowMissingStem: true });
  if (parsed) return formatParsedMcq(parsed);

  // Second attempt: break up packed inline options, then re-parse
  const broken = insertPackedOptionBreaks(front);
  const parsedBroken = parseLabeledMcq(broken, { allowMissingStem: true });
  if (parsedBroken) return formatParsedMcq(parsedBroken);

  // Fallback: return the broken-up text with whitespace normalized
  return normalizeLineSpaces(broken);
};

export const sanitizeImportedTerm = (term: ImportedTerm): ImportedTerm => {
  const normalizedTerm = normalizeRawText(term.term || '');
  const normalizedDef = normalizeLineSpaces(normalizeRawText(term.def || ''));
  return {
    term: canonicalizeMcqFront(normalizedTerm),
    def: normalizedDef,
  };
};

export const sanitizeImportedTerms = (terms: ImportedTerm[]): ImportedTerm[] =>
  terms.map((term) => sanitizeImportedTerm(term));
