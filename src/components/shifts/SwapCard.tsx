import { formatDistanceToNow, isPast } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Clock, MapPin, ArrowLeftRight, ArrowDown, Gift, 
  Timer, CheckCircle2, XCircle, AlertCircle, Hourglass
} from 'lucide-react';
import type { ShiftSwap } from '@/hooks/useShiftSwaps';

interface SwapCardProps {
  swap: ShiftSwap;
  onClaim?: () => void;
  onCancel?: () => void;
  onView?: () => void;
  isOwner?: boolean;
  isClaimer?: boolean;
  compact?: boolean;
}

const swapTypeConfig = {
  swap: {
    icon: ArrowLeftRight,
    label: 'Swap',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  cover: {
    icon: ArrowDown,
    label: 'Cover',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  giveaway: {
    icon: Gift,
    label: 'Giveaway',
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
};

const statusConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  open: {
    icon: Timer,
    label: 'Open',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  claimed: {
    icon: Hourglass,
    label: 'Claimed',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  pending_approval: {
    icon: AlertCircle,
    label: 'Pending Approval',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  approved: {
    icon: CheckCircle2,
    label: 'Approved',
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  denied: {
    icon: XCircle,
    label: 'Denied',
    color: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelled',
    color: 'bg-muted text-muted-foreground',
  },
  expired: {
    icon: Timer,
    label: 'Expired',
    color: 'bg-muted text-muted-foreground',
  },
};

export function SwapCard({
  swap,
  onClaim,
  onCancel,
  onView,
  isOwner = false,
  isClaimer = false,
  compact = false,
}: SwapCardProps) {
  const { formatDate } = useFormatDate();
  const typeConfig = swapTypeConfig[swap.swap_type];
  const TypeIcon = typeConfig.icon;
  const status = statusConfig[swap.status] || statusConfig.open;
  const StatusIcon = status.icon;

  const requesterName = swap.requester?.display_name || swap.requester?.full_name || 'Unknown';
  const claimerName = swap.claimer?.display_name || swap.claimer?.full_name;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return formatDate(date, 'h:mm a');
  };

  const isExpired = swap.expires_at && isPast(new Date(swap.expires_at));
  const shiftPassed = isPast(new Date(swap.original_date));

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group"
      >
        <Card className="p-3 hover:shadow-md transition-all cursor-pointer" onClick={onView}>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={swap.requester?.photo_url || undefined} />
              <AvatarFallback className="text-xs">{getInitials(requesterName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{requesterName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(new Date(swap.original_date), 'MMM d')} • {formatTime(swap.original_start_time)}
              </p>
            </div>
            <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={swap.requester?.photo_url || undefined} />
                <AvatarFallback>{getInitials(requesterName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-sans font-medium">{requesterName}</p>
                <p className="text-xs text-muted-foreground">
                  {isOwner ? 'Your request' : 'is looking for help'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={typeConfig.color}>
                <TypeIcon className="w-3 h-3 mr-1" />
                {typeConfig.label}
              </Badge>
              <Badge className={status.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Shift details */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                {formatDate(new Date(swap.original_date), 'EEEE, MMM d, yyyy')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              {formatTime(swap.original_start_time)} - {formatTime(swap.original_end_time)}
            </span>
          </div>

          {swap.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{swap.location.name}</span>
            </div>
          )}

          {/* Reason */}
          {swap.reason && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground italic">"{swap.reason}"</p>
            </div>
          )}

          {/* Claimer info for swaps */}
          {swap.swap_type === 'swap' && swap.claimer_date && (
            <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/10">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                Trade Offered by {claimerName}
              </p>
              <p className="text-sm">
                {formatDate(new Date(swap.claimer_date), 'MMM d')} • {swap.claimer_start_time && formatTime(swap.claimer_start_time)} - {swap.claimer_end_time && formatTime(swap.claimer_end_time)}
              </p>
            </div>
          )}

          {/* Expiration warning */}
          {swap.expires_at && swap.status === 'open' && !isExpired && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <Timer className="w-3 h-3" />
              <span>Expires {formatDistanceToNow(new Date(swap.expires_at), { addSuffix: true })}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {swap.status === 'open' && !isOwner && !shiftPassed && onClaim && (
              <Button onClick={onClaim} className="flex-1">
                Claim This Shift
              </Button>
            )}
            {isOwner && swap.status === 'open' && onCancel && (
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel Request
              </Button>
            )}
            {onView && (
              <Button variant="outline" onClick={onView}>
                View Details
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
