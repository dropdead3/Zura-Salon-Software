import { useMemo } from 'react';
import { addDays, isToday, isTomorrow, parseISO } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn, formatPhoneDisplay } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, Clock, MapPin, User, ChevronRight, Repeat, Users, Star, ArrowRightLeft } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';
import type { PhorestAppointment, AppointmentStatus } from '@/hooks/usePhorestCalendar';
import { APPOINTMENT_STATUS_BADGE } from '@/lib/design-tokens';
import { getClientInitials, getAvatarColor, formatServicesWithDuration } from '@/lib/appointment-card-utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import type { ServiceLookupEntry } from '@/hooks/useServiceLookup';

interface AgendaViewProps {
  currentDate: Date;
  appointments: PhorestAppointment[];
  onAppointmentClick: (appointment: PhorestAppointment) => void;
  assistedAppointmentIds?: Set<string>;
  assistantNamesMap?: Map<string, string[]>;
  appointmentsWithAssistants?: Set<string>;
  serviceLookup?: Map<string, ServiceLookupEntry>;
}

const STATUS_CONFIG = APPOINTMENT_STATUS_BADGE;

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getDateLabel(dateStr: string, formatDate: (date: Date, pattern: string) => string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return formatDate(date, 'EEEE, MMMM d');
}

function AppointmentCard({ 
  appointment, 
  onClick,
  isAssisting = false,
  assistantNamesMap,
  hasAssistants = false,
  serviceLookup,
}: { 
  appointment: PhorestAppointment; 
  onClick: () => void;
  isAssisting?: boolean;
  assistantNamesMap?: Map<string, string[]>;
  hasAssistants?: boolean;
  serviceLookup?: Map<string, ServiceLookupEntry>;
}) {
  const statusConfig = STATUS_CONFIG[appointment.status];
  const isCancelledOrNoShow = appointment.status === 'cancelled' || appointment.status === 'no_show';

  return (
    <Card 
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        isCancelledOrNoShow && 'opacity-60'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 min-h-[56px]">
        <div className="flex items-start gap-4">
          {/* Time Column */}
          <div className="text-center shrink-0 w-16">
            <div className="text-lg font-medium">
              {formatTime12h(appointment.start_time).replace(' ', '')}
            </div>
            <div className="text-xs text-muted-foreground">
              to {formatTime12h(appointment.end_time).replace(' ', '')}
            </div>
            {(() => {
              const dur = (parseInt(appointment.end_time.split(':')[0]) * 60 + parseInt(appointment.end_time.split(':')[1])) - (parseInt(appointment.start_time.split(':')[0]) * 60 + parseInt(appointment.start_time.split(':')[1]));
              return dur > 0 ? <div className="text-[10px] text-muted-foreground mt-0.5">{dur} min</div> : null;
            })()}
          </div>

          {/* Divider */}
          <div className={cn(
            'w-1 self-stretch rounded-full',
            statusConfig.bg
          )} />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                {/* Client avatar initials */}
                <span className={cn('h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 mt-0.5', getAvatarColor(appointment.client_name))}>
                  {getClientInitials(appointment.client_name)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-medium text-base">{appointment.client_name}</h4>
                    {appointment.is_new_client && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">NEW</span>
                    )}
                    {appointment.recurrence_group_id && (
                      <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {(appointment as any).rescheduled_at && (
                      <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                    )}
                    {isAssisting && (
                      <span className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5 rounded-sm font-medium">ASSISTING</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatServicesWithDuration(appointment.service_name, serviceLookup) || appointment.service_name}
                  </p>
                  {(appointment as any).rescheduled_at && (appointment as any).rescheduled_from_time && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 italic flex items-center gap-1 mt-0.5">
                      <ArrowRightLeft className="h-3 w-3 shrink-0" />
                      Moved from {(appointment as any).rescheduled_from_date !== appointment.appointment_date ? `${(appointment as any).rescheduled_from_date} ` : ''}{formatTime12h((appointment as any).rescheduled_from_time)} · {formatRelativeTime((appointment as any).rescheduled_at)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {appointment.total_price != null && appointment.total_price > 0 && (
                  <BlurredAmount className="text-sm font-medium text-muted-foreground">
                    ${appointment.total_price.toFixed(0)}
                  </BlurredAmount>
                )}
                <Badge className={cn('shrink-0', statusConfig.bg, statusConfig.text)}>
                  {statusConfig.label}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {appointment.client_phone && (
                <a 
                  href={`tel:${appointment.client_phone}`}
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-3.5 w-3.5" />
                  {formatPhoneDisplay(appointment.client_phone)}
                </a>
              )}
              
              {appointment.stylist_profile && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={appointment.stylist_profile.photo_url || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {(appointment.stylist_profile.display_name || appointment.stylist_profile.full_name).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {appointment.stylist_profile.display_name || appointment.stylist_profile.full_name}
                </div>
              )}

              {/* Assistant names */}
              {hasAssistants && assistantNamesMap?.get(appointment.id) && (
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  w/ {assistantNamesMap.get(appointment.id)!.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Chevron */}
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export function AgendaView({
  currentDate,
  appointments,
  onAppointmentClick,
  assistedAppointmentIds,
  assistantNamesMap,
  appointmentsWithAssistants,
  serviceLookup,
}: AgendaViewProps) {
  const { formatDate } = useFormatDate();

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
        const dateLabel = getDateLabel(dateStr, formatDate);

        return (
          <div key={dateStr}>
            {/* Date Header */}
            <div className={cn(
              'sticky top-0 z-10 py-2 px-1 mb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
              isToday(date) && 'border-l-4 border-l-primary pl-3'
            )}>
              <h3 className="font-medium text-lg">{dateLabel}</h3>
              <p className="text-sm text-muted-foreground">
                {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Appointments List */}
            <div className="space-y-3">
              {dayAppointments.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onClick={() => onAppointmentClick(apt)}
                  isAssisting={assistedAppointmentIds?.has(apt.id) || false}
                  assistantNamesMap={assistantNamesMap}
                  hasAssistants={appointmentsWithAssistants?.has(apt.id) || false}
                  serviceLookup={serviceLookup}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
