import { useState } from 'react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { EditServicesDialog } from '@/components/shared/EditServicesDialog';
import { useUpdateAppointmentServices, type ServiceEntry } from '@/hooks/useUpdateAppointmentServices';
import { useAppointmentTransactionBreakdown } from '@/hooks/useAppointmentTransactionBreakdown';
import { TransactionBreakdownPanel } from './TransactionBreakdownPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, SubTabsList, SubTabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { tokens } from '@/lib/design-tokens';
import { APPOINTMENT_STATUS_BADGE } from '@/lib/design-tokens';
import { AppointmentAuditTimeline } from './AppointmentAuditTimeline';
import { AppointmentNotesPanel } from './AppointmentNotesPanel';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, Clock, User, MapPin, DollarSign, MessageSquare, Tag, Percent, Phone, Mail, FileText, UserCheck, Info, ExternalLink, XCircle, Hash, Copy, Star, Send, Loader2, CheckCircle2, Pencil } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { useClientReviewHistory, useAppointmentFeedbackStatus } from '@/hooks/useClientReviewHistory';
import { toast } from 'sonner';

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
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [editServicesOpen, setEditServicesOpen] = useState(false);
  const updateServicesMutation = useUpdateAppointmentServices();

  // Transaction breakdown hook
  const phorestClientIdForTx = appointment?.phorest_client_id || appointment?.client_id;
  const { data: txBreakdown, isLoading: txLoading } = useAppointmentTransactionBreakdown(
    phorestClientIdForTx,
    appointment?.appointment_date
  );

  // Resolve organization_id from the appointment
  const orgId = appointment?.organization_id || null;

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

  // Client review history
  const { data: reviewSummary } = useClientReviewHistory(resolvedClientId);

  // Feedback status for THIS appointment
  const { data: feedbackStatus } = useAppointmentFeedbackStatus(appointment?.id);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const handleRequestFeedback = async () => {
    if (!appointment || !resolvedClientId || !orgId) return;
    const clientEmail = appointment.client_email;
    const clientName = appointment.client_name || 'Client';
    if (!clientEmail) {
      toast.error('No email on file for this client');
      return;
    }
    setSendingFeedback(true);
    try {
      const { error } = await supabase.functions.invoke('send-feedback-request', {
        body: {
          organizationId: orgId,
          clientId: resolvedClientId,
          clientEmail,
          clientName,
          appointmentId: appointment.id,
          staffUserId: appointment.staff_user_id || null,
          staffName: appointment.staff_name || appointment.staff_name || null,
          serviceName: appointment.service_name || null,
          baseUrl: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success('Feedback request sent', { description: `Email sent to ${clientEmail}` });
      queryClient.invalidateQueries({ queryKey: ['appointment-feedback-status', appointment.id] });
      queryClient.invalidateQueries({ queryKey: ['client-reviews', resolvedClientId] });
    } catch (err: any) {
      toast.error('Failed to send feedback request', { description: err.message });
    } finally {
      setSendingFeedback(false);
    }
  };

  // Fetch promo details if transaction items exist for this appointment
  const { data: promoInfo } = useQuery({
    queryKey: ['appointment-promo', appointment?.id],
    queryFn: async () => {
      if (!appointment?.transaction_id && !appointment?.phorest_appointment_id) return null;
      
      const lookupId = appointment.transaction_id || appointment.phorest_appointment_id;
      if (!lookupId) return null;

      const { data: items } = await supabase
        .from('v_all_transaction_items')
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
  const CONFIRM_METHOD_LABELS: Record<string, string> = {
    called: 'Phone Call',
    texted: 'Text Message',
    online: 'Online Confirmation',
    in_person: 'In Person',
  };

  const { data: confirmationEvent } = useQuery({
    queryKey: ['appointment-confirmation', appointment?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('appointment_audit_log')
        .select('created_at, actor_name, event_type, new_value, metadata')
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
      const meta = confirmed.metadata as any;
      const confirmMethod = meta?.confirmation_method || null;
      return {
        confirmedAt: confirmed.created_at,
        confirmedBy: confirmed.actor_name || 'System',
        method: confirmMethod
          ? CONFIRM_METHOD_LABELS[confirmMethod] || confirmMethod
          : (confirmed.actor_name === 'System' || !confirmed.actor_name ? 'Auto-confirmed' : 'Manual'),
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
              <div className="flex items-center gap-1.5">
                <p className="text-sm text-muted-foreground mt-1">
                  {appointment.service_name || 'Service'}
                </p>
                {!['completed', 'cancelled', 'no_show'].includes((status).toLowerCase()) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 mt-0.5"
                    onClick={() => setEditServicesOpen(true)}
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>
            <Badge className={cn('shrink-0', statusBadge.bg, statusBadge.text, statusBadge.border)} variant="outline">
              {statusBadge.label}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
          <SubTabsList className="mx-6 mt-3 overflow-x-auto scrollbar-hide border-b border-border w-auto">
            <SubTabsTrigger value="summary">Summary</SubTabsTrigger>
            <SubTabsTrigger value="transaction" className="gap-1.5">
              Payment
              {txBreakdown?.hasTransaction && (
                <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
                  {txBreakdown.items.length}
                </Badge>
              )}
            </SubTabsTrigger>
            <SubTabsTrigger value="notes">Notes</SubTabsTrigger>
            <SubTabsTrigger value="timeline">Activity</SubTabsTrigger>
            <SubTabsTrigger value="comms" disabled>Comms</SubTabsTrigger>
          </SubTabsList>

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
                {(() => {
                  const customerNumber = appointment.customer_number;
                  const fallbackId = appointment._source === 'phorest'
                    ? appointment.phorest_client_id
                    : appointment.client_id;
                  const displayValue = customerNumber || fallbackId;
                  if (!displayValue) return null;
                  return (
                    <DetailRow icon={Hash} label="Customer ID">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono hover:text-foreground transition-colors"
                        onClick={() => {
                          navigator.clipboard.writeText(displayValue);
                          toast.success('Customer ID copied');
                        }}
                      >
                        {customerNumber || (fallbackId.length > 12 ? `${fallbackId.slice(0, 12)}…` : fallbackId)}
                        <Copy className="h-3 w-3" />
                      </button>
                    </DetailRow>
                  );
                })()}
              </div>
              {resolvedClientId && (
                <div className="flex justify-end mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/dashboard/clients?clientId=${resolvedClientId}`);
                    }}
                  >
                    View in Directory
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* ── Client Reviews ── */}
            {(() => {
              // Find if THIS appointment has a specific review
              const thisApptReview = reviewSummary?.reviews.find(
                (r) => r.appointment_id === appointment.id
              );

              return (
                <div className="space-y-2">
                  {/* Appointment-specific review highlight */}
                  {thisApptReview && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-foreground">
                          Review for this visit
                          {thisApptReview.overall_rating !== null && (
                            <span className="text-muted-foreground"> · {thisApptReview.overall_rating} ★</span>
                          )}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground pl-6">
                        {format(parseISO(thisApptReview.responded_at), 'MMM d, yyyy')}
                        {thisApptReview.nps_score !== null && ` · NPS: ${thisApptReview.nps_score}`}
                      </div>
                      {thisApptReview.comments && (
                        <p className="text-xs text-muted-foreground/80 pl-6 italic line-clamp-2">
                          "{thisApptReview.comments}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Overall client review summary */}
                  {reviewSummary && reviewSummary.totalReviews > 0 ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-foreground">
                          {reviewSummary.totalReviews} {reviewSummary.totalReviews === 1 ? 'Review' : 'Reviews'}
                          {reviewSummary.averageRating !== null && (
                            <span className="text-muted-foreground"> · Avg {reviewSummary.averageRating} ★</span>
                          )}
                        </span>
                      </div>
                      {reviewSummary.lastReviewDate && (
                        <div className="text-xs text-muted-foreground pl-6">
                          Last: {format(parseISO(reviewSummary.lastReviewDate), 'MMM d, yyyy')}
                          {appointment.appointment_date && (() => {
                            const days = differenceInCalendarDays(
                              parseISO(reviewSummary.lastReviewDate!),
                              parseISO(appointment.appointment_date)
                            );
                            if (days === 0) return ' · Same day as visit';
                            if (days > 0) return ` · ${days} day${days !== 1 ? 's' : ''} after visit`;
                            return ` · ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} before visit`;
                          })()}
                        </div>
                      )}
                      {!thisApptReview && reviewSummary.reviews[0]?.comments && (
                        <p className="text-xs text-muted-foreground/80 pl-6 italic line-clamp-2">
                          "{reviewSummary.reviews[0].comments}"
                        </p>
                      )}
                    </div>
                  ) : reviewSummary ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                      <Star className="w-3 h-3" />
                      No reviews on file
                    </div>
                  ) : null}

                  {/* Request Feedback button — show for completed appointments without feedback */}
                  {status === 'completed' && feedbackStatus && !feedbackStatus.exists && appointment.client_email && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border"
                      onClick={handleRequestFeedback}
                      disabled={sendingFeedback}
                    >
                      {sendingFeedback ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      Request Feedback
                    </Button>
                  )}
                  {status === 'completed' && feedbackStatus?.exists && !feedbackStatus.responded && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                      <Send className="w-3 h-3" />
                      Feedback requested · Awaiting response
                    </div>
                  )}
                </div>
              );
            })()}

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
                  <span>{appointment.staff_name || 'Unassigned'}</span>
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

            {/* Cancel Appointment */}
            {status !== 'cancelled' && status !== 'completed' && (
              <>
                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel Appointment
                </Button>
              </>
            )}
          </TabsContent>

          {/* Transaction Tab */}
          <TabsContent value="transaction" className="flex-1 overflow-auto p-6">
            <TransactionBreakdownPanel
              breakdown={txBreakdown}
              isLoading={txLoading}
              organizationId={orgId}
              clientId={resolvedClientId || null}
              appointmentDate={appointment.appointment_date}
            />
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

        {/* Cancel Appointment Dialog */}
        <AlertDialog open={cancelOpen} onOpenChange={(v) => { setCancelOpen(v); if (!v) setCancelReason(''); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel {clientName}'s appointment on {formatDateDisplay(appointment.appointment_date)}. The client may need to be notified separately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="px-6 pb-2">
              <Textarea
                placeholder="Reason for cancellation (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelling}>Go Back</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={cancelling}
                onClick={async (e) => {
                  e.preventDefault();
                  setCancelling(true);
                  try {
                    const table = appointment._source === 'phorest' ? 'phorest_appointments' : 'appointments';
                    const { error } = await supabase.from(table).update({ status: 'cancelled' }).eq('id', appointment.id);
                    if (error) throw error;
                    toast.success(`${clientName}'s appointment has been cancelled`);
                    queryClient.invalidateQueries({ queryKey: ['appointments-hub'] });
                    setCancelOpen(false);
                    setCancelReason('');
                    onOpenChange(false);
                  } catch (err: any) {
                    toast.error('Failed to cancel appointment', { description: err.message });
                  } finally {
                    setCancelling(false);
                  }
                }}
              >
                {cancelling ? 'Cancelling…' : 'Cancel Appointment'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <EditServicesDialog
          open={editServicesOpen}
          onOpenChange={setEditServicesOpen}
          currentServices={appointment.service_name ? appointment.service_name.split(',').map((s: string) => s.trim()).filter(Boolean) : []}
          locationId={appointment.location_id}
          isSaving={updateServicesMutation.isPending}
          onSave={(newServices: ServiceEntry[]) => {
            updateServicesMutation.mutate({
              appointmentId: appointment.id,
              organizationId: orgId || '',
              services: newServices,
              previousServiceName: appointment.service_name,
            }, {
              onSuccess: () => setEditServicesOpen(false),
            });
          }}
        />
    </PremiumFloatingPanel>
  );
}
