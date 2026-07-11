// =============================================================================
// tests/utils/dateUtils.ts
// Travel date computation utilities
// =============================================================================

export type MonthAbbr =
  | 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun'
  | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec';

const MONTHS: MonthAbbr[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ─── Core Helpers ─────────────────────────────────────────────────────────────

/** Add `n` days to a given base date */
function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

/** Format a Date → "DD Mon YYYY"  e.g. "15 Jun 2026" */
export function formatDisplay(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format a Date → "DD-Mon-YYYY"  e.g. "15-Jun-2026" */
export function formatHyphen(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

/** Format a Date → ISO "YYYY-MM-DD"  e.g. "2026-06-15" */
export function formatISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Format a Date → "DD/MM/YYYY"  e.g. "15/06/2026" */
export function formatSlash(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// ─── Travel Date Generators ───────────────────────────────────────────────────

/**
 * Travel date `n` days from today.
 * Returns multiple format strings for maximum selector compatibility.
 */
export function getTravelDate(offsetDays = 5): {
  display:  string;   // "15 Jun 2026"
  hyphen:   string;   // "15-Jun-2026"
  iso:      string;   // "2026-06-15"
  slash:    string;   // "15/06/2026"
  date:     Date;
} {
  const d = addDays(new Date(), offsetDays);
  return {
    display: formatDisplay(d),
    hyphen:  formatHyphen(d),
    iso:     formatISO(d),
    slash:   formatSlash(d),
    date:    d,
  };
}

/** Journey date — 5 days from today (default) */
export const journeyDate = getTravelDate(5);

/** Return date — for round-trip, 7 days from today */
export const returnDate = getTravelDate(7);

/** Hotel check-in — 3 days from today */
export const hotelCheckIn = getTravelDate(3);

/** Hotel check-out — 5 days from today */
export const hotelCheckOut = getTravelDate(5);

/** Weekend travel: next Saturday */
export function nextSaturday(): Date {
  const d    = new Date();
  const day  = d.getDay();   // 0=Sun … 6=Sat
  const diff = day === 6 ? 7 : (6 - day);
  return addDays(d, diff);
}

/** Next working day (Mon–Fri) */
export function nextWorkingDay(): Date {
  let d = addDays(new Date(), 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d = addDays(d, 1);
  }
  return d;
}

/** Random future date between minDays and maxDays from today */
export function randomFutureDate(minDays = 3, maxDays = 30): Date {
  const offset = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
  return addDays(new Date(), offset);
}

/** Check if a date string is in the past */
export function isDateInPast(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

/** Days between two dates */
export function daysBetween(a: Date, b: Date): number {
  return Math.abs(Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

/** Format month name from month index (0-based) */
export function monthName(index: number): MonthAbbr {
  return MONTHS[index % 12];
}
