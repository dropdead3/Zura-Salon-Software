/**
 * NextVisitRecommendation — Scripted rebook prompt with uniform interval toggle.
 * Surfaces a verbal commitment script for the stylist to read aloud, plus
 * 1/2/3/4/6/8/10/12 week options. Pre-selects the recommended interval based
 * on service category but allows override.
 */

import { useState, useMemo } from 'react';
import { CalendarPlus, CalendarCheck, XCircle, Quote } from 'lucide-react';
import { format, addWeeks } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  onBookInterval: (interval: RebookInterval) => void;
  onScheduleManually: () => void;
  onDecline: () => void;
}

export function NextVisitRecommendation({
  serviceName,
  serviceCategory,
  appointmentDate,
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

  return (
    <div className="space-y-5">
      {/* Verbal Script Card */}
      <div className="relative rounded-lg border border-border/60 bg-muted/30 p-4">
        <Quote className="absolute top-3 left-3 h-3.5 w-3.5 text-muted-foreground/50" />
        <p className="font-sans text-sm text-foreground leading-relaxed pl-6 italic">
          "I'd like to see you back in{' '}
          <span className="not-italic text-foreground font-medium">
            {selectedWeeks} {weekLabel}
          </span>
          . How does{' '}
          <span className="not-italic text-foreground font-medium">{dayLabel}</span>{' '}
          work?"
        </p>
        <p className="mt-2 pl-6 text-[11px] uppercase tracking-wider text-muted-foreground/70 font-display">
          Suggested Script
        </p>
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
