/**
 * ExceptionBadge — Small count indicator for open color bar exceptions.
 * Place on navigation items to surface unresolved anomalies.
 */

import { useColorBarExceptions } from '@/hooks/color-bar/useColorBarExceptions';
import { reportVisibilitySuppression } from '@/lib/dev/visibility-contract-bus';

interface ExceptionBadgeProps {
  className?: string;
}

export function ExceptionBadge({ className = '' }: ExceptionBadgeProps) {
  const { data: exceptions = [] } = useColorBarExceptions({ status: 'open' });

  if (exceptions.length === 0) {
    // Visibility Contract: no open exceptions → badge is silent (this is the healthy state).
    reportVisibilitySuppression('exception-badge', 'no-data', {
      openExceptionCount: 0,
    });
    return null;
  }

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground font-sans text-[10px] font-medium tabular-nums ${className}`}
    >
      {exceptions.length > 99 ? '99+' : exceptions.length}
    </span>
  );
}
