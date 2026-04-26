import { useNavigate } from 'react-router-dom';
import { Building2, Copy, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PLATFORM_NAME } from '@/lib/brand';
import { usePlatformThemeIsolation } from '@/hooks/usePlatformThemeIsolation';

/**
 * NoOrganization
 * --------------
 * Calm, advisory dead-end for authenticated users whose account is not
 * linked to an organization yet. Lives outside the dashboard provider
 * tree so it cannot recursively trigger the "no org → redirect" cascade
 * that previously bounced users to the marketing landing page on refresh.
 *
 * Brand isolation:
 *  - This is platform identity space, not org-luxe space. Users without an
 *    org have no tenant palette to inherit, so we render in the canonical
 *    Zura platform palette (purple primary, dark navy backdrop, black depth).
 *  - `usePlatformThemeIsolation` strips any cached `theme-rosewood` /
 *    `theme-cream-lux` / `dark` / inline org vars left on `<html>` by the
 *    prior dashboard session so this surface paints cleanly regardless of
 *    where the user came from.
 *  - All colors resolve through `--platform-*` tokens scoped to the
 *    `.platform-theme.platform-dark` wrapper. Raw shadcn primitives that
 *    read `--background`/`--foreground` are intentionally avoided here.
 *
 * Doctrine:
 *  - Advisory tone, no shame language
 *  - Two clear actions: copy email, sign out
 *  - Surfaces signed-in email so the operator knows which account they're on
 */
export default function NoOrganization() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  // Strip lingering org `theme-*` + `dark` + inline vars on mount.
  // Same pattern PlatformLayout uses on /platform/* entry.
  usePlatformThemeIsolation();

  const email = user?.email ?? '';

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success('Email copied', { description: 'Share this with your administrator.' });
    } catch {
      toast.error('Could not copy', { description: 'Your browser blocked clipboard access.' });
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div
      className="platform-theme platform-dark min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ background: 'hsl(var(--platform-bg))' }}
      data-surface="dead-end"
    >
      {/* Ambient platform-purple glow — subtle, top-anchored, behind content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--platform-primary) / 0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          {/* Icon disc — platform card surface + Zura purple accent */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border"
            style={{
              backgroundColor: 'hsl(var(--platform-bg-card))',
              borderColor: 'hsl(var(--platform-border))',
            }}
          >
            <Building2
              className="w-6 h-6"
              style={{ color: 'hsl(var(--platform-primary))' }}
              aria-hidden="true"
            />
          </div>

          <h1
            className={cn('font-display tracking-wide uppercase text-xl mb-3')}
            style={{ color: 'hsl(var(--platform-foreground))' }}
          >
            No Organization Linked
          </h1>

          <p
            className="font-sans text-sm leading-relaxed max-w-sm mb-8"
            style={{ color: 'hsl(var(--platform-foreground-muted))' }}
          >
            Your {PLATFORM_NAME} account isn't connected to an organization yet.
            Reach out to your account owner or administrator so they can add you to the team.
          </p>

          {email && (
            <div
              className="w-full rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-3 border"
              style={{
                backgroundColor: 'hsl(var(--platform-bg-surface))',
                borderColor: 'hsl(var(--platform-border-subtle))',
              }}
            >
              <div className="text-left min-w-0">
                <div
                  className="font-sans text-[10px] uppercase tracking-wider mb-0.5"
                  style={{ color: 'hsl(var(--platform-foreground-subtle))' }}
                >
                  Signed in as
                </div>
                <div
                  className="font-sans text-sm truncate"
                  style={{ color: 'hsl(var(--platform-foreground))' }}
                >
                  {email}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleCopyEmail}
                className="shrink-0 h-8 px-2 font-sans text-xs border-0 bg-transparent"
                style={{ color: 'hsl(var(--platform-foreground-muted))' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--platform-bg-hover))';
                  e.currentTarget.style.color = 'hsl(var(--platform-foreground))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'hsl(var(--platform-foreground-muted))';
                }}
                aria-label="Copy email address"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy
              </Button>
            </div>
          )}

          <div className="w-full flex flex-col gap-2">
            <Button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full font-sans border"
              style={{
                backgroundColor: 'hsl(var(--platform-bg-card))',
                borderColor: 'hsl(var(--platform-border))',
                color: 'hsl(var(--platform-foreground))',
              }}
              onMouseEnter={(e) => {
                if (!signingOut) {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--platform-bg-hover))';
                }
              }}
              onMouseLeave={(e) => {
                if (!signingOut) {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--platform-bg-card))';
                }
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>

          <p
            className="font-sans text-xs mt-6"
            style={{ color: 'hsl(var(--platform-foreground-subtle))' }}
          >
            Already added? Try signing out and back in to refresh your access.
          </p>
        </div>
      </div>
    </div>
  );
}
