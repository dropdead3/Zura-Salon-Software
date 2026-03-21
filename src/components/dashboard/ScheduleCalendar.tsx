import { useState, useMemo } from 'react';
import { 
  format, 
  startOfWeek, 
  addDays, 
  isSameDay, 
  parseISO,
  addWeeks,
  subWeeks,
  isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AssistantRequest } from '@/hooks/useAssistantRequests';

interface ScheduleCalendarProps {
  requests: AssistantRequest[];
  isStylistView: boolean;
}

// Time slots from 8 AM to 8 PM
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

function formatHour(hour: number) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12} ${ampm}`;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getEventStyle(request: AssistantRequest) {
  const startMinutes = parseTimeToMinutes(request.start_time);
  const endMinutes = parseTimeToMinutes(request.end_time);
  
  // Calculate position relative to 8 AM (480 minutes)
  const startOffset = startMinutes - 480; // 8 AM = 480 minutes
  const duration = endMinutes - startMinutes;
  
  // Each hour is 60px tall
  const top = (startOffset / 60) * 60;
  const height = Math.max((duration / 60) * 60, 24); // Minimum 24px height
  
  return { top: `${top}px`, height: `${height}px` };
}

const statusColors = {
  pending: 'bg-yellow-400/80 border-yellow-500 text-yellow-950',
  assigned: 'bg-green-400/80 border-green-500 text-green-950',
  completed: 'bg-blue-400/80 border-blue-500 text-blue-950',
  cancelled: 'bg-gray-300/80 border-gray-400 text-gray-600',
};

function CalendarEvent({ 
  request, 
  isStylistView 
}: { 
  request: AssistantRequest; 
  isStylistView: boolean;
}) {
  const style = getEventStyle(request);
  const startMinutes = parseTimeToMinutes(request.start_time);
  const endMinutes = parseTimeToMinutes(request.end_time);
  const duration = endMinutes - startMinutes;
  const isCompact = duration <= 30;

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'absolute left-1 right-1 rounded-full border-l-4 px-2 py-1 cursor-pointer transition-all hover:shadow-md overflow-hidden',
            statusColors[request.status],
            request.status === 'cancelled' && 'opacity-50'
          )}
          style={style}
        >
          {isCompact ? (
            <div className="text-xs font-medium truncate">
              {request.client_name}
            </div>
          ) : (
            <>
              <div className="text-xs font-medium truncate">{request.client_name}</div>
              <div className="text-xs opacity-80 truncate">{request.salon_services?.name}</div>
              {duration > 45 && (
                <div className="text-xs opacity-70">
                  {formatTime(request.start_time)} - {formatTime(request.end_time)}
                </div>
              )}
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <div className="space-y-1">
          <div className="font-medium">{request.client_name}</div>
          <div className="text-sm">{request.salon_services?.name}</div>
          <div className="text-sm text-muted-foreground">
            {formatTime(request.start_time)} - {formatTime(request.end_time)}
          </div>
          {isStylistView && request.assistant_profile && (
            <div className="text-sm flex items-center gap-1">
              <User className="h-3 w-3" />
              {request.assistant_profile.display_name || request.assistant_profile.full_name}
            </div>
          )}
          {!isStylistView && request.stylist_profile && (
            <div className="text-sm flex items-center gap-1">
              <User className="h-3 w-3" />
              {request.stylist_profile.display_name || request.stylist_profile.full_name}
            </div>
          )}
          <Badge variant="outline" className={cn('text-xs', statusColors[request.status])}>
            {request.status}
          </Badge>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function ScheduleCalendar({ requests, isStylistView }: ScheduleCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const goToPreviousWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Group requests by date
  const requestsByDate = useMemo(() => {
    const map = new Map<string, AssistantRequest[]>();
    requests.forEach(request => {
      const dateKey = request.request_date;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(request);
    });
    return map;
  }, [requests]);

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size={tokens.button.inline} onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size={tokens.button.inline} onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h3 className="font-medium text-lg">
          {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
        </h3>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500" />
          <span>Assigned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-400 border border-blue-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400" />
          <span>Cancelled</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto border rounded-lg bg-card">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/50 sticky top-0 z-10">
            <div className="p-2" /> {/* Time column spacer */}
            {weekDays.map((day) => (
              <div 
                key={day.toISOString()} 
                className={cn(
                  'p-2 text-center border-l',
                  isToday(day) && 'bg-primary/10'
                )}
              >
                <div className="text-xs text-muted-foreground uppercase">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  'text-lg font-medium',
                  isToday(day) && 'text-primary'
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
            {/* Time Labels */}
            <div className="relative">
              {HOURS.map((hour) => (
                <div 
                  key={hour} 
                  className="h-[60px] border-b text-xs text-muted-foreground pr-2 text-right pt-0 -mt-2"
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayRequests = requestsByDate.get(dateKey) || [];
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={cn(
                    'relative border-l',
                    isToday(day) && 'bg-primary/5'
                  )}
                >
                  {/* Hour lines */}
                  {HOURS.map((hour) => (
                    <div key={hour} className="h-[60px] border-b border-dashed border-border/50" />
                  ))}
                  
                  {/* Events */}
                  {dayRequests.map((request) => (
                    <CalendarEvent 
                      key={request.id} 
                      request={request} 
                      isStylistView={isStylistView} 
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}