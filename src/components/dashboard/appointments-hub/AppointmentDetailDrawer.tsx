import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { tokens } from '@/lib/design-tokens';
import { APPOINTMENT_STATUS_BADGE } from '@/lib/design-tokens';
import { AppointmentAuditTimeline } from './AppointmentAuditTimeline';
import { AppointmentNotesPanel } from './AppointmentNotesPanel';
import { Calendar, Clock, User, MapPin, DollarSign, MessageSquare, Tag, Percent, Phone, Mail, FileText, UserCheck, Info, StickyNote, ExternalLink } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

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

function formatFullDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MM/dd/yyyy · h:mm a');
  } catch {
    return '—';
  }
}

function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MM/dd/yyyy');
  } catch {
    return '—';
  }
}

/** Inline detail row used in the drawer sections */
function DetailRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
      <div className="min-w-0">
        <span className="text-muted-foreground">{label}</span>
        <div className="text-foreground mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export function AppointmentDetailDrawer({ appointment, open, onOpenChange }: AppointmentDetailDrawerProps) {
  const navigate = useNavigate();

  // Resolve phorest_client_id to client directory ID
  const phorestClientId = appointment?.phorest_client_id || appointment?.client_id;
  const { data: resolvedClientId } = useQuery({
    queryKey: ['resolve-client-directory-id', phorestClientId],
    queryFn: async () => {
      if (!phorestClientId) return null;
      const { data } = await supabase
        .from('phorest_clients')
        .select('id')
        .eq('phorest_client_id', phorestClientId)
        .maybeSingle();
      return data?.id || null;
    },
    enabled: !!phorestClientId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch promo details if transaction items exist for this appointment
  const { data: promoInfo } = useQuery({
    queryKey: ['appointment-promo', appointment?.id],
    queryFn: async () => {
      if (!appointment?.transaction_id && !appointment?.phorest_appointment_id) return null;
      
      const lookupId = appointment.transaction_id || appointment.phorest_appointment_id;
      if (!lookupId) return null;

      const { data: items } = await supabase
        .from('phorest_transaction_items')
        .select('discount, promotion_id')
        .eq('transaction_id', lookupId)
        .not('promotion_id', 'is', null)
        .limit(1);

      if (!items || items.length === 0) return null;
      const item = items[0];

      const { data: promo } = await supabase
        .from('promotions' as any)
        .select('name, promo_code, discount_value, promotion_type')
        .eq('id', item.promotion_id)
        .single();

      if (!promo) return null;
      return {
        name: (promo as any).name,
        code: (promo as any).promo_code,
        discount: Number(item.discount) || 0,
      };
    },
    enabled: !!appointment,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch confirmation event from audit log
  const { data: confirmationEvent } = useQuery({
    queryKey: ['appointment-confirmation', appointment?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('appointment_audit_log')
        .select('created_at, actor_name, event_type, new_value')
        .eq('appointment_id', appointment!.id)
        .eq('event_type', 'status_changed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!data) return null;
      const confirmed = data.find((e: any) => {
        const nv = e.new_value as any;
        return nv?.status === 'confirmed';
      });
      if (!confirmed) return null;
      return {
        confirmedAt: confirmed.created_at,
        confirmedBy: confirmed.actor_name || 'System',
        method: confirmed.actor_name === 'System' || !confirmed.actor_name ? 'Auto-confirmed' : 'Manual',
      };
    },
    enabled: !!appointment?.id,
    staleTime: 60_000,
  });

  if (!appointment) return null;

  const status = appointment.status || 'booked';
  const statusBadge = APPOINTMENT_STATUS_BADGE[status as keyof typeof APPOINTMENT_STATUS_BADGE] || APPOINTMENT_STATUS_BADGE.booked;
  const clientName = appointment.client_name || 'Walk-in';

  return (
    <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="512px">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <h2 className={cn(tokens.heading.card, 'truncate')}>
                {clientName}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {appointment.service_name || 'Service'}
              </p>
            </div>
            <Badge className={cn('shrink-0', statusBadge.bg, statusBadge.text, statusBadge.border)} variant="outline">
              {statusBadge.label}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5">
              <StickyNote className="h-3.5 w-3.5" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="timeline">Audit Trail</TabsTrigger>
            <TabsTrigger value="comms" disabled>Comms</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="flex-1 overflow-auto p-6 space-y-5">
            {/* ── Client Info ── */}
            <div className="space-y-3">
              <h4 className={tokens.heading.subsection}>Client Info</h4>
              <div className="space-y-2">
                <DetailRow icon={User} label="Name">
                  {clientName}
                </DetailRow>
                <DetailRow icon={Phone} label="Phone">
                  {appointment.client_phone ? (
                    <a href={`tel:${appointment.client_phone}`} className="text-primary hover:underline">
                      {appointment.client_phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not provided</span>
                  )}
                </DetailRow>
                <DetailRow icon={Mail} label="Email">
                  {appointment.client_email ? (
                    <a href={`mailto:${appointment.client_email}`} className="text-primary hover:underline">
                      {appointment.client_email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not provided</span>
                  )}
                </DetailRow>
              </div>
              {resolvedClientId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 gap-1.5 rounded-xl border-border/60"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/dashboard/clients?clientId=${resolvedClientId}`);
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View in Client Directory
                </Button>
              )}
            </div>

            <Separator />

            {/* ── Appointment Details ── */}
            <div className="space-y-3">
              <h4 className={tokens.heading.subsection}>Appointment Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>{formatDateDisplay(appointment.appointment_date)}</span>
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
            </div>

            {/* Promo / Discount context */}
            {promoInfo && (
              <>
                <Separator />
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-primary shrink-0" />
                    <span className={tokens.body.emphasis}>{promoInfo.name}</span>
                    {promoInfo.code && (
                      <Badge variant="outline" className="gap-1 border-primary/30 text-primary bg-primary/5 text-[10px] px-1.5 py-0">
                        <Tag className="w-3 h-3" />
                        {promoInfo.code}
                      </Badge>
                    )}
                  </div>
                  {promoInfo.discount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Discount applied: <BlurredAmount><span className="text-amber-600 font-medium text-sm">-${promoInfo.discount.toFixed(2)}</span></BlurredAmount>
                    </p>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* ── Booking Provenance ── */}
            <div className="space-y-3">
              <h4 className={tokens.heading.subsection}>Booking Provenance</h4>
              <div className="space-y-2">
                <DetailRow icon={Calendar} label="Created At">
                  {formatFullDateTime(appointment.created_at)}
                </DetailRow>
                <DetailRow icon={UserCheck} label="Created By">
                  {appointment.created_by_name || '—'}
                </DetailRow>
                <DetailRow icon={Info} label="Source">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {appointment._source === 'phorest' ? 'Phorest' : 'Local'}
                    </Badge>
                    {appointment.import_source && appointment.import_source !== 'manual' && (
                      <Badge variant="outline" className="text-[10px]">
                        {appointment.import_source}
                      </Badge>
                    )}
                  </div>
                </DetailRow>
                {appointment.payment_method && (
                  <DetailRow icon={DollarSign} label="Payment Method">
                    {appointment.payment_method}
                  </DetailRow>
                )}
              </div>
            </div>

            <Separator />

            {/* ── Confirmation Details ── */}
            <div className="space-y-3">
              <h4 className={tokens.heading.subsection}>Confirmation Details</h4>
              <div className="space-y-2">
                <DetailRow icon={FileText} label="Status">
                  <Badge className={cn('text-[10px]', statusBadge.bg, statusBadge.text, statusBadge.border)} variant="outline">
                    {statusBadge.label}
                  </Badge>
                </DetailRow>
                {confirmationEvent ? (
                  <>
                    <DetailRow icon={Clock} label="Confirmed At">
                      {formatFullDateTime(confirmationEvent.confirmedAt)}
                    </DetailRow>
                    <DetailRow icon={UserCheck} label="Confirmed By">
                      {confirmationEvent.confirmedBy}
                    </DetailRow>
                    <DetailRow icon={Info} label="Method">
                      {confirmationEvent.method}
                    </DetailRow>
                  </>
                ) : status !== 'confirmed' && status !== 'completed' ? (
                  <DetailRow icon={Clock} label="Confirmation">
                    <span className="text-muted-foreground">Pending</span>
                  </DetailRow>
                ) : null}
              </div>
            </div>

            {/* Reschedule history */}
            {appointment.rescheduled_from_date && (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  <span className={tokens.label.default}>Moved from:</span>{' '}
                  {formatDateDisplay(appointment.rescheduled_from_date)} at {appointment.rescheduled_from_time}
                </div>
              </>
            )}

            {/* Notes (inline, read-only display of existing notes field) */}
            {appointment.notes && (
              <>
                <Separator />
                <div>
                  <h4 className={tokens.heading.subsection}>Booking Notes</h4>
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

          {/* Notes Tab */}
          <TabsContent value="notes" className="flex-1 overflow-auto p-6">
            <AppointmentNotesPanel appointmentId={appointment.id} />
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
    </PremiumFloatingPanel>
  );
}
