/**
 * useDockMixSessions — Fetches mix sessions for a given appointment.
 * Lightweight query for the Dock appointment detail view.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { DEMO_MIX_SESSIONS } from './dockDemoData';

const isDemoId = (id: string | null) => id?.startsWith('demo-') ?? false;

export interface DockMixSession {
  id: string;
  status: string;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  is_manual_override: boolean;
  unresolved_flag: boolean;
  unresolved_reason: string | null;
}

export function useDockMixSessions(appointmentId: string | null) {
  const { isDemoMode, usesRealData } = useDockDemo();
  return useQuery({
    queryKey: ['dock-mix-sessions', appointmentId, isDemoMode, usesRealData],
    queryFn: async (): Promise<DockMixSession[]> => {
      // Pure demo mode or demo IDs — use static data
      if (isDemoMode && (!usesRealData || isDemoId(appointmentId))) {
        return DEMO_MIX_SESSIONS[appointmentId!] || [];
      }

      const { data, error } = await supabase
        .from('mix_sessions')
        .select('id, status, notes, started_at, completed_at, is_manual_override, unresolved_flag, unresolved_reason')
        .eq('appointment_id', appointmentId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const sessions = (data || []) as unknown as DockMixSession[];

      // Org-specific demo with no real sessions — fallback to demo data
      if (isDemoMode && sessions.length === 0) {
        return DEMO_MIX_SESSIONS[appointmentId!] || [];
      }
      return sessions;
    },
    enabled: !!appointmentId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
