import { useState, useMemo } from 'react';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';

interface BookingDateTimePickerProps {
  theme: BookingSurfaceTheme;
  onSelect: (date: string, time: string) => void;
}

const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM',
];

export function BookingDateTimePicker({ theme, onSelect }: BookingDateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(today, weekOffset * 7 + i));
  }, [weekOffset]);

  return (
    <div className="flex flex-col gap-5">
      {/* Date selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
            className="p-1.5 rounded-full transition-colors disabled:opacity-30"
            style={{ color: theme.textColor }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium" style={{ color: theme.textColor }}>
            {format(days[0], 'MMM d')} – {format(days[6], 'MMM d, yyyy')}
          </span>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="p-1.5 rounded-full transition-colors"
            style={{ color: theme.textColor }}
            disabled={weekOffset >= 8}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isPast = day < startOfDay(new Date());

            return (
              <button
                key={day.toISOString()}
                onClick={() => !isPast && setSelectedDate(day)}
                disabled={isPast}
                className="flex flex-col items-center py-2.5 px-1 rounded-lg transition-colors disabled:opacity-30"
                style={{
                  backgroundColor: isSelected ? theme.primaryColor : 'transparent',
                  color: isSelected ? '#fff' : theme.textColor,
                  border: `1px solid ${isSelected ? theme.primaryColor : 'transparent'}`,
                }}
              >
                <span className="text-xs" style={{ color: isSelected ? '#fff' : theme.mutedTextColor }}>
                  {format(day, 'EEE')}
                </span>
                <span className="text-sm font-medium mt-0.5">{format(day, 'd')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: theme.textColor }}>
            Available Times for {format(selectedDate, 'EEEE, MMMM d')}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {TIME_SLOTS.map((time) => (
              <button
                key={time}
                onClick={() => onSelect(format(selectedDate, 'yyyy-MM-dd'), time)}
                className="py-2.5 px-3 text-sm font-medium rounded-lg transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: theme.surfaceColor,
                  color: theme.textColor,
                  border: `1px solid ${theme.borderColor}`,
                }}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
