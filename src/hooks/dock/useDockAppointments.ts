/**
 * useDockAppointments — Fetches today's appointments for a specific staff member.
 * Lightweight query for the Dock Schedule tab.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { DEMO_APPOINTMENTS } from './dockDemoData';

export interface DockAppointment {
  id: string;
  source: 'phorest' | 'local';
  client_name: string | null;
  service_name: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string | null;
  location_id: string | null;
  phorest_client_id?: string | null;
  client_id?: string | null;
  notes?: string | null;
  has_mix_session?: boolean;
}

export function useDockAppointments(staffUserId: string | null) {
  const { isDemoMode } = useDockDemo();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['dock-appointments', staffUserId, today],
    queryFn: async (): Promise<DockAppointment[]> => {
      // Fetch from both phorest_appointments and appointments in parallel
      const [phorestResult, localResult] = await Promise.all([
        supabase
          .from('phorest_appointments')
          .select('id, client_name, service_name, appointment_date, start_time, end_time, status, location_id, phorest_client_id, notes')
          .eq('stylist_user_id', staffUserId!)
          .eq('appointment_date', today)
          .is('deleted_at', null)
          .order('start_time', { ascending: true }),
        supabase
          .from('appointments')
          .select('id, client_name, service_name, appointment_date, start_time, end_time, status, location_id, client_id, notes')
          .eq('staff_user_id', staffUserId!)
          .eq('appointment_date', today)
          .is('deleted_at', null)
          .not('service_category', 'in', '("Block","Break")')
          .order('start_time', { ascending: true }),
      ]);

      if (phorestResult.error) throw phorestResult.error;
      if (localResult.error) throw localResult.error;

      const phorest: DockAppointment[] = (phorestResult.data || []).map((a) => ({
        id: a.id,
        source: 'phorest' as const,
        client_name: a.client_name,
        service_name: a.service_name,
        appointment_date: a.appointment_date,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        location_id: a.location_id,
        phorest_client_id: a.phorest_client_id,
        notes: a.notes,
      }));

      const local: DockAppointment[] = (localResult.data || []).map((a) => ({
        id: a.id,
        source: 'local' as const,
        client_name: a.client_name,
        service_name: a.service_name,
        appointment_date: a.appointment_date!,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        location_id: a.location_id,
        client_id: a.client_id,
        notes: a.notes,
      }));

      // Check for active mix sessions on these appointments
      const allIds = [...phorest, ...local].map((a) => a.id);
      if (allIds.length > 0) {
        const { data: sessions } = await supabase
          .from('mix_sessions')
          .select('appointment_id')
          .in('appointment_id', allIds)
          .not('status', 'in', '("completed","cancelled")');

        const activeSessionIds = new Set((sessions || []).map((s) => s.appointment_id));
        return [...phorest, ...local].map((a) => ({
          ...a,
          has_mix_session: activeSessionIds.has(a.id),
        }));
      }

      return [...phorest, ...local];
    },
    enabled: !!staffUserId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
