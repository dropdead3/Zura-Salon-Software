/**
 * useDockMixSessions — Fetches mix sessions for a given appointment.
 * Lightweight query for the Dock appointment detail view.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { DEMO_MIX_SESSIONS } from './dockDemoData';

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
  return useQuery({
    queryKey: ['dock-mix-sessions', appointmentId],
    queryFn: async (): Promise<DockMixSession[]> => {
      const { data, error } = await supabase
        .from('mix_sessions')
        .select('id, status, notes, started_at, completed_at, is_manual_override, unresolved_flag, unresolved_reason')
        .eq('appointment_id', appointmentId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as DockMixSession[];
    },
    enabled: !!appointmentId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
