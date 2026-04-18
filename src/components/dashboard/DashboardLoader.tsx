import { cn } from '@/lib/utils';
import { ZuraLoader } from '@/components/ui/ZuraLoader';
import { SpinnerLoader, DotsLoader, BarLoader, LuxeLoader } from '@/components/ui/loaders';
import { Skeleton } from '@/components/ui/skeleton';
import { useLoaderConfig, LoaderStyle } from '@/hooks/useLoaderConfig';

interface DashboardLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const LOADER_MAP: Record<LoaderStyle, React.ComponentType<{ size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }>> = {
  luxe: LuxeLoader,
  zura: ZuraLoader,
  spinner: SpinnerLoader,
  dots: DotsLoader,
  bar: BarLoader,
};

/**
 * Config-aware loader for org dashboard section/page loading states.
 * Reads platform admin's chosen loader style (or skeleton mode) from branding settings.
 *
 * Usage convention:
 *   - Section / card loads → <DashboardLoader /> (default size 'md')
 *   - Full-page route loads → <DashboardLoader size="lg" />
 *   - Inline / button spinners → <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
 *   - Bootstrap / brand moments only → <ZuraLoader size="xl" platformColors />
 *
 * Always theme-aware via foreground tokens; never hardcode colors.
 */
export function DashboardLoader({ size = 'md', className }: DashboardLoaderProps) {
  const { loaderStyle, useSkeletons } = useLoaderConfig();

  if (useSkeletons) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3', !(className?.includes('min-h-') || className?.includes('h-')) && 'min-h-[60vh]', className)}>
        <Skeleton className="h-4 w-48 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
        <Skeleton className="h-3 w-40 rounded" />
      </div>
    );
  }

  const LoaderComponent = LOADER_MAP[loaderStyle] || LuxeLoader;

  const hasHeightClass = className?.includes('min-h-') || className?.includes('h-');

  return (
    <div className={cn('flex items-center justify-center', !hasHeightClass && 'min-h-[60vh]', className)}>
      <LoaderComponent size={size} />
    </div>
  );
}
