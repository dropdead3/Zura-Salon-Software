import { formatDistanceToNow, parseISO } from 'date-fns';
import { Send, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaymentLinkStatusBadgeProps {
  paymentLinkSentAt?: string | null;
  paymentLinkUrl?: string | null;
  splitPaymentTerminalIntentId?: string | null;
  splitPaymentLinkIntentId?: string | null;
  paidAt?: string | null;
  paymentStatus?: string;
  onResend?: () => void;
  isResending?: boolean;
}

export function PaymentLinkStatusBadge({
  paymentLinkSentAt,
  paymentLinkUrl,
  splitPaymentTerminalIntentId,
  splitPaymentLinkIntentId,
  paidAt,
  paymentStatus,
  onResend,
  isResending,
}: PaymentLinkStatusBadgeProps) {
  // No link sent — don't render anything
  if (!paymentLinkSentAt) return null;

  // Fully paid — already handled by existing paid_at logic elsewhere
  if (paymentStatus === 'paid' || paidAt) return null;

  const sentTimeAgo = formatDistanceToNow(parseISO(paymentLinkSentAt), { addSuffix: true });

  // Split payment: terminal paid, awaiting link payment
  if (splitPaymentTerminalIntentId && !splitPaymentLinkIntentId) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1.5">
          <Clock className="h-3 w-3" />
          Terminal Paid · Awaiting Afterpay
        </Badge>
        {onResend && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={onResend}
            disabled={isResending}
          >
            {isResending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
            Resend
          </Button>
        )}
      </div>
    );
  }

  // Link sent, awaiting any payment
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1.5">
        <Send className="h-3 w-3" />
        Payment Link Sent · {sentTimeAgo}
      </Badge>
      {onResend && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={onResend}
          disabled={isResending}
        >
          {isResending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
          Resend
        </Button>
      )}
    </div>
  );
}
