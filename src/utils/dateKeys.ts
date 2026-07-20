// Canonical "day" key used by streaks and the Study Activity heat-map.
//
// These must all agree on what a day is, otherwise the streak count and the
// heat-map/week-dots can disagree at day boundaries. We key on the *local*
// calendar day (not UTC via toISOString, which shifts the date for users in
// positive-UTC-offset timezones and made the two features drift apart).

/** "YYYY-MM-DD" for the local calendar day of `d` (defaults to now). */
export const toDayKey = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
