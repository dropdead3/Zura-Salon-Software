/**
 * Timezone-safe helpers for schedule components.
 *
 * The database stores naive strings (YYYY-MM-DD, HH:mm) — no conversion needed.
 * These helpers answer "what is NOW in the org's timezone?" so the schedule
 * renders correctly even when the user's browser is in a different timezone.
 *
 * IMPORTANT: We intentionally do NOT expose a fake Date object.
 * Leaking a "shifted" Date into date-fns comparisons with real Dates produces wrong results.
 * Instead we expose primitive values (string, number) that are safe to compare against DB strings.
 */

import { format } from 'date-fns';

/**
 * Extract year/month/day/hour/minute/second in a given IANA timezone.
 */
function getOrgParts(timezone: string, instant: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map(({ type, value }) => [type, value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24, // Intl may return 24 for midnight
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/**
 * Returns today's date as `YYYY-MM-DD` in the org timezone.
 */
export function getOrgToday(timezone: string): string {
  const p = getOrgParts(timezone);
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/**
 * Returns current minutes since midnight in the org timezone.
 * Used for the current-time indicator line and late check-in detection.
 */
export function orgNowMinutes(timezone: string): number {
  const p = getOrgParts(timezone);
  return p.hour * 60 + p.minute;
}

/**
 * Checks whether a given date (Date object or YYYY-MM-DD string) is "today"
 * in the org's timezone.
 */
export function isOrgToday(date: Date | string, timezone: string): boolean {
  const todayStr = getOrgToday(timezone);
  const dateStr = typeof date === 'string'
    ? date.slice(0, 10) // handle both YYYY-MM-DD and ISO strings
    : format(date, 'yyyy-MM-dd');
  return dateStr === todayStr;
}

/**
 * Checks whether a given date is "tomorrow" in the org's timezone.
 */
export function isOrgTomorrow(date: Date | string, timezone: string): boolean {
  const p = getOrgParts(timezone);
  // Construct a Date for org-today at noon (avoids DST edge), add 1 day
  const orgTodayNoon = new Date(p.year, p.month - 1, p.day, 12, 0, 0);
  const tomorrowNoon = new Date(orgTodayNoon);
  tomorrowNoon.setDate(tomorrowNoon.getDate() + 1);
  const tomorrowStr = format(tomorrowNoon, 'yyyy-MM-dd');

  const dateStr = typeof date === 'string'
    ? date.slice(0, 10)
    : format(date, 'yyyy-MM-dd');
  return dateStr === tomorrowStr;
}

/**
 * Returns a Date object representing "today at midnight" in the org's timezone,
 * constructed via local parts. Use ONLY for generating quick-date arrays
 * (addDays(orgTodayDate, i)), never for time comparisons.
 */
export function getOrgTodayDate(timezone: string): Date {
  const p = getOrgParts(timezone);
  return new Date(p.year, p.month - 1, p.day, 0, 0, 0, 0);
}

/**
 * Returns the signed integer day offset between the given date and "today"
 * in the org's timezone. Negative = past, 0 = today, positive = future.
 *
 * Uses noon anchors on both sides to avoid DST edge errors.
 */
export function getOrgDayOffset(date: Date | string, timezone: string): number {
  const p = getOrgParts(timezone);
  const orgTodayNoon = new Date(p.year, p.month - 1, p.day, 12, 0, 0);

  let target: Date;
  if (typeof date === 'string') {
    const ymd = date.slice(0, 10).split('-').map(Number);
    target = new Date(ymd[0], (ymd[1] ?? 1) - 1, ymd[2] ?? 1, 12, 0, 0);
  } else {
    target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - orgTodayNoon.getTime()) / msPerDay);
}

/**
 * Converts an org-local YYYY-MM-DD date + HH:mm:ss.SSS time of day
 * into the corresponding UTC instant (ISO string).
 *
 * Uses Intl.DateTimeFormat to derive the timezone offset for the given date
 * (DST-correct). Avoids pulling in date-fns-tz.
 */
function zonedDayTimeToUtcIso(ymd: string, hms: string, timezone: string): string {
  const [Y, M, D] = ymd.split('-').map(Number);
  const [h, m, sFull] = hms.split(':');
  const [secStr, msStr] = (sFull ?? '0').split('.');
  const H = Number(h);
  const Mi = Number(m);
  const S = Number(secStr) || 0;
  const Ms = Number(msStr ?? 0) || 0;

  // Treat the wall-clock time as if it were UTC, then correct by the tz offset
  // for that exact instant. Two-pass to handle DST cleanly at midnight boundaries.
  const guess = Date.UTC(Y, (M ?? 1) - 1, D ?? 1, H, Mi, S, Ms);
  const offset1 = getTimezoneOffsetMs(timezone, new Date(guess));
  const adjusted = guess - offset1;
  const offset2 = getTimezoneOffsetMs(timezone, new Date(adjusted));
  return new Date(guess - offset2).toISOString();
}

/**
 * Returns the timezone's offset from UTC (in ms) at the given instant.
 * Positive when the zone is ahead of UTC.
 */
function getTimezoneOffsetMs(timezone: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(instant).map(({ type, value }) => [type, value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

/**
 * Returns the UTC ISO bounds of an org-local date range.
 * `dateFrom` and `dateTo` are YYYY-MM-DD strings interpreted in the org timezone.
 *
 * Use these bounds when filtering `timestamptz` columns (e.g. `transaction_date`)
 * so that yesterday-evening UTC drift cannot leak into today's window.
 */
export function toOrgDayBounds(
  dateFrom: string,
  dateTo: string,
  timezone: string,
): { startUtc: string; endUtc: string } {
  return {
    startUtc: zonedDayTimeToUtcIso(dateFrom.slice(0, 10), '00:00:00.000', timezone),
    endUtc: zonedDayTimeToUtcIso(dateTo.slice(0, 10), '23:59:59.999', timezone),
  };
}
