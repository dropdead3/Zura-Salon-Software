import { useState, useMemo } from 'react';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useDayRateAvailability } from '@/hooks/useDayRateAvailability';
import { cn } from '@/lib/utils';

interface DateStepProps {
  locationId: string;
  selectedDate?: string;
  onSelect: (date: string) => void;
}

export function DateStep({ locationId, selectedDate, onSelect }: DateStepProps) {
  const { formatDate } = useFormatDate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd');
  
  const { data: availability, isLoading } = useDayRateAvailability(
    locationId,
    startDate,
    endDate
  );

  const availabilityMap = useMemo(() => {
    const map = new Map<string, { available: boolean; chairs: number }>();
    availability?.forEach(a => {
      map.set(a.date, { available: a.available, chairs: a.availableChairs });
    });
    return map;
  }, [availability]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayAvailability = availabilityMap.get(dateStr);
      if (dayAvailability?.available) {
        onSelect(dateStr);
      }
    }
  };

  const isDateDisabled = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayAvailability = availabilityMap.get(dateStr);
    return !dayAvailability?.available;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center">
        <Skeleton className="h-[300px] w-full max-w-sm" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm text-center">
        Select an available date for your booking
      </p>

      <div className="flex flex-col items-center">
        <div className="flex items-center justify-between w-full max-w-sm mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">
            {formatDate(currentMonth, 'MMMM yyyy')}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Calendar
          mode="single"
          selected={selectedDate ? new Date(selectedDate + 'T00:00:00') : undefined}
          onSelect={handleDateSelect}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          disabled={isDateDisabled}
          className={cn("p-3 pointer-events-auto rounded-lg border")}
          modifiers={{
            available: (date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              return availabilityMap.get(dateStr)?.available ?? false;
            },
          }}
          modifiersClassNames={{
            available: "bg-primary/10 text-primary hover:bg-primary/20",
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/10 border border-primary/20" />
          <span className="text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted" />
          <span className="text-muted-foreground">Unavailable</span>
        </div>
      </div>

      {!availability?.some(a => a.available) && (
        <div className="text-center py-4 text-muted-foreground">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No available dates this month</p>
          <p className="text-xs">Try checking the next month</p>
        </div>
      )}
    </div>
  );
}
