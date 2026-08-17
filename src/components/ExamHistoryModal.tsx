import React from 'react';
import Modal from './ui/Modal';
import { ExamHistory } from '../utils/examHistory';
import { TrendingUp, TrendingDown, Minus, History } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface ExamHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  history: ExamHistory;
}

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const StatTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
    <p className="text-lg font-bold leading-none">{value}</p>
    <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
  </div>
);

const ExamHistoryModal = ({ isOpen, onClose, title, history }: ExamHistoryModalProps) => {
  const { attempts, latest, best, averagePct, delta } = history;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${title} — Score History`} maxWidth="max-w-2xl">
      {attempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
          <History className="h-8 w-8 opacity-60" />
          <p className="text-sm">
            No attempts yet. Complete this exam to start tracking your progress over time.
          </p>
        </div>
      ) : (
        <div className="space-y-5 py-1">
          {/* Improvement banner (needs at least two attempts) */}
          {delta !== null && (
            <div
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
                delta > 0
                  ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                  : delta < 0
                  ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'border-border bg-secondary/40 text-muted-foreground'
              }`}
            >
              {delta > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Up {delta}% from your last attempt — nice improvement!
                </>
              ) : delta < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4" />
                  Down {Math.abs(delta)}% from your last attempt — worth another review.
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4" />
                  Same score as your last attempt.
                </>
              )}
            </div>
          )}

          {/* Summary tiles */}
          <div className="grid grid-cols-4 gap-3">
            <StatTile label="Latest" value={latest ? `${latest.pct}%` : '—'} />
            <StatTile label="Best" value={best ? `${best.pct}%` : '—'} />
            <StatTile label="Average" value={`${averagePct}%`} />
            <StatTile label="Attempts" value={`${attempts.length}`} />
          </div>

          {/* Score-over-time chart (line needs 2+ points to be meaningful) */}
          {attempts.length > 1 ? (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <LineChart data={attempts} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="index"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(i) => `#${i}`}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, _name, item) => {
                      const a = item?.payload as { score: number; total: number } | undefined;
                      return [`${value}%${a ? ` (${a.score}/${a.total})` : ''}`, 'Score'];
                    }}
                    labelFormatter={(i, payload) => {
                      const a = payload?.[0]?.payload as { date: number } | undefined;
                      return a ? `Attempt #${i} · ${fmtDate(a.date)}` : `Attempt #${i}`;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-center text-sm text-muted-foreground">
              Take this exam again to see your progress trend over time.
            </p>
          )}

          {/* Attempt log (most recent first) */}
          <div className="max-h-40 overflow-y-auto rounded-xl border border-border">
            {[...attempts].reverse().map((a) => (
              <div
                key={a.index}
                className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-sm last:border-b-0"
              >
                <span className="text-muted-foreground">
                  Attempt #{a.index} · {fmtDate(a.date)}
                </span>
                <span className="font-medium">
                  {a.pct}% <span className="text-muted-foreground">({a.score}/{a.total})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ExamHistoryModal;
