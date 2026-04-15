import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOrgDefaults } from '@/hooks/useOrgDefaults';
import { getOrgToday, orgNowMinutes, isOrgToday, isOrgTomorrow, getOrgTodayDate } from '@/lib/orgTime';

/**
 * Reactive, timezone-safe "now" for schedule components.
 *
 * Accepts an optional locationTimezone override. When provided (non-null),
 * it takes priority over the org default timezone.
 *
 * Returns primitive values (string, number) — never a raw Date —
 * so they can't be accidentally misused with date-fns comparisons.
 *
 * Refreshes every 60 seconds to keep the current-time indicator moving.
 */
export function useOrgNow(locationTimezone?: string | null) {
  const { timezone: orgTimezone } = useOrgDefaults();
  const timezone = locationTimezone ?? orgTimezone;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = useMemo(() => getOrgToday(timezone), [timezone, tick]);
  const nowMinutes = useMemo(() => orgNowMinutes(timezone), [timezone, tick]);
  const todayDate = useMemo(() => getOrgTodayDate(timezone), [timezone, tick]);

  const isToday = useCallback(
    (date: Date | string) => isOrgToday(date, timezone),
    [timezone, tick]
  );

  const isTomorrow = useCallback(
    (date: Date | string) => isOrgTomorrow(date, timezone),
    [timezone, tick]
  );

  return {
    /** Today as YYYY-MM-DD in org timezone */
    todayStr,
    /** Minutes since midnight in org timezone */
    nowMinutes,
    /** A Date for org-today at midnight — use ONLY for addDays() sequences, not time math */
    todayDate,
    /** Is the given date "today" in org timezone? */
    isToday,
    /** Is the given date "tomorrow" in org timezone? */
    isTomorrow,
    /** The effective timezone string */
    timezone,
  };
}
