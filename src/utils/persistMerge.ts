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
  qCount: number;  // number of questions in the snapshot
  sCount: number;  // number of exam sets in the snapshot
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

/** Count exam sets inside a persisted zustand value (`{ state, version }`). */
export const setCountOf = (jsonValue: string): number => {
  try {
    const parsed = JSON.parse(jsonValue);
    const state = parsed?.state ?? parsed;
    return Array.isArray(state?.sets) ? state.sets.length : 0;
  } catch {
    return 0;
  }
};

/**
 * Total user content in a snapshot — questions plus exam sets. Used to judge how
 * "rich" a copy is so reconciliation never trades a fuller library for an emptier
 * one. Counting sets (not just questions) means a newly created exam can't be
 * silently dropped by a copy that happens to carry the same question count.
 */
export const richnessOf = (meta: PersistMeta): number => meta.qCount + meta.sCount;

/** Parse a stored meta blob, falling back to inferring qCount from the value. */
export const parsePersistMeta = (raw: unknown, fallbackValue: string): PersistMeta => {
  if (typeof raw === 'string' && raw) {
    try {
      const m = JSON.parse(raw);
      if (m && typeof m.savedAt === 'number') {
        return {
          savedAt: m.savedAt,
          qCount: typeof m.qCount === 'number' ? m.qCount : questionCountOf(fallbackValue),
          // sCount was added later; older meta blobs lack it, so infer from value.
          sCount: typeof m.sCount === 'number' ? m.sCount : setCountOf(fallbackValue),
        };
      }
    } catch {
      /* fall through to legacy handling */
    }
  }
  // Legacy data written before meta existed: unknown age, infer richness.
  return { savedAt: 0, qCount: questionCountOf(fallbackValue), sCount: setCountOf(fallbackValue) };
};

export interface PersistCandidate {
  source: string;
  value: string;
  meta: PersistMeta;
}

// A copy may win on recency only if it keeps at least this fraction of the
// richest copy's content. This treats normal edits (including deleting a handful
// of items) as legitimate while refusing to let a much smaller — usually stale —
// snapshot overwrite a populated library just because it carries a newer
// timestamp. e.g. a 59-item copy can never beat a 109-item one here (59 < 98),
// which is exactly the case that previously wiped the library.
const RICHNESS_RETAIN_RATIO = 0.9;

/**
 * Choose the best persisted copy.
 *
 * Richness (questions + exam sets) is the primary guard: an empty or much
 * smaller snapshot must never override a fuller one — otherwise a fresh/empty
 * origin (e.g. the dev server's separate IndexedDB) or a stale shared/cloud copy
 * writing with a newer timestamp could wipe real data. So we first restrict to
 * copies that actually contain data, then to copies that retain most of the
 * richest copy's content, and only among those does the freshest win (which
 * still respects normal edits and small deletions), tie-broken toward more data.
 *
 * Trade-off: deleting a *large* fraction of your library won't propagate across
 * origins while a stale fuller copy still exists — an acceptable, rare edge
 * versus the much worse risk of silently losing a populated library.
 */
export const pickBestCandidate = (candidates: PersistCandidate[]): PersistCandidate | null => {
  if (candidates.length === 0) return null;
  const withData = candidates.filter((c) => richnessOf(c.meta) > 0);
  const pool = withData.length > 0 ? withData : candidates;

  const richest = Math.max(...pool.map((c) => richnessOf(c.meta)));
  const threshold = richest * RICHNESS_RETAIN_RATIO;
  const eligible = pool.filter((c) => richnessOf(c.meta) >= threshold);

  return [...eligible].sort(
    (a, b) => (b.meta.savedAt - a.meta.savedAt) || (richnessOf(b.meta) - richnessOf(a.meta)),
  )[0];
};
