/**
 * DockPinGate — PIN-based staff authentication for the Dock app.
 * Full-screen dark numpad overlay.
 */

import { useState, useCallback } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
        const { data, error: dbError } = await supabase
          .from('employee_profiles')
          .select('user_id, full_name, display_name, photo_url')
          .eq('login_pin', next)
          .limit(1)
          .maybeSingle();

        if (dbError || !data) {
          setError(true);
          setPin('');
          toast.error('Invalid PIN');
        } else {
          onSuccess({
            userId: data.user_id,
            displayName: data.display_name || data.full_name || 'Staff',
            avatarUrl: data.photo_url,
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
    <div className="platform-theme platform-dark fixed inset-0 flex flex-col items-center justify-center bg-[hsl(var(--platform-bg))] text-[hsl(var(--platform-foreground))]">
      {/* Logo / Title */}
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl tracking-widest uppercase text-violet-400">
          Zura Dock
        </h1>
        <p className="mt-2 text-sm text-[hsl(var(--platform-foreground-muted))]">
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
                onClick={() => handleKey('delete')}
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
    </div>
  );
}
