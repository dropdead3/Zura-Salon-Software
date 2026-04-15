import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOrgDefaults } from '@/hooks/useOrgDefaults';
import { useLocationTimezoneContext } from '@/contexts/LocationTimezoneContext';
import { getOrgToday, orgNowMinutes, isOrgToday, isOrgTomorrow, getOrgTodayDate } from '@/lib/orgTime';

/**
 * Reactive, timezone-safe "now" for schedule components.
 *
 * Resolves timezone in order:
 *   1. Explicit `locationTimezone` parameter (if non-null)
 *   2. LocationTimezoneContext value (set by LocationTimezoneProvider)
 *   3. Org default timezone from useOrgDefaults
 *
 * Returns primitive values (string, number) — never a raw Date —
 * so they can't be accidentally misused with date-fns comparisons.
 *
 * Refreshes every 60 seconds to keep the current-time indicator moving.
 */
export function useOrgNow(locationTimezone?: string | null) {
  const { timezone: orgTimezone } = useOrgDefaults();
  const contextTimezone = useLocationTimezoneContext();
  const timezone = locationTimezone ?? contextTimezone ?? orgTimezone;
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
    /** Today as YYYY-MM-DD in effective timezone */
    todayStr,
    /** Minutes since midnight in effective timezone */
    nowMinutes,
    /** A Date for today at midnight — use ONLY for addDays() sequences, not time math */
    todayDate,
    /** Is the given date "today" in effective timezone? */
    isToday,
    /** Is the given date "tomorrow" in effective timezone? */
    isTomorrow,
    /** The effective timezone string */
    timezone,
  };
}
