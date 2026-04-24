/**
 * Shared utilization calculator for the Schedule.
 *
 * Doctrine: Clamp at the boundary of meaning, not at the boundary of comfort.
 * — Utilization is reported uncapped (0 to ∞). When a stylist double- or
 *   triple-books the same time slot, the booked-minutes total exceeds the
 *   available minutes and the percentage exceeds 100%. That over-booking
 *   signal is the most operationally important reading on this surface and
 *   must NOT be hidden by a defensive `Math.min(..., 100)`.
 *
 * Returns are intentionally split:
 *   - `computeUtilizationByStylist` returns the legacy `Map<id, number>` shape
 *     (now uncapped) so existing callers compile without changes.
 *   - `computeUtilizationDetailsByStylist` returns the rich shape including
 *     `overbookedMinutes` and `isOverbooked` for surfaces that want to
 *     render the over-booking signal explicitly.
 *
 * Single source of truth — consumed by DayView (column sort + badge),
 * ScheduleHeader (capacity badge + date-picker tier), and aggregate hooks.
 */

import { parseTimeToMinutes } from '@/lib/schedule-utils';

export interface UtilizationAppointment {
  appointment_date: string;
  stylist_user_id?: string | null;
  start_time: string;
  end_time: string;
  status: string;
  service_category?: string | null;
}

export interface UtilizationStylist {
  user_id: string;
}

export interface StylistUtilizationDetails {
  /** Raw utilization percentage (0 to ∞) — NOT clamped at 100. */
  utilization: number;
  /** Booked client minutes for the day. */
  bookedMinutes: number;
  /** Available minutes (denominator). */
  availableMinutes: number;
  /** Minutes booked beyond available capacity. 0 when not over-booked. */
  overbookedMinutes: number;
  /** Convenience flag: utilization > 100. */
  isOverbooked: boolean;
}

const BLOCKED_CATEGORIES = ['Block', 'Break'];
const EXCLUDED_STATUSES = ['cancelled', 'no_show'];

/**
 * Rich per-stylist utilization map. Returns the full details shape, including
 * over-booking signal. Use this for any surface that renders > 100% or wants
 * to badge over-booked stylists.
 */
export function computeUtilizationDetailsByStylist(
  stylists: UtilizationStylist[],
  appointments: UtilizationAppointment[],
  dateStr: string,
  hoursStart: number,
  hoursEnd: number,
): Map<string, StylistUtilizationDetails> {
  const totalAvailable = Math.max((hoursEnd - hoursStart) * 60, 0);
  const map = new Map<string, StylistUtilizationDetails>();

  // Initialize each stylist with zero utilization so the lookup is always defined.
  stylists.forEach((s) => {
    map.set(s.user_id, {
      utilization: 0,
      bookedMinutes: 0,
      availableMinutes: totalAvailable,
      overbookedMinutes: 0,
      isOverbooked: false,
    });
  });

  // Bucket appointments by stylist for the given date.
  const byStylist = new Map<string, UtilizationAppointment[]>();
  appointments
    .filter((a) => a.appointment_date === dateStr && a.stylist_user_id)
    .forEach((a) => {
      const key = a.stylist_user_id as string;
      if (!byStylist.has(key)) byStylist.set(key, []);
      byStylist.get(key)!.push(a);
    });

  byStylist.forEach((apts, stylistId) => {
    const booked = apts
      .filter(
        (a) =>
          !EXCLUDED_STATUSES.includes(a.status) &&
          !BLOCKED_CATEGORIES.includes(a.service_category || ''),
      )
      .reduce((sum, a) => {
        const dur = parseTimeToMinutes(a.end_time) - parseTimeToMinutes(a.start_time);
        return sum + Math.max(dur, 0);
      }, 0);

    // UNCAPPED — overlapping appointments inflate `booked` past `totalAvailable`.
    // That is the over-booking signal we surface, not a bug to hide.
    const utilization =
      totalAvailable > 0 ? Math.round((booked / totalAvailable) * 100) : 0;
    const overbookedMinutes = Math.max(0, booked - totalAvailable);

    map.set(stylistId, {
      utilization,
      bookedMinutes: booked,
      availableMinutes: totalAvailable,
      overbookedMinutes,
      isOverbooked: utilization > 100,
    });
  });

  return map;
}

/**
 * Legacy adapter: returns the simple `Map<stylistId, percentage>` shape that
 * existing call sites consume. Values are now uncapped — callers that render
 * a progress bar should clamp visually with `Math.min(pct, 100)` while still
 * showing the raw value as text.
 */
export function computeUtilizationByStylist(
  stylists: UtilizationStylist[],
  appointments: UtilizationAppointment[],
  dateStr: string,
  hoursStart: number,
  hoursEnd: number,
): Map<string, number> {
  const details = computeUtilizationDetailsByStylist(
    stylists,
    appointments,
    dateStr,
    hoursStart,
    hoursEnd,
  );
  const out = new Map<string, number>();
  details.forEach((d, id) => out.set(id, d.utilization));
  return out;
}
