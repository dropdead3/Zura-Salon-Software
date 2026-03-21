import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeamCalendarEvents, EVENT_TYPE_COLORS, EVENT_TYPE_LABELS, type TeamCalendarEvent, type EventType } from '@/hooks/useTeamCalendar';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { EventTypeFilter } from '@/components/calendar/EventTypeFilter';
import { cn } from '@/lib/utils';

type CalendarView = 'month' | 'week';

export default function TeamCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>([]);

  // Calculate date range based on view
  const { rangeStart, rangeEnd, days } = useMemo(() => {
    let start: Date, end: Date;
    
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      start = startOfWeek(monthStart);
      end = endOfWeek(monthEnd);
    } else {
      start = startOfWeek(currentDate);
      end = endOfWeek(currentDate);
    }

    return {
      rangeStart: start,
      rangeEnd: end,
      days: eachDayOfInterval({ start, end }),
    };
  }, [currentDate, view]);

  const { data: events = [] } = useTeamCalendarEvents(
    format(rangeStart, 'yyyy-MM-dd'),
    format(rangeEnd, 'yyyy-MM-dd')
  );

  // Filter events by type
  const filteredEvents = useMemo(() => {
    if (selectedTypes.length === 0) return events;
    return events.filter(e => selectedTypes.includes(e.event_type as EventType));
  }, [events, selectedTypes]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, TeamCalendarEvent[]>();
    filteredEvents.forEach(event => {
      const dateKey = event.start_date;
      const existing = map.get(dateKey) || [];
      existing.push(event);
      map.set(dateKey, existing);
    });
    return map;
  }, [filteredEvents]);

  const selectedDateEvents = selectedDate 
    ? eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
    : [];

  const handlePrevious = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <DashboardPageHeader
          title="Team Calendar"
          description="View and manage team events, time off, and meetings"
          actions={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          }
        />

        {/* Controls */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* View Switcher */}
            <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
              <TabsList>
                <TabsTrigger value="month" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Month
                </TabsTrigger>
                <TabsTrigger value="week" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Week
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size={tokens.button.card} onClick={handleToday}>
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[150px] text-center">
                {view === 'month' 
                  ? format(currentDate, 'MMMM yyyy')
                  : `${format(rangeStart, 'MMM d')} - ${format(rangeEnd, 'MMM d, yyyy)}`
                }
              </span>
              <Button variant="ghost" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Type Filter */}
            <EventTypeFilter 
              selectedTypes={selectedTypes}
              onTypesChange={setSelectedTypes}
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <Card className="lg:col-span-3 p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2 hidden sm:block">
                  {day}
                </div>
              ))}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2 sm:hidden">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
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
                      "min-h-[80px] p-2 text-left rounded-lg border transition-colors",
                      !isCurrentMonth && view === 'month' && "bg-muted/30 text-muted-foreground",
                      isToday && "border-primary bg-primary/5",
                      isSelected && "ring-2 ring-primary",
                      "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "font-medium text-sm mb-1",
                      isToday && "text-primary"
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs truncate px-1 py-0.5 rounded"
                          style={{ 
                            backgroundColor: `${event.color || EVENT_TYPE_COLORS[event.event_type as EventType]}20`,
                            color: event.color || EVENT_TYPE_COLORS[event.event_type as EventType]
                          }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground px-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Selected Date Panel */}
          <Card className="p-4">
            <h3 className="font-medium mb-4">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
            </h3>
            
            {selectedDate ? (
              <>
                <Button 
                  variant="outline" 
                  className="w-full mb-4"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>

                {selectedDateEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No events scheduled
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map(event => (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg border"
                        style={{ 
                          borderLeftWidth: 4,
                          borderLeftColor: event.color || EVENT_TYPE_COLORS[event.event_type as EventType]
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm">{event.title}</h4>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {EVENT_TYPE_LABELS[event.event_type as EventType]}
                          </Badge>
                        </div>
                        {!event.all_day && event.start_time && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.start_time.slice(0, 5)} - {event.end_time?.slice(0, 5) || 'TBD'}
                          </p>
                        )}
                        {event.all_day && (
                          <p className="text-xs text-muted-foreground mt-1">All day</p>
                        )}
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Click on a date to view events
              </p>
            )}
          </Card>
        </div>
      </div>

      <CreateEventDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        defaultDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
      />
    </DashboardLayout>
  );
}
