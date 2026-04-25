/**
 * US federal + commonly-observed retail holiday presets.
 *
 * Doctrine: this is a *preset*, not a calendar source of truth. Operators
 * can edit / remove any entry after loading. We compute the dates dynamically
 * (n-th weekday rules) so the loader stays correct year over year without a
 * hardcoded table that decays.
 *
 * Floating rules supported:
 *   - nthWeekdayOfMonth(year, month, weekday, n) — e.g. 3rd Monday of January
 *   - lastWeekdayOfMonth(year, month, weekday) — e.g. last Monday of May
 */

export interface HolidayPreset {
  date: string; // yyyy-MM-dd
  name: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fmt(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Returns the date of the n-th occurrence of `weekday` (0=Sun..6=Sat) in `month` (1..12). */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): string {
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return fmt(year, month, day);
}

/** Returns the date of the last `weekday` (0=Sun..6=Sat) in `month` (1..12). */
function lastWeekdayOfMonth(year: number, month: number, weekday: number): string {
  // Day 0 of next month = last day of current month
  const last = new Date(year, month, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return fmt(year, month, last.getDate() - offset);
}

/**
 * Generate the standard US holiday closure list for a given year. Operators
 * typically *don't* close on every federal holiday (e.g. salons stay open
 * Columbus / Presidents' Day) — this list is the conservative "common
 * salon-industry closures" set rather than every federal day.
 */
export function getUSHolidayPresets(year: number): HolidayPreset[] {
  return [
    { date: fmt(year, 1, 1), name: "New Year's Day" },
    // Memorial Day — last Monday of May
    { date: lastWeekdayOfMonth(year, 5, 1), name: 'Memorial Day' },
    { date: fmt(year, 7, 4), name: 'Independence Day' },
    // Labor Day — 1st Monday of September
    { date: nthWeekdayOfMonth(year, 9, 1, 1), name: 'Labor Day' },
    // Thanksgiving — 4th Thursday of November
    { date: nthWeekdayOfMonth(year, 11, 4, 4), name: 'Thanksgiving Day' },
    { date: fmt(year, 12, 24), name: 'Christmas Eve' },
    { date: fmt(year, 12, 25), name: 'Christmas Day' },
    { date: fmt(year, 12, 31), name: "New Year's Eve" },
  ];
}
