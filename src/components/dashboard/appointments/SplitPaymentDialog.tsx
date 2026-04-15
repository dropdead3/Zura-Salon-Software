import { useState } from 'react';
import { CreditCard, Send, Loader2, Info } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

const AFTERPAY_MAX_CENTS = 400000; // $4,000

interface SplitPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmountCents: number;
  appointmentId: string;
  organizationId: string;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  onPaymentLinkSent?: () => void;
  afterpaySurchargeEnabled?: boolean;
  afterpaySurchargeRate?: number;
}

export function SplitPaymentDialog({
  open,
  onOpenChange,
  totalAmountCents,
  appointmentId,
  organizationId,
  clientName,
  clientEmail,
  clientPhone,
  onPaymentLinkSent,
  afterpaySurchargeEnabled,
  afterpaySurchargeRate,
}: SplitPaymentDialogProps) {
  const { formatCurrency } = useFormatCurrency();
  const minImmediate = totalAmountCents - AFTERPAY_MAX_CENTS;
  const [immediateAmountCents, setImmediateAmountCents] = useState(minImmediate);
  const [isSending, setIsSending] = useState(false);
  const [step, setStep] = useState<'configure' | 'terminal_pending' | 'link_sent'>('configure');

  const afterpayAmountCents = totalAmountCents - immediateAmountCents;
  const surchargeAmountCents = afterpaySurchargeEnabled && afterpaySurchargeRate
    ? Math.round(afterpayAmountCents * afterpaySurchargeRate)
    : 0;
  const afterpayTotalCents = afterpayAmountCents + surchargeAmountCents;

  const isValidSplit =
    immediateAmountCents >= minImmediate &&
    afterpayAmountCents >= 100 &&
    afterpayAmountCents <= AFTERPAY_MAX_CENTS;

  const handleImmediateChange = (val: string) => {
    const dollars = parseFloat(val);
    if (!isNaN(dollars)) {
      setImmediateAmountCents(Math.round(dollars * 100));
    }
  };

  const handleConfirmSplit = async () => {
    if (!clientEmail && !clientPhone) {
      toast.error('Client email or phone is required to send the Afterpay link.');
      return;
    }

    setIsSending(true);
    try {
      // Step 1: Create the Afterpay-eligible payment link for the remainder
      const { data: linkData, error: linkError } = await supabase.functions.invoke(
        'create-checkout-payment-link',
        {
          body: {
            organization_id: organizationId,
            appointment_id: appointmentId,
            amount_cents: afterpayAmountCents,
            original_amount_cents: totalAmountCents,
            client_email: clientEmail,
            client_phone: clientPhone,
            client_name: clientName,
          },
        }
      );

      if (linkError) throw new Error(linkError.message);
      if (!linkData?.checkout_url) throw new Error('Failed to create payment link');

      // Step 2: Send the link with surcharge disclosure
      const surchargeDisplay = surchargeAmountCents > 0
        ? ` + ${formatCurrency(surchargeAmountCents / 100)} processing fee`
        : '';

      await supabase.functions.invoke('send-payment-link', {
        body: {
          organization_id: organizationId,
          appointment_id: appointmentId,
          checkout_url: linkData.checkout_url,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          amount_display: `$${(afterpayAmountCents / 100).toFixed(2)}`,
          surcharge_display: surchargeAmountCents > 0
            ? `$${(surchargeAmountCents / 100).toFixed(2)}`
            : undefined,
        },
      });

      setStep('link_sent');
      toast.success(
        `Afterpay link for ${formatCurrency(afterpayTotalCents / 100)} sent. Process ${formatCurrency(immediateAmountCents / 100)} on the terminal now.`
      );
      onPaymentLinkSent?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create split payment');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setStep('configure');
    setImmediateAmountCents(minImmediate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg tracking-wide">
            SPLIT PAYMENT
          </DialogTitle>
          <DialogDescription>
            This transaction exceeds Afterpay's $4,000 limit. Split it into an immediate terminal payment and an Afterpay-eligible payment link.
          </DialogDescription>
        </DialogHeader>

        {step === 'configure' && (
          <div className="space-y-4 py-2">
            {/* Summary */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{formatCurrency(totalAmountCents / 100)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Afterpay max</span>
                <span className="font-medium">{formatCurrency(AFTERPAY_MAX_CENTS / 100)}</span>
              </div>
            </div>

            <Separator />

            {/* Split configuration */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Pay now on terminal
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min={(minImmediate / 100).toFixed(2)}
                  max={((totalAmountCents - 100) / 100).toFixed(2)}
                  value={(immediateAmountCents / 100).toFixed(2)}
                  onChange={(e) => handleImmediateChange(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum: {formatCurrency(minImmediate / 100)} (total minus Afterpay max)
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  Send via Afterpay link
                </Label>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 font-mono text-sm">
                  {formatCurrency(afterpayAmountCents / 100)}
                  {surchargeAmountCents > 0 && (
                    <span className="text-muted-foreground ml-2 text-xs font-sans">
                      + {formatCurrency(surchargeAmountCents / 100)} fee = {formatCurrency(afterpayTotalCents / 100)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Info callout */}
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                {afterpaySurchargeEnabled
                  ? 'The client will receive a payment link with Afterpay as the only payment option. A processing fee will be added as a separate line item. The appointment will be marked as fully paid once both payments are completed.'
                  : 'The client will receive a payment link with Afterpay as an option. They can pay in 4 interest-free installments. The appointment will be marked as fully paid once both payments are completed.'}
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleConfirmSplit}
                disabled={!isValidSplit || isSending}
              >
                {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Split & Send Link
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'link_sent' && (
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Send className="w-7 h-7 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Afterpay link sent for {formatCurrency(afterpayTotalCents / 100)}
              </p>
              <p className="text-xs text-muted-foreground">
                Now process {formatCurrency(immediateAmountCents / 100)} on the terminal to complete checkout.
              </p>
            </div>
            <DialogFooter className="justify-center">
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
