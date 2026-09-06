/**
 * formatHours — turns a raw hours figure from the forecast API into a
 * reader-friendly duration. Precision intentionally drops as the figure
 * grows: nobody needs "349.4 days", and showing that much false precision
 * on a linear-regression projection is misleading, not more informative.
 */
export function formatHours(hours) {
  if (hours == null) return null;
  if (hours < 1) return 'under an hour';
  if (hours < 36) return `~${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 14) return `~${Math.round(days * 2) / 2} day${days >= 1.5 ? 's' : ''}`;
  const weeks = days / 7;
  return `~${Math.round(weeks)} week${weeks >= 1.5 ? 's' : ''}`;
}
