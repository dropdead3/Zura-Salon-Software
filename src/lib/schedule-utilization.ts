/**
 * Shared utilization calculator for the Schedule.
 * Returns a Map of stylist user_id → utilization percentage (0–100)
 * for a given date and a set of appointments.
 *
 * Single source of truth — consumed by both DayView (for column sort)
 * and ScheduleHeader (for the staff-dropdown capacity badge).
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

const BLOCKED_CATEGORIES = ['Block', 'Break'];
const EXCLUDED_STATUSES = ['cancelled', 'no_show'];

export function computeUtilizationByStylist(
  stylists: UtilizationStylist[],
  appointments: UtilizationAppointment[],
  dateStr: string,
  hoursStart: number,
  hoursEnd: number,
): Map<string, number> {
  const totalAvailable = Math.max((hoursEnd - hoursStart) * 60, 0);
  const map = new Map<string, number>();

  // Initialize each stylist to 0 so the lookup is always defined.
  stylists.forEach((s) => map.set(s.user_id, 0));

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

    const pct =
      totalAvailable > 0 ? Math.min(Math.round((booked / totalAvailable) * 100), 100) : 0;
    map.set(stylistId, pct);
  });

  return map;
}
