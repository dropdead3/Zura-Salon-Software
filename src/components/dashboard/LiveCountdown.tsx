import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CountdownDisplayMode = 'compact' | 'full' | 'days';

interface LiveCountdownProps {
  expiresAt: Date;
  onExpire?: () => void;
  className?: string;
  /** Display mode: compact (h:m:s), full (with labels), days (X days, Y hours for longer durations) */
  displayMode?: CountdownDisplayMode;
  /** Custom urgent threshold in milliseconds (default: 1 hour) */
  urgentThresholdMs?: number;
  /** Hide the icon */
  hideIcon?: boolean;
}

export function LiveCountdown({ 
  expiresAt, 
  onExpire, 
  className = '',
  displayMode = 'compact',
  urgentThresholdMs = 60 * 60 * 1000, // 1 hour default
  hideIcon = false,
}: LiveCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining('Expired');
        onExpire?.();
        return;
      }

      // Set urgent state based on threshold
      setIsUrgent(diff < urgentThresholdMs);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      // Format based on display mode
      if (displayMode === 'days') {
        if (days > 0) {
          setTimeRemaining(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setTimeRemaining(`${minutes}m ${seconds}s`);
        }
      } else if (displayMode === 'full') {
        if (days > 0) {
          setTimeRemaining(`${days} day${days !== 1 ? 's' : ''}, ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        } else if (minutes > 0) {
          setTimeRemaining(`${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining(`${seconds}s`);
        }
      } else {
        // Compact mode (original behavior)
        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        } else if (minutes > 0) {
          setTimeRemaining(`${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining(`${seconds}s`);
        }
      }
    };

    // Update immediately
    updateCountdown();

    // Update interval based on display mode and remaining time
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const intervalMs = displayMode === 'days' && diff > 60 * 60 * 1000 
      ? 60 * 1000 // Every minute for days mode with >1h remaining
      : 1000; // Every second otherwise

    const interval = setInterval(updateCountdown, intervalMs);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire, displayMode, urgentThresholdMs]);

  if (isExpired) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-destructive', className)}>
        {!hideIcon && (
          <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <Clock className="h-3.5 w-3.5" />
          </div>
        )}
        <span className="font-medium">Expired</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm', isUrgent ? 'text-destructive' : '', className)}>
      {!hideIcon && (
        <div className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
          isUrgent ? 'bg-destructive/10' : 'bg-oat/40'
        )}>
          <Clock className={cn('h-3.5 w-3.5', isUrgent ? 'animate-pulse' : '')} />
        </div>
      )}
      <span>
        Expires in <span className="font-mono font-medium tabular-nums">{timeRemaining}</span>
      </span>
    </div>
  );
}
