import { v4 as uuidv4 } from 'uuid';

/**
 * Next Generation NCLEX (NGN) item formats.
 *
 * Everything in this file is *additive*: a Question that has no `ngn` payload
 * behaves exactly as it always has (flashcard or classic multiple-choice). The
 * NGN payload is a discriminated union so each format keeps its own shape while
 * the editor, player, and grader can switch on `kind`.
 */

export type NgnKind =
  | 'bowtie'
  | 'matrix'
  | 'cloze'
  | 'highlight'
  | 'dragdrop'
  | 'multi-response';

/**
 * How a partially-answered item earns credit.
 * - `partial`      — 0/1 per sub-item (blank, row, slot, placement).
 * - `plus-minus`   — +1 per correct pick, −1 per incorrect pick, floored at 0.
 * - `all-or-nothing` — full credit only when every sub-item is right.
 */
export type NgnScoring = 'partial' | 'plus-minus' | 'all-or-nothing';

export interface NgnToken {
  id: string;
  text: string;
}

// ── Bow-Tie ────────────────────────────────────────────────────────────────
// Actions to Take (left) → Condition (center) → Parameters to Monitor (right).
export interface NgnBowTie {
  kind: 'bowtie';
  scoring: NgnScoring;
  conditionLabel: string;
  actionsLabel: string;
  parametersLabel: string;
  actionSlots: number;
  parameterSlots: number;
  conditions: NgnToken[];
  actions: NgnToken[];
  parameters: NgnToken[];
  correctCondition: string | null;
  correctActions: string[];
  correctParameters: string[];
}

// ── Matrix / Grid ──────────────────────────────────────────────────────────
export interface NgnMatrixRow {
  id: string;
  text: string;
  correct: number[]; // column indices
}

export interface NgnMatrix {
  kind: 'matrix';
  scoring: NgnScoring;
  rowHeader: string;
  columns: string[];
  rows: NgnMatrixRow[];
  perRow: 'single' | 'multiple';
}

// ── Drop-Down / Cloze ──────────────────────────────────────────────────────
export interface NgnClozeBlank {
  id: string;
  options: string[];
  correctIndex: number;
}

export interface NgnCloze {
  kind: 'cloze';
  scoring: NgnScoring;
  /** Sentence/paragraph with `[[1]]`, `[[2]]` … placeholders, 1-based. */
  template: string;
  blanks: NgnClozeBlank[];
}

// ── Highlight Text / Table ─────────────────────────────────────────────────
export interface NgnHighlightSegment {
  id: string;
  text: string;
  correct: boolean;
}

export interface NgnHighlightCell {
  id: string;
  text: string;
  selectable: boolean;
  correct: boolean;
}

export interface NgnHighlightRow {
  id: string;
  cells: NgnHighlightCell[];
}

export interface NgnHighlight {
  kind: 'highlight';
  scoring: NgnScoring;
  variant: 'text' | 'table';
  /** Source passage kept so the author can re-split without retyping. */
  passage: string;
  segmentation: 'sentence' | 'line' | 'word';
  segments: NgnHighlightSegment[];
  tableColumns: string[];
  tableRows: NgnHighlightRow[];
}

// ── Extended Drag-and-Drop ─────────────────────────────────────────────────
export interface NgnDropZone {
  id: string;
  label: string;
  /** Token ids. For `sequence` the order is significant. */
  correct: string[];
}

export interface NgnDragDrop {
  kind: 'dragdrop';
  scoring: NgnScoring;
  variant: 'sequence' | 'category';
  instructions: string;
  /** Full pool — may contain distractors that belong in no zone. */
  tokens: NgnToken[];
  zones: NgnDropZone[];
}

// ── Extended Multiple Response ─────────────────────────────────────────────
export interface NgnResponseOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface NgnMultiResponse {
  kind: 'multi-response';
  scoring: NgnScoring;
  options: NgnResponseOption[];
  /** 0 = unlimited. */
  maxSelections: number;
}

export type NgnItem =
  | NgnBowTie
  | NgnMatrix
  | NgnCloze
  | NgnHighlight
  | NgnDragDrop
  | NgnMultiResponse;

// ── Learner responses ──────────────────────────────────────────────────────

export type NgnResponse =
  | { kind: 'bowtie'; condition: string | null; actions: string[]; parameters: string[] }
  | { kind: 'matrix'; rows: Record<string, number[]> }
  | { kind: 'cloze'; blanks: Record<string, number | null> }
  | { kind: 'highlight'; selected: string[] }
  | { kind: 'dragdrop'; zones: Record<string, string[]> }
  | { kind: 'multi-response'; selected: string[] };

// ── EHR chart (5-tab clinical record) ──────────────────────────────────────

export const EHR_TABS = ['hp', 'orders', 'notes', 'flowsheets', 'labs'] as const;
export type EhrTabId = (typeof EHR_TABS)[number];

export const EHR_TAB_LABELS: Record<EhrTabId, string> = {
  hp: 'History & Physical',
  orders: 'Orders',
  notes: 'Nurses’ Notes',
  flowsheets: 'Flowsheets',
  labs: 'Laboratory Results',
};

export type EhrFlag = 'normal' | 'high' | 'low' | 'critical';

export interface EhrEntry {
  id: string;
  timestamp: string;
  author: string;
  body: string;
}

export interface EhrGridRow {
  id: string;
  label: string;
  values: string[];
}

export interface EhrLabRow {
  id: string;
  test: string;
  result: string;
  reference: string;
  flag: EhrFlag;
}

export interface EhrPatient {
  name: string;
  age: string;
  sex: string;
  mrn: string;
  allergies: string;
  codeStatus: string;
}

export interface EhrChart {
  enabled: boolean;
  patient: EhrPatient;
  hp: string;
  orders: EhrEntry[];
  notes: EhrEntry[];
  flowsheets: { columns: string[]; rows: EhrGridRow[] };
  labs: EhrLabRow[];
}

// ── Presentation metadata (drives the style picker) ────────────────────────

export interface NgnKindMeta {
  kind: NgnKind;
  name: string;
  tagline: string;
  /** Tailwind gradient used by the picker card. */
  gradient: string;
  accent: string;
}

export const NGN_KIND_META: NgnKindMeta[] = [
  {
    kind: 'bowtie',
    name: 'Bow-Tie',
    tagline: 'Link one condition to the actions to take and parameters to monitor.',
    gradient: 'from-violet-500 to-indigo-500',
    accent: 'text-violet-500',
  },
  {
    kind: 'matrix',
    name: 'Matrix / Grid',
    tagline: 'Judge each finding across columns like Indicated, Contraindicated, Non-essential.',
    gradient: 'from-sky-500 to-cyan-500',
    accent: 'text-sky-500',
  },
  {
    kind: 'cloze',
    name: 'Drop-Down / Cloze',
    tagline: 'Embed drop-down menus straight inside a sentence or paragraph.',
    gradient: 'from-emerald-500 to-teal-500',
    accent: 'text-emerald-500',
  },
  {
    kind: 'highlight',
    name: 'Highlight Text / Table',
    tagline: 'Select the critical data inside a clinical passage or record table.',
    gradient: 'from-amber-500 to-orange-500',
    accent: 'text-amber-500',
  },
  {
    kind: 'dragdrop',
    name: 'Extended Drag-and-Drop',
    tagline: 'Order steps or sort into categories — with extra distractors left over.',
    gradient: 'from-rose-500 to-pink-500',
    accent: 'text-rose-500',
  },
  {
    kind: 'multi-response',
    name: 'Extended Multiple Response',
    tagline: 'Select all that apply, scored with +/− partial credit.',
    gradient: 'from-fuchsia-500 to-purple-500',
    accent: 'text-fuchsia-500',
  },
];

export const ngnKindMeta = (kind: NgnKind): NgnKindMeta =>
  NGN_KIND_META.find((m) => m.kind === kind) || NGN_KIND_META[0];

// ── Factories ──────────────────────────────────────────────────────────────

const token = (text = ''): NgnToken => ({ id: uuidv4(), text });

export const createEhrChart = (): EhrChart => ({
  enabled: false,
  patient: { name: '', age: '', sex: '', mrn: '', allergies: '', codeStatus: '' },
  hp: '',
  orders: [],
  notes: [],
  flowsheets: { columns: ['0800', '1200', '1600'], rows: [] },
  labs: [],
});

export const createEhrEntry = (): EhrEntry => ({
  id: uuidv4(),
  timestamp: '',
  author: '',
  body: '',
});

export const createEhrGridRow = (columnCount: number): EhrGridRow => ({
  id: uuidv4(),
  label: '',
  values: Array.from({ length: columnCount }, () => ''),
});

export const createEhrLabRow = (): EhrLabRow => ({
  id: uuidv4(),
  test: '',
  result: '',
  reference: '',
  flag: 'normal',
});

export const createNgnItem = (kind: NgnKind): NgnItem => {
  switch (kind) {
    case 'bowtie':
      return {
        kind: 'bowtie',
        scoring: 'partial',
        conditionLabel: 'Condition Most Likely Experiencing',
        actionsLabel: 'Actions to Take',
        parametersLabel: 'Parameters to Monitor',
        actionSlots: 2,
        parameterSlots: 2,
        conditions: [token(), token(), token()],
        actions: [token(), token(), token(), token(), token()],
        parameters: [token(), token(), token(), token(), token()],
        correctCondition: null,
        correctActions: [],
        correctParameters: [],
      };
    case 'matrix':
      return {
        kind: 'matrix',
        scoring: 'partial',
        rowHeader: 'Client Finding',
        columns: ['Indicated', 'Contraindicated', 'Non-essential'],
        rows: [
          { id: uuidv4(), text: '', correct: [] },
          { id: uuidv4(), text: '', correct: [] },
          { id: uuidv4(), text: '', correct: [] },
        ],
        perRow: 'single',
      };
    case 'cloze':
      return {
        kind: 'cloze',
        scoring: 'partial',
        template: 'The client is most likely experiencing [[1]] as evidenced by [[2]].',
        blanks: [
          { id: uuidv4(), options: ['', ''], correctIndex: 0 },
          { id: uuidv4(), options: ['', ''], correctIndex: 0 },
        ],
      };
    case 'highlight':
      return {
        kind: 'highlight',
        scoring: 'plus-minus',
        variant: 'text',
        passage: '',
        segmentation: 'sentence',
        segments: [],
        tableColumns: ['Finding', 'Value'],
        tableRows: [],
      };
    case 'dragdrop':
      return {
        kind: 'dragdrop',
        scoring: 'partial',
        variant: 'sequence',
        instructions: 'Place the actions in the order they should be performed.',
        tokens: [token(), token(), token(), token(), token()],
        zones: [{ id: uuidv4(), label: 'Correct Order', correct: [] }],
      };
    case 'multi-response':
    default:
      return {
        kind: 'multi-response',
        scoring: 'plus-minus',
        options: [
          { id: uuidv4(), text: '', correct: false },
          { id: uuidv4(), text: '', correct: false },
          { id: uuidv4(), text: '', correct: false },
          { id: uuidv4(), text: '', correct: false },
          { id: uuidv4(), text: '', correct: false },
        ],
        maxSelections: 0,
      };
  }
};

export const createEmptyResponse = (item: NgnItem): NgnResponse => {
  switch (item.kind) {
    case 'bowtie':
      return { kind: 'bowtie', condition: null, actions: [], parameters: [] };
    case 'matrix':
      return { kind: 'matrix', rows: {} };
    case 'cloze':
      return {
        kind: 'cloze',
        blanks: Object.fromEntries(item.blanks.map((b) => [b.id, null])),
      };
    case 'highlight':
      return { kind: 'highlight', selected: [] };
    case 'dragdrop':
      return {
        kind: 'dragdrop',
        zones: Object.fromEntries(item.zones.map((z) => [z.id, [] as string[]])),
      };
    case 'multi-response':
    default:
      return { kind: 'multi-response', selected: [] };
  }
};

export const newToken = token;
export const newId = (): string => uuidv4();
