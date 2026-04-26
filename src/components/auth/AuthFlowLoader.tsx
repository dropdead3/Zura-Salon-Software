import { LoginShell } from './LoginShell';
import { useDelayedRender } from '@/hooks/useDelayedRender';
import { PlatformLogo } from '@/components/brand/PlatformLogo';

interface AuthFlowLoaderProps {
  /** Cooldown before render (ms). Default 200 — below human flicker threshold. */
  delay?: number;
}

/**
 * AuthFlowLoader — the canonical loader for the auth flow (login → dashboard).
 *
 * Renders inside <LoginShell> so the canvas (slate-950 + gradient blobs + grid)
 * is identical to the login form. Only the centered content differs:
 * brand mark + thin animated bar. No Z-grid, no spinner, no procedural copy.
 *
 * Used by:
 *   - <Suspense fallback> wrapping /login and /org/:slug/login routes
 *   - <ProtectedRoute> when transitioning *from* a login route (sentinel-aware)
 *   - <OrgDashboardRoute> when arriving from /login (sentinel-aware)
 *   - In-page phase transitions inside UnifiedLogin / OrgBrandedLogin
 *
 * The 200ms cooldown matches BootLuxeLoader so quick navigations never
 * flash a loader at all.
 */
export function AuthFlowLoader({ delay = 200 }: AuthFlowLoaderProps = {}) {
  const { mounted, visible } = useDelayedRender(delay);

  return (
    <LoginShell>
      {mounted && (
        <div
          data-loader-fade={visible ? 'in' : 'out'}
          className="opacity-0 transition-opacity duration-200 data-[loader-fade=in]:opacity-100 flex flex-col items-center gap-4"
          role="status"
          aria-label="Loading"
        >
          <PlatformLogo variant="login" className="h-9 w-auto opacity-80" />
          <div className="relative w-32 h-px overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 h-px rounded-full bg-white/50"
              style={{
                width: '40%',
                animation: 'auth-flow-bar-slide 1.4s ease-in-out infinite',
              }}
            />
          </div>
          <style>{`
            @keyframes auth-flow-bar-slide {
              0% { left: -40%; }
              100% { left: 100%; }
            }
          `}</style>
        </div>
      )}
    </LoginShell>
  );
}
