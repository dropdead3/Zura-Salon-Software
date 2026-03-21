import { cn } from '@/lib/utils';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showOffline?: boolean;
}

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

export function OnlineIndicator({ 
  isOnline, 
  size = 'sm', 
  className,
  showOffline = true 
}: OnlineIndicatorProps) {
  if (!isOnline && !showOffline) return null;

  return (
    <span
      className={cn(
        'rounded-full border-2 border-slate-900',
        sizeClasses[size],
        isOnline 
          ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50' 
          : 'bg-slate-500',
        className
      )}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
}
