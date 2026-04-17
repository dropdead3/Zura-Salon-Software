import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AfterpayLogo } from '@/components/icons/AfterpayLogo';
import { SplitPaymentDialog } from './SplitPaymentDialog';
import { SendPaymentLinkComposer } from './SendPaymentLinkComposer';

const AFTERPAY_MAX_CENTS = 400000; // $4,000

interface SendToPayButtonProps {
  appointmentId: string;
  organizationId: string;
  totalAmountCents: number;
  serviceName?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  /** Phorest client id — enables inline email capture for Afterpay flow */
  phorestClientId?: string | null;
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
  serviceName,
  clientName,
  clientEmail,
  clientPhone,
  phorestClientId,
  afterpayEnabled,
  afterpaySurchargeEnabled,
  afterpaySurchargeRate,
  onPaymentLinkSent,
  disabled,
}: SendToPayButtonProps) {
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const hasContact = !!(clientEmail?.trim() || clientPhone?.trim());
  const needsSplit = afterpayEnabled && totalAmountCents > AFTERPAY_MAX_CENTS;
  const afterpayEligible = afterpayEnabled && totalAmountCents <= AFTERPAY_MAX_CENTS;

  const handleClick = () => {
    if (needsSplit) {
      setShowSplitDialog(true);
    } else {
      setShowComposer(true);
    }
  };

  const isDisabled = disabled || !hasContact;

  // Adaptive label
  const buttonLabel = needsSplit
    ? 'Send Payment Link · Split'
    : afterpayEligible
      ? afterpaySurchargeEnabled
        ? `Send Payment Link · Afterpay (+${parseFloat(((afterpaySurchargeRate ?? 0.06) * 100).toFixed(2))}%)`
        : 'Send Payment Link · Afterpay'
      : 'Send Payment Link';

  const button = (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={isDisabled}
      className="gap-2"
    >
      <Send className="h-4 w-4" />
      {afterpayEligible && (
        <AfterpayLogo className="w-3.5 h-3.5" color="currentColor" />
      )}
      {buttonLabel}
    </Button>
  );

  return (
    <>
      {!hasContact ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{button}</span>
            </TooltipTrigger>
            <TooltipContent>
              Add a phone number or email to the client profile to send a payment link.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}

      <SendPaymentLinkComposer
        open={showComposer}
        onOpenChange={setShowComposer}
        appointmentId={appointmentId}
        organizationId={organizationId}
        totalAmountCents={totalAmountCents}
        serviceName={serviceName}
        clientName={clientName}
        clientEmail={clientEmail}
        clientPhone={clientPhone}
        afterpayEnabled={afterpayEnabled}
        afterpaySurchargeEnabled={afterpaySurchargeEnabled}
        afterpaySurchargeRate={afterpaySurchargeRate}
        onPaymentLinkSent={onPaymentLinkSent}
      />

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
