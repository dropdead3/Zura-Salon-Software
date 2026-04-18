import { cn } from '@/lib/utils';
import { ZuraLoader } from '@/components/ui/ZuraLoader';
import { SpinnerLoader, DotsLoader, BarLoader, LuxeLoader } from '@/components/ui/loaders';
import { Skeleton } from '@/components/ui/skeleton';
import { useLoaderConfig, LoaderStyle } from '@/hooks/useLoaderConfig';
import { useDelayedRender } from '@/hooks/useDelayedRender';

interface DashboardLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  caption?: string;
  /**
   * Fills viewport minus top nav + page header chrome and centers the loader.
   * Use for full-page route loads where the loader is the only content.
   */
  fullPage?: boolean;
  /**
   * Absolutely fills the nearest positioned parent and centers the loader.
   * Use for card / section loaders where the parent already has a defined height.
   */
  fillParent?: boolean;
  /**
   * Delay in ms before the loader paints. Suppresses flicker on fast loads.
   * Defaults to 200ms (below human flicker-perception threshold). Pass `0` to
   * render immediately for user-triggered "Refreshing…" actions.
   */
  delay?: number;
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
 * Defaults to LuxeLoader — calm, executive, theme-aware.
 *
 * Usage convention:
 *   - Full-page route loads → <DashboardLoader fullPage />
 *   - Card / section loaders inside a sized parent → <DashboardLoader fillParent />
 *   - Section / card loads (default min-h-[60vh]) → <DashboardLoader />
 *   - Inline / button spinners → <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
 *
 * IMPORTANT: ZuraLoader (the disco Z grid) is OFF BY DEFAULT. It only renders
 * when an operator explicitly selects "Zura" in branding settings. Never hardcode
 * <ZuraLoader /> in bootstrap, route shells, or platform admin surfaces — those
 * are system states and should remain calm regardless of branding preference.
 *
 * Always theme-aware via foreground tokens; never hardcode colors.
 */
export function DashboardLoader({ size = 'md', className, caption, fullPage, fillParent, delay = 200 }: DashboardLoaderProps) {
  const { loaderStyle, useSkeletons } = useLoaderConfig();
  const { mounted, visible } = useDelayedRender(delay);
  if (!mounted) return null;

  const fadeClass = 'opacity-0 transition-opacity duration-150 data-[loader-fade=in]:opacity-100';
  const fadeState = visible ? 'in' : 'out';

  const hasHeightClass = className?.includes('min-h-') || className?.includes('h-[') || className?.includes('h-64') || className?.includes('h-screen');

  // Account for top nav (~64px) + page header (~80px) = ~9rem of chrome.
  const fullPageClass = 'min-h-[calc(100vh-9rem)]';
  const fillParentClass = 'absolute inset-0';
  const defaultClass = !hasHeightClass ? 'min-h-[60vh]' : undefined;

  const wrapperClass = fillParent
    ? fillParentClass
    : fullPage
      ? fullPageClass
      : defaultClass;

  if (useSkeletons) {
    return (
      <div data-loader-fade={fadeState} className={cn('flex flex-col items-center justify-center gap-3', fadeClass, wrapperClass, className)}>
        <Skeleton className="h-4 w-48 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
        <Skeleton className="h-3 w-40 rounded" />
        {caption && <span className="font-sans text-xs text-muted-foreground mt-2">{caption}</span>}
      </div>
    );
  }

  const LoaderComponent = LOADER_MAP[loaderStyle] || LuxeLoader;
  const supportsCaption = LoaderComponent === LuxeLoader;

  return (
    <div data-loader-fade={fadeState} className={cn('flex items-center justify-center', fadeClass, wrapperClass, className)}>
      {supportsCaption
        ? <LuxeLoader size={size} caption={caption} />
        : <LoaderComponent size={size} />}
    </div>
  );
}
