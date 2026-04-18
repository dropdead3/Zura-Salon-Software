/**
 * BootLuxeLoader — provider-free, theme-aware Luxe Z + bar loader.
 *
 * Use this for pre-React or pre-provider load contexts where the config-aware
 * <DashboardLoader /> cannot resolve (e.g. React.Suspense fallbacks, ProtectedRoute
 * gates that mount before OrganizationContext / branding hooks are ready).
 *
 * Mirrors the markup used by main.tsx's bootstrap fallback so that boot →
 * Suspense → ProtectedRoute → Dashboard all present the SAME visual loading
 * treatment. No more cascading purple/white/Z-grid stack.
 *
 * For in-app section/page loads (after providers mount), use <DashboardLoader />.
 * For inline button spinners, use <Loader2 className="w-4 h-4 animate-spin" />.
 */
import { useDelayedRender } from '@/hooks/useDelayedRender';

export function BootLuxeLoader({ fullScreen = false, delay = 200 }: { fullScreen?: boolean; delay?: number }) {
  const { mounted, visible } = useDelayedRender(delay);
  if (!mounted) return null;

  const fadeState = visible ? 'in' : 'out';
  const fadeClass = 'opacity-0 transition-opacity duration-150 data-[loader-fade=in]:opacity-100';

  const inner = (
    <div data-loader-fade={fadeState} className={`flex flex-col items-center justify-center gap-3 ${fadeClass}`} role="status" aria-label="Loading">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 134.15 133.16"
        className="h-7 w-7 shrink-0 text-foreground/80"
        fill="currentColor"
        aria-hidden="true"
      >
        <g>
          <rect width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="19.97" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="39.93" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="59.9" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="79.86" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="99.83" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="119.8" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="99.83" y="19.8" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="119.8" y="19.8" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="79.86" y="39.6" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="99.83" y="39.6" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="59.9" y="59.4" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="79.86" y="59.4" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="39.93" y="79.2" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="59.9" y="79.2" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="19.97" y="99" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="39.93" y="99" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="19.97" y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="39.93" y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="59.9" y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="79.86" y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="99.83" y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="119.8" y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
        </g>
      </svg>
      <div className="relative w-32 h-px overflow-hidden rounded-full bg-foreground/10">
        <div
          className="absolute inset-y-0 h-px rounded-full bg-foreground/50"
          style={{
            width: '40%',
            animation: 'boot-luxe-bar-slide 1.4s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes boot-luxe-bar-slide {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        {inner}
      </div>
    );
  }
  return inner;
}
