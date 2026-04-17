import { useState } from 'react';
import { Send, Loader2, Smartphone, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SplitPaymentDialog } from './SplitPaymentDialog';

const AFTERPAY_MAX_CENTS = 400000; // $4,000

interface SendToPayButtonProps {
  appointmentId: string;
  organizationId: string;
  totalAmountCents: number;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  afterpayEnabled: boolean;
  afterpaySurchargeEnabled?: boolean;
  afterpaySurchargeRate?: number;
  onPaymentLinkSent?: () => void;
  disabled?: boolean;
}

export function SendToPayButton({
  appointmentId,
  organizationId,
  totalAmountCents,
  clientName,
  clientEmail,
  clientPhone,
  afterpayEnabled,
  afterpaySurchargeEnabled,
  afterpaySurchargeRate,
  onPaymentLinkSent,
  disabled,
}: SendToPayButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);

  const hasContact = !!(clientEmail?.trim() || clientPhone?.trim());
  const needsSplit = afterpayEnabled && totalAmountCents > AFTERPAY_MAX_CENTS;

  const handleSendToPayDirect = async (amountCents?: number) => {
    const sendAmount = amountCents ?? totalAmountCents;
    
    if (!clientEmail && !clientPhone) {
      toast.error('Client email or phone is required to send a payment link.');
      return;
    }

    setIsSending(true);
    try {
      // Step 1: Create the checkout payment link
      const { data: linkData, error: linkError } = await supabase.functions.invoke(
        'create-checkout-payment-link',
        {
           body: {
            organization_id: organizationId,
            appointment_id: appointmentId,
            amount_cents: sendAmount,
            original_amount_cents: totalAmountCents,
            client_email: clientEmail,
            client_phone: clientPhone,
            client_name: clientName,
          },
        }
      );

      if (linkError) throw new Error(linkError.message);
      if (!linkData?.checkout_url) throw new Error('Failed to create payment link');

      // Calculate surcharge for display
      const surchargeAmountCents = afterpaySurchargeEnabled && afterpaySurchargeRate
        ? Math.round(sendAmount * afterpaySurchargeRate)
        : 0;

      // Step 2: Send the link via SMS/email
      const { error: sendError } = await supabase.functions.invoke(
        'send-payment-link',
        {
          body: {
            organization_id: organizationId,
            appointment_id: appointmentId,
            checkout_url: linkData.checkout_url,
            client_name: clientName,
            client_email: clientEmail,
            client_phone: clientPhone,
            amount_display: `$${(sendAmount / 100).toFixed(2)}`,
            surcharge_display: surchargeAmountCents > 0
              ? `$${(surchargeAmountCents / 100).toFixed(2)}`
              : undefined,
          },
        }
      );

      if (sendError) {
        console.error('Send error (link still created):', sendError);
      }

      const deliveryMethod = clientPhone ? 'SMS' : 'email';
      const afterpayNote = linkData.afterpay_available
        ? linkData.surcharge_amount_cents
          ? ` (Afterpay only — $${(linkData.surcharge_amount_cents / 100).toFixed(2)} fee included)`
          : ' (Afterpay available)'
        : '';
      toast.success(`Payment link sent via ${deliveryMethod}${afterpayNote}`);
      onPaymentLinkSent?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send payment link');
    } finally {
      setIsSending(false);
    }
  };

  const handleClick = () => {
    if (needsSplit) {
      setShowSplitDialog(true);
    } else {
      handleSendToPayDirect();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={disabled || isSending}
        className="gap-2"
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {afterpayEnabled
          ? afterpaySurchargeEnabled
            ? `Send to Pay (Afterpay + ${parseFloat(((afterpaySurchargeRate ?? 0.06) * 100).toFixed(2))}% fee)`
            : 'Send to Pay / Afterpay'
          : 'Send Payment Link'}
      </Button>

      {needsSplit && (
        <SplitPaymentDialog
          open={showSplitDialog}
          onOpenChange={setShowSplitDialog}
          totalAmountCents={totalAmountCents}
          appointmentId={appointmentId}
          organizationId={organizationId}
          clientName={clientName}
          clientEmail={clientEmail}
          clientPhone={clientPhone}
          onPaymentLinkSent={onPaymentLinkSent}
          afterpaySurchargeEnabled={afterpaySurchargeEnabled}
          afterpaySurchargeRate={afterpaySurchargeRate}
        />
      )}
    </>
  );
}
