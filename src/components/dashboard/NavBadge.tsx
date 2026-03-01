import { cn } from '@/lib/utils';

interface NavBadgeProps {
  count: number;
  isActive?: boolean;
  className?: string;
}

export function NavBadge({ count, isActive = false, className }: NavBadgeProps) {
  if (count <= 0) return null;

  return (
    <span className={cn(
      "inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[10px] font-medium rounded-full border bg-destructive/20 text-destructive border-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.3)]",
      className
    )}>
      {count > 9 ? '9+' : count}
    </span>
  );
}
