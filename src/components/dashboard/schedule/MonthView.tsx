import { useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay
} from 'date-fns';
import { useOrgNow } from '@/hooks/useOrgNow';
import { cn } from '@/lib/utils';
import { ClosedBadge } from '@/components/dashboard/ClosedBadge';
import { isClosedOnDate, type HoursJson, type HolidayClosure } from '@/hooks/useLocations';
import type { PhorestAppointment, AppointmentStatus } from '@/hooks/usePhorestCalendar';
import { APPOINTMENT_STATUS_COLORS } from '@/lib/design-tokens';

interface MonthViewProps {
  currentDate: Date;
  appointments: PhorestAppointment[];
  onDayClick: (date: Date) => void;
  onAppointmentClick: (appointment: PhorestAppointment) => void;
  locationHoursJson?: HoursJson | null;
  locationHolidayClosures?: HolidayClosure[] | null;
}

// Derived from the canonical APPOINTMENT_STATUS_COLORS map — extracts the
// saturated `bg-*` class (first token, light-mode) for the day-cell dot.
const STATUS_DOT_COLORS: Record<AppointmentStatus, string> = Object.fromEntries(
  (Object.entries(APPOINTMENT_STATUS_COLORS) as [AppointmentStatus, { bg: string }][]).map(
    ([key, { bg }]) => [key, bg.split(' ').find((c) => c.startsWith('bg-')) ?? 'bg-muted'],
  ),
) as Record<AppointmentStatus, string>;

export function MonthView({
  currentDate,
  appointments,
  onDayClick,
  onAppointmentClick,
  locationHoursJson,
  locationHolidayClosures,
}: MonthViewProps) {
  const { isToday: orgIsToday } = useOrgNow();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Generate all days in the calendar view
  const days = useMemo(() => {
    const result: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      result.push(day);
      day = addDays(day, 1);
    }
    return result;
  }, [calendarStart, calendarEnd]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, PhorestAppointment[]>();
    appointments.forEach(apt => {
      const dateKey = apt.appointment_date;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(apt);
    });
    return map;
  }, [appointments]);

  // Split days into weeks
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const weekDayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {weekDayHeaders.map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-rows-[repeat(auto-fill,minmax(100px,1fr))]">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayAppointments = appointmentsByDate.get(dateKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = orgIsToday(day);
              const closureInfo = isClosedOnDate(locationHoursJson ?? null, locationHolidayClosures ?? null, day);
              
              // Count by status for the dots
              const statusCounts = dayAppointments.reduce((acc, apt) => {
                acc[apt.status] = (acc[apt.status] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[100px] p-1.5 border-r last:border-r-0 cursor-pointer hover:bg-muted/50 transition-colors',
                    !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                    isCurrentDay && 'bg-primary/5',
                    closureInfo.isClosed && isCurrentMonth && 'bg-muted/40'
                  )}
                  style={closureInfo.isClosed && isCurrentMonth ? {
                    background: `repeating-linear-gradient(-45deg, transparent, transparent 4px, hsl(var(--muted-foreground) / 0.06) 4px, hsl(var(--muted-foreground) / 0.06) 5px)`,
                  } : undefined}
                  onClick={() => onDayClick(day)}
                >
                  {/* Day Number */}
                  <div className="flex items-center gap-1">
                    <div className={cn(
                      'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                      isCurrentDay && 'bg-primary text-primary-foreground'
                    )}>
                      {format(day, 'd')}
                    </div>
                    {closureInfo.isClosed && isCurrentMonth && (
                      <ClosedBadge reason={closureInfo.reason} />
                    )}
                  </div>

                  {/* Appointment Indicators */}
                  {dayAppointments.length > 0 && (
                    <div className="space-y-0.5">
                      {/* Show up to 3 appointments */}
                      {dayAppointments.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80',
                            STATUS_DOT_COLORS[apt.status].replace('bg-', 'bg-opacity-20 bg-'),
                            'border-l-2',
                          apt.status === 'confirmed' && 'border-l-green-500 bg-green-50 dark:bg-green-950/50',
                          apt.status === 'booked' && 'border-l-slate-400 bg-slate-50 dark:bg-slate-900/50',
                          apt.status === 'checked_in' && 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/50',
                          apt.status === 'completed' && 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/50',
                          apt.status === 'cancelled' && 'border-l-gray-300 bg-gray-50 dark:bg-gray-900/50 opacity-60',
                          apt.status === 'no_show' && 'border-l-red-500 bg-red-50 dark:bg-red-950/50',
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt);
                          }}
                        >
                          {apt.client_name}
                        </div>
                      ))}
                      
                      {/* Show "+X more" if there are more */}
                      {dayAppointments.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1.5">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status dots summary */}
                  {dayAppointments.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                      {Object.entries(statusCounts).map(([status, count]) => (
                        <div
                          key={status}
                          className={cn('w-2 h-2 rounded-full', STATUS_DOT_COLORS[status as AppointmentStatus])}
                          title={`${count} ${status.replace('_', ' ')}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
