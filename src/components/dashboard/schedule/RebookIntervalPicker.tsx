/**
 * RebookIntervalPicker — Capacity-aware rebook surface shown after the user
 * taps "Rebook" in the appointment detail drawer. Returns a target date that
 * the existing booking flow uses to pre-fill the calendar before the user
 * proceeds through service selection.
 *
 * Surfaces:
 *  - Interval chips (2/4/6/8/12 weeks) with capacity dots so heavy weeks are
 *    visible before selection.
 *  - Inline calendar (no popover) with per-day capacity dots + tooltips and
 *    a legend so the operator can pick the calmest day quickly.
 *  - Smart nudge when the recommended/selected interval lands on a heavy
 *    or full day.
 *
 * Capacity is a signal, not an audit — see useScheduleDayCapacity for the
 * doctrine on thresholds.
 */

import { useMemo, useState, useEffect } from 'react';
import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isBefore,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import {
  CalendarCheck,
  CalendarIcon,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Wand2,
  User,
  Clock,
  CalendarOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PhorestAppointment } from '@/hooks/usePhorestCalendar';
import { getRecommendedWeeks } from '@/lib/scheduling/rebook-recommender';
import {
  useScheduleDayCapacity,
  type DayLoad,
  type TimeBand,
} from '@/hooks/useScheduleDayCapacity';
import { useStylistWorkDays } from '@/hooks/useStylistWorkDays';

const INTERVAL_WEEKS = [2, 4, 6, 8, 12] as const;
const CAPACITY_HORIZON_DAYS = 100;

interface RebookIntervalPickerProps {
  open: boolean;
  appointment: PhorestAppointment | null;
  onCancel: () => void;
  onConfirm: (result: { date: Date; weeks?: number }) => void;
}

function snapToOptions(target: number): number {
  return INTERVAL_WEEKS.reduce(
    (best, w) => (Math.abs(w - target) < Math.abs(best - target) ? w : best),
    INTERVAL_WEEKS[0],
  );
}

const LOAD_DOT_CLASS: Record<DayLoad, string> = {
  light: 'bg-emerald-500',
  moderate: 'bg-amber-500',
  heavy: 'bg-orange-500',
  full: 'bg-rose-500',
};

const LOAD_LABEL: Record<DayLoad, string> = {
  light: 'Light',
  moderate: 'Moderate',
  heavy: 'Heavy',
  full: 'Full',
};

// Day-of-week tokens used by employee_location_schedules.work_days
const WEEKDAY_TOKENS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// A band is "full" for a single stylist when ~3+ appointments already sit in it.
// Bands are roughly 4–5 hours, so 3 chemical/cut appts typically saturate them.
const BAND_FULL_THRESHOLD = 3;

const BAND_LABEL: Record<TimeBand, string> = {
  morning: 'AM',
  afternoon: 'PM',
  evening: 'PM',
};

export function RebookIntervalPicker({
  open,
  appointment,
  onCancel,
  onConfirm,
}: RebookIntervalPickerProps) {
  // Anchor "from" date: the source appointment date (so weeks math is honest),
  // falling back to today.
  const fromDate = useMemo(() => {
    if (appointment?.appointment_date) {
      return new Date(appointment.appointment_date + 'T12:00:00');
    }
    return new Date();
  }, [appointment?.appointment_date]);

  const recommendedWeeks = useMemo(() => {
    if (!appointment) return 6;
    return snapToOptions(
      getRecommendedWeeks(appointment.service_name, appointment.service_category),
    );
  }, [appointment]);

  const [selectedWeeks, setSelectedWeeks] = useState<number | null>(null);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [calendarRevealed, setCalendarRevealed] = useState(false);

  // Capacity window: today through ~100 days out (covers the 12w max + buffer).
  const today = useMemo(() => startOfDay(new Date()), []);
  const horizonEnd = useMemo(
    () => addDays(today, CAPACITY_HORIZON_DAYS),
    [today],
  );
  // Scope capacity to the original stylist when present — that's the load
  // that actually matters for this client's rebook.
  const stylistUserId = appointment?.stylist_user_id ?? null;
  const { capacityMap, isStylistScoped } = useScheduleDayCapacity(
    today,
    horizonEnd,
    { stylistUserId },
  );

  // Stylist's standing weekly schedule — used for "Off this week" detection.
  const { workDays, hasSchedule } = useStylistWorkDays(stylistUserId);

  // Derive the client's preferred time-of-day band from the source appointment.
  // A "calm" day with no opening in the preferred band isn't actually a calm rebook.
  const preferredBand = useMemo<TimeBand | null>(() => {
    const t = appointment?.start_time;
    if (!t) return null;
    const h = parseInt(t.split(':')[0] ?? '0', 10);
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }, [appointment?.start_time]);

  const isStylistOff = (date: Date): boolean => {
    if (!hasSchedule) return false; // unknown → don't flag
    const token = WEEKDAY_TOKENS[date.getDay()];
    return !workDays.has(token);
  };

  // Reset / pre-select recommended interval whenever the picker re-opens for
  // a new appointment.
  useEffect(() => {
    if (open) {
      setSelectedWeeks(recommendedWeeks);
      setCustomDate(null);
      setCalendarRevealed(false);
    }
  }, [open, recommendedWeeks]);

  const intervals = useMemo(
    () =>
      INTERVAL_WEEKS.map((weeks) => {
        const date = addWeeks(fromDate, weeks);
        const key = format(date, 'yyyy-MM-dd');
        const cap = capacityMap.get(key);
        return {
          weeks,
          date,
          dateLabel: format(date, 'MMM d'),
          load: cap?.load,
          apptCount: cap?.apptCount ?? 0,
        };
      }),
    [fromDate, capacityMap],
  );

  const targetDate: Date | null = customDate
    ? customDate
    : selectedWeeks != null
    ? intervals.find((i) => i.weeks === selectedWeeks)?.date ?? null
    : null;

  const canContinue = !!targetDate && !isBefore(startOfDay(targetDate), today);

  // "Calmest day this week" — a quick-pick chip per interval row that finds
  // the lightest day in the same week as the interval target, so the operator
  // can nudge the rebook off a heavy day in one tap. Days when the stylist
  // isn't working are excluded from the search (we never recommend an Off day).
  const calmestPicks = useMemo(() => {
    return intervals.map((interval) => {
      const weekStart = startOfWeek(interval.date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(interval.date, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
        .filter((d) => !isBefore(startOfDay(d), today))
        .filter((d) => !isStylistOff(d)) // honor schedule
        .map((d) => {
          const cap = capacityMap.get(format(d, 'yyyy-MM-dd'));
          const bandCount = preferredBand
            ? cap?.bands?.[preferredBand] ?? 0
            : 0;
          return {
            date: d,
            count: cap?.apptCount ?? 0,
            load: cap?.load,
            bandFull: !!preferredBand && bandCount >= BAND_FULL_THRESHOLD,
            bandCount,
          };
        });
      if (!days.length) return null;
      // Lightest by count, then prefer days where the preferred band is open,
      // then bias toward the interval's own day on ties.
      const targetKey = format(interval.date, 'yyyy-MM-dd');
      const best = [...days].sort((a, b) => {
        if (a.count !== b.count) return a.count - b.count;
        if (a.bandFull !== b.bandFull) return a.bandFull ? 1 : -1;
        const aIsTarget = format(a.date, 'yyyy-MM-dd') === targetKey ? -1 : 0;
        const bIsTarget = format(b.date, 'yyyy-MM-dd') === targetKey ? -1 : 0;
        return aIsTarget - bIsTarget;
      })[0];
      // Don't surface a chip if the interval's own day is already the calmest.
      if (format(best.date, 'yyyy-MM-dd') === targetKey) return null;
      return best;
    });
  }, [intervals, capacityMap, today, hasSchedule, workDays, preferredBand]);

  // Smart nudge: when the active target lands on a heavy/full day, suggest a
  // calmer alternative from the interval grid.
  const nudge = useMemo(() => {
    if (!targetDate) return null;
    const key = format(targetDate, 'yyyy-MM-dd');
    const cap = capacityMap.get(key);
    if (!cap || (cap.load !== 'heavy' && cap.load !== 'full')) return null;
    // Find lightest alternative interval (excluding the current one).
    const ranked = [...intervals]
      .filter((i) => format(i.date, 'yyyy-MM-dd') !== key)
      .sort((a, b) => (a.apptCount ?? 0) - (b.apptCount ?? 0));
    const alt = ranked[0];
    if (!alt) return { load: cap.load, alt: null as null | typeof intervals[number] };
    return { load: cap.load, alt };
  }, [targetDate, capacityMap, intervals]);

  const handleContinue = () => {
    if (!targetDate || !canContinue) return;
    onConfirm({
      date: targetDate,
      weeks: customDate ? undefined : selectedWeeks ?? undefined,
    });
  };

  const clientName = appointment?.client_name?.trim() || 'this client';
  const serviceName = appointment?.service_name?.trim() || null;

  return (
    <PremiumFloatingPanel
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      side="bottom"
      maxWidth="560px"
      maxHeight="92vh"
      showCloseButton={false}
      className="sm:!left-1/2 sm:!right-auto sm:!-translate-x-1/2 sm:!bottom-auto sm:!top-1/2 sm:!-translate-y-1/2 sm:!w-[560px] sm:!max-w-[calc(100vw-2rem)] sm:!rounded-2xl"
    >
      <TooltipProvider delayDuration={150}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50">
          <h2 className="font-display text-sm tracking-wide uppercase flex items-center gap-2 text-foreground">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Rebook
          </h2>
          <p className="font-sans text-base text-foreground mt-2">
            When should we book {clientName}?
          </p>
          {serviceName && (
            <p className="font-sans text-xs text-muted-foreground mt-0.5">
              {serviceName}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Interval grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider">
                From last visit
              </p>
              {isStylistScoped && (
                <span className="inline-flex items-center gap-1 font-sans text-[10px] text-muted-foreground">
                  <User className="h-3 w-3" />
                  Stylist's book
                </span>
              )}
            </div>
            <ToggleGroup
              type="single"
              value={
                selectedWeeks != null && !customDate ? String(selectedWeeks) : ''
              }
              onValueChange={(v) => {
                if (!v) return;
                setSelectedWeeks(Number(v));
                setCustomDate(null);
                setCalendarRevealed(false);
              }}
              className="grid grid-cols-5 gap-2"
            >
              {intervals.map((interval) => {
                const isRecommended = interval.weeks === recommendedWeeks;
                const offThatDay = isStylistOff(interval.date);
                return (
                  <Tooltip key={interval.weeks}>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value={String(interval.weeks)}
                        aria-label={`${interval.weeks} weeks`}
                        className={cn(
                          'h-16 flex flex-col items-center justify-center gap-0.5 rounded-lg border bg-background',
                          'border-border hover:bg-muted/60 transition-colors relative',
                          // Purple ghost selected — primary tint + thick stroke + soft ring
                          'data-[state=on]:bg-primary/[0.06] data-[state=on]:border-primary data-[state=on]:border-2',
                          'data-[state=on]:ring-2 data-[state=on]:ring-primary/20 data-[state=on]:ring-offset-0',
                          'data-[state=on]:text-foreground',
                          offThatDay && 'opacity-60',
                        )}
                      >
                        <span className="font-sans text-sm leading-none">
                          {interval.weeks}w
                        </span>
                        <span className="font-sans text-[10px] text-muted-foreground leading-none mt-1">
                          {interval.dateLabel}
                        </span>
                        {/* Recommended → top-edge label pill (no longer corner-dot collision) */}
                        {isRecommended && (
                          <span
                            className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-px rounded-full bg-primary/10 border border-primary/30 font-display text-[8px] uppercase tracking-wider text-primary leading-none"
                            aria-label="Recommended"
                          >
                            Rec
                          </span>
                        )}
                        {/* Off-day marker (small, top-right) */}
                        {offThatDay && (
                          <span
                            className="absolute top-1 right-1 inline-flex items-center"
                            aria-label="Stylist off"
                          >
                            <CalendarOff className="h-2.5 w-2.5 text-muted-foreground" />
                          </span>
                        )}
                        {interval.load && (
                          <span
                            className={cn(
                              'absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full',
                              LOAD_DOT_CLASS[interval.load],
                            )}
                          />
                        )}
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      {offThatDay
                        ? "Stylist isn't scheduled this day"
                        : interval.load
                        ? `${interval.apptCount} booked · ${LOAD_LABEL[interval.load]}${
                            isRecommended ? ' · Recommended' : ''
                          }`
                        : isRecommended
                        ? 'Recommended'
                        : ''}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </ToggleGroup>

            {/* Calmest-day quick picks (one per interval week) */}
            {calmestPicks.some((p) => p) && (
              <div className="grid grid-cols-5 gap-2 pt-1">
                {calmestPicks.map((pick, idx) => {
                  const interval = intervals[idx];
                  if (!pick) return <div key={interval.weeks} aria-hidden />;
                  const isActive =
                    customDate &&
                    format(customDate, 'yyyy-MM-dd') ===
                      format(pick.date, 'yyyy-MM-dd');
                  return (
                    <Tooltip key={interval.weeks}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomDate(pick.date);
                            setSelectedWeeks(null);
                            setCalendarRevealed(false);
                          }}
                          className={cn(
                            'group flex items-center justify-center gap-1 rounded-md border border-dashed border-border/70 bg-background/50 px-1 py-1 transition-colors hover:bg-muted/60 hover:border-border',
                            // Purple ghost when this calmest-pick is the active selection
                            isActive && 'border-solid border-primary border-2 bg-primary/[0.06] ring-2 ring-primary/20',
                          )}
                          aria-label={`Calmest day in week of ${interval.dateLabel}: ${format(pick.date, 'EEE MMM d')}`}
                        >
                          <Wand2 className="h-2.5 w-2.5 text-muted-foreground group-hover:text-primary" />
                          <span className="font-sans text-[10px] text-muted-foreground group-hover:text-foreground">
                            {format(pick.date, 'EEE d')}
                          </span>
                          {pick.bandFull && preferredBand && (
                            <span
                              className="inline-flex items-center gap-0.5 font-display text-[8px] uppercase tracking-wider text-amber-500 leading-none"
                              aria-label={`${BAND_LABEL[preferredBand]} full`}
                            >
                              <Clock className="h-2 w-2" />
                              {BAND_LABEL[preferredBand]} full
                            </span>
                          )}
                          {pick.load && (
                            <span
                              className={cn(
                                'h-1 w-1 rounded-full',
                                LOAD_DOT_CLASS[pick.load],
                              )}
                            />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Calmest day this week · {pick.count} booked ·{' '}
                        {pick.load ? LOAD_LABEL[pick.load] : 'Open'}
                        {pick.bandFull && preferredBand && (
                          <> · {BAND_LABEL[preferredBand]} band tight</>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>

          {/* Smart nudge */}
          <AnimatePresence>
            {nudge && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-xs text-foreground">
                    That day is{' '}
                    <span className="font-medium">
                      {LOAD_LABEL[nudge.load].toLowerCase()}
                    </span>
                    .
                    {nudge.alt && (
                      <>
                        {' '}Consider{' '}
                        <button
                          type="button"
                          className="underline underline-offset-2 hover:text-primary"
                          onClick={() => {
                            setSelectedWeeks(nudge.alt!.weeks);
                            setCustomDate(null);
                            setCalendarRevealed(false);
                          }}
                        >
                          {nudge.alt.weeks}w ({nudge.alt.dateLabel})
                        </button>
                        {' '}instead — calmer book.
                      </>
                    )}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider with "or" */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Inline calendar reveal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider">
                Pick a specific date
              </p>
              {calendarRevealed && (
                <button
                  type="button"
                  onClick={() => {
                    setCalendarRevealed(false);
                    setCustomDate(null);
                    setSelectedWeeks(recommendedWeeks);
                  }}
                  className="font-sans text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Hide
                </button>
              )}
            </div>

            {!calendarRevealed && (
              <Button
                variant="outline"
                onClick={() => setCalendarRevealed(true)}
                className={cn(
                  'w-full justify-start text-left font-sans h-11 rounded-lg',
                  customDate
                    ? 'border-primary text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {customDate
                  ? format(customDate, 'EEEE, MMM d, yyyy')
                  : 'Choose a date…'}
              </Button>
            )}

            <AnimatePresence initial={false}>
              {calendarRevealed && (
                <motion.div
                  key="rebook-inline-calendar"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-border bg-background/60 backdrop-blur-sm px-2 py-2">
                    <Calendar
                      mode="single"
                      selected={customDate ?? undefined}
                      onSelect={(date) => {
                        if (!date) return;
                        setCustomDate(date);
                        setSelectedWeeks(null);
                      }}
                      disabled={(date) => isBefore(startOfDay(date), today)}
                      defaultMonth={targetDate ?? today}
                      initialFocus
                      className="p-2 pointer-events-auto w-full"
                      classNames={{
                        months: 'flex flex-col w-full',
                        month: 'space-y-3 w-full',
                        table: 'w-full border-collapse',
                        head_row: 'grid grid-cols-7',
                        head_cell:
                          'text-muted-foreground font-normal text-[0.7rem] uppercase tracking-wider h-8 flex items-center justify-center',
                        row: 'grid grid-cols-7 mt-1',
                        cell: 'h-10 w-full text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
                      }}
                      components={{
                        DayContent: ({ date }) => {
                          const key = format(date, 'yyyy-MM-dd');
                          const cap = capacityMap.get(key);
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="relative flex items-center justify-center h-9 w-9 mx-auto">
                                  <span>{date.getDate()}</span>
                                  {cap && (
                                    <span
                                      className={cn(
                                        'absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full',
                                        LOAD_DOT_CLASS[cap.load],
                                      )}
                                    />
                                  )}
                                </div>
                              </TooltipTrigger>
                              {cap && (
                                <TooltipContent side="top">
                                  {cap.apptCount} booked · {LOAD_LABEL[cap.load]}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          );
                        },
                      }}
                    />

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-3 px-2 pt-2 pb-1 border-t border-border/40 mt-1">
                      {(['light', 'moderate', 'heavy', 'full'] as const).map(
                        (l) => (
                          <div
                            key={l}
                            className="flex items-center gap-1.5"
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                LOAD_DOT_CLASS[l],
                              )}
                            />
                            <span className="font-sans text-[10px] text-muted-foreground">
                              {LOAD_LABEL[l]}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Selected summary */}
          {targetDate && (
            <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-wider">
                  Target date
                </p>
                <p className="font-sans text-sm text-foreground mt-0.5 flex items-center gap-2">
                  {format(targetDate, 'EEEE, MMM d, yyyy')}
                  {(() => {
                    const cap = capacityMap.get(format(targetDate, 'yyyy-MM-dd'));
                    if (!cap) return null;
                    return (
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          LOAD_DOT_CLASS[cap.load],
                        )}
                        aria-label={LOAD_LABEL[cap.load]}
                      />
                    );
                  })()}
                </p>
              </div>
              {selectedWeeks != null && !customDate && (
                <span className="font-sans text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {selectedWeeks} weeks out
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex gap-2 shrink-0">
          <Button
            variant="ghost"
            size="default"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="default"
            className="flex-[2]"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            Choose Services
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </TooltipProvider>
    </PremiumFloatingPanel>
  );
}
