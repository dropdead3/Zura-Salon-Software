import { useMemo } from 'react';
import { addDays, parseISO } from 'date-fns';
import { isOrgToday, isOrgTomorrow } from '@/lib/orgTime';
import { useOrgNow } from '@/hooks/useOrgNow';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn, formatDisplayName } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import type { AdminMeeting } from '@/hooks/useAdminMeetings';
import { MeetingAgendaCard } from './meetings/MeetingCard';
import type { PhorestAppointment, AppointmentStatus } from '@/hooks/usePhorestCalendar';
import { APPOINTMENT_STATUS_BADGE } from '@/lib/design-tokens';
import { AppointmentCardContent, getCardSize } from './AppointmentCardContent';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';
import type { ServiceLookupEntry } from '@/hooks/useServiceLookup';
import type { AssistantTimeBlock } from '@/hooks/useAssistantTimeBlocks';

interface AgendaViewProps {
  currentDate: Date;
  appointments: PhorestAppointment[];
  onAppointmentClick: (appointment: PhorestAppointment) => void;
  assistedAppointmentIds?: Set<string>;
  assistantNamesMap?: Map<string, string[]>;
  appointmentsWithAssistants?: Set<string>;
  serviceLookup?: Map<string, ServiceLookupEntry>;
  assistantTimeBlocks?: AssistantTimeBlock[];
  adminMeetings?: (AdminMeeting & { admin_meeting_attendees?: { user_id: string; rsvp_status: string }[] })[];
  onMeetingClick?: (meeting: AdminMeeting & { admin_meeting_attendees?: { user_id: string; rsvp_status: string }[] }) => void;
}

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getDateLabel(dateStr: string, formatDate: (date: Date, pattern: string) => string, timezone: string): string {
  const date = parseISO(dateStr);
  if (isOrgToday(date, timezone)) return 'Today';
  if (isOrgTomorrow(date, timezone)) return 'Tomorrow';
  return formatDate(date, 'EEEE, MMMM d');
}

export function AgendaView({
  currentDate,
  appointments,
  onAppointmentClick,
  assistedAppointmentIds,
  assistantNamesMap,
  appointmentsWithAssistants,
  serviceLookup,
  assistantTimeBlocks = [],
  adminMeetings = [],
  onMeetingClick,
}: AgendaViewProps) {
  const { formatDate } = useFormatDate();
  const { colorMap: categoryColors } = useServiceCategoryColorsMap();
  const { timezone } = useOrgNow();

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, PhorestAppointment[]>();
    
    // Sort appointments by date and time
    const sorted = [...appointments].sort((a, b) => {
      const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
      if (dateCompare !== 0) return dateCompare;
      return a.start_time.localeCompare(b.start_time);
    });

    sorted.forEach(apt => {
      const dateKey = apt.appointment_date;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(apt);
    });
    
    return map;
  }, [appointments]);

  // Get sorted dates
  const dates = useMemo(() => 
    Array.from(appointmentsByDate.keys()).sort(),
    [appointmentsByDate]
  );

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-lg font-medium mb-1">No appointments scheduled</h3>
        <p className="text-muted-foreground">
          There are no appointments in this time period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {dates.map((dateStr) => {
        const dayAppointments = appointmentsByDate.get(dateStr) || [];
        const date = parseISO(dateStr);
        const dateLabel = getDateLabel(dateStr, formatDate, timezone);

        return (
          <div key={dateStr}>
            {/* Date Header */}
            <div className={cn(
              'sticky top-0 z-10 py-2 px-1 mb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
              isOrgToday(date, timezone) && 'border-l-4 border-l-primary pl-3'
            )}>
              <h3 className="font-medium text-lg">{dateLabel}</h3>
              <p className="text-sm text-muted-foreground">
                {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Appointments List */}
            <div className="space-y-3">
              {dayAppointments.map((apt) => {
                const isOverdue = isOrgToday(apt.appointment_date, timezone) &&
                  (apt.status === 'booked' || apt.status === 'confirmed') &&
                  orgNowMins > (() => { const [h, m] = apt.start_time.split(':').map(Number); return h * 60 + m; })();
                return (
                  <AppointmentCardContent
                    key={apt.id}
                    appointment={apt}
                    variant="agenda"
                    size={getCardSize(apt.start_time, apt.end_time)}
                    onClick={() => onAppointmentClick(apt)}
                    isAssisting={assistedAppointmentIds?.has(apt.id) || false}
                    assistantNamesMap={assistantNamesMap}
                    hasAssistants={appointmentsWithAssistants?.has(apt.id) || false}
                    serviceLookup={serviceLookup}
                    categoryColors={categoryColors}
                    isOverdueForCheckin={isOverdue}
                  />
                );
              })}

              {/* Admin Meetings */}
              {adminMeetings
                .filter(m => m.start_date === dateStr)
                .map(meeting => (
                  <MeetingAgendaCard
                    key={meeting.id}
                    meeting={meeting}
                    onClick={() => onMeetingClick?.(meeting)}
                  />
                ))}

              {/* Assistant Time Blocks */}
              {assistantTimeBlocks
                .filter(b => b.date === dateStr)
                .map(block => {
                  const isUnassigned = !block.assistant_user_id;
                  const requesterName = block.requesting_profile
                    ? formatDisplayName(block.requesting_profile.full_name, block.requesting_profile.display_name)
                    : 'Unknown';
                  const assistantName = block.assistant_profile
                    ? formatDisplayName(block.assistant_profile.full_name, block.assistant_profile.display_name)
                    : null;

                  return (
                    <Card key={block.id} className={cn(
                      'border-dashed',
                      isUnassigned ? 'border-amber-400/60 bg-amber-50/50 dark:bg-amber-900/10' : 'border-primary/30 bg-primary/5'
                    )}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="text-center shrink-0 w-16">
                            <div className="text-sm font-medium">{formatTime12h(block.start_time).replace(' ', '')}</div>
                            <div className="text-xs text-muted-foreground">to {formatTime12h(block.end_time).replace(' ', '')}</div>
                          </div>
                          <div className={cn('w-1 self-stretch rounded-full', isUnassigned ? 'bg-amber-400/60' : 'bg-primary/40')} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium">Assistant Coverage</span>
                              <Badge variant="outline" className={cn('text-[10px]', isUnassigned ? 'text-amber-700 dark:text-amber-300 border-amber-300' : 'text-primary border-primary/30')}>
                                {block.status === 'confirmed' ? 'Confirmed' : 'Requested'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Requested by {requesterName}
                              {assistantName && ` · Assigned to ${assistantName}`}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
