/**
 * sumBedTotals — the one function that turns a hospital's per-type bed
 * records (one row per ICU/General/Emergency, each with total/available/
 * occupied/cleaning counts) into hospital-wide totals.
 *
 * Every screen that shows a bed count (the welcome banner, the Beds page
 * KPIs, per-type cards) must call this instead of writing its own reduce —
 * that's what guarantees they can never silently disagree.
 *
 * Note: total == available + occupied + cleaning. If a screen only shows
 * "available" and "total", the remainder is occupied *plus* cleaning, not
 * just occupied — that's the arithmetic that trips people up when eyeballing
 * numbers across screens, so always show all four together where possible.
 */
export function sumBedTotals(beds) {
  return (beds || []).reduce(
    (acc, b) => ({
      total: acc.total + (b.total || 0),
      available: acc.available + (b.available || 0),
      occupied: acc.occupied + (b.occupied || 0),
      cleaning: acc.cleaning + (b.cleaning || 0),
    }),
    { total: 0, available: 0, occupied: 0, cleaning: 0 }
  );
}

export function occupancyPct(totals) {
  return totals.total ? Math.round((totals.occupied / totals.total) * 100) : 0;
}
