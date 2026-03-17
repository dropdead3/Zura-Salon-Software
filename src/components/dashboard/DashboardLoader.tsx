import { cn } from '@/lib/utils';
import { ZuraLoader } from '@/components/ui/ZuraLoader';

interface DashboardLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Centered ZuraLoader for org dashboard section/page loading states.
 * Inherits org theme colors via foreground tokens (no platformColors).
 * Use className for height overrides like "py-12" or "h-64".
 */
export function DashboardLoader({ size = 'lg', className }: DashboardLoaderProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <ZuraLoader size={size} />
    </div>
  );
}
