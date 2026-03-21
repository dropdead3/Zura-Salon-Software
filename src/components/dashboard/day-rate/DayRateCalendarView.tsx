import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  parseISO 
} from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronLeft, 
  ChevronRight,
  User,
  MapPin
} from 'lucide-react';
import { useBookingsByDateRange, type DayRateBooking, type DayRateBookingStatus } from '@/hooks/useDayRateBookings';
import { useLocations } from '@/hooks/useLocations';
import { BookingDetailSheet } from './BookingDetailSheet';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<DayRateBookingStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  confirmed: 'bg-primary/20 text-primary border-primary/30',
  checked_in: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-600 border-green-500/30',
  cancelled: 'bg-muted text-muted-foreground border-muted',
  no_show: 'bg-destructive/20 text-destructive border-destructive/30',
};

export function DayRateCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<DayRateBooking | null>(null);

  const { data: locations } = useLocations();

  // Calculate date range for current month view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const { data: bookings, isLoading } = useBookingsByDateRange(
    format(calendarStart, 'yyyy-MM-dd'),
    format(calendarEnd, 'yyyy-MM-dd'),
    selectedLocationId !== 'all' ? selectedLocationId : undefined
  );

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, DayRateBooking[]>();
    bookings?.forEach(booking => {
      const dateStr = booking.booking_date;
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(booking);
    });
    return map;
  }, [bookings]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  const getLocationName = (locationId: string) => {
    return locations?.find(l => l.id === locationId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-display text-xl tracking-wide min-w-[180px] text-center">
            {format(currentDate, 'MMMM yyyy').toUpperCase()}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-[200px]">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations?.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        {isLoading ? (
          <div className="p-8">
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayBookings = bookingsByDate.get(dateStr) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[120px] p-2 border-b border-r",
                    !isCurrentMonth && "bg-muted/30",
                    isToday && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "text-sm mb-2",
                    !isCurrentMonth && "text-muted-foreground",
                    isToday && "font-medium text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-1">
                    {dayBookings.slice(0, 3).map(booking => (
                      <button
                        key={booking.id}
                        onClick={() => setSelectedBooking(booking)}
                        className={cn(
                          "w-full text-left text-xs p-1.5 rounded border truncate transition-opacity hover:opacity-80",
                          STATUS_COLORS[booking.status]
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{booking.stylist_name}</span>
                        </div>
                      </button>
                    ))}
                    {dayBookings.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayBookings.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded border", color)} />
            <span className="text-xs text-muted-foreground capitalize">
              {status.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>

      {/* Booking Detail Sheet */}
      <BookingDetailSheet
        booking={selectedBooking}
        locationName={selectedBooking ? getLocationName(selectedBooking.location_id) : ''}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
