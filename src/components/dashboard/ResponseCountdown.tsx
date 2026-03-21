import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponseCountdownProps {
  assignedAt: string;
  deadlineHours: number;
  className?: string;
}

export function ResponseCountdown({ assignedAt, deadlineHours, className }: ResponseCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    isUrgent: boolean;
  } | null>(null);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const assignedTime = new Date(assignedAt).getTime();
      const deadlineTime = assignedTime + (deadlineHours * 60 * 60 * 1000);
      const now = Date.now();
      const diff = deadlineTime - now;

      if (diff <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, isExpired: true, isUrgent: true };
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      // Urgent if less than 30 minutes remaining
      const isUrgent = diff < 30 * 60 * 1000;

      return { hours, minutes, seconds, isExpired: false, isUrgent };
    };

    setTimeRemaining(calculateTimeRemaining());

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [assignedAt, deadlineHours]);

  if (!timeRemaining) return null;

  if (timeRemaining.isExpired) {
    return (
      <div className={cn(
        'flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-full',
        className
      )}>
        <AlertTriangle className="h-3 w-3" />
        <span>Response overdue</span>
      </div>
    );
  }

  const formatTime = () => {
    const { hours, minutes, seconds } = timeRemaining;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className={cn(
      'flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors',
      timeRemaining.isUrgent 
        ? 'text-orange-700 bg-orange-100 animate-pulse' 
        : 'text-muted-foreground bg-muted',
      className
    )}>
      <Clock className={cn('h-3 w-3', timeRemaining.isUrgent && 'animate-spin')} style={{ animationDuration: '3s' }} />
      <span>{formatTime()} to respond</span>
    </div>
  );
}
