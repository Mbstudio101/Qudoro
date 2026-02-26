// Centralized localStorage / sessionStorage key constants.
// Import from here rather than using raw string literals in page files.

// ── Auth ─────────────────────────────────────────────────────────────────────
export const REMEMBER_ME_KEY   = 'qudoro-remember-me';
export const LOGIN_GUARD_KEY   = 'qudoro-login-guard-v1';

// ── Questions draft ───────────────────────────────────────────────────────────
/** Dynamic key — call as draftKey(activeProfileId ?? 'default') */
export const draftKey = (profileId: string) => `qudoro-draft-sb-${profileId}`;

// ── Marketplace / Discover ────────────────────────────────────────────────────
export const DISCOVER_BOOKMARKS_KEY  = 'qudoro-discover-bookmarks-v1';
export const DISCOVER_FOLLOWING_KEY  = 'qudoro-discover-following-v1';
export const DISCOVER_REVIEWS_KEY    = 'qudoro-discover-my-reviews-v1';
export const MARKETPLACE_LINKS_KEY   = 'qudoro-imported-set-links-v1';
