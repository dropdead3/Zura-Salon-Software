/**
 * DockClientAlertsBanner — Compact read-only allergy & booking notes banner
 * for the Services tab. Shares the dock-client-profile query cache.
 * Supports swipe-to-dismiss and X-to-close per card (session-only).
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CalendarPlus, X } from 'lucide-react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { detectAllergyFlags } from '@/lib/color-bar/detect-allergy-flags';
import { DOCK_TEXT } from '@/components/dock/dock-ui-tokens';
import { cn } from '@/lib/utils';

interface DockClientAlertsBannerProps {
  phorestClientId: string | null | undefined;
  clientId: string | null | undefined;
  clientName: string | null | undefined;
  bookingNotes?: string | null;
}

const isDemoClientId = (id: string | null | undefined) => id?.startsWith('demo-') ?? false;

const RACHEL_KIM_IDS = ['demo-client-7', 'demo-pc-7'];

function getDemoClientMock(clientId: string | null | undefined, phorestClientId: string | null | undefined, clientName: string | null | undefined) {
  const isRachel = RACHEL_KIM_IDS.includes(clientId ?? '') || RACHEL_KIM_IDS.includes(phorestClientId ?? '');
  return {
    notes: isRachel ? 'Prefers low-ammonia formulas. Sensitive scalp — patch test recommended.' : null,
    medical_alerts: isRachel ? 'PPD sensitivity — always patch test 48h prior' : null,
    name: clientName || 'Client',
  };
}

type BannerKey = 'allergy' | 'booking';

const SWIPE_THRESHOLD = 100;

export function DockClientAlertsBanner({ phorestClientId, clientId, clientName, bookingNotes }: DockClientAlertsBannerProps) {
  const storageKey = `dock-alerts-dismissed-${clientId || phorestClientId}`;
  const [dismissed, setDismissed] = useState<Set<BannerKey>>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored ? new Set(JSON.parse(stored) as BannerKey[]) : new Set();
    } catch { return new Set(); }
  });
  const usingDemo = isDemoClientId(phorestClientId) || isDemoClientId(clientId);

  // Re-sync dismissed state when switching clients
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      setDismissed(stored ? new Set(JSON.parse(stored) as BannerKey[]) : new Set());
    } catch { setDismissed(new Set()); }
  }, [storageKey]);

  // Listen for demo reset to re-show dismissed alerts
  useEffect(() => {
    const handleReset = () => {
      setDismissed(new Set());
      try { sessionStorage.removeItem(storageKey); } catch {}
    };
    window.addEventListener('dock-demo-reset', handleReset);
    return () => window.removeEventListener('dock-demo-reset', handleReset);
  }, [storageKey]);

  const dismiss = useCallback((key: BannerKey) => {
    setDismissed(prev => {
      const next = new Set(prev).add(key);
      try { sessionStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [storageKey]);

  const handleDragEnd = useCallback((key: BannerKey, _: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
      dismiss(key);
    }
  }, [dismiss]);

  const { data: client } = useQuery({
    queryKey: ['dock-client-profile', phorestClientId, clientId, usingDemo],
    queryFn: async () => {
      if (usingDemo) {
        return getDemoClientMock(clientId, phorestClientId, clientName);
      }
      if (phorestClientId) {
        const { data } = await supabase
          .from('v_all_clients' as any)
          .select('notes, medical_alerts')
          .eq('phorest_client_id', phorestClientId)
          .maybeSingle();
        return data as any;
      }
      if (clientId) {
        const { data } = await supabase
          .from('clients')
          .select('notes, medical_alerts')
          .eq('id', clientId)
          .maybeSingle();
        return data;
      }
      return null;
    },
    enabled: !!(phorestClientId || clientId),
  });

  const allergyText = client ? detectAllergyFlags(
    (client as any)?.medical_alerts ?? null,
    client?.notes ?? null,
  ) : null;
  const trimmedBooking = bookingNotes?.trim() || null;

  const hasAny =
    (allergyText && !dismissed.has('allergy')) ||
    (trimmedBooking && !dismissed.has('booking'));

  if (!hasAny) return null;

  const exitAnim = { opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.22 } };
  const dragConstraints = { left: 0, right: 0 };

  return (
    <div className="px-7 pt-4 pb-1 space-y-2 overflow-hidden">
      <AnimatePresence initial={false}>
        {/* Allergy / Sensitivity Alert */}
        {allergyText && !dismissed.has('allergy') && (
          <motion.div
            key="allergy"
            layout
            drag="x"
            dragConstraints={dragConstraints}
            onDragEnd={(_, info) => handleDragEnd('allergy', _, info)}
            exit={exitAnim}
            className="relative flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20"
          >
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className={cn(DOCK_TEXT.category, 'text-sm text-rose-400 mb-0.5')}>
                Allergy / Sensitivity
              </p>
              <p className="text-sm text-rose-300/90 leading-relaxed">
                {allergyText}
              </p>
            </div>
            <button
              onClick={() => dismiss('allergy')}
              className="absolute top-2 right-2 p-1 rounded-full text-rose-400/30 hover:text-rose-400/60 transition-colors"
            >
               <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Booking Note */}
        {trimmedBooking && !dismissed.has('booking') && (
          <motion.div
            key="booking"
            layout
            drag="x"
            dragConstraints={dragConstraints}
            onDragEnd={(_, info) => handleDragEnd('booking', _, info)}
            exit={exitAnim}
            className="relative flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)]"
          >
            <CalendarPlus className="w-5 h-5 text-violet-400/60 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className={cn(DOCK_TEXT.category, 'text-sm mb-0.5')}>
                Booking Note
              </p>
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))] leading-relaxed">
                {trimmedBooking}
              </p>
            </div>
            <button
              onClick={() => dismiss('booking')}
              className="absolute top-2 right-2 p-1 rounded-full text-[hsl(var(--platform-foreground-muted)/0.3)] hover:text-[hsl(var(--platform-foreground-muted)/0.6)] transition-colors"
            >
               <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}