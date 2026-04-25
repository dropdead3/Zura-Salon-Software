/**
 * RebookIntervalPicker — Lightweight interval/date picker shown after the user
 * taps "Rebook" in the appointment detail drawer. Returns a target date that
 * the existing booking flow uses to pre-fill the calendar before the user
 * proceeds through service selection.
 *
 * Interval options (per product spec): 2 / 4 / 6 / 8 / 12 weeks, or a custom
 * date via the calendar. Past dates disabled. Recommended interval pre-
 * selected based on service category (snapped to nearest available option).
 */

import { useMemo, useState, useEffect } from 'react';
import { addWeeks, format, isBefore, startOfDay } from 'date-fns';
import { CalendarCheck, CalendarIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { cn } from '@/lib/utils';
import type { PhorestAppointment } from '@/hooks/usePhorestCalendar';
import { getRecommendedWeeks } from '@/lib/scheduling/rebook-recommender';

const INTERVAL_WEEKS = [2, 4, 6, 8, 12] as const;

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
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Reset / pre-select recommended interval whenever the picker re-opens for
  // a new appointment.
  useEffect(() => {
    if (open) {
      setSelectedWeeks(recommendedWeeks);
      setCustomDate(null);
      setCalendarOpen(false);
    }
  }, [open, recommendedWeeks]);

  const intervals = useMemo(
    () =>
      INTERVAL_WEEKS.map((weeks) => {
        const date = addWeeks(fromDate, weeks);
        return { weeks, date, dateLabel: format(date, 'MMM d') };
      }),
    [fromDate],
  );

  const targetDate: Date | null = customDate
    ? customDate
    : selectedWeeks != null
    ? intervals.find((i) => i.weeks === selectedWeeks)?.date ?? null
    : null;

  const today = startOfDay(new Date());
  const canContinue = !!targetDate && !isBefore(startOfDay(targetDate), today);

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
      maxWidth="520px"
      maxHeight="90vh"
      showCloseButton={false}
      className="sm:!left-1/2 sm:!right-auto sm:!-translate-x-1/2 sm:!bottom-auto sm:!top-1/2 sm:!-translate-y-1/2 sm:!w-[520px] sm:!max-w-[calc(100vw-2rem)] sm:!rounded-2xl"
    >
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
            value={selectedWeeks != null && !customDate ? String(selectedWeeks) : ''}
            onValueChange={(v) => {
              if (!v) return;
              setSelectedWeeks(Number(v));
              setCustomDate(null);
            }}
            className="grid grid-cols-5 gap-2"
          >
            {intervals.map((interval) => {
              const isRecommended = interval.weeks === recommendedWeeks;
              return (
                <ToggleGroupItem
                  key={interval.weeks}
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
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </div>

        {/* Divider with "or" */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="font-sans text-[10px] text-muted-foreground uppercase tracking-wider">
            or
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Custom date picker */}
        <div className="space-y-2">
          <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider">
            Pick a specific date
          </p>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
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
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[80]" align="start">
              <Calendar
                mode="single"
                selected={customDate ?? undefined}
                onSelect={(date) => {
                  if (!date) return;
                  setCustomDate(date);
                  setSelectedWeeks(null);
                  setCalendarOpen(false);
                }}
                disabled={(date) => isBefore(startOfDay(date), today)}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Selected summary */}
        {targetDate && (
          <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-wider">
                Target date
              </p>
              <p className="font-sans text-sm text-foreground mt-0.5">
                {format(targetDate, 'EEEE, MMM d, yyyy')}
              </p>
            </div>
            {selectedWeeks != null && !customDate && (
              <span className="font-sans text-xs text-muted-foreground">
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
    </PremiumFloatingPanel>
  );
}
