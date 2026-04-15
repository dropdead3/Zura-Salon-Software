/**
 * DockClientQuickView — Lightweight client profile bottom sheet for the Dock.
 * Shows client name, notes, and recent visit history.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, FileText, Clock, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatFirstLastInitial } from '@/lib/dock-utils';

interface DockClientQuickViewProps {
  open: boolean;
  onClose: () => void;
  phorestClientId?: string | null;
  clientId?: string | null;
  clientName?: string | null;
}

const spring = { damping: 26, stiffness: 300, mass: 0.8 };

export function DockClientQuickView({ open, onClose, phorestClientId, clientId, clientName }: DockClientQuickViewProps) {
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['dock-client-profile', phorestClientId, clientId],
    queryFn: async () => {
      if (phorestClientId) {
        const { data } = await supabase
          .from('v_all_clients' as any)
          .select('id, name, email, phone, notes, created_at')
          .eq('phorest_client_id', phorestClientId)
          .maybeSingle();
        return data;
      }
      if (clientId) {
        const { data } = await supabase
          .from('clients')
          .select('id, first_name, last_name, email, phone, notes, created_at')
          .eq('id', clientId)
          .maybeSingle();
        if (data) {
          return { ...data, name: `${data.first_name || ''} ${data.last_name || ''}`.trim() };
        }
      }
      return null;
    },
    enabled: open && !!(phorestClientId || clientId),
  });

  const { data: recentVisits } = useQuery({
    queryKey: ['dock-client-visits', phorestClientId, clientId],
    queryFn: async () => {
      if (phorestClientId) {
        const { data } = await supabase
          .from('v_all_appointments' as any)
          .select('id, service_name, appointment_date, start_time, status')
          .eq('phorest_client_id', phorestClientId)
          .order('appointment_date', { ascending: false })
          .limit(5);
        return data || [];
      }
      if (clientId) {
        const { data } = await supabase
          .from('appointments')
          .select('id, service_name, appointment_date, start_time, status')
          .eq('client_id', clientId)
          .order('appointment_date', { ascending: false })
          .limit(5);
        return data || [];
      }
      return [];
    },
    enabled: open && !!(phorestClientId || clientId),
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="absolute top-0 left-0 right-0 z-50 rounded-b-2xl bg-[hsl(var(--platform-bg-elevated))] border-b border-[hsl(var(--platform-border)/0.3)] max-h-[70%] overflow-hidden flex flex-col"
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', ...spring }}
            drag="y"
            dragConstraints={{ bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y < -100) onClose();
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[hsl(var(--platform-foreground-muted)/0.3)]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-7 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
                    {clientName || client?.name || 'Client'}
                  </h3>
                  {client?.email && (
                    <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">{client.email}</p>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-[hsl(var(--platform-bg-hover))]">
                <X className="w-4 h-4 text-[hsl(var(--platform-foreground-muted))]" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-7 pb-6 space-y-5">
              {loadingClient ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                </div>
              ) : (
                <>
                  {/* Notes */}
                  {client?.notes && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.6)]" />
                        <span className="text-xs font-medium tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">
                          Notes
                        </span>
                      </div>
                      <p className="text-sm text-[hsl(var(--platform-foreground))] bg-[hsl(var(--platform-bg-card))] rounded-lg p-3 border border-[hsl(var(--platform-border)/0.2)]">
                        {client.notes}
                      </p>
                    </div>
                  )}

                  {/* Recent visits */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.6)]" />
                      <span className="text-xs font-medium tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">
                        Recent Visits
                      </span>
                    </div>
                    {recentVisits && recentVisits.length > 0 ? (
                      <div className="space-y-2">
                        {recentVisits.map((v: any) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between rounded-lg bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] p-3"
                          >
                            <div>
                              <p className="text-xs text-[hsl(var(--platform-foreground))]">
                                {v.service_name || 'Service'}
                              </p>
                              <p className="text-[11px] text-[hsl(var(--platform-foreground-muted))]">
                                {v.appointment_date ? format(parseISO(v.appointment_date), 'MMM d, yyyy') : ''}
                              </p>
                            </div>
                            <span className="text-[10px] uppercase tracking-wide text-[hsl(var(--platform-foreground-muted)/0.6)]">
                              {v.status || 'completed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">No previous visits</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
