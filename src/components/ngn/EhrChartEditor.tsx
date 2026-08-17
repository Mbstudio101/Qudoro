import React from 'react';
import { Plus, Trash2, FileText, ClipboardList, NotebookPen, Activity, FlaskConical } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import {
  EhrChart,
  EhrTabId,
  EhrFlag,
  EhrEntry,
  EHR_TABS,
  createEhrEntry,
  createEhrGridRow,
  createEhrLabRow,
} from '../../types/ngn';

const TAB_ICONS: Record<EhrTabId, React.ReactNode> = {
  hp: <FileText className="h-3.5 w-3.5" />,
  orders: <ClipboardList className="h-3.5 w-3.5" />,
  notes: <NotebookPen className="h-3.5 w-3.5" />,
  flowsheets: <Activity className="h-3.5 w-3.5" />,
  labs: <FlaskConical className="h-3.5 w-3.5" />,
};

const TAB_LABELS: Record<EhrTabId, string> = {
  hp: 'H&P',
  orders: 'Orders',
  notes: 'Notes',
  flowsheets: 'Flowsheets',
  labs: 'Labs',
};

const FLAGS: { value: EhrFlag; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
  { value: 'critical', label: 'Critical' },
];

const RemoveButton = ({ onClick, title }: { onClick: () => void; title: string }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
  >
    <Trash2 className="h-4 w-4" />
  </button>
);

const EntryListEditor = ({
  entries,
  onChange,
  authorPlaceholder,
  bodyPlaceholder,
  addLabel,
}: {
  entries: EhrEntry[];
  onChange: (next: EhrEntry[]) => void;
  authorPlaceholder: string;
  bodyPlaceholder: string;
  addLabel: string;
}) => (
  <div className="space-y-3">
    {entries.map((entry) => (
      <div key={entry.id} className="rounded-xl border border-border/60 bg-background p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={entry.timestamp}
            placeholder="Day 1, 0800"
            onChange={(e) =>
              onChange(entries.map((x) => (x.id === entry.id ? { ...x, timestamp: e.target.value } : x)))
            }
            className="h-9 w-40 font-mono text-xs"
          />
          <Input
            value={entry.author}
            placeholder={authorPlaceholder}
            onChange={(e) =>
              onChange(entries.map((x) => (x.id === entry.id ? { ...x, author: e.target.value } : x)))
            }
            className="h-9 text-xs"
          />
          <RemoveButton title="Remove entry" onClick={() => onChange(entries.filter((x) => x.id !== entry.id))} />
        </div>
        <Textarea
          value={entry.body}
          placeholder={bodyPlaceholder}
          onChange={(e) =>
            onChange(entries.map((x) => (x.id === entry.id ? { ...x, body: e.target.value } : x)))
          }
          className="min-h-[70px] text-sm"
        />
      </div>
    ))}
    <Button
      type="button"
      variant="outline"
      onClick={() => onChange([...entries, createEhrEntry()])}
      className="w-full border-dashed py-5 text-sm hover:border-primary/50 hover:bg-muted/30 hover:text-primary"
    >
      <Plus className="mr-2 h-4 w-4" /> {addLabel}
    </Button>
  </div>
);

interface EhrChartEditorProps {
  chart: EhrChart;
  onChange: (chart: EhrChart) => void;
}

const EhrChartEditor = ({ chart, onChange }: EhrChartEditorProps) => {
  const [active, setActive] = React.useState<EhrTabId>('hp');

  const setPatient = (field: keyof EhrChart['patient'], value: string) =>
    onChange({ ...chart, patient: { ...chart.patient, [field]: value } });

  const setColumn = (index: number, value: string) =>
    onChange({
      ...chart,
      flowsheets: {
        ...chart.flowsheets,
        columns: chart.flowsheets.columns.map((c, i) => (i === index ? value : c)),
      },
    });

  const addColumn = () =>
    onChange({
      ...chart,
      flowsheets: {
        columns: [...chart.flowsheets.columns, ''],
        rows: chart.flowsheets.rows.map((r) => ({ ...r, values: [...r.values, ''] })),
      },
    });

  const removeColumn = (index: number) =>
    onChange({
      ...chart,
      flowsheets: {
        columns: chart.flowsheets.columns.filter((_, i) => i !== index),
        rows: chart.flowsheets.rows.map((r) => ({ ...r, values: r.values.filter((_, i) => i !== index) })),
      },
    });

  return (
    <div className="space-y-4">
      {/* Patient banner fields */}
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            ['name', 'Client name'],
            ['age', 'Age'],
            ['sex', 'Sex'],
            ['mrn', 'MRN'],
            ['allergies', 'Allergies'],
            ['codeStatus', 'Code status'],
          ] as [keyof EhrChart['patient'], string][]
        ).map(([field, placeholder]) => (
          <Input
            key={field}
            value={chart.patient[field]}
            placeholder={placeholder}
            onChange={(e) => setPatient(field, e.target.value)}
            className="h-9 text-xs"
          />
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-secondary/20 p-1.5">
        {EHR_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              active === tab
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
            }`}
          >
            {TAB_ICONS[tab]}
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {active === 'hp' && (
        <Textarea
          value={chart.hp}
          onChange={(e) => onChange({ ...chart, hp: e.target.value })}
          placeholder={
            'History of Present Illness:\n62-year-old client presents to the ED with…\n\nPast Medical History:\n…\n\nPhysical Assessment:\n…'
          }
          className="min-h-[200px] text-sm leading-relaxed"
        />
      )}

      {active === 'orders' && (
        <EntryListEditor
          entries={chart.orders}
          onChange={(orders) => onChange({ ...chart, orders })}
          authorPlaceholder="Ordering provider"
          bodyPlaceholder="0.9% sodium chloride 1,000 mL IV at 125 mL/hr"
          addLabel="Add order"
        />
      )}

      {active === 'notes' && (
        <EntryListEditor
          entries={chart.notes}
          onChange={(notes) => onChange({ ...chart, notes })}
          authorPlaceholder="Author (e.g. RN)"
          bodyPlaceholder="Client reports increasing shortness of breath. Ambulated 20 feet with…"
          addLabel="Add note"
        />
      )}

      {active === 'flowsheets' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Time columns</span>
            {chart.flowsheets.columns.map((col, i) => (
              <div key={i} className="flex items-center gap-1">
                <Input
                  value={col}
                  placeholder={`T${i + 1}`}
                  onChange={(e) => setColumn(i, e.target.value)}
                  className="h-9 w-24 text-center font-mono text-xs"
                />
                {chart.flowsheets.columns.length > 1 && (
                  <RemoveButton title="Remove column" onClick={() => removeColumn(i)} />
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addColumn}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Column
            </Button>
          </div>

          <div className="space-y-2">
            {chart.flowsheets.rows.map((row) => (
              <div key={row.id} className="flex items-center gap-2">
                <Input
                  value={row.label}
                  placeholder="Heart rate"
                  onChange={(e) =>
                    onChange({
                      ...chart,
                      flowsheets: {
                        ...chart.flowsheets,
                        rows: chart.flowsheets.rows.map((r) =>
                          r.id === row.id ? { ...r, label: e.target.value } : r,
                        ),
                      },
                    })
                  }
                  className="h-9 w-44 shrink-0 text-sm"
                />
                {chart.flowsheets.columns.map((_, i) => (
                  <Input
                    key={i}
                    value={row.values[i] || ''}
                    placeholder="—"
                    onChange={(e) =>
                      onChange({
                        ...chart,
                        flowsheets: {
                          ...chart.flowsheets,
                          rows: chart.flowsheets.rows.map((r) =>
                            r.id === row.id
                              ? {
                                  ...r,
                                  values: chart.flowsheets.columns.map((__, vi) =>
                                    vi === i ? e.target.value : r.values[vi] || '',
                                  ),
                                }
                              : r,
                          ),
                        },
                      })
                    }
                    className="h-9 text-center font-mono text-xs"
                  />
                ))}
                <RemoveButton
                  title="Remove row"
                  onClick={() =>
                    onChange({
                      ...chart,
                      flowsheets: {
                        ...chart.flowsheets,
                        rows: chart.flowsheets.rows.filter((r) => r.id !== row.id),
                      },
                    })
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onChange({
                  ...chart,
                  flowsheets: {
                    ...chart.flowsheets,
                    rows: [...chart.flowsheets.rows, createEhrGridRow(chart.flowsheets.columns.length)],
                  },
                })
              }
              className="w-full border-dashed py-5 text-sm hover:border-primary/50 hover:bg-muted/30 hover:text-primary"
            >
              <Plus className="mr-2 h-4 w-4" /> Add measure
            </Button>
          </div>
        </div>
      )}

      {active === 'labs' && (
        <div className="space-y-2">
          {chart.labs.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <Input
                value={row.test}
                placeholder="Potassium"
                onChange={(e) =>
                  onChange({
                    ...chart,
                    labs: chart.labs.map((r) => (r.id === row.id ? { ...r, test: e.target.value } : r)),
                  })
                }
                className="h-9 flex-1 text-sm"
              />
              <Input
                value={row.result}
                placeholder="5.9 mEq/L"
                onChange={(e) =>
                  onChange({
                    ...chart,
                    labs: chart.labs.map((r) => (r.id === row.id ? { ...r, result: e.target.value } : r)),
                  })
                }
                className="h-9 w-32 text-center font-mono text-xs"
              />
              <Input
                value={row.reference}
                placeholder="3.5–5.0 mEq/L"
                onChange={(e) =>
                  onChange({
                    ...chart,
                    labs: chart.labs.map((r) => (r.id === row.id ? { ...r, reference: e.target.value } : r)),
                  })
                }
                className="h-9 w-40 text-center font-mono text-xs"
              />
              <select
                value={row.flag}
                onChange={(e) =>
                  onChange({
                    ...chart,
                    labs: chart.labs.map((r) =>
                      r.id === row.id ? { ...r, flag: e.target.value as EhrFlag } : r,
                    ),
                  })
                }
                className="h-9 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {FLAGS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <RemoveButton
                title="Remove lab"
                onClick={() => onChange({ ...chart, labs: chart.labs.filter((r) => r.id !== row.id) })}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange({ ...chart, labs: [...chart.labs, createEhrLabRow()] })}
            className="w-full border-dashed py-5 text-sm hover:border-primary/50 hover:bg-muted/30 hover:text-primary"
          >
            <Plus className="mr-2 h-4 w-4" /> Add lab result
          </Button>
        </div>
      )}
    </div>
  );
};

export default EhrChartEditor;
