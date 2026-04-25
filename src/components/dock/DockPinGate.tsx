/**
 * DockPinGate — PIN-based staff authentication for the Dock app.
 * Full-screen dark numpad overlay.
 */

import { useState, useCallback } from 'react';
import { useDockDemoAccess } from '@/hooks/dock/useDockDemoAccess';
import { useLocations } from '@/hooks/useLocations';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { PLATFORM_NAME } from '@/lib/brand';
import { DockLocationPicker } from './DockLocationPicker';
import { LockoutCountdown } from '@/components/auth/LockoutCountdown';
import { useSessionLockout } from '@/hooks/useSessionLockout';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';
import type { DockStaffSession } from '@/pages/Dock';

interface DockPinGateProps {
  onSuccess: (session: DockStaffSession) => void;
}

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'] as const;

export function DockPinGate({ onSuccess }: DockPinGateProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingSession, setPendingSession] = useState<{
    userId: string;
    organizationId: string;
    displayName: string;
    avatarUrl: string | null;
    locationIds: string[];
  } | null>(null);
  const showDemo = useDockDemoAccess();
  const { data: settings } = useBusinessSettings();
  const { data: locations = [] } = useLocations();

  // Dock-scoped lockout window — survives refresh/sleep so a fat-fingered
  // staffer can't bypass the rate limit by reloading the iPad.
  const dockOrgId = (() => {
    try { return localStorage.getItem('dock-organization-id'); } catch { return null; }
  })();
  const { lockoutUntil, setLockoutUntil } = useSessionLockout(
    dockOrgId ? `dock:${dockOrgId}` : 'dock:unbound',
  );

  const businessName = settings?.business_name || '';
  const logoDarkUrl = settings?.logo_dark_url;

  const completeSession = useCallback((userId: string, organizationId: string, displayName: string, avatarUrl: string | null, locationId: string) => {
    // Persist location binding
    try { localStorage.setItem('dock-location-id', locationId); } catch {}
    onSuccess({
      userId,
      organizationId,
      displayName,
      avatarUrl,
      locationId,
    });
  }, [onSuccess]);

  const handleKey = useCallback(async (key: string) => {
    if (loading) return;
    // Hard-block during lockout — countdown is the dominant signal.
    if (lockoutUntil && lockoutUntil > Date.now()) return;

    if (key === 'delete') {
      setPin('');
      setError(false);
      return;
    }
    if (key === '') return;

    const next = pin + key;
    if (next.length > PIN_LENGTH) return;

    setPin(next);
    setError(false);

    if (next.length === PIN_LENGTH) {
      setLoading(true);
      try {
        const storedOrgId = (() => { try { return localStorage.getItem('dock-organization-id') || null; } catch { return null; } })();

        const { data, error: dbError } = await supabase
          .rpc('validate_dock_pin', {
            _pin: next,
            _organization_id: storedOrgId,
            _device_fingerprint: getDeviceFingerprint(),
          })
          .maybeSingle();

        // ── Server-side rate limit (per-device or org-wide window) ──
        if (data && (data as { lockout_until: string | null }).lockout_until) {
          const until = new Date((data as { lockout_until: string }).lockout_until).getTime();
          setLockoutUntil(until);
          setPin('');
          return;
        }

        if (dbError || !data || !data.user_id) {
          setError(true);
          setPin('');
          toast.error('Invalid PIN');
        } else {
          // Bind device to org on first successful login
          if (!storedOrgId && data.organization_id) {
            try { localStorage.setItem('dock-organization-id', data.organization_id); } catch {}
          }

          const deviceLocId = (() => { try { return localStorage.getItem('dock-location-id') || ''; } catch { return ''; } })();

          // If device already bound to a location, use it directly
          if (deviceLocId) {
            completeSession(data.user_id, data.organization_id || '', data.display_name || 'Staff', data.photo_url, deviceLocId);
            return;
          }

          // Build effective location list: location_ids array, falling back to single location_id
          const staffLocationIds: string[] = (data.location_ids && data.location_ids.length > 0)
            ? data.location_ids
            : data.location_id ? [data.location_id] : [];

          // If multiple locations and no device binding, show picker
          if (staffLocationIds.length > 1) {
            setPendingSession({
              userId: data.user_id,
              organizationId: data.organization_id || '',
              displayName: data.display_name || 'Staff',
              avatarUrl: data.photo_url,
              locationIds: staffLocationIds,
            });
          } else {
            // Single location — auto-bind
            const locId = staffLocationIds[0] || '';
            completeSession(data.user_id, data.organization_id || '', data.display_name || 'Staff', data.photo_url, locId);
          }
        }
      } catch {
        setError(true);
        setPin('');
        toast.error('Connection error');
      } finally {
        setLoading(false);
      }
    }
  }, [pin, loading, lockoutUntil, setLockoutUntil, completeSession]);

  // Show location picker if multi-location staff needs to choose
  if (pendingSession) {
    return (
      <DockLocationPicker
        organizationId={pendingSession.organizationId}
        locationIds={pendingSession.locationIds}
        staffName={pendingSession.displayName}
        onSelect={(locId) => {
          completeSession(
            pendingSession.userId,
            pendingSession.organizationId,
            pendingSession.displayName,
            pendingSession.avatarUrl,
            locId,
          );
        }}
      />
    );
  }

  return (
    <div className="platform-theme platform-dark absolute inset-0 flex flex-col items-center justify-center bg-[hsl(var(--platform-bg))] text-[hsl(var(--platform-foreground))]">
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 w-[60%] h-[60%] bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.12)_0%,rgba(59,130,246,0.06)_40%,transparent_70%)] pointer-events-none" />
      {/* Organization Logo / Name */}
      <div className="mb-8 text-center">
        {logoDarkUrl ? (
          <img
            src={logoDarkUrl}
            alt={businessName}
            className="mx-auto max-h-10 w-auto object-contain"
          />
        ) : businessName ? (
          <h1 className="font-display text-2xl tracking-widest uppercase text-[hsl(var(--platform-foreground))]">
            {businessName}
          </h1>
        ) : null}
        <p className="mt-3 text-sm text-[hsl(var(--platform-foreground-muted))]">
          Enter your PIN to begin
        </p>
      </div>

      {/* Lockout countdown — dominant signal during rate-limit window */}
      {lockoutUntil && lockoutUntil > Date.now() && (
        <div className="mb-6 max-w-xs w-full px-6">
          <LockoutCountdown until={lockoutUntil} onExpire={() => setLockoutUntil(null)} />
        </div>
      )}

      {/* PIN dots */}
      <div className="flex gap-4 mb-10">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-4 rounded-full border-2 transition-all duration-150',
              i < pin.length
                ? error
                  ? 'bg-red-500 border-red-500'
                  : 'bg-violet-500 border-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]'
                : 'border-[hsl(var(--platform-border))] bg-transparent'
            )}
          />
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 w-80">
        {KEYS.map((key, i) => {
          if (key === '') return <div key={i} />;
          if (key === 'delete') {
            return (
              <button
                key={i}
                onClick={() => handleKey('delete')}
                className="flex items-center justify-center h-[72px] rounded-2xl text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-bg-hover))] active:bg-[hsl(var(--platform-bg-card))] transition-colors"
              >
                <span className="text-sm font-medium tracking-wide">Clear</span>
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleKey(key)}
              disabled={loading}
              className="flex items-center justify-center h-[72px] rounded-2xl text-2xl font-medium bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] hover:bg-[hsl(var(--platform-bg-hover))] active:bg-violet-500/25 active:shadow-[inset_0_0_20px_rgba(139,92,246,0.15)] active:scale-[0.97] transition-all duration-500 ease-out disabled:opacity-50"
            >
              {key}
            </button>
          );
        })}
      </div>

      {showDemo && (
        <div className="mt-8 flex flex-col items-center gap-1">
          <button
            onClick={() => {
              const deviceLocId = (() => { try { return localStorage.getItem('dock-location-id') || ''; } catch { return ''; } })();
              const resolvedLoc = deviceLocId
                ? locations.find(l => l.id === deviceLocId)
                : locations[0];
              const resolvedLocId = resolvedLoc?.id || '';
              const resolvedOrgId = (resolvedLoc as any)?.organization_id || '';
              if (!deviceLocId && resolvedLocId) {
                try { localStorage.setItem('dock-location-id', resolvedLocId); } catch {}
              }
              onSuccess({
                userId: 'dev-bypass-000',
                organizationId: resolvedOrgId,
                displayName: 'Demo User',
                avatarUrl: null,
                locationId: resolvedLocId,
              });
            }
            }
            className="text-xs text-[hsl(var(--platform-foreground-muted)/0.4)] hover:text-violet-400 transition-colors"
          >
            Demo Mode →
          </button>
          <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.25)]">Preview only</span>
        </div>
      )}

      {/* Powered by footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <span className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.3)]">
          {businessName ? `${businessName} · ` : ''}Powered by {PLATFORM_NAME}
        </span>
      </div>
    </div>
  );
}
