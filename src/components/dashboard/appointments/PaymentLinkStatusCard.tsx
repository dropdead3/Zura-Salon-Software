import { useState } from 'react';
import { formatDistanceToNow, parseISO, addHours } from 'date-fns';
import {
  Send,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  XCircle,
  Smartphone,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { LiveCountdown } from '@/components/dashboard/LiveCountdown';
import { AfterpaySurchargePreview } from '@/components/dashboard/payments/AfterpaySurchargePreview';
import { cn, formatPhoneDisplay } from '@/lib/utils';

const LINK_EXPIRY_HOURS_FALLBACK = 24;

interface PaymentLinkStatusCardProps {
  appointmentId: string;
  organizationId: string;
  totalAmountCents: number;
  paymentLinkSentAt?: string | null;
  paymentLinkUrl?: string | null;
  paymentLinkExpiresAt?: string | null;
  paymentLinkStatus?: string | null; // 'sent' | 'viewed' | 'paid' | 'cancelled'
  paymentStatus?: string | null;
  paidAt?: string | null;
  splitPaymentTerminalIntentId?: string | null;
  splitPaymentLinkIntentId?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  afterpaySurchargeEnabled?: boolean;
  afterpaySurchargeRate?: number;
  onChanged?: () => void;
}

type Step = 'sent' | 'viewed' | 'paid';

export function PaymentLinkStatusCard({
  appointmentId,
  organizationId,
  totalAmountCents,
  paymentLinkSentAt,
  paymentLinkUrl,
  paymentLinkExpiresAt,
  paymentLinkStatus,
  paymentStatus,
  paidAt,
  splitPaymentTerminalIntentId,
  splitPaymentLinkIntentId,
  clientName,
  clientEmail,
  clientPhone,
  afterpaySurchargeEnabled,
  afterpaySurchargeRate = 0.06,
  onChanged,
}: PaymentLinkStatusCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const [isResending, setIsResending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  if (!paymentLinkSentAt) return null;
  if (paymentStatus === 'paid' || paidAt) return null;
  if (paymentLinkStatus === 'cancelled') return null;

  const sentDate = parseISO(paymentLinkSentAt);
  const expiresAt = paymentLinkExpiresAt
    ? parseISO(paymentLinkExpiresAt)
    : addHours(sentDate, LINK_EXPIRY_HOURS_FALLBACK);
  const isExpired = expiresAt.getTime() <= Date.now();
  const sentTimeAgo = formatDistanceToNow(sentDate, { addSuffix: true });

  const currentStep: Step =
    paymentLinkStatus === 'paid' ? 'paid' : paymentLinkStatus === 'viewed' ? 'viewed' : 'sent';

  const isSplitPending = !!splitPaymentTerminalIntentId && !splitPaymentLinkIntentId;

  const steps: { key: Step; label: string; icon: typeof Send }[] = [
    { key: 'sent', label: 'Sent', icon: Send },
    { key: 'viewed', label: 'Viewed', icon: Eye },
    { key: 'paid', label: 'Paid', icon: CheckCircle2 },
  ];

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { data: linkData, error: linkError } = await supabase.functions.invoke(
        'create-checkout-payment-link',
        {
          body: {
            organization_id: organizationId,
            appointment_id: appointmentId,
            amount_cents: totalAmountCents,
            client_email: clientEmail,
            client_phone: clientPhone,
            client_name: clientName,
          },
        },
      );
      if (linkError) throw new Error(linkError.message);
      if (!linkData?.checkout_url) throw new Error('Failed to create new link');

      await supabase.functions.invoke('send-payment-link', {
        body: {
          organization_id: organizationId,
          appointment_id: appointmentId,
          checkout_url: linkData.checkout_url,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          amount_display: `$${(totalAmountCents / 100).toFixed(2)}`,
        },
      });

      toast.success('Payment link resent');
      onChanged?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend link');
    } finally {
      setIsResending(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          payment_link_url: null,
          payment_link_sent_at: null,
          payment_link_expires_at: null,
        })
        .eq('id', appointmentId);
      if (error) throw error;
      toast.success('Payment link cancelled');
      onChanged?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel link');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card/60 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-display text-muted-foreground">
              Payment Link
            </span>
            {isExpired ? (
              <Badge
                variant="outline"
                className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-[10px] h-5"
              >
                <AlertTriangle className="h-2.5 w-2.5" />
                Expired
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[10px] h-5"
              >
                Active
              </Badge>
            )}
            {isSplitPending && (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[10px] h-5"
              >
                Split · Terminal paid
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Sent {sentTimeAgo}
            {!isExpired && (
              <>
                {' · '}
                <LiveCountdown
                  expiresAt={expiresAt}
                  displayMode="compact"
                  hideIcon
                  urgentThresholdMs={2 * 60 * 60 * 1000}
                  className="text-xs"
                />
              </>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wider font-display text-muted-foreground">
            Amount
          </p>
          <p className="text-sm font-medium tabular-nums">
            {formatCurrency(totalAmountCents / 100)}
          </p>
        </div>
      </div>

      {/* Status timeline */}
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const stepIndex = steps.findIndex((s) => s.key === currentStep);
          const isCompleted = idx <= stepIndex;
          const isCurrent = idx === stepIndex;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex-1 flex items-center gap-1">
              <div
                className={cn(
                  'flex flex-col items-center gap-1 flex-1 transition-opacity',
                  !isCompleted && 'opacity-40',
                )}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center border',
                    isCompleted
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                      : 'bg-muted border-border text-muted-foreground',
                    isCurrent && 'ring-2 ring-emerald-500/30',
                  )}
                >
                  <Icon className="h-3 w-3" />
                </div>
                <span className="text-[9px] uppercase tracking-wider font-display text-muted-foreground">
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'h-px flex-1 mb-4',
                    idx < stepIndex ? 'bg-emerald-500/40' : 'bg-border',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Channel */}
      <Separator />
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        {clientPhone && (
          <span className="flex items-center gap-1">
            <Smartphone className="h-3 w-3" />
            {formatPhoneDisplay(clientPhone)}
          </span>
        )}
        {clientEmail && (
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {clientEmail}
          </span>
        )}
      </div>

      {/* Surcharge breakdown */}
      {afterpaySurchargeEnabled && (
        <AfterpaySurchargePreview
          amountCents={totalAmountCents}
          surchargeRate={afterpaySurchargeRate}
          compact
        />
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleResend}
          disabled={isResending || isCancelling}
          className="h-8 text-xs gap-1.5"
        >
          {isResending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {isExpired ? 'Create New Link' : 'Resend'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isResending || isCancelling}
          className="h-8 text-xs text-muted-foreground gap-1.5"
        >
          {isCancelling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          Cancel link
        </Button>
        {paymentLinkUrl && !isExpired && (
          <a
            href={paymentLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline self-center ml-auto"
          >
            View link
          </a>
        )}
      </div>
    </Card>
  );
}
