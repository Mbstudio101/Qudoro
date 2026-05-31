// Helpers for reconciling persisted state across storage backends.
//
// IndexedDB is partitioned per origin, so the dev server (http://localhost:5173)
// and the packaged app (file://) see different IndexedDB databases. electron-store
// is a single origin-independent file and acts as the shared source of truth. On
// read we gather every available copy and pick the freshest one, so dev and the
// packaged app converge on the same data instead of each showing its own origin's
// (possibly empty) store.

export interface PersistMeta {
  savedAt: number; // ms epoch of the last write; 0 for legacy data without meta
  qCount: number;  // number of questions in the snapshot, used as a tie-breaker
}

/** Count questions inside a persisted zustand value (`{ state, version }`). */
export const questionCountOf = (jsonValue: string): number => {
  try {
    const parsed = JSON.parse(jsonValue);
    const state = parsed?.state ?? parsed;
    return Array.isArray(state?.questions) ? state.questions.length : 0;
  } catch {
    return 0;
  }
};

/** Parse a stored meta blob, falling back to inferring qCount from the value. */
export const parsePersistMeta = (raw: unknown, fallbackValue: string): PersistMeta => {
  if (typeof raw === 'string' && raw) {
    try {
      const m = JSON.parse(raw);
      if (m && typeof m.savedAt === 'number') {
        return {
          savedAt: m.savedAt,
          qCount: typeof m.qCount === 'number' ? m.qCount : questionCountOf(fallbackValue),
        };
      }
    } catch {
      /* fall through to legacy handling */
    }
  }
  // Legacy data written before meta existed: unknown age, infer richness.
  return { savedAt: 0, qCount: questionCountOf(fallbackValue) };
};

export interface PersistCandidate {
  source: string;
  value: string;
  meta: PersistMeta;
}

/**
 * Choose the best persisted copy.
 *
 * An empty snapshot must never override one that still has questions — otherwise
 * a fresh/empty origin (e.g. the dev server's separate IndexedDB) writing an
 * empty state with a newer timestamp could wipe real data. So we first restrict
 * to copies that actually contain questions, and only fall back to plain recency
 * when every copy is empty. Among non-empty copies, the freshest wins (which
 * still respects normal edits and partial deletions), tie-broken toward more
 * questions.
 *
 * Trade-off: deleting *all* questions won't propagate across origins while a
 * stale copy still holds some — an acceptable, rare edge versus the much worse
 * risk of silently losing a populated library.
 */
export const pickBestCandidate = (candidates: PersistCandidate[]): PersistCandidate | null => {
  if (candidates.length === 0) return null;
  const withData = candidates.filter((c) => c.meta.qCount > 0);
  const pool = withData.length > 0 ? withData : candidates;
  return [...pool].sort(
    (a, b) => (b.meta.savedAt - a.meta.savedAt) || (b.meta.qCount - a.meta.qCount),
  )[0];
};
