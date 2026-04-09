import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientPreviewData {
  id: string;
  firstName: string;
  lastName: string;
  lastVisitDate: string | null;
  totalSpend: number;
  visitCount: number;
  isVip: boolean;
  notes: string | null;
  nextAppointmentDate: string | null;
  nextAppointmentService: string | null;
}

export function useClientPreviewData(clientId: string | null) {
  return useQuery({
    queryKey: ['client-preview', clientId],
    queryFn: async (): Promise<ClientPreviewData | null> => {
      if (!clientId) return null;

      const { data: client, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, last_visit_date, total_spend, visit_count, is_vip, notes')
        .eq('id', clientId)
        .maybeSingle();

      if (error || !client) return null;

      // Fetch next upcoming appointment
      const { data: nextAppt } = await supabase
        .from('appointments')
        .select('appointment_date, service_name')
        .eq('client_id', clientId)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .neq('status', 'cancelled')
        .order('appointment_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      return {
        id: client.id,
        firstName: client.first_name || '',
        lastName: client.last_name || '',
        lastVisitDate: client.last_visit_date,
        totalSpend: client.total_spend || 0,
        visitCount: client.visit_count || 0,
        isVip: client.is_vip || false,
        notes: client.notes,
        nextAppointmentDate: nextAppt?.appointment_date || null,
        nextAppointmentService: nextAppt?.service_name || null,
      };
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });
}
