import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceAssignment {
  id: string;
  service_name: string;
  assigned_user_id: string;
  assigned_staff_name: string;
}

/**
 * Fetches per-service stylist overrides for an appointment.
 * Returns a Map<serviceName, { userId, staffName }> for easy lookup.
 */
export function useServiceAssignments(appointmentId: string | null) {
  const queryClient = useQueryClient();

  const { data: assignmentMap = new Map<string, ServiceAssignment>(), isLoading } = useQuery({
    queryKey: ['service-assignments', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointment_service_assignments')
        .select('id, service_name, assigned_user_id, assigned_staff_name')
        .eq('appointment_id', appointmentId!);
      if (error) throw error;

      const map = new Map<string, ServiceAssignment>();
      for (const row of (data as any[]) || []) {
        map.set(row.service_name, {
          id: row.id,
          service_name: row.service_name,
          assigned_user_id: row.assigned_user_id,
          assigned_staff_name: row.assigned_staff_name,
        });
      }
      return map;
    },
    enabled: !!appointmentId,
    staleTime: 30_000,
  });

  const upsertAssignments = useMutation({
    mutationFn: async (params: {
      appointmentId: string;
      organizationId: string;
      assignments: Array<{ serviceName: string; userId: string; staffName: string }>;
    }) => {
      const rows = params.assignments.map(a => ({
        appointment_id: params.appointmentId,
        service_name: a.serviceName,
        assigned_user_id: a.userId,
        assigned_staff_name: a.staffName,
        organization_id: params.organizationId,
      }));

      const { error } = await supabase
        .from('appointment_service_assignments')
        .upsert(rows as any, { onConflict: 'appointment_id,service_name' });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-assignments', variables.appointmentId] });
    },
  });

  return { assignmentMap, isLoading, upsertAssignments };
}
