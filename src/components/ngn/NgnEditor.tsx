import React from 'react';
import { Plus, Trash2, Star, Columns3, Rows3, Wand2, Eye, EyeOff, MousePointerClick, AlertTriangle, Info } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import {
  NgnItem,
  NgnBowTie,
  NgnMatrix,
  NgnCloze,
  NgnHighlight,
  NgnDragDrop,
  NgnMultiResponse,
  NgnScoring,
  NgnToken,
  newToken,
  newId,
  ngnKindMeta,
} from '../../types/ngn';
import { splitPassage, clozePlaceholderIndexes } from '../../utils/ngnGrading';
import { validateNgnFull } from '../../utils/itemValidation';

// ── Shared building blocks ─────────────────────────────────────────────────

const Section = ({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-border/60 bg-secondary/10 p-4 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h4 className="text-sm font-semibold leading-tight">{title}</h4>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const CorrectToggle = ({
  active,
  onClick,
  title,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={active}
    className={`shrink-0 rounded-lg p-2 transition-all ${
      active
        ? 'bg-green-500 text-white shadow-sm'
        : 'bg-muted text-muted-foreground hover:bg-muted/70'
    }`}
  >
    <Star className={`h-4 w-4 ${active ? 'fill-current' : ''}`} />
  </button>
);

const IconButton = ({
  onClick,
  title,
  children,
  tone = 'muted',
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  tone?: 'muted' | 'destructive';
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`shrink-0 rounded-lg p-2 transition-colors ${
      tone === 'destructive'
        ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
        : 'text-muted-foreground hover:bg-muted'
    }`}
  >
    {children}
  </button>
);

const AddRowButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <Button
    type="button"
    variant="outline"
    onClick={onClick}
    className="w-full border-dashed py-5 text-sm hover:border-primary/50 hover:bg-muted/30 hover:text-primary"
  >
    <Plus className="mr-2 h-4 w-4" /> {label}
  </Button>
);

const SCORING_LABELS: Record<NgnScoring, string> = {
  partial: 'Partial credit (0/1 per item)',
  'plus-minus': '+/− scoring (wrong picks subtract)',
  'all-or-nothing': 'All or nothing',
};

const ScoringSelect = ({
  value,
  onChange,
  allowed = ['partial', 'plus-minus', 'all-or-nothing'],
}: {
  value: NgnScoring;
  onChange: (v: NgnScoring) => void;
  allowed?: NgnScoring[];
}) => (
  <label className="flex items-center gap-2 text-xs text-muted-foreground">
    Scoring
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as NgnScoring)}
      className="h-9 rounded-lg border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {allowed.map((s) => (
        <option key={s} value={s}>
          {SCORING_LABELS[s]}
        </option>
      ))}
    </select>
  </label>
);

const Segmented = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
}) => (
  <div className="inline-flex rounded-xl border border-border/60 bg-background p-1">
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
          value === opt.value
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {opt.icon}
        {opt.label}
      </button>
    ))}
  </div>
);

/** Editable list of choice tokens with a "this is a correct answer" toggle. */
const TokenColumn = ({
  tokens,
  correctIds,
  limit,
  placeholder,
  onTokensChange,
  onToggleCorrect,
}: {
  tokens: NgnToken[];
  correctIds: string[];
  limit: number;
  placeholder: string;
  onTokensChange: (next: NgnToken[]) => void;
  onToggleCorrect: (id: string) => void;
}) => (
  <div className="space-y-2">
    {tokens.map((t, i) => {
      const isCorrect = correctIds.includes(t.id);
      const atLimit = !isCorrect && limit > 0 && correctIds.length >= limit;
      return (
        <div key={t.id} className="flex items-center gap-2">
          <CorrectToggle
            active={isCorrect}
            onClick={() => {
              if (atLimit) return;
              onToggleCorrect(t.id);
            }}
            title={
              atLimit
                ? `Only ${limit} can be marked correct — unmark another first`
                : isCorrect
                  ? 'Marked correct'
                  : 'Mark as correct'
            }
          />
          <Input
            value={t.text}
            placeholder={`${placeholder} ${i + 1}`}
            onChange={(e) =>
              onTokensChange(tokens.map((x) => (x.id === t.id ? { ...x, text: e.target.value } : x)))
            }
            className={isCorrect ? 'border-green-500/60 ring-1 ring-green-500/20' : ''}
          />
          <IconButton
            tone="destructive"
            title="Remove choice"
            onClick={() => onTokensChange(tokens.filter((x) => x.id !== t.id))}
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      );
    })}
    <AddRowButton onClick={() => onTokensChange([...tokens, newToken()])} label="Add choice" />
  </div>
);

// ── Bow-Tie ────────────────────────────────────────────────────────────────

const BowTieEditor = ({ item, onChange }: { item: NgnBowTie; onChange: (v: NgnBowTie) => void }) => {
  const setSlots = (field: 'actionSlots' | 'parameterSlots', value: number) => {
    const slots = Math.max(1, Math.min(4, value));
    const key = field === 'actionSlots' ? 'correctActions' : 'correctParameters';
    onChange({ ...item, [field]: slots, [key]: item[key].slice(0, slots) } as NgnBowTie);
  };

  const toggle = (key: 'correctActions' | 'correctParameters', id: string) => {
    const current = item[key];
    onChange({
      ...item,
      [key]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    } as NgnBowTie);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Mark the correct answers with the star. Everything else becomes a distractor.
        </p>
        <ScoringSelect value={item.scoring} onChange={(scoring) => onChange({ ...item, scoring })} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Actions to Take"
          hint={`${item.correctActions.length} of ${item.actionSlots} marked`}
          action={
            <Input
              type="number"
              min={1}
              max={4}
              value={item.actionSlots}
              onChange={(e) => setSlots('actionSlots', Number.parseInt(e.target.value, 10) || 1)}
              className="h-9 w-16 text-center"
              title="Number of action slots"
            />
          }
        >
          <Input
            value={item.actionsLabel}
            onChange={(e) => onChange({ ...item, actionsLabel: e.target.value })}
            placeholder="Column heading"
            className="h-9 text-xs"
          />
          <TokenColumn
            tokens={item.actions}
            correctIds={item.correctActions}
            limit={item.actionSlots}
            placeholder="Action"
            onTokensChange={(actions) =>
              onChange({
                ...item,
                actions,
                correctActions: item.correctActions.filter((id) => actions.some((a) => a.id === id)),
              })
            }
            onToggleCorrect={(id) => toggle('correctActions', id)}
          />
        </Section>

        <Section
          title="Condition"
          hint={item.correctCondition ? 'Correct condition marked' : 'Mark one condition'}
        >
          <Input
            value={item.conditionLabel}
            onChange={(e) => onChange({ ...item, conditionLabel: e.target.value })}
            placeholder="Column heading"
            className="h-9 text-xs"
          />
          <TokenColumn
            tokens={item.conditions}
            correctIds={item.correctCondition ? [item.correctCondition] : []}
            limit={1}
            placeholder="Condition"
            onTokensChange={(conditions) =>
              onChange({
                ...item,
                conditions,
                correctCondition: conditions.some((c) => c.id === item.correctCondition)
                  ? item.correctCondition
                  : null,
              })
            }
            onToggleCorrect={(id) =>
              onChange({ ...item, correctCondition: item.correctCondition === id ? null : id })
            }
          />
        </Section>

        <Section
          title="Parameters to Monitor"
          hint={`${item.correctParameters.length} of ${item.parameterSlots} marked`}
          action={
            <Input
              type="number"
              min={1}
              max={4}
              value={item.parameterSlots}
              onChange={(e) => setSlots('parameterSlots', Number.parseInt(e.target.value, 10) || 1)}
              className="h-9 w-16 text-center"
              title="Number of parameter slots"
            />
          }
        >
          <Input
            value={item.parametersLabel}
            onChange={(e) => onChange({ ...item, parametersLabel: e.target.value })}
            placeholder="Column heading"
            className="h-9 text-xs"
          />
          <TokenColumn
            tokens={item.parameters}
            correctIds={item.correctParameters}
            limit={item.parameterSlots}
            placeholder="Parameter"
            onTokensChange={(parameters) =>
              onChange({
                ...item,
                parameters,
                correctParameters: item.correctParameters.filter((id) =>
                  parameters.some((p) => p.id === id),
                ),
              })
            }
            onToggleCorrect={(id) => toggle('correctParameters', id)}
          />
        </Section>
      </div>
    </div>
  );
};

// ── Matrix / Grid ──────────────────────────────────────────────────────────

const MatrixEditor = ({ item, onChange }: { item: NgnMatrix; onChange: (v: NgnMatrix) => void }) => {
  const toggleCell = (rowId: string, col: number) => {
    onChange({
      ...item,
      rows: item.rows.map((r) => {
        if (r.id !== rowId) return r;
        if (item.perRow === 'single') {
          return { ...r, correct: r.correct[0] === col ? [] : [col] };
        }
        return {
          ...r,
          correct: r.correct.includes(col)
            ? r.correct.filter((c) => c !== col)
            : [...r.correct, col].sort((a, b) => a - b),
        };
      }),
    });
  };

  const setColumn = (index: number, text: string) =>
    onChange({ ...item, columns: item.columns.map((c, i) => (i === index ? text : c)) });

  const removeColumn = (index: number) =>
    onChange({
      ...item,
      columns: item.columns.filter((_, i) => i !== index),
      rows: item.rows.map((r) => ({
        ...r,
        correct: r.correct.filter((c) => c !== index).map((c) => (c > index ? c - 1 : c)),
      })),
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={item.perRow}
          onChange={(perRow) =>
            onChange({
              ...item,
              perRow,
              rows: perRow === 'single' ? item.rows.map((r) => ({ ...r, correct: r.correct.slice(0, 1) })) : item.rows,
            })
          }
          options={[
            { value: 'single', label: 'One answer per row' },
            { value: 'multiple', label: 'Multiple per row' },
          ]}
        />
        <ScoringSelect
          value={item.scoring}
          onChange={(scoring) => onChange({ ...item, scoring })}
          allowed={['partial', 'all-or-nothing']}
        />
      </div>

      <Section
        title="Columns"
        hint="These become the choices the learner picks for each row."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...item, columns: [...item.columns, ''] })}
          >
            <Columns3 className="mr-1.5 h-3.5 w-3.5" /> Add column
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Input
            value={item.rowHeader}
            onChange={(e) => onChange({ ...item, rowHeader: e.target.value })}
            placeholder="Row heading (e.g. Client Finding)"
            className="h-9 w-52 text-xs font-medium"
          />
          {item.columns.map((col, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                value={col}
                onChange={(e) => setColumn(i, e.target.value)}
                placeholder={`Column ${i + 1}`}
                className="h-9 w-40 text-xs"
              />
              {item.columns.length > 2 && (
                <IconButton tone="destructive" title="Remove column" onClick={() => removeColumn(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Rows"
        hint="Tap a cell to mark it as the correct answer for that row."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...item, rows: [...item.rows, { id: newId(), text: '', correct: [] }] })}
          >
            <Rows3 className="mr-1.5 h-3.5 w-3.5" /> Add row
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-y-1.5">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-2 text-left font-medium">{item.rowHeader || 'Finding'}</th>
                {item.columns.map((c, i) => (
                  <th key={i} className="px-2 text-center font-medium">
                    {c || `Column ${i + 1}`}
                  </th>
                ))}
                <th className="w-9" />
              </tr>
            </thead>
            <tbody>
              {item.rows.map((row, rIdx) => (
                <tr key={row.id}>
                  <td className="pr-2 align-middle">
                    <Input
                      value={row.text}
                      placeholder={`Finding ${rIdx + 1}`}
                      onChange={(e) =>
                        onChange({
                          ...item,
                          rows: item.rows.map((r) => (r.id === row.id ? { ...r, text: e.target.value } : r)),
                        })
                      }
                      className="h-9 min-w-[180px] text-sm"
                    />
                  </td>
                  {item.columns.map((_, cIdx) => {
                    const on = row.correct.includes(cIdx);
                    return (
                      <td key={cIdx} className="px-1 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => toggleCell(row.id, cIdx)}
                          aria-pressed={on}
                          className={`mx-auto flex h-8 w-8 items-center justify-center transition-all ${
                            item.perRow === 'single' ? 'rounded-full' : 'rounded-lg'
                          } ${
                            on
                              ? 'bg-green-500 text-white shadow-sm'
                              : 'border border-border/70 bg-background hover:border-green-500/50 hover:bg-green-500/10'
                          }`}
                        >
                          {on && <Star className="h-3.5 w-3.5 fill-current" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="align-middle">
                    <IconButton
                      tone="destructive"
                      title="Remove row"
                      onClick={() => onChange({ ...item, rows: item.rows.filter((r) => r.id !== row.id) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};

// ── Drop-Down / Cloze ──────────────────────────────────────────────────────

const ClozeEditor = ({ item, onChange }: { item: NgnCloze; onChange: (v: NgnCloze) => void }) => {
  const templateRef = React.useRef<HTMLTextAreaElement | null>(null);

  const insertBlank = () => {
    const nextNumber = item.blanks.length + 1;
    const marker = `[[${nextNumber}]]`;
    const el = templateRef.current;
    const pos = el ? el.selectionStart : item.template.length;
    const template = `${item.template.slice(0, pos)}${marker}${item.template.slice(pos)}`;
    onChange({
      ...item,
      template,
      blanks: [...item.blanks, { id: newId(), options: ['', ''], correctIndex: 0 }],
    });
  };

  const used = clozePlaceholderIndexes(item.template);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Write the sentence, then drop a menu wherever the learner should choose.
        </p>
        <ScoringSelect
          value={item.scoring}
          onChange={(scoring) => onChange({ ...item, scoring })}
          allowed={['partial', 'all-or-nothing']}
        />
      </div>

      <Section
        title="Sentence"
        hint="Each [[n]] becomes a drop-down menu in the same position."
        action={
          <Button type="button" variant="outline" size="sm" onClick={insertBlank}>
            <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Insert blank
          </Button>
        }
      >
        <Textarea
          ref={templateRef}
          value={item.template}
          onChange={(e) => onChange({ ...item, template: e.target.value })}
          placeholder="The client is most likely experiencing [[1]] as evidenced by [[2]]."
          className="min-h-[110px] text-sm leading-relaxed"
        />
      </Section>

      <div className="space-y-3">
        {item.blanks.map((blank, bIdx) => {
          const orphaned = !used.includes(bIdx + 1);
          return (
            <Section
              key={blank.id}
              title={`Blank ${bIdx + 1}`}
              hint={
                orphaned
                  ? `Not used yet — add [[${bIdx + 1}]] to the sentence.`
                  : 'Star the correct choice.'
              }
              action={
                <IconButton
                  tone="destructive"
                  title="Remove blank"
                  onClick={() => onChange({ ...item, blanks: item.blanks.filter((b) => b.id !== blank.id) })}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              }
            >
              <div className="space-y-2">
                {blank.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <CorrectToggle
                      active={blank.correctIndex === oIdx}
                      title="Mark as the correct choice"
                      onClick={() =>
                        onChange({
                          ...item,
                          blanks: item.blanks.map((b) =>
                            b.id === blank.id ? { ...b, correctIndex: oIdx } : b,
                          ),
                        })
                      }
                    />
                    <Input
                      value={opt}
                      placeholder={`Choice ${oIdx + 1}`}
                      onChange={(e) =>
                        onChange({
                          ...item,
                          blanks: item.blanks.map((b) =>
                            b.id === blank.id
                              ? { ...b, options: b.options.map((o, i) => (i === oIdx ? e.target.value : o)) }
                              : b,
                          ),
                        })
                      }
                      className={blank.correctIndex === oIdx ? 'border-green-500/60 ring-1 ring-green-500/20' : ''}
                    />
                    {blank.options.length > 2 && (
                      <IconButton
                        tone="destructive"
                        title="Remove choice"
                        onClick={() =>
                          onChange({
                            ...item,
                            blanks: item.blanks.map((b) =>
                              b.id === blank.id
                                ? {
                                    ...b,
                                    options: b.options.filter((_, i) => i !== oIdx),
                                    correctIndex:
                                      b.correctIndex > oIdx
                                        ? b.correctIndex - 1
                                        : b.correctIndex === oIdx
                                          ? 0
                                          : b.correctIndex,
                                  }
                                : b,
                            ),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    )}
                  </div>
                ))}
                <AddRowButton
                  label="Add choice"
                  onClick={() =>
                    onChange({
                      ...item,
                      blanks: item.blanks.map((b) =>
                        b.id === blank.id ? { ...b, options: [...b.options, ''] } : b,
                      ),
                    })
                  }
                />
              </div>
            </Section>
          );
        })}
      </div>
    </div>
  );
};

// ── Highlight Text / Table ─────────────────────────────────────────────────

const HighlightEditor = ({
  item,
  onChange,
}: {
  item: NgnHighlight;
  onChange: (v: NgnHighlight) => void;
}) => {
  const resplit = (passage: string, segmentation: NgnHighlight['segmentation']) => {
    const next = splitPassage(passage, segmentation, item.segments);
    onChange({
      ...item,
      passage,
      segmentation,
      segments: next.map((s) => ({ ...s, id: newId() })),
    });
  };

  const cycleCell = (rowId: string, cellId: string) =>
    onChange({
      ...item,
      tableRows: item.tableRows.map((row) =>
        row.id !== rowId
          ? row
          : {
              ...row,
              cells: row.cells.map((c) => {
                if (c.id !== cellId) return c;
                // locked → selectable → selectable + correct → locked
                if (!c.selectable) return { ...c, selectable: true, correct: false };
                if (!c.correct) return { ...c, correct: true };
                return { ...c, selectable: false, correct: false };
              }),
            },
      ),
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={item.variant}
          onChange={(variant) => onChange({ ...item, variant })}
          options={[
            { value: 'text', label: 'Passage' },
            { value: 'table', label: 'Record table' },
          ]}
        />
        <ScoringSelect value={item.scoring} onChange={(scoring) => onChange({ ...item, scoring })} />
      </div>

      {item.variant === 'text' ? (
        <>
          <Section
            title="Clinical passage"
            hint="Paste the nurses' note or record excerpt, then split it into selectable parts."
            action={
              <div className="flex items-center gap-2">
                <select
                  value={item.segmentation}
                  onChange={(e) => resplit(item.passage, e.target.value as NgnHighlight['segmentation'])}
                  className="h-9 rounded-lg border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="sentence">By sentence</option>
                  <option value="line">By line</option>
                  <option value="word">By word</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => resplit(item.passage, item.segmentation)}
                >
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Split
                </Button>
              </div>
            }
          >
            <Textarea
              value={item.passage}
              onChange={(e) => onChange({ ...item, passage: e.target.value })}
              placeholder="1400: Client reports chest tightness. BP 168/94. Denies nausea. Lungs clear bilaterally."
              className="min-h-[120px] text-sm leading-relaxed"
            />
          </Section>

          <Section
            title="Selectable parts"
            hint={`${item.segments.filter((s) => s.correct).length} marked correct — click a part to toggle it.`}
          >
            {item.segments.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Write the passage above, then press <span className="font-medium">Split</span>.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {item.segments.map((seg) => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...item,
                        segments: item.segments.map((s) =>
                          s.id === seg.id ? { ...s, correct: !s.correct } : s,
                        ),
                      })
                    }
                    className={`max-w-full rounded-lg border px-2.5 py-1.5 text-left text-sm transition-all ${
                      seg.correct
                        ? 'border-green-500 bg-green-500/15 text-green-600 dark:text-green-400'
                        : 'border-border/60 bg-background hover:border-primary/40 hover:bg-secondary/40'
                    }`}
                  >
                    {seg.text}
                  </button>
                ))}
              </div>
            )}
          </Section>
        </>
      ) : (
        <Section
          title="Record table"
          hint="Click a cell to cycle: locked → selectable → correct answer."
          action={
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange({
                    ...item,
                    tableColumns: [...item.tableColumns, ''],
                    tableRows: item.tableRows.map((r) => ({
                      ...r,
                      cells: [...r.cells, { id: newId(), text: '', selectable: true, correct: false }],
                    })),
                  })
                }
              >
                <Columns3 className="mr-1.5 h-3.5 w-3.5" /> Column
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange({
                    ...item,
                    tableRows: [
                      ...item.tableRows,
                      {
                        id: newId(),
                        cells: item.tableColumns.map((_, i) => ({
                          id: newId(),
                          text: '',
                          selectable: i > 0,
                          correct: false,
                        })),
                      },
                    ],
                  })
                }
              >
                <Rows3 className="mr-1.5 h-3.5 w-3.5" /> Row
              </Button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-separate border-spacing-1">
              <thead>
                <tr>
                  {item.tableColumns.map((col, i) => (
                    <th key={i} className="px-0">
                      <Input
                        value={col}
                        placeholder={`Column ${i + 1}`}
                        onChange={(e) =>
                          onChange({
                            ...item,
                            tableColumns: item.tableColumns.map((c, ci) => (ci === i ? e.target.value : c)),
                          })
                        }
                        className="h-9 text-xs font-semibold"
                      />
                    </th>
                  ))}
                  <th className="w-9" />
                </tr>
              </thead>
              <tbody>
                {item.tableRows.map((row) => (
                  <tr key={row.id}>
                    {row.cells.map((cell) => (
                      <td key={cell.id} className="align-middle">
                        <div className="flex items-center gap-1">
                          <Input
                            value={cell.text}
                            placeholder="—"
                            onChange={(e) =>
                              onChange({
                                ...item,
                                tableRows: item.tableRows.map((r) =>
                                  r.id !== row.id
                                    ? r
                                    : {
                                        ...r,
                                        cells: r.cells.map((c) =>
                                          c.id === cell.id ? { ...c, text: e.target.value } : c,
                                        ),
                                      },
                                ),
                              })
                            }
                            className={`h-9 text-sm ${
                              cell.correct
                                ? 'border-green-500/60 ring-1 ring-green-500/20'
                                : cell.selectable
                                  ? 'border-primary/40'
                                  : ''
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => cycleCell(row.id, cell.id)}
                            title={
                              cell.correct
                                ? 'Correct answer — click to lock'
                                : cell.selectable
                                  ? 'Selectable — click to mark correct'
                                  : 'Locked — click to make selectable'
                            }
                            className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                              cell.correct
                                ? 'bg-green-500 text-white'
                                : cell.selectable
                                  ? 'bg-primary/15 text-primary'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {cell.correct ? (
                              <Star className="h-3.5 w-3.5 fill-current" />
                            ) : cell.selectable ? (
                              <MousePointerClick className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    ))}
                    <td className="align-middle">
                      <IconButton
                        tone="destructive"
                        title="Remove row"
                        onClick={() =>
                          onChange({ ...item, tableRows: item.tableRows.filter((r) => r.id !== row.id) })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {item.tableRows.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Add a row to start building the record.
            </p>
          )}
        </Section>
      )}
    </div>
  );
};

// ── Extended Drag-and-Drop ─────────────────────────────────────────────────

const DragDropEditor = ({
  item,
  onChange,
}: {
  item: NgnDragDrop;
  onChange: (v: NgnDragDrop) => void;
}) => {
  const zone = item.zones[0];

  const switchVariant = (variant: NgnDragDrop['variant']) => {
    if (variant === item.variant) return;
    onChange({
      ...item,
      variant,
      instructions:
        variant === 'sequence'
          ? 'Place the actions in the order they should be performed.'
          : 'Drag each option into the category where it belongs.',
      zones:
        variant === 'sequence'
          ? [{ id: newId(), label: 'Correct Order', correct: [] }]
          : [
              { id: newId(), label: '', correct: [] },
              { id: newId(), label: '', correct: [] },
            ],
    });
  };

  const setSlot = (slotIndex: number, tokenId: string) => {
    if (!zone) return;
    const correct = [...zone.correct];
    // A token can only occupy one slot — clear it from wherever it was.
    const existing = correct.indexOf(tokenId);
    if (existing >= 0 && existing !== slotIndex) correct[existing] = '';
    correct[slotIndex] = tokenId;
    onChange({ ...item, zones: [{ ...zone, correct }] });
  };

  const usedInAnyZone = (tokenId: string) => item.zones.some((z) => z.correct.includes(tokenId));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={item.variant}
          onChange={switchVariant}
          options={[
            { value: 'sequence', label: 'Order / sequence' },
            { value: 'category', label: 'Categories' },
          ]}
        />
        <ScoringSelect value={item.scoring} onChange={(scoring) => onChange({ ...item, scoring })} />
      </div>

      <Section title="Instructions" hint="Shown above the drag area during practice.">
        <Input
          value={item.instructions}
          onChange={(e) => onChange({ ...item, instructions: e.target.value })}
          placeholder="Place the actions in the order they should be performed."
        />
      </Section>

      <Section
        title="Draggable options"
        hint="Add more options than the answer needs — the extras become leftovers."
      >
        <div className="space-y-2">
          {item.tokens.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                  usedInAnyZone(t.id) ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
                }`}
                title={usedInAnyZone(t.id) ? 'Used in the answer key' : 'Distractor (left over)'}
              >
                {usedInAnyZone(t.id) ? <Star className="h-3.5 w-3.5 fill-current" /> : i + 1}
              </span>
              <Input
                value={t.text}
                placeholder={`Option ${i + 1}`}
                onChange={(e) =>
                  onChange({
                    ...item,
                    tokens: item.tokens.map((x) => (x.id === t.id ? { ...x, text: e.target.value } : x)),
                  })
                }
              />
              <IconButton
                tone="destructive"
                title="Remove option"
                onClick={() =>
                  onChange({
                    ...item,
                    tokens: item.tokens.filter((x) => x.id !== t.id),
                    zones: item.zones.map((z) => ({ ...z, correct: z.correct.filter((id) => id !== t.id) })),
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </div>
          ))}
          <AddRowButton
            label="Add option"
            onClick={() => onChange({ ...item, tokens: [...item.tokens, newToken()] })}
          />
        </div>
      </Section>

      {item.variant === 'sequence' ? (
        <Section
          title="Correct order"
          hint="Pick the option that belongs in each position."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => zone && onChange({ ...item, zones: [{ ...zone, correct: [...zone.correct, ''] }] })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add step
            </Button>
          }
        >
          <div className="space-y-2">
            {(zone?.correct || []).map((tokenId, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                  {idx + 1}
                </span>
                <select
                  value={tokenId}
                  onChange={(e) => setSlot(idx, e.target.value)}
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">— choose an option —</option>
                  {item.tokens.map((t, i) => (
                    <option key={t.id} value={t.id}>
                      {t.text.trim() || `Option ${i + 1}`}
                    </option>
                  ))}
                </select>
                <IconButton
                  tone="destructive"
                  title="Remove step"
                  onClick={() =>
                    zone &&
                    onChange({ ...item, zones: [{ ...zone, correct: zone.correct.filter((_, i) => i !== idx) }] })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            ))}
            {(zone?.correct.length || 0) === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Add a step to start building the sequence.
              </p>
            )}
          </div>
        </Section>
      ) : (
        <Section
          title="Categories"
          hint="Tap the options that belong in each category."
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({ ...item, zones: [...item.zones, { id: newId(), label: '', correct: [] }] })}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add category
            </Button>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {item.zones.map((z, zi) => (
              <div key={z.id} className="rounded-xl border border-border/60 bg-background p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={z.label}
                    placeholder={`Category ${zi + 1}`}
                    onChange={(e) =>
                      onChange({
                        ...item,
                        zones: item.zones.map((x) => (x.id === z.id ? { ...x, label: e.target.value } : x)),
                      })
                    }
                    className="h-9 text-sm font-medium"
                  />
                  {item.zones.length > 1 && (
                    <IconButton
                      tone="destructive"
                      title="Remove category"
                      onClick={() => onChange({ ...item, zones: item.zones.filter((x) => x.id !== z.id) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.tokens
                    .filter((t) => t.text.trim())
                    .map((t) => {
                      const on = z.correct.includes(t.id);
                      const elsewhere = !on && item.zones.some((x) => x.id !== z.id && x.correct.includes(t.id));
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={elsewhere}
                          onClick={() =>
                            onChange({
                              ...item,
                              zones: item.zones.map((x) =>
                                x.id !== z.id
                                  ? x
                                  : {
                                      ...x,
                                      correct: on ? x.correct.filter((id) => id !== t.id) : [...x.correct, t.id],
                                    },
                              ),
                            })
                          }
                          className={`rounded-full border px-2.5 py-1 text-xs transition-all disabled:opacity-30 ${
                            on
                              ? 'border-green-500 bg-green-500/15 text-green-600 dark:text-green-400'
                              : 'border-border/60 hover:border-primary/40 hover:bg-secondary/40'
                          }`}
                          title={elsewhere ? 'Already assigned to another category' : undefined}
                        >
                          {t.text}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

// ── Extended Multiple Response ─────────────────────────────────────────────

const MultiResponseEditor = ({
  item,
  onChange,
}: {
  item: NgnMultiResponse;
  onChange: (v: NgnMultiResponse) => void;
}) => {
  const correctCount = item.options.filter((o) => o.correct).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {correctCount} correct of {item.options.length} options
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Max picks
            <Input
              type="number"
              min={0}
              value={item.maxSelections}
              onChange={(e) =>
                onChange({ ...item, maxSelections: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })
              }
              className="h-9 w-16 text-center"
              title="0 = unlimited"
            />
          </label>
          <ScoringSelect value={item.scoring} onChange={(scoring) => onChange({ ...item, scoring })} />
        </div>
      </div>

      <Section title="Options" hint="Star every option that should count as correct.">
        <div className="space-y-2">
          {item.options.map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-2">
              <CorrectToggle
                active={opt.correct}
                title={opt.correct ? 'Marked correct' : 'Mark as correct'}
                onClick={() =>
                  onChange({
                    ...item,
                    options: item.options.map((o) => (o.id === opt.id ? { ...o, correct: !o.correct } : o)),
                  })
                }
              />
              <Input
                value={opt.text}
                placeholder={`Option ${i + 1}`}
                onChange={(e) =>
                  onChange({
                    ...item,
                    options: item.options.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)),
                  })
                }
                className={opt.correct ? 'border-green-500/60 ring-1 ring-green-500/20' : ''}
              />
              <IconButton
                tone="destructive"
                title="Remove option"
                onClick={() => onChange({ ...item, options: item.options.filter((o) => o.id !== opt.id) })}
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </div>
          ))}
          <AddRowButton
            label="Add option"
            onClick={() =>
              onChange({ ...item, options: [...item.options, { id: newId(), text: '', correct: false }] })
            }
          />
        </div>
      </Section>
    </div>
  );
};

// ── Entry point ────────────────────────────────────────────────────────────

interface NgnEditorProps {
  item: NgnItem;
  onChange: (item: NgnItem) => void;
  onPreview?: () => void;
  previewing?: boolean;
}

const NgnEditor = ({ item, onChange, onPreview, previewing = false }: NgnEditorProps) => {
  const meta = ngnKindMeta(item.kind);
  const findings = validateNgnFull(item);
  const blocking = findings.filter((f) => f.severity === 'error');
  const smells = findings.filter((f) => f.severity === 'warning');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-linear-to-r from-secondary/30 to-transparent px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-1.5 rounded-full bg-linear-to-b ${meta.gradient}`} />
          <div>
            <h3 className="text-sm font-semibold leading-tight">{meta.name}</h3>
            <p className="text-xs text-muted-foreground">{meta.tagline}</p>
          </div>
        </div>
        {onPreview && (
          <Button type="button" variant="outline" size="sm" onClick={onPreview}>
            {previewing ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
            {previewing ? 'Back to editing' : 'Preview'}
          </Button>
        )}
      </div>

      {item.kind === 'bowtie' && <BowTieEditor item={item} onChange={onChange} />}
      {item.kind === 'matrix' && <MatrixEditor item={item} onChange={onChange} />}
      {item.kind === 'cloze' && <ClozeEditor item={item} onChange={onChange} />}
      {item.kind === 'highlight' && <HighlightEditor item={item} onChange={onChange} />}
      {item.kind === 'dragdrop' && <DragDropEditor item={item} onChange={onChange} />}
      {item.kind === 'multi-response' && <MultiResponseEditor item={item} onChange={onChange} />}

      {blocking.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="text-xs">
              <p className="font-medium text-amber-600 dark:text-amber-400">
                Finish these before saving
              </p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {blocking.map((f, i) => (
                  <li key={`${f.code}-${i}`}>• {f.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Quality smells: the item is answerable, but it may not measure anything. */}
      {smells.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-xs">
              <p className="font-medium">Worth a second look</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {smells.map((f, i) => (
                  <li key={`${f.code}-${i}`}>• {f.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NgnEditor;
