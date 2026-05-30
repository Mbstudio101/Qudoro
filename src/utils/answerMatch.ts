// Answer matching for multiple-choice questions.
//
// MCQ grading compares the *text* of the chosen option against the stored
// correct-answer text, so the two strings must match. Authored and imported
// questions frequently differ only by surrounding/internal whitespace, HTML
// markup, smart quotes, HTML entities, or letter case — which silently made
// the correct answer grade as wrong. Normalizing those differences away makes
// equivalent strings compare equal, without making genuinely different options
// collide in real quizzes.

const decodeEntities = (s: string): string =>
  s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&apos;/gi, "'");

/** Normalize an option/answer string for equality comparison. */
export const normalizeAnswerText = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return decodeEntities(value)
    .replace(/<[^>]*>/g, ' ')          // strip HTML tags
    .replace(/[‘’]/g, "'")   // smart single quotes → '
    .replace(/[“”]/g, '"')   // smart double quotes → "
    .replace(/\s+/g, ' ')              // collapse all whitespace (incl. newlines/nbsp)
    .trim()
    .toLowerCase();
};

/** True when `selected` matches any of the `correct` answers. */
export const isAnswerMatch = (selected: unknown, correct: unknown): boolean => {
  const target = normalizeAnswerText(selected);
  if (!target) return false;
  const list = Array.isArray(correct) ? correct : [correct];
  return list.some((c) => normalizeAnswerText(c) === target);
};

/**
 * True when the set of `selected` options exactly equals the set of `correct`
 * answers (order- and duplicate-insensitive). Handles single- and multi-answer
 * questions uniformly.
 */
export const isSelectionCorrect = (selected: unknown[], correct: unknown[]): boolean => {
  const norm = (arr: unknown[]) =>
    [...new Set(arr.map(normalizeAnswerText).filter(Boolean))].sort();
  const a = norm(selected);
  const b = norm(correct);
  return a.length > 0 && a.length === b.length && a.every((v, i) => v === b[i]);
};

/**
 * Re-map stored answers onto the exact option text they correspond to, so a
 * persisted answer is always an exact member of `options`. Answers that match
 * no option are kept (trimmed) so a question is never left without a correct
 * answer. When there are no options (non-MCQ), answers are just trimmed.
 */
export const alignAnswersToOptions = (options: unknown, answers: unknown): string[] => {
  const opts = Array.isArray(options) ? options.filter((o): o is string => typeof o === 'string') : [];
  const ansArr = Array.isArray(answers) ? answers : answers != null && answers !== '' ? [answers] : [];
  return ansArr
    .map((a) => {
      if (opts.length > 0) {
        const match = opts.find((o) => normalizeAnswerText(o) === normalizeAnswerText(a));
        if (match !== undefined) return match;
      }
      return typeof a === 'string' ? a.trim() : String(a);
    })
    .filter((a) => a !== '');
};
