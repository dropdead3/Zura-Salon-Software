import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { tokens } from '@/lib/design-tokens';
import { APPOINTMENT_STATUS_BADGE } from '@/lib/design-tokens';
import { AppointmentAuditTimeline } from './AppointmentAuditTimeline';
import { Calendar, Clock, User, MapPin, DollarSign, MessageSquare } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { cn } from '@/lib/utils';

interface AppointmentDetailDrawerProps {
  appointment: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function AppointmentDetailDrawer({ appointment, open, onOpenChange }: AppointmentDetailDrawerProps) {
  if (!appointment) return null;

  const status = appointment.status || 'booked';
  const statusBadge = APPOINTMENT_STATUS_BADGE[status as keyof typeof APPOINTMENT_STATUS_BADGE] || APPOINTMENT_STATUS_BADGE.booked;
  const clientName = appointment.client_name || appointment.phorest_clients?.name || 'Walk-in';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <SheetHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className={cn(tokens.heading.card, 'truncate')}>
                  {clientName}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {appointment.service_name || 'Service'}
                </SheetDescription>
              </div>
              <Badge className={cn('shrink-0', statusBadge.bg, statusBadge.text, statusBadge.border)} variant="outline">
                {statusBadge.label}
              </Badge>
            </div>
          </SheetHeader>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="timeline">Audit Trail</TabsTrigger>
            <TabsTrigger value="comms" disabled>Comms</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="flex-1 overflow-auto p-6 space-y-4">
            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>{appointment.appointment_date}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{formatTime12h(appointment.start_time)} – {formatTime12h(appointment.end_time)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4 shrink-0" />
                <span>{appointment.stylist_name || 'Unassigned'}</span>
              </div>
              {appointment.location_name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{appointment.location_name}</span>
                </div>
              )}
              {appointment.total_price != null && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <BlurredAmount>${appointment.total_price}</BlurredAmount>
                </div>
              )}
            </div>

            {/* Reschedule history */}
            {appointment.rescheduled_from_date && (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Moved from:</span>{' '}
                  {appointment.rescheduled_from_date} at {appointment.rescheduled_from_time}
                </div>
              </>
            )}

            {/* Notes */}
            {appointment.notes && (
              <>
                <Separator />
                <div>
                  <h4 className={tokens.heading.subsection}>Notes</h4>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{appointment.notes}</p>
                </div>
              </>
            )}

            {/* Communications placeholder */}
            <Separator />
            <div className="rounded-lg border border-dashed border-border p-4 text-center opacity-50">
              <MessageSquare className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Communications — Coming Soon</p>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="flex-1 overflow-auto p-6">
            <AppointmentAuditTimeline appointmentId={appointment.id} />
          </TabsContent>

          <TabsContent value="comms" className="flex-1 overflow-auto p-6">
            <div className={tokens.empty.container}>
              <MessageSquare className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>Coming Soon</h3>
              <p className={tokens.empty.description}>Client communications timeline will appear here once enabled.</p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
