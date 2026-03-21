import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTeamCalendarEvents, EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, type TeamCalendarEvent, type EventType } from '@/hooks/useTeamCalendar';
import { cn } from '@/lib/utils';
import { CreateEventDialog } from './CreateEventDialog';

interface TeamCalendarMiniProps {
  onEventClick?: (event: TeamCalendarEvent) => void;
  showCreateButton?: boolean;
}

export function TeamCalendarMini({ onEventClick, showCreateButton = true }: TeamCalendarMiniProps) {
  const { formatDate } = useFormatDate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const { data: events = [] } = useTeamCalendarEvents(
    format(calendarStart, 'yyyy-MM-dd'),
    format(calendarEnd, 'yyyy-MM-dd')
  );

  const days = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, TeamCalendarEvent[]>();
    events.forEach(event => {
      const dateKey = event.start_date;
      const existing = map.get(dateKey) || [];
      existing.push(event);
      map.set(dateKey, existing);
    });
    return map;
  }, [events]);

  const selectedDateEvents = selectedDate 
    ? eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
    : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Team Calendar</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {formatDate(currentDate, 'MMMM yyyy')}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "aspect-square p-1 text-sm rounded-md relative transition-colors",
                  !isCurrentMonth && "text-muted-foreground/50",
                  isToday && "bg-primary/10 font-medium",
                  isSelected && "ring-2 ring-primary",
                  "hover:bg-muted"
                )}
              >
                <span>{format(day, 'd')}</span>
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: event.color || EVENT_TYPE_COLORS[event.event_type as EventType] }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected date events */}
        {selectedDate && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-sm">
                {formatDate(selectedDate, 'MMMM d, yyyy')}
              </h5>
              {showCreateButton && (
                <Button variant="ghost" size={tokens.button.inline} onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events</p>
            ) : (
              <div className="space-y-2">
                {selectedDateEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className="w-full text-left p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: event.color || EVENT_TYPE_COLORS[event.event_type as EventType] }}
                      />
                      <span className="text-sm font-medium truncate">{event.title}</span>
                      <Badge variant="outline" className="text-xs ml-auto shrink-0">
                        {EVENT_TYPE_LABELS[event.event_type as EventType]}
                      </Badge>
                    </div>
                    {!event.all_day && event.start_time && (
                      <p className="text-xs text-muted-foreground mt-1 ml-4">
                        {event.start_time.slice(0, 5)} - {event.end_time?.slice(0, 5) || 'TBD'}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CreateEventDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        defaultDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
      />
    </Card>
  );
}
