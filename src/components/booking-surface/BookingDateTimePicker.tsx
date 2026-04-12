import { useState, useMemo } from 'react';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';
import { useAvailableSlots } from '@/hooks/useBookingAvailability';

interface BookingDateTimePickerProps {
  theme: BookingSurfaceTheme;
  orgId?: string;
  stylistId?: string | null;
  locationId?: string | null;
  serviceName?: string | null;
  onSelect: (date: string, time: string) => void;
}

export function BookingDateTimePicker({
  theme, orgId, stylistId, locationId, serviceName, onSelect,
}: BookingDateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(today, weekOffset * 7 + i));
  }, [weekOffset]);

  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  const { data: slotData, isLoading: slotsLoading } = useAvailableSlots(
    orgId, stylistId ?? null, locationId ?? null, serviceName ?? null, dateStr,
  );

  const availableSlots = slotData?.slots ?? [];

  const handleTimeSelect = (time: string) => {
    if (!selectedDate) return;
    setSelectedTime(time);
    onSelect(format(selectedDate, 'yyyy-MM-dd'), time);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Date selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
            className="p-2 rounded-full transition-colors disabled:opacity-30 hover:bg-black/5"
            style={{ color: theme.textColor }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium" style={{ color: theme.textColor }}>
            {format(days[0], 'MMM d')} – {format(days[6], 'MMM d, yyyy')}
          </span>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="p-2 rounded-full transition-colors hover:bg-black/5"
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
                className="flex flex-col items-center py-3 px-1 rounded-xl transition-all disabled:opacity-30"
                style={{
                  backgroundColor: isSelected ? theme.primaryColor : 'transparent',
                  color: isSelected ? '#fff' : theme.textColor,
                  border: `1.5px solid ${isSelected ? theme.primaryColor : theme.borderColor}`,
                }}
              >
                <span className="text-[11px]" style={{ color: isSelected ? '#fff' : theme.mutedTextColor }}>
                  {format(day, 'EEE')}
                </span>
                <span className="text-base font-medium mt-0.5">{format(day, 'd')}</span>
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

          {slotsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: theme.mutedTextColor }} />
              <span className="ml-2 text-sm" style={{ color: theme.mutedTextColor }}>
                Checking availability…
              </span>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: theme.mutedTextColor }}>
                No available times on this date. Try another day.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map((slot) => {
                const isActive = selectedTime === slot.time;
                return (
                  <button
                    key={slot.time}
                    onClick={() => handleTimeSelect(slot.time)}
                    className="py-3 px-3 text-sm font-medium rounded-xl transition-all active:scale-95"
                    style={{
                      backgroundColor: isActive ? theme.primaryColor : theme.surfaceColor,
                      color: isActive ? '#fff' : theme.textColor,
                      border: `1.5px solid ${isActive ? theme.primaryColor : theme.borderColor}`,
                    }}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
