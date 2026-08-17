import React from 'react';
import { Check, X, ChevronDown, GripVertical, Sparkles } from 'lucide-react';
import {
  NgnItem,
  NgnResponse,
  NgnBowTie,
  NgnMatrix,
  NgnCloze,
  NgnHighlight,
  NgnDragDrop,
  NgnMultiResponse,
  NgnToken,
} from '../../types/ngn';
import { parseClozeTemplate, highlightCorrectIds } from '../../utils/ngnGrading';

/**
 * Interactive renderers for the NGN item formats.
 *
 * One component per format, all driven by the same three props: the authored
 * `item`, the learner's `response`, and `checked` (after which the item locks
 * and reveals the key). Practice owns the response state so it can persist and
 * grade it; the player is otherwise self-contained.
 */

// ── Shared pieces ──────────────────────────────────────────────────────────

type ChipState = 'idle' | 'active' | 'placed' | 'correct' | 'incorrect' | 'missed';

const CHIP_STYLES: Record<ChipState, string> = {
  idle: 'border-border/70 bg-background hover:border-primary/50 hover:bg-secondary/40',
  active: 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30',
  placed: 'border-primary/40 bg-primary/5 text-foreground',
  correct: 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400',
  incorrect: 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400',
  missed: 'border-green-500/50 border-dashed bg-green-500/5 text-green-600/80 dark:text-green-400/80',
};

const Chip = ({
  text,
  state = 'idle',
  onClick,
  disabled,
  draggable,
  onDragStart,
  onDragEnd,
  className = '',
}: {
  text: string;
  state?: ChipState;
  onClick?: () => void;
  disabled?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  className?: string;
}) => (
  <button
    type="button"
    disabled={disabled}
    draggable={draggable && !disabled}
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    onClick={onClick}
    className={`flex w-full items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-all disabled:cursor-default ${CHIP_STYLES[state]} ${
      draggable && !disabled ? 'cursor-grab active:cursor-grabbing' : ''
    } ${className}`}
  >
    {draggable && !disabled && <GripVertical className="h-4 w-4 shrink-0 opacity-40" />}
    <span className="flex-1 break-words [overflow-wrap:anywhere]">{text}</span>
    {state === 'correct' && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
    {state === 'incorrect' && <X className="h-4 w-4 shrink-0" strokeWidth={3} />}
  </button>
);

const Slot = ({
  filled,
  state,
  placeholder,
  index,
  onClick,
  onDrop,
  disabled,
}: {
  filled: string | null;
  state: ChipState;
  placeholder: string;
  index?: number;
  onClick: () => void;
  onDrop: () => void;
  disabled: boolean;
}) => (
  <button
    type="button"
    disabled={disabled && !filled}
    onClick={onClick}
    onDragOver={(e) => {
      if (disabled) return;
      e.preventDefault();
    }}
    onDrop={(e) => {
      if (disabled) return;
      e.preventDefault();
      onDrop();
    }}
    className={`flex min-h-[46px] w-full items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-all ${
      filled ? CHIP_STYLES[state] : 'border-dashed border-border/70 bg-secondary/20 text-muted-foreground hover:border-primary/50 hover:bg-secondary/40'
    }`}
  >
    {index !== undefined && (
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
          filled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
        }`}
      >
        {index}
      </span>
    )}
    <span className="flex-1 break-words [overflow-wrap:anywhere]">{filled || placeholder}</span>
    {filled && state === 'correct' && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
    {filled && state === 'incorrect' && <X className="h-4 w-4 shrink-0" strokeWidth={3} />}
  </button>
);

const ColumnHeading = ({ label, hint }: { label: string; hint?: string }) => (
  <div className="mb-2">
    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h4>
    {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
  </div>
);

/** Click-to-place / drag-to-place selection shared by bow-tie and drag-and-drop. */
type Held = { id: string; pool: string } | null;

const tokenText = (tokens: NgnToken[], id: string | null): string =>
  (id && tokens.find((t) => t.id === id)?.text) || '';

// ── Bow-Tie ────────────────────────────────────────────────────────────────

const BowTiePlayer = ({
  item,
  response,
  onChange,
  checked,
}: {
  item: NgnBowTie;
  response: Extract<NgnResponse, { kind: 'bowtie' }>;
  onChange: (r: NgnResponse) => void;
  checked: boolean;
}) => {
  const [held, setHeld] = React.useState<Held>(null);

  const place = (pool: 'actions' | 'condition' | 'parameters', slotIndex: number, tokenId: string) => {
    if (checked) return;
    if (pool === 'condition') {
      onChange({ ...response, condition: tokenId });
      setHeld(null);
      return;
    }
    const key = pool === 'actions' ? 'actions' : 'parameters';
    const limit = pool === 'actions' ? item.actionSlots : item.parameterSlots;
    const next = [...response[key]];
    // A token can only sit in one slot; clear any earlier placement first.
    const existing = next.indexOf(tokenId);
    if (existing >= 0) next.splice(existing, 1);
    while (next.length < limit) next.push('');
    next[slotIndex] = tokenId;
    onChange({ ...response, [key]: next.slice(0, limit) });
    setHeld(null);
  };

  const clearSlot = (pool: 'actions' | 'condition' | 'parameters', slotIndex: number) => {
    if (checked) return;
    if (pool === 'condition') {
      onChange({ ...response, condition: null });
      return;
    }
    const key = pool === 'actions' ? 'actions' : 'parameters';
    const next = [...response[key]];
    next[slotIndex] = '';
    onChange({ ...response, [key]: next });
  };

  const slotState = (pool: 'actions' | 'condition' | 'parameters', tokenId: string): ChipState => {
    if (!checked) return 'placed';
    const key =
      pool === 'condition'
        ? item.correctCondition
          ? [item.correctCondition]
          : []
        : pool === 'actions'
          ? item.correctActions
          : item.correctParameters;
    return key.includes(tokenId) ? 'correct' : 'incorrect';
  };

  const renderColumn = (
    pool: 'actions' | 'condition' | 'parameters',
    label: string,
    tokens: NgnToken[],
    slotCount: number,
    placed: string[],
  ) => {
    const available = tokens.filter((t) => t.text.trim() && !placed.includes(t.id));
    const correctKey =
      pool === 'condition'
        ? item.correctCondition
          ? [item.correctCondition]
          : []
        : pool === 'actions'
          ? item.correctActions
          : item.correctParameters;

    return (
      <div className="flex flex-col">
        <ColumnHeading label={label} hint={`Choose ${slotCount}`} />
        <div className="space-y-2">
          {Array.from({ length: slotCount }).map((_, i) => {
            const tokenId = placed[i] || '';
            return (
              <Slot
                key={i}
                filled={tokenId ? tokenText(tokens, tokenId) : null}
                state={tokenId ? slotState(pool, tokenId) : 'idle'}
                placeholder="Drop or tap a choice"
                disabled={checked}
                onClick={() => {
                  if (tokenId) clearSlot(pool, i);
                  else if (held && held.pool === pool) place(pool, i, held.id);
                }}
                onDrop={() => {
                  if (held && held.pool === pool) place(pool, i, held.id);
                }}
              />
            );
          })}
        </div>

        <div className="mt-3 space-y-1.5 rounded-xl border border-border/50 bg-secondary/10 p-2">
          {available.length === 0 && (
            <p className="py-2 text-center text-[11px] text-muted-foreground">All choices placed</p>
          )}
          {available.map((t) => (
            <Chip
              key={t.id}
              text={t.text}
              draggable={!checked}
              disabled={checked}
              state={
                checked
                  ? correctKey.includes(t.id)
                    ? 'missed'
                    : 'idle'
                  : held?.id === t.id
                    ? 'active'
                    : 'idle'
              }
              onDragStart={() => setHeld({ id: t.id, pool })}
              onDragEnd={() => setHeld(null)}
              onClick={() => setHeld(held?.id === t.id ? null : { id: t.id, pool })}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-4 lg:grid-cols-3">
        {renderColumn('actions', item.actionsLabel, item.actions, item.actionSlots, response.actions)}
        <div className="lg:pt-6">
          {renderColumn(
            'condition',
            item.conditionLabel,
            item.conditions,
            1,
            response.condition ? [response.condition] : [],
          )}
        </div>
        {renderColumn(
          'parameters',
          item.parametersLabel,
          item.parameters,
          item.parameterSlots,
          response.parameters,
        )}
      </div>
      {!checked && (
        <p className="text-center text-[11px] text-muted-foreground">
          Tap a choice then tap a slot — or drag it across.
        </p>
      )}
    </div>
  );
};

// ── Matrix / Grid ──────────────────────────────────────────────────────────

const MatrixPlayer = ({
  item,
  response,
  onChange,
  checked,
}: {
  item: NgnMatrix;
  response: Extract<NgnResponse, { kind: 'matrix' }>;
  onChange: (r: NgnResponse) => void;
  checked: boolean;
}) => {
  const toggle = (rowId: string, col: number) => {
    if (checked) return;
    const current = response.rows[rowId] || [];
    const next =
      item.perRow === 'single'
        ? current[0] === col
          ? []
          : [col]
        : current.includes(col)
          ? current.filter((c) => c !== col)
          : [...current, col].sort((a, b) => a - b);
    onChange({ ...response, rows: { ...response.rows, [rowId]: next } });
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-secondary/30">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {item.rowHeader || 'Finding'}
            </th>
            {item.columns.map((c, i) => (
              <th
                key={i}
                className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {item.rows
            .filter((r) => r.text.trim())
            .map((row) => {
              const picks = response.rows[row.id] || [];
              const rowCorrect =
                checked &&
                picks.length === row.correct.length &&
                picks.every((p) => row.correct.includes(p));
              return (
                <tr
                  key={row.id}
                  className={`border-b border-border/30 last:border-0 transition-colors ${
                    checked ? (rowCorrect ? 'bg-green-500/5' : 'bg-red-500/5') : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-start gap-2">
                      {checked &&
                        (rowCorrect ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" strokeWidth={3} />
                        ) : (
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" strokeWidth={3} />
                        ))}
                      <span className="break-words [overflow-wrap:anywhere]">{row.text}</span>
                    </span>
                  </td>
                  {item.columns.map((_, cIdx) => {
                    const picked = picks.includes(cIdx);
                    const isKey = row.correct.includes(cIdx);
                    let tone = 'border-border/70 bg-background hover:border-primary/50 hover:bg-primary/5';
                    if (checked) {
                      if (picked && isKey) tone = 'border-green-500 bg-green-500 text-white';
                      else if (picked && !isKey) tone = 'border-red-500 bg-red-500 text-white';
                      else if (isKey) tone = 'border-green-500 border-dashed bg-green-500/10 text-green-500';
                      else tone = 'border-border/40 bg-background opacity-50';
                    } else if (picked) {
                      tone = 'border-primary bg-primary text-primary-foreground';
                    }
                    return (
                      <td key={cIdx} className="px-3 py-3 text-center">
                        <button
                          type="button"
                          disabled={checked}
                          onClick={() => toggle(row.id, cIdx)}
                          aria-label={`${row.text} — ${item.columns[cIdx]}`}
                          aria-pressed={picked}
                          className={`mx-auto flex h-8 w-8 items-center justify-center border-2 transition-all disabled:cursor-default ${
                            item.perRow === 'single' ? 'rounded-full' : 'rounded-lg'
                          } ${tone}`}
                        >
                          {(picked || (checked && isKey)) && <Check className="h-4 w-4" strokeWidth={3} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

// ── Drop-Down / Cloze ──────────────────────────────────────────────────────

const ClozePlayer = ({
  item,
  response,
  onChange,
  checked,
}: {
  item: NgnCloze;
  response: Extract<NgnResponse, { kind: 'cloze' }>;
  onChange: (r: NgnResponse) => void;
  checked: boolean;
}) => {
  const parts = parseClozeTemplate(item.template);

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/10 p-5 text-lg leading-loose">
      {parts.map((part, i) => {
        if (part.type === 'text') {
          return (
            <span key={i} className="whitespace-pre-wrap">
              {part.value}
            </span>
          );
        }
        const blank = item.blanks[part.index - 1];
        if (!blank) {
          return (
            <span key={i} className="mx-1 rounded-md bg-destructive/10 px-2 text-sm text-destructive">
              [[{part.index}]]
            </span>
          );
        }
        const picked = response.blanks[blank.id];
        const isRight = checked && picked === blank.correctIndex;
        const isWrong = checked && picked !== null && picked !== undefined && !isRight;

        return (
          <span key={i} className="relative mx-1 inline-flex items-center align-middle">
            <select
              disabled={checked}
              value={picked === null || picked === undefined ? '' : String(picked)}
              onChange={(e) =>
                onChange({
                  ...response,
                  blanks: {
                    ...response.blanks,
                    [blank.id]: e.target.value === '' ? null : Number.parseInt(e.target.value, 10),
                  },
                })
              }
              className={`h-10 min-w-[170px] max-w-full appearance-none rounded-xl border-2 bg-background px-3 pr-8 text-base font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${
                isRight
                  ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'
                  : isWrong
                    ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400'
                    : picked !== null && picked !== undefined
                      ? 'border-primary text-primary'
                      : 'border-dashed border-primary/50 text-muted-foreground'
              }`}
            >
              <option value="">Select…</option>
              {blank.options.map((opt, oi) =>
                opt.trim() ? (
                  <option key={oi} value={oi}>
                    {opt}
                  </option>
                ) : null,
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 opacity-60" />
            {checked && isWrong && (
              <span className="ml-2 text-sm font-medium text-green-600 dark:text-green-400">
                → {blank.options[blank.correctIndex]}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
};

// ── Highlight Text / Table ─────────────────────────────────────────────────

const HighlightPlayer = ({
  item,
  response,
  onChange,
  checked,
}: {
  item: NgnHighlight;
  response: Extract<NgnResponse, { kind: 'highlight' }>;
  onChange: (r: NgnResponse) => void;
  checked: boolean;
}) => {
  const correctIds = highlightCorrectIds(item);

  const toggle = (id: string) => {
    if (checked) return;
    onChange({
      ...response,
      selected: response.selected.includes(id)
        ? response.selected.filter((s) => s !== id)
        : [...response.selected, id],
    });
  };

  const toneFor = (id: string): string => {
    const picked = response.selected.includes(id);
    const isKey = correctIds.includes(id);
    if (!checked) {
      return picked
        ? 'bg-primary/20 text-primary ring-1 ring-primary/40'
        : 'hover:bg-secondary/60 ring-1 ring-transparent';
    }
    if (picked && isKey) return 'bg-green-500/20 text-green-700 dark:text-green-300 ring-1 ring-green-500';
    if (picked && !isKey) return 'bg-red-500/20 text-red-700 dark:text-red-300 line-through ring-1 ring-red-500';
    if (isKey) return 'ring-1 ring-dashed ring-green-500/70 bg-green-500/5';
    return 'opacity-60';
  };

  if (item.variant === 'table') {
    return (
      <div className="overflow-x-auto rounded-2xl border border-border/60">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/30">
              {item.tableColumns.map((c, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.tableRows.map((row) => (
              <tr key={row.id} className="border-b border-border/30 last:border-0">
                {row.cells.map((cell) => (
                  <td key={cell.id} className="px-2 py-1.5">
                    {cell.selectable ? (
                      <button
                        type="button"
                        disabled={checked}
                        onClick={() => toggle(cell.id)}
                        className={`w-full rounded-lg px-2.5 py-1.5 text-left transition-all disabled:cursor-default ${toneFor(cell.id)}`}
                      >
                        {cell.text || '—'}
                      </button>
                    ) : (
                      <span className="block px-2.5 py-1.5 font-medium">{cell.text || '—'}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/10 p-5 text-base leading-loose">
      {item.segments.map((seg) => (
        <button
          key={seg.id}
          type="button"
          disabled={checked}
          onClick={() => toggle(seg.id)}
          className={`mr-1 rounded-md px-1 py-0.5 text-left transition-all disabled:cursor-default ${toneFor(seg.id)}`}
        >
          {seg.text}
        </button>
      ))}
    </div>
  );
};

// ── Extended Drag-and-Drop ─────────────────────────────────────────────────

const DragDropPlayer = ({
  item,
  response,
  onChange,
  checked,
}: {
  item: NgnDragDrop;
  response: Extract<NgnResponse, { kind: 'dragdrop' }>;
  onChange: (r: NgnResponse) => void;
  checked: boolean;
}) => {
  const [held, setHeld] = React.useState<string | null>(null);

  const placedIds = React.useMemo(
    () => Object.values(response.zones).flat().filter(Boolean),
    [response.zones],
  );
  const pool = item.tokens.filter((t) => t.text.trim() && !placedIds.includes(t.id));

  const putInZone = (zoneId: string, tokenId: string, slotIndex?: number) => {
    if (checked || !tokenId) return;
    const zones: Record<string, string[]> = {};
    // Pull the token out of wherever it currently sits, then place it.
    for (const z of item.zones) {
      const list = [...(response.zones[z.id] || [])];
      const at = list.indexOf(tokenId);
      if (at >= 0) {
        if (item.variant === 'sequence') list[at] = '';
        else list.splice(at, 1);
      }
      zones[z.id] = list;
    }
    const target = zones[zoneId] || [];
    if (item.variant === 'sequence' && slotIndex !== undefined) {
      while (target.length <= slotIndex) target.push('');
      target[slotIndex] = tokenId;
    } else {
      target.push(tokenId);
    }
    zones[zoneId] = target;
    onChange({ ...response, zones });
    setHeld(null);
  };

  const removeFrom = (zoneId: string, slotIndex: number) => {
    if (checked) return;
    const list = [...(response.zones[zoneId] || [])];
    if (item.variant === 'sequence') list[slotIndex] = '';
    else list.splice(slotIndex, 1);
    onChange({ ...response, zones: { ...response.zones, [zoneId]: list } });
  };

  const slotState = (zoneId: string, tokenId: string, slotIndex: number): ChipState => {
    if (!checked) return 'placed';
    const zone = item.zones.find((z) => z.id === zoneId);
    if (!zone) return 'placed';
    const ok =
      item.variant === 'sequence' ? zone.correct[slotIndex] === tokenId : zone.correct.includes(tokenId);
    return ok ? 'correct' : 'incorrect';
  };

  return (
    <div className="space-y-4">
      {item.instructions && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {item.instructions}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Pool */}
        <div>
          <ColumnHeading label="Options" hint="Extras will be left over" />
          <div
            className="min-h-[120px] space-y-2 rounded-2xl border-2 border-dashed border-border/60 bg-secondary/10 p-3"
            onDragOver={(e) => !checked && e.preventDefault()}
            onDrop={(e) => {
              if (checked || !held) return;
              e.preventDefault();
              const zones: Record<string, string[]> = {};
              for (const z of item.zones) {
                const list = [...(response.zones[z.id] || [])];
                const at = list.indexOf(held);
                if (at >= 0) {
                  if (item.variant === 'sequence') list[at] = '';
                  else list.splice(at, 1);
                }
                zones[z.id] = list;
              }
              onChange({ ...response, zones });
              setHeld(null);
            }}
          >
            {pool.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {checked ? 'No options left over' : 'All options placed'}
              </p>
            )}
            {pool.map((t) => (
              <Chip
                key={t.id}
                text={t.text}
                draggable={!checked}
                disabled={checked}
                state={held === t.id ? 'active' : 'idle'}
                onDragStart={() => setHeld(t.id)}
                onDragEnd={() => setHeld(null)}
                onClick={() => setHeld(held === t.id ? null : t.id)}
              />
            ))}
          </div>
        </div>

        {/* Zones */}
        <div className="space-y-4">
          {item.zones.map((zone) => {
            const placed = response.zones[zone.id] || [];
            const slotCount =
              item.variant === 'sequence' ? Math.max(zone.correct.length, placed.length) : 0;
            return (
              <div key={zone.id}>
                <ColumnHeading label={zone.label || 'Drop here'} />
                {item.variant === 'sequence' ? (
                  <div className="space-y-2">
                    {Array.from({ length: slotCount }).map((_, i) => {
                      const tokenId = placed[i] || '';
                      return (
                        <Slot
                          key={i}
                          index={i + 1}
                          filled={tokenId ? tokenText(item.tokens, tokenId) : null}
                          state={tokenId ? slotState(zone.id, tokenId, i) : 'idle'}
                          placeholder="Drop or tap an option"
                          disabled={checked}
                          onClick={() => {
                            if (tokenId) removeFrom(zone.id, i);
                            else if (held) putInZone(zone.id, held, i);
                          }}
                          onDrop={() => held && putInZone(zone.id, held, i)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="min-h-[90px] space-y-2 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-3"
                    onDragOver={(e) => !checked && e.preventDefault()}
                    onDrop={(e) => {
                      if (checked || !held) return;
                      e.preventDefault();
                      putInZone(zone.id, held);
                    }}
                    onClick={() => held && putInZone(zone.id, held)}
                  >
                    {placed.length === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        Drop or tap options here
                      </p>
                    )}
                    {placed.map((tokenId, i) => (
                      <Chip
                        key={`${tokenId}-${i}`}
                        text={tokenText(item.tokens, tokenId)}
                        disabled={checked}
                        state={slotState(zone.id, tokenId, i)}
                        onClick={() => removeFrom(zone.id, i)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {checked && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3 text-xs">
          <span className="font-semibold text-green-600 dark:text-green-400">Answer key</span>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {item.zones.map((z) => (
              <li key={z.id}>
                <span className="font-medium text-foreground">{z.label || 'Zone'}:</span>{' '}
                {z.correct.map((id) => tokenText(item.tokens, id)).filter(Boolean).join(
                  item.variant === 'sequence' ? ' → ' : ', ',
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ── Extended Multiple Response ─────────────────────────────────────────────

const MultiResponsePlayer = ({
  item,
  response,
  onChange,
  checked,
}: {
  item: NgnMultiResponse;
  response: Extract<NgnResponse, { kind: 'multi-response' }>;
  onChange: (r: NgnResponse) => void;
  checked: boolean;
}) => {
  const limitReached =
    item.maxSelections > 0 && response.selected.length >= item.maxSelections;

  const toggle = (id: string) => {
    if (checked) return;
    const picked = response.selected.includes(id);
    if (!picked && limitReached) return;
    onChange({
      ...response,
      selected: picked ? response.selected.filter((s) => s !== id) : [...response.selected, id],
    });
  };

  return (
    <div className="space-y-2">
      {item.maxSelections > 0 && !checked && (
        <p className="text-xs text-muted-foreground">
          Select up to {item.maxSelections} ({response.selected.length} chosen)
        </p>
      )}
      {item.options
        .filter((o) => o.text.trim())
        .map((opt) => {
          const picked = response.selected.includes(opt.id);
          let tone = 'border-border/70 bg-background hover:border-primary/50 hover:bg-secondary/30';
          if (checked) {
            if (picked && opt.correct) tone = 'border-green-500 bg-green-500/10';
            else if (picked && !opt.correct) tone = 'border-red-500 bg-red-500/10';
            else if (opt.correct) tone = 'border-green-500/50 border-dashed bg-green-500/5';
            else tone = 'border-border/40 opacity-60';
          } else if (picked) {
            tone = 'border-primary bg-primary/10';
          }

          return (
            <button
              key={opt.id}
              type="button"
              disabled={checked || (!picked && limitReached)}
              onClick={() => toggle(opt.id)}
              aria-pressed={picked}
              className={`flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all disabled:cursor-default ${tone} ${
                !checked && !picked && limitReached ? 'opacity-50' : ''
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                  picked
                    ? checked
                      ? opt.correct
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-red-500 bg-red-500 text-white'
                      : 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/40'
                }`}
              >
                {picked && (checked && !opt.correct ? <X className="h-3.5 w-3.5" strokeWidth={3} /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />)}
              </span>
              <span className="flex-1 break-words [overflow-wrap:anywhere]">{opt.text}</span>
              {checked && !picked && opt.correct && (
                <span className="shrink-0 text-[11px] font-medium text-green-600 dark:text-green-400">
                  Missed
                </span>
              )}
            </button>
          );
        })}
      {checked && item.scoring === 'plus-minus' && (
        <p className="pt-1 text-[11px] text-muted-foreground">
          Scored +1 per correct selection, −1 per incorrect selection (never below zero).
        </p>
      )}
    </div>
  );
};

// ── Entry point ────────────────────────────────────────────────────────────

interface NgnPlayerProps {
  item: NgnItem;
  response: NgnResponse;
  onChange: (response: NgnResponse) => void;
  /** After checking, the item locks and reveals the answer key. */
  checked?: boolean;
}

const NgnPlayer = ({ item, response, onChange, checked = false }: NgnPlayerProps) => {
  // Guard against a response that doesn't match the item (e.g. a resumed exam
  // whose question was re-authored into a different format).
  if (response.kind !== item.kind) return null;

  switch (item.kind) {
    case 'bowtie':
      return (
        <BowTiePlayer
          item={item}
          response={response as Extract<NgnResponse, { kind: 'bowtie' }>}
          onChange={onChange}
          checked={checked}
        />
      );
    case 'matrix':
      return (
        <MatrixPlayer
          item={item}
          response={response as Extract<NgnResponse, { kind: 'matrix' }>}
          onChange={onChange}
          checked={checked}
        />
      );
    case 'cloze':
      return (
        <ClozePlayer
          item={item}
          response={response as Extract<NgnResponse, { kind: 'cloze' }>}
          onChange={onChange}
          checked={checked}
        />
      );
    case 'highlight':
      return (
        <HighlightPlayer
          item={item}
          response={response as Extract<NgnResponse, { kind: 'highlight' }>}
          onChange={onChange}
          checked={checked}
        />
      );
    case 'dragdrop':
      return (
        <DragDropPlayer
          item={item}
          response={response as Extract<NgnResponse, { kind: 'dragdrop' }>}
          onChange={onChange}
          checked={checked}
        />
      );
    case 'multi-response':
    default:
      return (
        <MultiResponsePlayer
          item={item}
          response={response as Extract<NgnResponse, { kind: 'multi-response' }>}
          onChange={onChange}
          checked={checked}
        />
      );
  }
};

export default NgnPlayer;
