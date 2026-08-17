import React from 'react';
import { FileText, ClipboardList, NotebookPen, Activity, FlaskConical, User, ShieldAlert } from 'lucide-react';
import { EhrChart, EhrTabId, EhrFlag, EHR_TABS, EHR_TAB_LABELS } from '../../types/ngn';

const TAB_ICONS: Record<EhrTabId, React.ReactNode> = {
  hp: <FileText className="h-3.5 w-3.5" />,
  orders: <ClipboardList className="h-3.5 w-3.5" />,
  notes: <NotebookPen className="h-3.5 w-3.5" />,
  flowsheets: <Activity className="h-3.5 w-3.5" />,
  labs: <FlaskConical className="h-3.5 w-3.5" />,
};

const SHORT_LABELS: Record<EhrTabId, string> = {
  hp: 'H&P',
  orders: 'Orders',
  notes: 'Notes',
  flowsheets: 'Flowsheets',
  labs: 'Labs',
};

const FLAG_STYLES: Record<EhrFlag, { chip: string; mark: string }> = {
  normal: { chip: 'text-muted-foreground', mark: '' },
  high: { chip: 'text-amber-600 dark:text-amber-400 font-semibold', mark: 'H' },
  low: { chip: 'text-sky-600 dark:text-sky-400 font-semibold', mark: 'L' },
  critical: { chip: 'text-red-600 dark:text-red-400 font-bold', mark: '!' },
};

/** How much content each tab actually has — drives the little count badges. */
const tabCount = (chart: EhrChart, tab: EhrTabId): number => {
  switch (tab) {
    case 'hp':
      return chart.hp.trim() ? 1 : 0;
    case 'orders':
      return chart.orders.length;
    case 'notes':
      return chart.notes.length;
    case 'flowsheets':
      return chart.flowsheets.rows.length;
    case 'labs':
      return chart.labs.length;
    default:
      return 0;
  }
};

const EmptyTab = ({ label }: { label: string }) => (
  <div className="flex h-full min-h-[140px] items-center justify-center px-6 text-center">
    <p className="text-xs text-muted-foreground">No {label.toLowerCase()} documented for this client.</p>
  </div>
);

const Timeline = ({
  entries,
  showAuthor,
}: {
  entries: EhrChart['orders'];
  showAuthor: boolean;
}) => (
  <ol className="relative space-y-4 pl-5">
    <span className="absolute left-1.5 top-1.5 bottom-1.5 w-px bg-border" aria-hidden="true" />
    {entries.map((entry) => (
      <li key={entry.id} className="relative">
        <span className="absolute -left-[15px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {entry.timestamp && (
            <span className="font-mono text-xs font-semibold text-primary">{entry.timestamp}</span>
          )}
          {showAuthor && entry.author && (
            <span className="text-[11px] text-muted-foreground">{entry.author}</span>
          )}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>
      </li>
    ))}
  </ol>
);

interface EhrChartViewerProps {
  chart: EhrChart;
  /** Compact mode trims padding for side-by-side use next to a question. */
  compact?: boolean;
  className?: string;
}

const EhrChartViewer = ({ chart, compact = false, className = '' }: EhrChartViewerProps) => {
  // Open on the first tab that actually has content so the learner never lands
  // on an empty pane.
  const [active, setActive] = React.useState<EhrTabId>(
    () => EHR_TABS.find((t) => tabCount(chart, t) > 0) || 'hp',
  );

  const patient = chart.patient;
  const hasBanner =
    patient.name || patient.age || patient.sex || patient.mrn || patient.allergies || patient.codeStatus;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm ${className}`}
    >
      {/* Patient banner */}
      {hasBanner && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/60 bg-linear-to-r from-primary/10 via-primary/5 to-transparent px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              <User className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold">{patient.name || 'Client'}</span>
          </div>
          {[patient.age, patient.sex].filter(Boolean).length > 0 && (
            <span className="text-xs text-muted-foreground">
              {[patient.age, patient.sex].filter(Boolean).join(' · ')}
            </span>
          )}
          {patient.mrn && (
            <span className="font-mono text-[11px] text-muted-foreground">MRN {patient.mrn}</span>
          )}
          {patient.allergies && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
              <ShieldAlert className="h-3 w-3" />
              {patient.allergies}
            </span>
          )}
          {patient.codeStatus && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
              {patient.codeStatus}
            </span>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div
        className="flex gap-1 overflow-x-auto border-b border-border/60 bg-secondary/20 px-2 py-1.5"
        role="tablist"
        aria-label="Electronic health record"
      >
        {EHR_TABS.map((tab) => {
          const count = tabCount(chart, tab);
          const isActive = active === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab)}
              title={EHR_TAB_LABELS[tab]}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
              }`}
            >
              {TAB_ICONS[tab]}
              {SHORT_LABELS[tab]}
              {count > 1 && (
                <span
                  className={`rounded-full px-1.5 text-[10px] leading-4 ${
                    isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <div
        role="tabpanel"
        className={`overflow-y-auto ${compact ? 'max-h-[38vh] p-4' : 'max-h-[52vh] p-5'}`}
      >
        {active === 'hp' &&
          (chart.hp.trim() ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{chart.hp}</div>
          ) : (
            <EmptyTab label="History & Physical" />
          ))}

        {active === 'orders' &&
          (chart.orders.length ? <Timeline entries={chart.orders} showAuthor /> : <EmptyTab label="Orders" />)}

        {active === 'notes' &&
          (chart.notes.length ? (
            <Timeline entries={chart.notes} showAuthor />
          ) : (
            <EmptyTab label="Nurses' notes" />
          ))}

        {active === 'flowsheets' &&
          (chart.flowsheets.rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 text-left font-medium">Measure</th>
                    {chart.flowsheets.columns.map((c, i) => (
                      <th key={i} className="px-3 py-2 text-right font-mono font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chart.flowsheets.rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2 pr-3 font-medium">{row.label}</td>
                      {chart.flowsheets.columns.map((_, i) => (
                        <td key={i} className="px-3 py-2 text-right font-mono tabular-nums">
                          {row.values[i] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyTab label="Flowsheets" />
          ))}

        {active === 'labs' &&
          (chart.labs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 text-left font-medium">Laboratory Test</th>
                    <th className="px-3 py-2 text-right font-medium">Result</th>
                    <th className="py-2 pl-3 text-right font-medium">Reference Range</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.labs.map((row) => {
                    const style = FLAG_STYLES[row.flag] || FLAG_STYLES.normal;
                    return (
                      <tr key={row.id} className="border-b border-border/30 last:border-0">
                        <td className="py-2 pr-3 font-medium">{row.test}</td>
                        <td className={`px-3 py-2 text-right font-mono tabular-nums ${style.chip}`}>
                          {row.result}
                          {style.mark && <span className="ml-1 text-[10px]">{style.mark}</span>}
                        </td>
                        <td className="py-2 pl-3 text-right font-mono text-xs text-muted-foreground">
                          {row.reference || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyTab label="Laboratory results" />
          ))}
      </div>
    </div>
  );
};

export default EhrChartViewer;
