/**
 * NextVisitRecommendation — Smart rebook suggestion with one-tap date buttons.
 * Shown inside the CheckoutSummarySheet rebooking gate.
 */

import { CalendarPlus, CalendarCheck, XCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getRecommendedRebookIntervals,
  getRebookServiceLabel,
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
  const fromDate = new Date(appointmentDate + 'T12:00:00');
  const intervals = getRecommendedRebookIntervals(serviceName, serviceCategory, fromDate);
  const serviceLabel = getRebookServiceLabel(serviceName, serviceCategory);

  return (
    <div className="space-y-4">
      {/* Recommendation header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>{serviceLabel}</span>
      </div>

      {/* Quick book buttons */}
      <div className="grid grid-cols-2 gap-3">
        {intervals.map((interval) => (
          <Button
            key={interval.weeks}
            variant="outline"
            className={cn(
              'h-20 flex flex-col gap-1.5 hover:bg-primary/5 hover:border-primary/30',
              'transition-all duration-200',
            )}
            onClick={() => onBookInterval(interval)}
          >
            <CalendarCheck className="h-5 w-5 text-primary" />
            <span className="font-medium text-sm">{interval.label}</span>
            <span className="text-xs text-muted-foreground">{interval.dateLabel}</span>
          </Button>
        ))}
      </div>

      {/* Manual schedule + Skip */}
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
