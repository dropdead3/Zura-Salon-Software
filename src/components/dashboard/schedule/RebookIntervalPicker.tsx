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
import { addDays, addWeeks, format, isBefore, startOfDay } from 'date-fns';
import { CalendarCheck, CalendarIcon, ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';
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
} from '@/hooks/useScheduleDayCapacity';

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
  const { capacityMap } = useScheduleDayCapacity(today, horizonEnd);

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
            <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider">
              From last visit
            </p>
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
                return (
                  <Tooltip key={interval.weeks}>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value={String(interval.weeks)}
                        aria-label={`${interval.weeks} weeks`}
                        className={cn(
                          'h-16 flex flex-col items-center justify-center gap-0.5 rounded-lg border border-border bg-background',
                          'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary',
                          'hover:bg-muted/60 transition-colors relative',
                        )}
                      >
                        <span className="font-sans text-sm font-medium leading-none">
                          {interval.weeks}w
                        </span>
                        <span className="font-sans text-[10px] opacity-70 leading-none mt-1">
                          {interval.dateLabel}
                        </span>
                        {isRecommended && (
                          <span
                            className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary data-[state=on]:bg-primary-foreground"
                            aria-label="Recommended"
                          />
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
                    {interval.load && (
                      <TooltipContent>
                        {interval.apptCount} booked · {LOAD_LABEL[interval.load]}
                        {isRecommended ? ' · Recommended' : ''}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </ToggleGroup>
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
