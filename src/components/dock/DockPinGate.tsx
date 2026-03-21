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
  const showDemo = useDockDemoAccess();
  const { data: settings } = useBusinessSettings();
  const { data: locations = [] } = useLocations();

  const businessName = settings?.business_name || '';
  const logoDarkUrl = settings?.logo_dark_url;

  const handleKey = useCallback(async (key: string) => {
    if (loading) return;

    if (key === 'delete') {
      setPin((p) => p.slice(0, -1));
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
        // Read device-bound org from localStorage (scopes PIN after first login)
        const storedOrgId = (() => { try { return localStorage.getItem('dock-organization-id') || null; } catch { return null; } })();

        const { data, error: dbError } = await supabase
          .rpc('validate_dock_pin', {
            _pin: next,
            _organization_id: storedOrgId,
          })
          .maybeSingle();

        if (dbError || !data) {
          setError(true);
          setPin('');
          toast.error('Invalid PIN');
        } else {
          // Bind device to org on first successful login
          if (!storedOrgId && data.organization_id) {
            try { localStorage.setItem('dock-organization-id', data.organization_id); } catch {}
          }
          // Resolve location: explicit device config > staff profile
          const deviceLocId = (() => { try { return localStorage.getItem('dock-location-id') || ''; } catch { return ''; } })();
          const resolvedLocationId = deviceLocId || data.location_id || '';
          onSuccess({
            userId: data.user_id,
            organizationId: data.organization_id || '',
            displayName: data.display_name || 'Staff',
            avatarUrl: data.photo_url,
            locationId: resolvedLocationId,
          });
        }
      } catch {
        setError(true);
        setPin('');
        toast.error('Connection error');
      } finally {
        setLoading(false);
      }
    }
  }, [pin, loading, onSuccess]);

  return (
    <div className="platform-theme platform-dark absolute inset-0 flex flex-col items-center justify-center bg-[hsl(var(--platform-bg))] text-[hsl(var(--platform-foreground))]">
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
      <div className="grid grid-cols-3 gap-4 w-72">
        {KEYS.map((key, i) => {
          if (key === '') return <div key={i} />;
          if (key === 'delete') {
            return (
              <button
                key={i}
                onClick={() => handleKey('delete'}
                className="flex items-center justify-center h-16 rounded-2xl text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-bg-hover))] active:bg-[hsl(var(--platform-bg-card))] transition-colors"
              >
                <Delete className="w-6 h-6" />
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleKey(key)}
              disabled={loading}
              className="flex items-center justify-center h-16 rounded-2xl text-xl font-medium bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] hover:bg-[hsl(var(--platform-bg-hover))] active:bg-violet-600/20 transition-colors disabled:opacity-50"
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
                displayName: 'Dev Tester',
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
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <span className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.3)]">
          {businessName ? `${businessName} · ` : ''}Powered by {PLATFORM_NAME}
        </span>
      </div>
    </div>
  );
}
