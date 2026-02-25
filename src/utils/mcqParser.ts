// Strip zero-width and invisible Unicode characters that appear in web-copied content
const ZERO_WIDTH_RE = /[\u200b\u200c\u200d\u200e\u200f\u2060\ufeff]/g;

export const cleanMcqText = (value: string): string =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(ZERO_WIDTH_RE, '')
    .replace(/\s+/g, ' ')
    .replace(/^["'""''\s]+|["'""''\s]+$/g, '')
    .trim();

type Marker = {
  index: number;
  matchLen: number;
  label: string;
  labelIndex: number;
};

type LineMarker = {
  lineIndex: number;
  label: string;
  labelIndex: number;
  inlineText: string;
};

type ParsedMcq = {
  stem: string;
  options: string[];
  labels: string[];
};

// Matches A. A) (A) a. a) — includes lowercase, comma added to boundary set
const markerRegex =
  /(^|[\s"'""'')\]\}\.\?!:;,]|(?<=[a-zA-Z0-9]))(?:\(?([A-Za-z])\)|([A-Za-z])[).:-]|([0-9]{1,2})[).:-])\s*/g;

// Matches lines that start with an option marker (A. A) (A) a. a) 1. etc.)
const lineMarkerRegex =
  /^\s*(?:[-*•]\s*)?(?:\(?([A-Za-z])\)|([A-Za-z])[).:-]|([0-9]{1,2})[).:-])\s*(.*)\s*$/;

// Matches a line that is ONLY a single letter (Quizlet "bare letter" export format)
const bareLetterLineRegex = /^\s*([A-Za-z])\s*$/;

const toLabelIndex = (label: string): number => {
  if (/^\d+$/.test(label)) return Number.parseInt(label, 10);
  const upper = label.toUpperCase();
  const code = upper.charCodeAt(0);
  if (code >= 65 && code <= 90) return code - 64; // A=1, B=2...
  return -1;
};

const findBestOrderedSequence = <T extends { labelIndex: number }>(markers: T[]): T[] => {
  if (markers.length < 2) return [];

  let best: T[] = [];
  for (let i = 0; i < markers.length; i += 1) {
    if (markers[i].labelIndex !== 1) continue; // start from A or 1 only
    const sequence: T[] = [markers[i]];
    let expected = 2;
    for (let j = i + 1; j < markers.length; j += 1) {
      const current = markers[j];
      if (current.labelIndex === expected) {
        sequence.push(current);
        expected += 1;
      } else if (current.labelIndex <= expected - 1) {
        // ignore duplicates or earlier labels
        continue;
      } else {
        // jumped ahead, likely not a clean MCQ block
        break;
      }
    }
    if (sequence.length > best.length) best = sequence;
  }

  return best.length >= 2 ? best : [];
};

export const parseInlineLabeledMcq = (value: string): ParsedMcq | null => {
  const normalized = value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(ZERO_WIDTH_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return null;

  // Reset global regex state before use
  markerRegex.lastIndex = 0;

  const markers: Marker[] = [];
  let match: RegExpExecArray | null = markerRegex.exec(normalized);
  while (match) {
    const boundary = match[1] || '';
    const label = String(match[2] || match[3] || match[4] || '').toLowerCase();
    const labelIndex = toLabelIndex(label);
    if (label && labelIndex > 0) {
      markers.push({
        index: match.index + boundary.length,
        matchLen: match[0].length - boundary.length,
        label,
        labelIndex,
      });
    }
    match = markerRegex.exec(normalized);
  }

  const sequence = findBestOrderedSequence(markers);
  if (sequence.length < 2) return null;

  const stem = normalized.slice(0, sequence[0].index).trim();
  if (!stem) return null;

  const options: string[] = [];
  sequence.forEach((entry, index) => {
    const start = entry.index + entry.matchLen;
    const end = sequence[index + 1] ? sequence[index + 1].index : normalized.length;
    const option = cleanMcqText(normalized.slice(start, end));
    if (option) options.push(option);
  });

  if (options.length < 2) return null;
  return {
    stem,
    options,
    labels: sequence.map((item) => item.label),
  };
};

export const parseLineLabeledMcq = (
  value: string,
  opts?: { allowMissingStem?: boolean },
): ParsedMcq | null => {
  const normalized = value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(ZERO_WIDTH_RE, '')
    .trim();
  if (!normalized) return null;

  const rawLines = normalized.split('\n').map((line) => line.trim());
  const lineMarkers: LineMarker[] = rawLines
    .map((line, lineIndex) => {
      const match = line.match(lineMarkerRegex);
      if (!match) return null;
      const label = String(match[1] || match[2] || match[3] || '').toLowerCase();
      const labelIndex = toLabelIndex(label);
      if (!label || labelIndex <= 0) return null;
      return {
        lineIndex,
        label,
        labelIndex,
        inlineText: cleanMcqText(match[4] || ''),
      };
    })
    .filter((entry): entry is LineMarker => Boolean(entry));

  const sequence = findBestOrderedSequence(lineMarkers);
  if (sequence.length < 2) return null;

  const stem = cleanMcqText(rawLines.slice(0, sequence[0].lineIndex).join(' '));
  if (!opts?.allowMissingStem && !stem) return null;

  const options: string[] = [];
  sequence.forEach((marker, index) => {
    const nextMarkerLine = sequence[index + 1]?.lineIndex ?? rawLines.length;
    const continuation = rawLines
      .slice(marker.lineIndex + 1, nextMarkerLine)
      .map((line) => cleanMcqText(line))
      .filter(Boolean);
    const joined = [marker.inlineText, ...continuation].filter(Boolean).join(' ');
    const option = cleanMcqText(joined);
    if (option) options.push(option);
  });

  if (options.length < 2) return null;
  return {
    stem,
    options,
    labels: sequence.map((item) => item.label),
  };
};

/**
 * Handles the Quizlet "bare letter" export format where option letters appear
 * on their own line with the option text on the following line(s):
 *   Question text
 *   A
 *   Option A text
 *   B
 *   Option B text
 */
export const parseBareLetterMcq = (
  value: string,
  opts?: { allowMissingStem?: boolean },
): ParsedMcq | null => {
  const normalized = value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(ZERO_WIDTH_RE, '')
    .trim();
  if (!normalized) return null;

  const rawLines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  if (rawLines.length < 3) return null; // need at least: stem + letter + text

  const possibleMarkers: Array<{ lineIndex: number; label: string; labelIndex: number }> = [];
  for (let i = 0; i < rawLines.length - 1; i += 1) {
    // Only treat a line as a bare-letter marker if the NEXT line is non-empty
    // and is NOT itself a bare letter (to avoid false positives)
    const match = rawLines[i].match(bareLetterLineRegex);
    if (match && rawLines[i + 1] && !rawLines[i + 1].match(bareLetterLineRegex)) {
      const label = match[1].toLowerCase();
      const labelIndex = toLabelIndex(label);
      if (labelIndex > 0) {
        possibleMarkers.push({ lineIndex: i, label, labelIndex });
      }
    }
  }

  const sequence = findBestOrderedSequence(possibleMarkers);
  if (sequence.length < 2) return null;

  const stem = cleanMcqText(rawLines.slice(0, sequence[0].lineIndex).join(' '));
  if (!opts?.allowMissingStem && !stem) return null;

  const options: string[] = [];
  sequence.forEach((marker, index) => {
    const nextMarkerLine = sequence[index + 1]?.lineIndex ?? rawLines.length;
    const optionLines = rawLines
      .slice(marker.lineIndex + 1, nextMarkerLine)
      .map((line) => cleanMcqText(line))
      .filter(Boolean);
    const option = optionLines.join(' ');
    if (option) options.push(option);
  });

  if (options.length < 2) return null;
  return {
    stem,
    options,
    labels: sequence.map((item) => item.label),
  };
};

export const parseLabeledMcq = (
  value: string,
  opts?: { allowMissingStem?: boolean },
): ParsedMcq | null =>
  parseLineLabeledMcq(value, opts) ||
  parseBareLetterMcq(value, opts) ||
  parseInlineLabeledMcq(value);
