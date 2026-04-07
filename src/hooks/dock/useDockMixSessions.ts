/**
 * useDockMixSessions — Fetches mix sessions for a given appointment.
 * Lightweight query for the Dock appointment detail view.
 * Resolves mixed_by_staff_id → mixed_by_name via employee_profiles.
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
  service_label: string | null;
  mixed_by_staff_id: string | null;
  mixed_by_name: string | null;
  container_type: 'bowl' | 'bottle';
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
        .select('id, status, notes, started_at, completed_at, is_manual_override, unresolved_flag, unresolved_reason, service_label, mixed_by_staff_id, container_type')
        .eq('appointment_id', appointmentId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const sessions = (data || []) as unknown as Omit<DockMixSession, 'mixed_by_name'>[];

      // Org-specific demo with no real sessions — fallback to demo data
      if (isDemoMode && sessions.length === 0) {
        return DEMO_MIX_SESSIONS[appointmentId!] || [];
      }

      // Resolve mixed_by_staff_id → name via employee_profiles
      const staffIds = [...new Set(sessions.map(s => s.mixed_by_staff_id).filter(Boolean))] as string[];
      let nameMap = new Map<string, string>();
      if (staffIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, full_name, display_name')
          .in('user_id', staffIds);
        if (profiles) {
          for (const p of profiles) {
            nameMap.set(p.user_id, p.display_name || p.full_name || 'Unknown');
          }
        }
      }

      return sessions.map(s => ({
        ...s,
        mixed_by_name: s.mixed_by_staff_id ? (nameMap.get(s.mixed_by_staff_id) || null) : null,
      }));
    },
    enabled: !!appointmentId && typeof document !== 'undefined' && document.visibilityState === 'visible',
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
