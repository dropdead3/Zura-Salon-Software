import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_VISIT_HISTORY } from '@/hooks/dock/dockDemoData';

export interface ClientVisit {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  service_name: string;
  service_category: string | null;
  stylist_name: string | null;
  status: string;
  total_price: number | null;
  notes: string | null;
}

export function useClientVisitHistory(phorestClientId: string | null | undefined) {
  return useQuery({
    queryKey: ['client-visit-history', phorestClientId],
    queryFn: async () => {
      if (!phorestClientId) return [];
      if (phorestClientId.startsWith('demo-')) {
        return DEMO_VISIT_HISTORY[phorestClientId] ?? [];
      }

      const { data, error } = await supabase
        .from('v_all_appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          service_name,
          service_category,
          status,
          total_price,
          notes,
          phorest_staff_mapping!phorest_appointments_phorest_staff_id_fkey(
            employee_profiles!phorest_staff_mapping_user_id_fkey(
              display_name,
              full_name
            )
          )
        `)
        .eq('phorest_client_id', phorestClientId)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        end_time: apt.end_time,
        service_name: apt.service_name,
        service_category: apt.service_category,
        stylist_name: apt.phorest_staff_mapping?.employee_profiles?.display_name || 
                      apt.phorest_staff_mapping?.employee_profiles?.full_name || null,
        status: apt.status,
        total_price: apt.total_price,
        notes: apt.notes,
      })) as ClientVisit[];
    },
    enabled: !!phorestClientId,
  });
}
