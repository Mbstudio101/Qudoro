export const cleanMcqText = (value: string): string =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')
    .trim();

type Marker = {
  index: number;
  matchLen: number;
  label: string;
  labelIndex: number;
};

const markerRegex =
  /(^|[\s"'“”‘’)\]\}\.\?!:;]|(?<=[a-z0-9]))(?:\(?([A-Za-z])\)|([A-Za-z])[).:-]|([0-9]{1,2})[).:-])\s*/g;

const toLabelIndex = (label: string): number => {
  if (/^\d+$/.test(label)) return Number.parseInt(label, 10);
  const upper = label.toUpperCase();
  const code = upper.charCodeAt(0);
  if (code >= 65 && code <= 90) return code - 64; // A=1, B=2...
  return -1;
};

const findBestOrderedSequence = (markers: Marker[]): Marker[] => {
  if (markers.length < 2) return [];

  let best: Marker[] = [];
  for (let i = 0; i < markers.length; i += 1) {
    if (markers[i].labelIndex !== 1) continue; // start from A or 1 only
    const sequence: Marker[] = [markers[i]];
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

export const parseInlineLabeledMcq = (
  value: string,
): { stem: string; options: string[]; labels: string[] } | null => {
  const normalized = value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return null;

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
