import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { 
  format, 
  parseISO, 
  isSameDay, 
  isSameMonth,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, 
  Calendar as CalendarIcon,
  XCircle,
  Target,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  PlatformCard, 
  PlatformCardHeader, 
  PlatformCardTitle, 
  PlatformCardContent 
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { cn } from '@/lib/utils';
import type { OnboardingOrganization } from '@/hooks/useOnboardingOrganizations';

export type CalendarEventType = 'go_live' | 'contract_start' | 'contract_end' | 'trial_end' | 'created';

export interface CalendarEvent {
  id: string;
  organizationId: string;
  organizationName: string;
  accountNumber: number | null;
  date: Date;
  type: CalendarEventType;
  isOverdue?: boolean;
}

const eventTypeConfig: Record<CalendarEventType, { 
  label: string; 
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}> = {
  go_live: { 
    label: 'Go-Live', 
    icon: Rocket,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
  },
  contract_start: { 
    label: 'Contract Start', 
    icon: Target,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
  contract_end: { 
    label: 'Contract End', 
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  trial_end: { 
    label: 'Trial Ends', 
    icon: CalendarIcon,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  created: { 
    label: 'Created', 
    icon: CheckCircle2,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
  },
};

interface OnboardingCalendarProps {
  organizations: OnboardingOrganization[];
  billingData?: Map<string, { 
    contract_start_date?: string | null;
    contract_end_date?: string | null;
    trial_ends_at?: string | null;
  }>;
}

export function OnboardingCalendar({ organizations, billingData }: OnboardingCalendarProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const navigate = useNavigate();

  // Build calendar events from organizations
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    organizations.forEach(org => {
      // Go-live date
      if (org.go_live_date) {
        allEvents.push({
          id: `${org.id}-go_live`,
          organizationId: org.id,
          organizationName: org.name,
          accountNumber: org.account_number,
          date: parseISO(org.go_live_date),
          type: 'go_live',
          isOverdue: org.isOverdue,
        });
      }

      // Created date
      if (org.created_at) {
        allEvents.push({
          id: `${org.id}-created`,
          organizationId: org.id,
          organizationName: org.name,
          accountNumber: org.account_number,
          date: new Date(org.created_at),
          type: 'created',
        });
      }

      // Billing data if available
      const billing = billingData?.get(org.id);
      if (billing) {
        if (billing.contract_start_date) {
          allEvents.push({
            id: `${org.id}-contract_start`,
            organizationId: org.id,
            organizationName: org.name,
            accountNumber: org.account_number,
            date: parseISO(billing.contract_start_date),
            type: 'contract_start',
          });
        }
        if (billing.contract_end_date) {
          allEvents.push({
            id: `${org.id}-contract_end`,
            organizationId: org.id,
            organizationName: org.name,
            accountNumber: org.account_number,
            date: parseISO(billing.contract_end_date),
            type: 'contract_end',
          });
        }
        if (billing.trial_ends_at) {
          allEvents.push({
            id: `${org.id}-trial_end`,
            organizationId: org.id,
            organizationName: org.name,
            accountNumber: org.account_number,
            date: new Date(billing.trial_ends_at),
            type: 'trial_end',
          });
        }
      }
    });

    return allEvents;
  }, [organizations, billingData]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  // Get events for the selected month
  const monthEvents = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return events.filter(event => 
      event.date >= start && event.date <= end
    );
  }, [events, selectedMonth]);

  // Get days that have events
  const daysWithEvents = useMemo(() => {
    const days = new Set<string>();
    events.forEach(event => {
      days.add(format(event.date, 'yyyy-MM-dd'));
    });
    return days;
  }, [events]);

  // Selected date events
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setSelectedMonth(new Date());
    setSelectedDate(new Date());
  };

  return (
    <PlatformCard className="lg:col-span-3">
      <PlatformCardHeader className="flex flex-row items-center justify-between">
        <PlatformCardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-violet-400" />
          Organization Calendar
        </PlatformCardTitle>
        <div className="flex items-center gap-2">
          <PlatformButton variant="ghost" size="sm" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </PlatformButton>
          <PlatformButton variant="ghost" size="sm" onClick={handleToday}>
            Today
          </PlatformButton>
          <PlatformButton variant="ghost" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </PlatformButton>
        </div>
      </PlatformCardHeader>
      <PlatformCardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium text-white">
                {format(selectedMonth, 'MMMM yyyy')}
              </h3>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={selectedMonth}
              onMonthChange={setSelectedMonth}
              className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 pointer-events-auto"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4 w-full",
                caption: "hidden",
                caption_label: "text-sm font-medium text-white",
                nav: "hidden",
                table: "w-full border-collapse space-y-1",
                head_row: "flex w-full",
                head_cell: "text-slate-500 rounded-md w-full font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: cn(
                  "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-full",
                  "[&:has([aria-selected])]:bg-violet-500/20 [&:has([aria-selected])]:rounded-md"
                ),
                day: cn(
                  "h-10 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-slate-700/50 rounded-md transition-colors",
                  "text-slate-300"
                ),
                day_selected: "bg-violet-600 text-white hover:bg-violet-600 hover:text-white focus:bg-violet-600 focus:text-white",
                day_today: "bg-slate-700/50 text-white font-medium",
                day_outside: "text-slate-600 opacity-50",
                day_disabled: "text-slate-600 opacity-50",
                day_hidden: "invisible",
              }}
              components={{
                DayContent: ({ date }) => {
                  const dayEvents = getEventsForDate(date);
                  const hasEvents = dayEvents.length > 0;
                  const hasOverdue = dayEvents.some(e => e.isOverdue);
                  const hasGoLive = dayEvents.some(e => e.type === 'go_live');
                  
                  return (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      <span>{date.getDate()}</span>
                      {hasEvents && (
                        <div className="absolute bottom-0.5 flex gap-0.5">
                          {hasOverdue ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          ) : hasGoLive ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          )}
                          {dayEvents.length > 1 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />

            {/* Event Type Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-700/50">
              {Object.entries(eventTypeConfig).map(([type, config]) => (
                <div key={type} className="flex items-center gap-2 text-sm">
                  <div className={cn('w-3 h-3 rounded-full', config.bgColor)} />
                  <span className="text-slate-400">{config.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Events List */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <h4 className="text-sm font-medium text-slate-400 mb-3">
                {selectedDate 
                  ? format(selectedDate, 'EEEE, MMMM d')
                  : 'Select a date'
                }
              </h4>
              
              {selectedDate && selectedDateEvents.length > 0 ? (
                <div className="space-y-2">
                  {selectedDateEvents.map(event => {
                    const config = eventTypeConfig[event.type];
                    const Icon = config.icon;
                    
                    return (
                      <button
                        key={event.id}
                        onClick={() => navigate(`/dashboard/platform/accounts/${event.organizationId}`)}
                        className="w-full flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-left group"
                      >
                        <div className={cn('p-2 rounded-lg shrink-0', config.bgColor)}>
                          <Icon className={cn('h-4 w-4', config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">
                            {event.organizationName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn('text-xs', config.color)}>
                              {config.label}
                            </span>
                            {event.accountNumber && (
                              <span className="text-xs text-slate-500">
                                #{event.accountNumber}
                              </span>
                            )}
                          </div>
                          {event.isOverdue && (
                            <PlatformBadge variant="error" className="mt-1 text-xs">
                              Overdue
                            </PlatformBadge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : selectedDate ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No events on this date
                </p>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">
                  Click a date to view events
                </p>
              )}

              {/* Month Summary */}
              {monthEvents.length > 0 && !selectedDate && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-slate-400 mb-3">
                    This Month
                  </h4>
                  <div className="space-y-2">
                    {monthEvents.slice(0, 5).map(event => {
                      const config = eventTypeConfig[event.type];
                      const Icon = config.icon;
                      
                      return (
                        <button
                          key={event.id}
                          onClick={() => {
                            setSelectedDate(event.date);
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors text-left"
                        >
                          <div className={cn('p-1.5 rounded', config.bgColor)}>
                            <Icon className={cn('h-3 w-3', config.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">
                              {event.organizationName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {format(event.date, 'MMM d')} • {config.label}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                    {monthEvents.length > 5 && (
                      <p className="text-xs text-slate-500 text-center pt-2">
                        +{monthEvents.length - 5} more events
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
