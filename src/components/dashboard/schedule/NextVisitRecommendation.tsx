/**
 * NextVisitRecommendation — Scripted rebook prompt with uniform interval toggle.
 * Surfaces a verbal commitment script for the stylist to read aloud, plus
 * 1/2/3/4/6/8/10/12 week options. Pre-selects the recommended interval based
 * on service category but allows override.
 */

import { useState, useMemo } from 'react';
import { CalendarPlus, CalendarCheck, XCircle, Quote, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  getAllRebookIntervals,
  getRecommendedWeeks,
  type RebookInterval,
} from '@/lib/scheduling/rebook-recommender';

interface NextVisitRecommendationProps {
  serviceName: string | null | undefined;
  serviceCategory: string | null | undefined;
  appointmentDate: string; // ISO date
  /** Optional HH:mm of the source appointment. When provided, the verbal
   * script reads "...at 2:00 PM work?" — materially more committal language. */
  appointmentStartTime?: string | null;
  onBookInterval: (interval: RebookInterval) => void;
  onScheduleManually: () => void;
  onDecline: () => void;
}

export function NextVisitRecommendation({
  serviceName,
  serviceCategory,
  appointmentDate,
  appointmentStartTime,
  onBookInterval,
  onScheduleManually,
  onDecline,
}: NextVisitRecommendationProps) {
  const fromDate = useMemo(() => new Date(appointmentDate + 'T12:00:00'), [appointmentDate]);
  const intervals = useMemo(() => getAllRebookIntervals(fromDate), [fromDate]);
  const recommendedWeeks = useMemo(
    () => getRecommendedWeeks(serviceName, serviceCategory),
    [serviceName, serviceCategory],
  );

  const [selectedWeeks, setSelectedWeeks] = useState<number>(recommendedWeeks);

  const selectedInterval = intervals.find(i => i.weeks === selectedWeeks) ?? intervals[0];
  const selectedDate = selectedInterval.date;
  const weekLabel = selectedWeeks === 1 ? 'week' : 'weeks';
  const dayLabel = format(selectedDate, 'EEEE, MMM d');

  // Time-aware script: parse HH:mm and format as h:mm a (e.g., "2:00 PM")
  const timeLabel = useMemo(() => {
    if (!appointmentStartTime) return null;
    const [h, m] = appointmentStartTime.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return format(d, 'h:mm a');
  }, [appointmentStartTime]);

  return (
    <div className="space-y-5">
      {/* Verbal Script Card — elevated as the centerpiece of the rebook flow */}
      <div className="space-y-1.5">
        <div className="relative rounded-lg border border-primary/30 border-l-2 border-l-primary/50 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] p-5 shadow-sm">
          <Quote className="absolute top-3 left-3 h-5 w-5 text-primary/40" />
          <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider text-primary/60 font-display">
            Suggested Script
          </span>
          <p className="font-sans text-base text-foreground leading-relaxed pl-7 pr-2 pt-4 italic">
            "I'd like to see you back in{' '}
            <span className="not-italic text-primary font-medium">
              {selectedWeeks} {weekLabel}
            </span>
            . How does{' '}
            <span className="not-italic text-primary font-medium">{dayLabel}</span>
            {timeLabel && (
              <>
                {' '}at{' '}
                <span className="not-italic text-primary font-medium">{timeLabel}</span>
              </>
            )}
            {' '}work?"
          </p>
        </div>

        {/* Anti-pattern reference link */}
        <div className="flex justify-end pr-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="font-sans text-xs text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-0.5 cursor-help"
              >
                What not to say
                <ChevronRight className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" align="end" className="max-w-xs p-3">
              <p className="font-sans text-xs text-foreground leading-relaxed">
                <span className="text-destructive">✗</span>{' '}
                <span className="italic">"Want to rebook? Or do you want me to text you?"</span>
              </p>
              <p className="font-sans text-xs text-muted-foreground leading-relaxed mt-2">
                Optional + deferred = no commitment. Always anchor to a specific week and time.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Interval toggle */}
      <div className="space-y-2">
        <ToggleGroup
          type="single"
          value={String(selectedWeeks)}
          onValueChange={(v) => v && setSelectedWeeks(Number(v))}
          className="grid grid-cols-4 gap-2"
        >
          {intervals.map((interval) => {
            const isRecommended = interval.weeks === recommendedWeeks;
            return (
              <ToggleGroupItem
                key={interval.weeks}
                value={String(interval.weeks)}
                aria-label={`${interval.weeks} weeks`}
                className={cn(
                  'h-14 flex flex-col items-center justify-center gap-0.5 rounded-md border border-border/60 bg-background',
                  'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary',
                  'hover:bg-muted/60 transition-colors relative',
                )}
              >
                <span className="font-sans text-sm font-medium leading-none">
                  {interval.weeks}w
                </span>
                <span className="font-sans text-[10px] opacity-70 leading-none">
                  {interval.dateLabel}
                </span>
                {isRecommended && (
                  <span
                    className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary data-[state=on]:bg-primary-foreground"
                    aria-label="Recommended"
                  />
                )}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      {/* Primary book CTA */}
      <Button
        size="default"
        className="w-full"
        onClick={() => onBookInterval(selectedInterval)}
      >
        <CalendarCheck className="h-4 w-4 mr-2" />
        Book {format(selectedDate, 'MMM d')}
      </Button>

      {/* Secondary actions */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-muted-foreground"
          onClick={onScheduleManually}
        >
          <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
          Pick a Date
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-muted-foreground hover:text-destructive"
          onClick={onDecline}
        >
          <XCircle className="h-3.5 w-3.5 mr-1.5" />
          Skip
        </Button>
      </div>
    </div>
  );
}
