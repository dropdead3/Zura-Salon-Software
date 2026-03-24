/**
 * DockClientAlertsBanner — Compact read-only allergy & profile notes banner
 * for the Services tab. Shares the dock-client-profile query cache.
 * Supports swipe-to-dismiss and X-to-close per card (session-only).
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, FileText, ChevronDown, ChevronUp, CalendarPlus, X } from 'lucide-react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { detectAllergyFlags } from '@/lib/backroom/detect-allergy-flags';
import { DOCK_TEXT } from '@/components/dock/dock-ui-tokens';
import { cn } from '@/lib/utils';

interface DockClientAlertsBannerProps {
  phorestClientId: string | null | undefined;
  clientId: string | null | undefined;
  clientName: string | null | undefined;
  bookingNotes?: string | null;
}

const isDemoClientId = (id: string | null | undefined) => id?.startsWith('demo-') ?? false;

const DEMO_CLIENT_MOCK = {
  notes: 'Prefers low-ammonia formulas. Sensitive scalp — patch test recommended.',
  medical_alerts: 'PPD sensitivity — always patch test 48h prior',
};

type BannerKey = 'allergy' | 'booking' | 'profile';

const SWIPE_THRESHOLD = 100;

export function DockClientAlertsBanner({ phorestClientId, clientId, clientName, bookingNotes }: DockClientAlertsBannerProps) {
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<BannerKey>>(new Set());
  const usingDemo = isDemoClientId(phorestClientId) || isDemoClientId(clientId);

  const dismiss = useCallback((key: BannerKey) => {
    setDismissed(prev => new Set(prev).add(key));
  }, []);

  const handleDragEnd = useCallback((key: BannerKey, _: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
      dismiss(key);
    }
  }, [dismiss]);

  const { data: client } = useQuery({
    queryKey: ['dock-client-profile', phorestClientId, clientId, usingDemo],
    queryFn: async () => {
      if (usingDemo) {
        return { ...DEMO_CLIENT_MOCK, name: clientName || 'Client' };
      }
      if (phorestClientId) {
        const { data } = await supabase
          .from('phorest_clients')
          .select('notes, medical_alerts')
          .eq('phorest_client_id', phorestClientId)
          .maybeSingle();
        return data;
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
  const profileNotes = client?.notes?.trim() || null;
  const trimmedBooking = bookingNotes?.trim() || null;

  const hasAny =
    (allergyText && !dismissed.has('allergy')) ||
    (trimmedBooking && !dismissed.has('booking')) ||
    (profileNotes && !dismissed.has('profile'));

  if (!hasAny) return null;

  const notesIsLong = profileNotes ? profileNotes.length > 120 : false;

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
            className="relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className={cn(DOCK_TEXT.category, 'text-rose-400 mb-0.5')}>
                Allergy / Sensitivity
              </p>
              <p className="text-xs text-rose-300/90 leading-relaxed">
                {allergyText}
              </p>
            </div>
            <button
              onClick={() => dismiss('allergy')}
              className="absolute top-2 right-2 p-1 rounded-full text-rose-400/30 hover:text-rose-400/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
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
            className="relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)]"
          >
            <CalendarPlus className="w-4 h-4 text-violet-400/60 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className={cn(DOCK_TEXT.category, 'mb-0.5')}>
                Booking Note
              </p>
              <p className="text-xs text-[hsl(var(--platform-foreground-muted))] leading-relaxed">
                {trimmedBooking}
              </p>
            </div>
            <button
              onClick={() => dismiss('booking')}
              className="absolute top-2 right-2 p-1 rounded-full text-[hsl(var(--platform-foreground-muted)/0.3)] hover:text-[hsl(var(--platform-foreground-muted)/0.6)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {/* Profile Notes */}
        {profileNotes && !dismissed.has('profile') && (
          <motion.div
            key="profile"
            layout
            drag="x"
            dragConstraints={dragConstraints}
            onDragEnd={(_, info) => handleDragEnd('profile', _, info)}
            exit={exitAnim}
            className="relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)]"
          >
            <FileText className="w-4 h-4 text-[hsl(var(--platform-foreground-muted)/0.5)] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className={cn(DOCK_TEXT.category, 'mb-0.5')}>
                Profile Notes
              </p>
              <p className={cn(
                'text-xs text-[hsl(var(--platform-foreground-muted))] leading-relaxed',
                !notesExpanded && notesIsLong && 'line-clamp-2',
              )}>
                {profileNotes}
              </p>
              {notesIsLong && (
                <button
                  onClick={() => setNotesExpanded(!notesExpanded)}
                  className="flex items-center gap-1 mt-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                >
                  {notesExpanded ? (
                    <>Show less <ChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>Show more <ChevronDown className="w-3 h-3" /></>
                  )}
                </button>
              )}
            </div>
            <button
              onClick={() => dismiss('profile')}
              className="absolute top-2 right-2 p-1 rounded-full text-[hsl(var(--platform-foreground-muted)/0.3)] hover:text-[hsl(var(--platform-foreground-muted)/0.6)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
