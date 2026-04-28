import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, AlertCircle } from 'lucide-react';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import {
  useActiveLocations,
  isClosedOnDate,
  type HoursJson,
  type HolidayClosure,
  type Location,
} from '@/hooks/useLocations';
import { useUserLocationAccess } from '@/hooks/useUserLocationAccess';
import { reportVisibilitySuppression } from '@/lib/dev/visibility-contract-bus';
import { cn } from '@/lib/utils';

export interface LocationsStatusCardProps {
  filterContext: FilterContext;
}

type LocationState =
  | { kind: 'open'; closeTime: string }
  | { kind: 'closing-soon'; closeTime: string; minutesRemaining: number }
  | { kind: 'opens-soon'; openTime: string; minutesUntilOpen: number }
  | { kind: 'before-open'; openTime: string }
  | { kind: 'after-close'; nextOpenLabel: string }
  | { kind: 'closed-today'; reason: string }
  | { kind: 'closed-holiday'; reason: string }
  | { kind: 'no-hours' };

/** Within this many minutes of close, surface the "Closing soon" amber state. */
const CLOSING_SOON_THRESHOLD_MINUTES = 30;
/** Within this many minutes of open, surface the "Opens soon" sky state. */
const OPENS_SOON_THRESHOLD_MINUTES = 30;

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_LABEL: Record<(typeof DAY_NAMES)[number], string> = {
  sunday: 'Sun',
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
};

function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':');
  const hours = Number(hStr);
  const minutes = Number(mStr);
  if (Number.isNaN(hours)) return time;
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  return minutes === 0
    ? `${displayHours}${period}`
    : `${displayHours}:${String(minutes).padStart(2, '0')}${period}`;
}

function timeToMinutes(time: string): number | null {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function findNextOpenDay(
  hoursJson: HoursJson | null,
  holidayClosures: HolidayClosure[] | null,
  fromDate: Date,
): { dayLabel: string; openTime: string } | null {
  if (!hoursJson) return null;
  for (let offset = 1; offset <= 7; offset++) {
    const next = new Date(fromDate);
    next.setDate(next.getDate() + offset);
    const closure = isClosedOnDate(hoursJson, holidayClosures, next);
    if (closure.isClosed) continue;
    const dayKey = DAY_NAMES[next.getDay()];
    const dayHours = hoursJson[dayKey];
    if (dayHours?.closed || !dayHours?.open) continue;
    return { dayLabel: DAY_LABEL[dayKey], openTime: dayHours.open };
  }
  return null;
}

function computeLocationState(loc: Location, now: Date): LocationState {
  const closure = isClosedOnDate(loc.hours_json, loc.holiday_closures, now);
  if (closure.isClosed) {
    const isHoliday = loc.holiday_closures?.some(
      (h) => h.date === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    );
    if (isHoliday) {
      return { kind: 'closed-holiday', reason: closure.reason ?? 'Holiday' };
    }
    return { kind: 'closed-today', reason: 'Closed today' };
  }

  if (!loc.hours_json) return { kind: 'no-hours' };
  const dayKey = DAY_NAMES[now.getDay()];
  const dayHours = loc.hours_json[dayKey];
  if (!dayHours?.open || !dayHours?.close) return { kind: 'no-hours' };

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = timeToMinutes(dayHours.open);
  const closeMin = timeToMinutes(dayHours.close);
  if (openMin == null || closeMin == null) return { kind: 'no-hours' };

  if (nowMin < openMin) {
    const minutesUntilOpen = openMin - nowMin;
    if (minutesUntilOpen > 0 && minutesUntilOpen <= OPENS_SOON_THRESHOLD_MINUTES) {
      return { kind: 'opens-soon', openTime: dayHours.open, minutesUntilOpen };
    }
    return { kind: 'before-open', openTime: dayHours.open };
  }
  if (nowMin >= closeMin) {
    const next = findNextOpenDay(loc.hours_json, loc.holiday_closures, now);
    const label = next ? `${next.dayLabel} ${formatTime(next.openTime)}` : 'tomorrow';
    return { kind: 'after-close', nextOpenLabel: label };
  }
  const minutesRemaining = closeMin - nowMin;
  if (minutesRemaining > 0 && minutesRemaining <= CLOSING_SOON_THRESHOLD_MINUTES) {
    return { kind: 'closing-soon', closeTime: dayHours.close, minutesRemaining };
  }
  return { kind: 'open', closeTime: dayHours.close };
}

function stateRank(s: LocationState): number {
  // Time-sensitive states rank first so operators see urgent ones at the top.
  switch (s.kind) {
    case 'closing-soon':
      return 0;
    case 'opens-soon':
      return 1;
    case 'open':
      return 2;
    case 'before-open':
      return 3;
    case 'after-close':
      return 4;
    case 'closed-today':
      return 5;
    case 'closed-holiday':
      return 6;
    case 'no-hours':
      return 7;
  }
}

function StatusPill({ state }: { state: LocationState }) {
  const config = (() => {
    switch (state.kind) {
      case 'open':
        return {
          dot: 'bg-emerald-500',
          text: 'text-emerald-600 dark:text-emerald-400',
          label: `Open · closes ${formatTime(state.closeTime)}`,
        };
      case 'closing-soon':
        return {
          dot: 'bg-amber-500',
          text: 'text-amber-600 dark:text-amber-400',
          label: `Closing soon · ${formatTime(state.closeTime)}`,
        };
      case 'opens-soon':
        return {
          dot: 'bg-sky-500',
          text: 'text-sky-600 dark:text-sky-400',
          label: `Opens soon · ${formatTime(state.openTime)}`,
        };
      case 'before-open':
        return {
          dot: 'bg-muted-foreground/60',
          text: 'text-muted-foreground',
          label: `Opens ${formatTime(state.openTime)}`,
        };
      case 'after-close':
        return {
          dot: 'bg-muted-foreground',
          text: 'text-muted-foreground',
          label: `Closed · opens ${state.nextOpenLabel}`,
        };
      case 'closed-today':
        return {
          dot: 'bg-muted-foreground',
          text: 'text-muted-foreground',
          label: state.reason,
        };
      case 'closed-holiday':
        return {
          dot: 'bg-rose-500',
          text: 'text-rose-600 dark:text-rose-400',
          label: `Holiday · ${state.reason}`,
        };
      case 'no-hours':
        return {
          dot: 'bg-muted-foreground/60',
          text: 'text-muted-foreground',
          label: 'Hours not set',
        };
    }
  })();
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', config.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} aria-hidden />
      {config.label}
    </span>
  );
}

export function LocationsStatusCard({ filterContext }: LocationsStatusCardProps) {
  const { accessibleLocations } = useUserLocationAccess();
  const { data: allLocations, isLoading, isError } = useActiveLocations();

  // Re-tick every 60s so "Open · closes 7pm" stays accurate without page reload.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const visibleLocations = useMemo(() => {
    if (!allLocations) return [];
    const accessibleIds = new Set(accessibleLocations.map((l) => l.id));
    return allLocations.filter((l) => accessibleIds.has(l.id));
  }, [allLocations, accessibleLocations]);

  // Materiality gate: < 2 locations OR all locations share identical schedules.
  const suppressionReason = useMemo<string | null>(() => {
    if (visibleLocations.length < 2) return 'single-location';
    const firstHours = JSON.stringify(visibleLocations[0].hours_json ?? null);
    const uniformHours = visibleLocations.every(
      (l) => JSON.stringify(l.hours_json ?? null) === firstHours,
    );
    const anyHolidays = visibleLocations.some(
      (l) => (l.holiday_closures?.length ?? 0) > 0,
    );
    if (uniformHours && !anyHolidays) return 'uniform-schedules';
    return null;
  }, [visibleLocations]);

  useEffect(() => {
    if (!isLoading && suppressionReason) {
      reportVisibilitySuppression('locations-status', suppressionReason, {
        locationCount: visibleLocations.length,
      });
    }
  }, [isLoading, suppressionReason, visibleLocations.length]);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5 flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to load location status.</span>
        </CardContent>
      </Card>
    );
  }

  if (suppressionReason) return null;

  const states = visibleLocations
    .map((loc) => ({ loc, state: computeLocationState(loc, now) }))
    .sort((a, b) => stateRank(a.state) - stateRank(b.state));

  const openCount = states.filter(
    (s) => s.state.kind === 'open' || s.state.kind === 'closing-soon',
  ).length;
  const closingSoonCount = states.filter((s) => s.state.kind === 'closing-soon').length;
  const opensSoonCount = states.filter((s) => s.state.kind === 'opens-soon').length;
  const total = states.length;
  const visible = states.slice(0, 6);
  const overflow = states.length - visible.length;

  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              data-pinnable-anchor
              className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg shrink-0"
            >
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-display text-sm tracking-wide text-muted-foreground uppercase truncate">
                Locations Status
              </h3>
              <MetricInfoTooltip description="Real-time open/closed status across your locations. Locations within 30 minutes of opening show as 'Opens soon'; within 30 minutes of close as 'Closing soon'. Surfaces only when you operate multiple locations with differing schedules or holiday closures." />
            </div>
          </div>
          <AnalyticsFilterBadge
            locationId={filterContext.locationId}
            dateRange={filterContext.dateRange}
          />
        </div>

        <div className="mb-3 flex items-baseline gap-2 flex-wrap">
          <span className="font-display text-2xl tracking-wide">
            {openCount}
            <span className="text-muted-foreground">/{total}</span>
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-display">
            Open right now
          </span>
          {closingSoonCount > 0 && (
            <span className="text-xs uppercase tracking-wider font-display text-amber-600 dark:text-amber-400">
              · {closingSoonCount} closing soon
            </span>
          )}
        </div>

        <div className="space-y-2">
          {visible.map(({ loc, state }) => (
            <div
              key={loc.id}
              className="flex justify-between items-center gap-3 py-2 px-3 rounded-lg border border-border/50 bg-muted/30"
            >
              <span className="text-sm truncate min-w-0">{loc.name}</span>
              <div className="shrink-0">
                <StatusPill state={state} />
              </div>
            </div>
          ))}
          {overflow > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-1">+{overflow} more</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
