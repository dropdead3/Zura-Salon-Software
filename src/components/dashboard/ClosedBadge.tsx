import { Moon } from 'lucide-react';

interface ClosedBadgeProps {
  reason?: string;
  className?: string;
}

export function ClosedBadge({ reason, className }: ClosedBadgeProps) {
  const label = reason && reason !== 'Regular hours'
    ? `Closed — ${reason}`
    : 'Closed';

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 border border-destructive/30 px-1.5 py-0.5 rounded whitespace-nowrap font-medium ${className ?? ''}`}>
      <Moon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}
