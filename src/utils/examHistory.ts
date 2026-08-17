import { StudySession } from '../store/useStore';

// One completed attempt at an exam set, normalised for display.
export interface ExamAttempt {
  index: number;   // 1-based attempt number, oldest = 1
  date: number;    // timestamp of the attempt
  score: number;   // questions correct
  total: number;   // questions answered
  pct: number;     // rounded percentage 0–100
  duration?: number; // seconds, if recorded
}

// Aggregated score history for a single exam set, plus the summary numbers the
// UI needs to answer "how did I do last time and have I improved?".
export interface ExamHistory {
  attempts: ExamAttempt[];
  latest: ExamAttempt | null;
  previous: ExamAttempt | null;
  best: ExamAttempt | null;
  averagePct: number;
  // latest.pct − previous.pct; null when there isn't a prior attempt to compare.
  delta: number | null;
}

// Build the attempt history for one exam set from the raw sessions array.
// Sessions are filtered to the active profile (mirroring how sets are scoped),
// dropping empty sessions, and sorted oldest → newest so the chart reads left
// to right and "latest"/"previous" are unambiguous.
export function getExamHistory(
  sessions: StudySession[],
  setId: string,
  profileId: string | null,
): ExamHistory {
  const attempts: ExamAttempt[] = sessions
    .filter((s) => s.setId === setId)
    .filter((s) => !s.profileId || !profileId || s.profileId === profileId)
    .filter((s) => s.totalQuestions > 0)
    .sort((a, b) => a.date - b.date)
    .map((s, i) => ({
      index: i + 1,
      date: s.date,
      score: s.score,
      total: s.totalQuestions,
      pct: Math.round((s.score / s.totalQuestions) * 100),
      duration: s.duration,
    }));

  const latest = attempts.length ? attempts[attempts.length - 1] : null;
  const previous = attempts.length > 1 ? attempts[attempts.length - 2] : null;
  const best = attempts.reduce<ExamAttempt | null>(
    (b, a) => (!b || a.pct > b.pct ? a : b),
    null,
  );
  const averagePct = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + a.pct, 0) / attempts.length)
    : 0;
  const delta = latest && previous ? latest.pct - previous.pct : null;

  return { attempts, latest, previous, best, averagePct, delta };
}
