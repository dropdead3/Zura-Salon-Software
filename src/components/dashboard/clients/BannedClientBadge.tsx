import { Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BannedClientBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function BannedClientBadge({ className, size = 'sm' }: BannedClientBadgeProps) {
  return (
    <Badge 
      variant="destructive" 
      className={cn(
        "bg-destructive text-destructive-foreground hover:bg-destructive",
        size === 'sm' && "text-xs px-1.5 py-0",
        size === 'md' && "text-sm px-2 py-0.5",
        className
      )}
    >
      <Ban className={cn("mr-1", size === 'sm' ? "w-3 h-3" : "w-4 h-4")} />
      Banned
    </Badge>
  );
}
