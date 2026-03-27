/**
 * ExceptionBadge — Small count indicator for open backroom exceptions.
 * Place on navigation items to surface unresolved anomalies.
 */

import { useBackroomExceptions } from '@/hooks/backroom/useBackroomExceptions';

interface ExceptionBadgeProps {
  className?: string;
}

export function ExceptionBadge({ className = '' }: ExceptionBadgeProps) {
  const { data: exceptions = [] } = useBackroomExceptions({ status: 'open' });

  if (exceptions.length === 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground font-sans text-[10px] font-medium tabular-nums ${className}`}
    >
      {exceptions.length > 99 ? '99+' : exceptions.length}
    </span>
  );
}
