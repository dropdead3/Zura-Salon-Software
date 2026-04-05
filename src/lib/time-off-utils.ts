import { addDays, format } from 'date-fns';

export interface TimeOffRecord {
  user_id: string;
  start_date: string;
  end_date: string;
  is_full_day: boolean;
}

/**
 * Expands approved time-off records into a Set of "userId|YYYY-MM-DD" keys.
 * Only includes full-day time off (partial days don't fully block utilization).
 */
export function buildTimeOffSet(records: TimeOffRecord[]): Set<string> {
  const set = new Set<string>();
  for (const r of records) {
    if (!r.is_full_day) continue;
    let current = new Date(r.start_date + 'T00:00:00');
    const end = new Date(r.end_date + 'T00:00:00');
    while (current <= end) {
      set.add(`${r.user_id}|${format(current, 'yyyy-MM-dd')}`);
      current = addDays(current, 1);
    }
  }
  return set;
}

/**
 * Checks if a specific user is off on a specific date.
 */
export function isUserOffOnDate(
  timeOffSet: Set<string>,
  userId: string,
  date: string,
): boolean {
  return timeOffSet.has(`${userId}|${date}`);
}

/**
 * Counts how many distinct user-days of time off exist in the set.
 */
export function countTimeOffDays(timeOffSet: Set<string>): number {
  return timeOffSet.size;
}

/**
 * Returns a Set of dates (YYYY-MM-DD) where ANY user has approved time off.
 * Useful for org-wide capacity calculations.
 */
export function buildTimeOffDateSet(records: TimeOffRecord[]): Set<string> {
  const set = new Set<string>();
  for (const r of records) {
    if (!r.is_full_day) continue;
    let current = new Date(r.start_date + 'T00:00:00');
    const end = new Date(r.end_date + 'T00:00:00');
    while (current <= end) {
      set.add(format(current, 'yyyy-MM-dd'));
      current = addDays(current, 1);
    }
  }
  return set;
}
