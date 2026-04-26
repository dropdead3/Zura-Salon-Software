import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LoginShellProps {
  children: ReactNode;
  /** Optional bottom branding strip slot (copyright line, etc.). */
  footer?: ReactNode;
  /** Optional top-left chrome slot (back link, etc.). */
  topLeft?: ReactNode;
  className?: string;
}

/**
 * LoginShell — the canonical canvas for every auth-flow surface.
 *
 * One slate-950 background + soft gradient blobs + faint grid is rendered
 * once and stays mounted across every internal phase (form, post-submit
 * loader, dual-role interstitial, expired-invitation, branded org login).
 *
 * Used by:
 *   - <UnifiedLogin>
 *   - <OrgBrandedLogin>
 *   - <AuthFlowLoader>
 *
 * Doctrine: from /login mount through dashboard first paint, the user must
 * perceive ONE continuous background. This shell + AuthFlowLoader on the
 * post-auth path is the contract that delivers that.
 */
export function LoginShell({ children, footer, topLeft, className }: LoginShellProps) {
  return (
    <div
      className={cn(
        // Scope dark Zura tokens to the auth canvas. Login routes live OUTSIDE
        // the dashboard provider tree, so without these classes --foreground,
        // --input, etc. resolve to the light-theme defaults — which makes
        // autofilled text render near-black on the slate-950 surface.
        'dark theme-cream-lux',
        'min-h-screen bg-slate-950 flex flex-col relative overflow-hidden',
        className,
      )}
    >
      {/* Background — gradient blobs + grid (always present, never animated in/out) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {topLeft && (
        <div className="absolute top-0 left-0 p-6 z-20">
          {topLeft}
        </div>
      )}

      {/* True viewport center — children are absolutely centered so neither the
          topLeft chrome nor the footer can pull the optical center upward. */}
      <div className="absolute inset-0 grid place-items-center px-6 z-10">
        {children}
      </div>

      {footer && (
        <div className="absolute bottom-0 inset-x-0 py-6 text-center z-10">
          {footer}
        </div>
      )}
    </div>
  );
}
