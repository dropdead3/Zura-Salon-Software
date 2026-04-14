import { formatDistanceToNow, parseISO, addHours } from 'date-fns';
import { Send, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LiveCountdown } from '@/components/dashboard/LiveCountdown';

const LINK_EXPIRY_HOURS = 24;

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
  if (!paymentLinkSentAt) return null;
  if (paymentStatus === 'paid' || paidAt) return null;

  const sentDate = parseISO(paymentLinkSentAt);
  const expiresAt = addHours(sentDate, LINK_EXPIRY_HOURS);
  const isExpired = expiresAt.getTime() <= Date.now();
  const sentTimeAgo = formatDistanceToNow(sentDate, { addSuffix: true });

  // Expired link
  if (isExpired) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          Payment Link Expired
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
            Create New Link
          </Button>
        )}
      </div>
    );
  }

  // Split payment: terminal paid, awaiting link payment
  if (splitPaymentTerminalIntentId && !splitPaymentLinkIntentId) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1.5">
          <Clock className="h-3 w-3" />
          Terminal Paid · Awaiting Afterpay
        </Badge>
        <LiveCountdown expiresAt={expiresAt} displayMode="compact" hideIcon urgentThresholdMs={2 * 60 * 60 * 1000} className="text-xs text-muted-foreground" />
        {onResend && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={onResend} disabled={isResending}>
            {isResending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
            Resend
          </Button>
        )}
      </div>
    );
  }

  // Link sent, awaiting payment
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1.5">
        <Send className="h-3 w-3" />
        Payment Link Sent · {sentTimeAgo}
      </Badge>
      <LiveCountdown expiresAt={expiresAt} displayMode="compact" hideIcon urgentThresholdMs={2 * 60 * 60 * 1000} className="text-xs text-muted-foreground" />
      {onResend && (
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={onResend} disabled={isResending}>
          {isResending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
          Resend
        </Button>
      )}
    </div>
  );
}
