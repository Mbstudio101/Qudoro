import React from 'react';
import { Check } from 'lucide-react';
import { NgnKind, NGN_KIND_META } from '../../types/ngn';

/**
 * `null` means "Classic" — the flashcard / multiple-choice item the app has
 * always had. Keeping it as an explicit choice makes the default obvious and
 * lets an author switch an NGN item back without losing the stem.
 */
export type StyleChoice = NgnKind | null;

// ── Miniature previews ─────────────────────────────────────────────────────
// Pure CSS/SVG thumbnails so the author can see the shape of each format
// before committing to it. Deliberately abstract — no text to translate.

const Bar = ({ w, tone = 'muted' }: { w: string; tone?: 'muted' | 'accent' }) => (
  <div
    className={`h-1.5 rounded-full ${tone === 'accent' ? 'bg-current' : 'bg-current/25'}`}
    style={{ width: w }}
  />
);

const ClassicPreview = () => (
  <div className="flex flex-col gap-1.5 w-full">
    <Bar w="80%" />
    <div className="h-px" />
    <Bar w="100%" tone="accent" />
    <Bar w="70%" />
    <Bar w="85%" />
  </div>
);

const BowTiePreview = () => (
  <svg viewBox="0 0 96 48" className="w-full h-full" aria-hidden="true">
    <path d="M26 12 L44 22 M26 30 L44 26 M52 22 L70 12 M52 26 L70 30" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" fill="none" />
    <rect x="8" y="6" width="18" height="12" rx="3" fill="currentColor" fillOpacity="0.25" />
    <rect x="8" y="24" width="18" height="12" rx="3" fill="currentColor" fillOpacity="0.25" />
    <rect x="36" y="16" width="24" height="16" rx="4" fill="currentColor" />
    <rect x="70" y="6" width="18" height="12" rx="3" fill="currentColor" fillOpacity="0.25" />
    <rect x="70" y="24" width="18" height="12" rx="3" fill="currentColor" fillOpacity="0.25" />
  </svg>
);

const MatrixPreview = () => (
  <div className="grid grid-cols-4 gap-1 w-full">
    {Array.from({ length: 12 }).map((_, i) => (
      <div
        key={i}
        className={`h-2.5 rounded-sm ${i % 4 === 0 ? 'bg-current/25' : i % 5 === 2 ? 'bg-current' : 'bg-current/10'}`}
      />
    ))}
  </div>
);

const ClozePreview = () => (
  <div className="flex flex-col gap-2 w-full">
    <div className="flex items-center gap-1.5">
      <Bar w="26%" />
      <div className="h-4 flex-1 rounded-md bg-current/80 flex items-center justify-end pr-1">
        <div className="h-0 w-0 border-x-[3px] border-x-transparent border-t-[3px] border-t-background" />
      </div>
    </div>
    <Bar w="90%" />
    <div className="flex items-center gap-1.5">
      <div className="h-4 w-1/2 rounded-md bg-current/40" />
      <Bar w="30%" />
    </div>
  </div>
);

const HighlightPreview = () => (
  <div className="flex flex-col gap-1.5 w-full">
    <Bar w="95%" />
    <div className="flex items-center gap-1">
      <div className="h-2.5 w-1/2 rounded-sm bg-current" />
      <Bar w="35%" />
    </div>
    <Bar w="80%" />
    <div className="flex items-center gap-1">
      <Bar w="20%" />
      <div className="h-2.5 w-1/3 rounded-sm bg-current" />
    </div>
  </div>
);

const DragDropPreview = () => (
  <div className="flex items-center gap-2 w-full">
    <div className="flex flex-col gap-1 flex-1">
      <div className="h-3 rounded-md bg-current/70" />
      <div className="h-3 rounded-md bg-current/25" />
      <div className="h-3 rounded-md bg-current/25" />
    </div>
    <svg viewBox="0 0 12 8" className="w-3 h-3 shrink-0 opacity-50"><path d="M0 4h9M6 1l3 3-3 3" stroke="currentColor" strokeWidth="1.4" fill="none" /></svg>
    <div className="flex flex-col gap-1 flex-1 rounded-md border border-dashed border-current/40 p-1">
      <div className="h-3 rounded bg-current/70" />
      <div className="h-3 rounded bg-current/10" />
    </div>
  </div>
);

const MultiResponsePreview = () => (
  <div className="flex flex-col gap-1.5 w-full">
    {[true, false, true, false].map((on, i) => (
      <div key={i} className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-[4px] shrink-0 ${on ? 'bg-current' : 'border-2 border-current/30'}`} />
        <Bar w={on ? '75%' : '55%'} />
      </div>
    ))}
  </div>
);

const PREVIEWS: Record<string, () => React.JSX.Element> = {
  classic: ClassicPreview,
  bowtie: BowTiePreview,
  matrix: MatrixPreview,
  cloze: ClozePreview,
  highlight: HighlightPreview,
  dragdrop: DragDropPreview,
  'multi-response': MultiResponsePreview,
};

interface StyleCard {
  key: string;
  kind: StyleChoice;
  name: string;
  tagline: string;
  gradient: string;
  accent: string;
}

const CARDS: StyleCard[] = [
  {
    key: 'classic',
    kind: null,
    name: 'Classic',
    tagline: 'Flashcard or multiple choice — the standard Qudoro question.',
    gradient: 'from-slate-500 to-slate-600',
    accent: 'text-slate-500',
  },
  ...NGN_KIND_META.map((m) => ({
    key: m.kind,
    kind: m.kind as StyleChoice,
    name: m.name,
    tagline: m.tagline,
    gradient: m.gradient,
    accent: m.accent,
  })),
];

interface NgnStylePickerProps {
  value: StyleChoice;
  onChange: (kind: StyleChoice) => void;
  /** Disabled while editing an existing question that already has answers. */
  disabled?: boolean;
}

const NgnStylePicker = ({ value, onChange, disabled = false }: NgnStylePickerProps) => (
  <div className="space-y-3">
    <div className="flex items-baseline justify-between">
      <label className="text-sm font-medium leading-none">Question Format</label>
      <span className="text-xs text-muted-foreground">
        NGN formats add clinical-judgment scoring with partial credit
      </span>
    </div>

    <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
      {CARDS.map((card) => {
        const selected = value === card.kind;
        const Preview = PREVIEWS[card.key];
        return (
          <button
            key={card.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(card.kind)}
            title={card.tagline}
            aria-pressed={selected}
            className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              selected
                ? 'border-transparent shadow-lg shadow-primary/10 ring-2 ring-primary'
                : 'border-border/60 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md'
            }`}
          >
            {/* Gradient wash — full strength when selected, hint on hover */}
            <div
              className={`pointer-events-none absolute inset-0 bg-linear-to-br ${card.gradient} transition-opacity duration-200 ${
                selected ? 'opacity-10' : 'opacity-0 group-hover:opacity-5'
              }`}
            />

            <div className="relative flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className={`h-1.5 w-8 rounded-full bg-linear-to-r ${card.gradient}`} />
                {selected && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </div>

              <div
                className={`flex h-12 items-center justify-center rounded-lg bg-secondary/40 px-2.5 ${card.accent} ${
                  selected ? '' : 'opacity-80 group-hover:opacity-100'
                }`}
              >
                <Preview />
              </div>

              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-tight text-balance">{card.name}</div>
                <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                  {card.tagline}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

export default NgnStylePicker;
