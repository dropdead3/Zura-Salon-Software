import { useState, useMemo, useEffect } from 'react';
import { Send, Loader2, CheckCircle2, CreditCard, MessageSquare, Mail, Smartphone, AlertCircle } from 'lucide-react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { AfterpayLogo } from '@/components/icons/AfterpayLogo';
import { AfterpaySurchargePreview } from '@/components/dashboard/payments/AfterpaySurchargePreview';
import { cn, formatPhoneDisplay } from '@/lib/utils';
import { validateEmail } from '@/lib/contactValidation';
import { useQueryClient } from '@tanstack/react-query';

const AFTERPAY_MAX_CENTS = 400000;

type Channel = 'sms' | 'email' | 'both';

interface SendPaymentLinkComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  organizationId: string;
  totalAmountCents: number;
  serviceName?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  afterpayEnabled: boolean;
  afterpaySurchargeEnabled?: boolean;
  afterpaySurchargeRate?: number;
  onPaymentLinkSent?: () => void;
}

export function SendPaymentLinkComposer({
  open,
  onOpenChange,
  appointmentId,
  organizationId,
  totalAmountCents,
  serviceName,
  clientName,
  clientEmail,
  clientPhone,
  afterpayEnabled,
  afterpaySurchargeEnabled,
  afterpaySurchargeRate = 0.06,
  onPaymentLinkSent,
}: SendPaymentLinkComposerProps) {
  const { formatCurrency } = useFormatCurrency();
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  // Auto-detect default channel
  const defaultChannel: Channel = useMemo(() => {
    if (clientPhone && clientEmail) return 'both';
    if (clientPhone) return 'sms';
    return 'email';
  }, [clientPhone, clientEmail]);
  const [channel, setChannel] = useState<Channel>(defaultChannel);

  useEffect(() => {
    if (open) {
      setChannel(defaultChannel);
      setIsSent(false);
      setCustomMessage('');
    }
  }, [open, defaultChannel]);

  const afterpayEligible = afterpayEnabled && totalAmountCents <= AFTERPAY_MAX_CENTS;
  const exceedsAfterpayMax = afterpayEnabled && totalAmountCents > AFTERPAY_MAX_CENTS;
  const installmentCents = Math.round(totalAmountCents / 4);

  const handleSend = async () => {
    setIsSending(true);
    try {
      // Decide which contact info to pass based on channel
      const sendEmail = channel === 'email' || channel === 'both' ? clientEmail : null;
      const sendPhone = channel === 'sms' || channel === 'both' ? clientPhone : null;

      const { data: linkData, error: linkError } = await supabase.functions.invoke(
        'create-checkout-payment-link',
        {
          body: {
            organization_id: organizationId,
            appointment_id: appointmentId,
            amount_cents: totalAmountCents,
            original_amount_cents: totalAmountCents,
            client_email: sendEmail,
            client_phone: sendPhone,
            client_name: clientName,
          },
        },
      );

      if (linkError) throw new Error(linkError.message);
      if (!linkData?.checkout_url) throw new Error('Failed to create payment link');

      const surchargeAmountCents = afterpaySurchargeEnabled
        ? Math.round(Math.min(totalAmountCents, AFTERPAY_MAX_CENTS) * afterpaySurchargeRate)
        : 0;

      const { error: sendError } = await supabase.functions.invoke('send-payment-link', {
        body: {
          organization_id: organizationId,
          appointment_id: appointmentId,
          checkout_url: linkData.checkout_url,
          client_name: clientName,
          client_email: sendEmail,
          client_phone: sendPhone,
          amount_display: `$${(totalAmountCents / 100).toFixed(2)}`,
          surcharge_display:
            surchargeAmountCents > 0 ? `$${(surchargeAmountCents / 100).toFixed(2)}` : undefined,
          custom_message: customMessage.trim() || undefined,
        },
      });

      if (sendError) {
        console.error('send-payment-link error:', sendError);
      }

      setIsSent(true);
      const channelLabel = channel === 'both' ? 'SMS + Email' : channel === 'sms' ? 'SMS' : 'Email';
      toast.success(`Payment link sent via ${channelLabel}`);
      onPaymentLinkSent?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send payment link');
    } finally {
      setIsSending(false);
    }
  };

  const close = () => onOpenChange(false);

  return (
    <PremiumFloatingPanel
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      maxWidth="480px"
      zIndex={70}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/60">
          <h2 className="font-display text-lg tracking-wide uppercase">
            {isSent ? 'Link Sent' : 'Send Payment Link'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isSent
              ? 'The client will receive payment instructions shortly.'
              : "Preview what the client will see before sending."}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {!isSent ? (
            <>
              {/* Preview card */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">
                      Client preview
                    </p>
                    <p className="text-sm font-medium truncate mt-0.5">
                      {serviceName || 'Service'}
                    </p>
                    {clientName && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        For {clientName}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">
                      Total
                    </p>
                    <p className="text-lg font-medium tabular-nums">
                      {formatCurrency(totalAmountCents / 100)}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Payment options client sees */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">
                    Payment options
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="gap-1.5 bg-card font-sans text-xs">
                      <CreditCard className="h-3 w-3" />
                      Card
                    </Badge>
                    {afterpayEligible && (
                      <Badge
                        variant="outline"
                        className="gap-1.5 bg-card font-sans text-xs border-foreground/20"
                      >
                        <AfterpayLogo className="w-3 h-3" color="currentColor" />
                        {afterpaySurchargeEnabled
                          ? `Afterpay only (+${parseFloat((afterpaySurchargeRate * 100).toFixed(2))}% fee)`
                          : 'Afterpay (Pay in 4)'}
                      </Badge>
                    )}
                    {exceedsAfterpayMax && (
                      <Badge variant="outline" className="gap-1.5 bg-card font-sans text-xs">
                        Split required (&gt;$4k)
                      </Badge>
                    )}
                  </div>

                  {afterpayEligible && !afterpaySurchargeEnabled && (
                    <p className="text-[11px] text-muted-foreground">
                      4 installments of{' '}
                      <span className="text-foreground font-medium tabular-nums">
                        {formatCurrency(installmentCents / 100)}
                      </span>{' '}
                      every 2 weeks · interest-free
                    </p>
                  )}
                </div>

                {/* Surcharge breakdown */}
                {afterpayEligible && afterpaySurchargeEnabled && (
                  <AfterpaySurchargePreview
                    amountCents={totalAmountCents}
                    surchargeRate={afterpaySurchargeRate}
                    compact
                  />
                )}
              </div>

              {/* Delivery channel */}
              <div className="space-y-2">
                <Label className="text-xs font-display tracking-wide uppercase text-muted-foreground">
                  Send via
                </Label>
                <ToggleGroup
                  type="single"
                  value={channel}
                  onValueChange={(v) => v && setChannel(v as Channel)}
                  className="grid grid-cols-3 gap-2"
                >
                  <ToggleGroupItem
                    value="sms"
                    disabled={!clientPhone}
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border rounded-lg h-auto py-2 flex flex-col items-center gap-1"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span className="text-[11px] font-sans">SMS</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="email"
                    disabled={!clientEmail}
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border rounded-lg h-auto py-2 flex flex-col items-center gap-1"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="text-[11px] font-sans">Email</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="both"
                    disabled={!clientPhone || !clientEmail}
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border rounded-lg h-auto py-2 flex flex-col items-center gap-1"
                  >
                    <div className="flex items-center gap-0.5">
                      <Smartphone className="h-3.5 w-3.5" />
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-sans">Both</span>
                  </ToggleGroupItem>
                </ToggleGroup>
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  {(channel === 'sms' || channel === 'both') && clientPhone && (
                    <p>SMS to {formatPhoneDisplay(clientPhone)}</p>
                  )}
                  {(channel === 'email' || channel === 'both') && clientEmail && (
                    <p>Email to {clientEmail}</p>
                  )}
                </div>
              </div>

              {/* Custom message */}
              <div className="space-y-2">
                <Label
                  htmlFor="composer-msg"
                  className="text-xs font-display tracking-wide uppercase text-muted-foreground flex items-center gap-1.5"
                >
                  <MessageSquare className="h-3 w-3" />
                  Optional message
                </Label>
                <Textarea
                  id="composer-msg"
                  placeholder="Add a personal note to the client (optional)…"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                  maxLength={280}
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {customMessage.length}/280
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium">Payment link delivered</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {channel === 'both'
                    ? 'Sent via SMS and Email'
                    : channel === 'sms'
                      ? `SMS to ${clientPhone ? formatPhoneDisplay(clientPhone) : ''}`
                      : `Email to ${clientEmail}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/60 flex justify-end gap-2">
          {!isSent ? (
            <>
              <Button variant="outline" size="sm" onClick={close} disabled={isSending}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={isSending}
                className="gap-2"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Link
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={close}>
              Done
            </Button>
          )}
        </div>
      </div>
    </PremiumFloatingPanel>
  );
}
