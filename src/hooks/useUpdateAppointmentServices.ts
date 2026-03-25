import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLogAuditEvent } from '@/hooks/useAppointmentAuditLog';
import { AUDIT_EVENTS } from '@/lib/audit-event-types';
import { toast } from 'sonner';

export interface ServiceEntry {
  name: string;
  price?: number | null;
  duration_minutes?: number | null;
  category?: string | null;
}

interface UpdateServicesParams {
  appointmentId: string;
  organizationId: string;
  services: ServiceEntry[];
  previousServiceName?: string | null;
}

export function useUpdateAppointmentServices() {
  const queryClient = useQueryClient();
  const logAudit = useLogAuditEvent();

  return useMutation({
    mutationFn: async ({ appointmentId, services }: UpdateServicesParams) => {
      // Demo mode — persist to sessionStorage, skip edge function
      if (appointmentId.startsWith('demo-')) {
        const newServiceName = services.map(s => s.name).join(', ');
        try {
          sessionStorage.setItem(`dock-demo-services::${appointmentId}`, newServiceName);
        } catch {}
        return { success: true, service_name: newServiceName };
      }

      const { data, error } = await supabase.functions.invoke('update-phorest-appointment', {
        body: {
          appointment_id: appointmentId,
          services: services.map(s => ({
            name: s.name,
            price: s.price ?? null,
            duration_minutes: s.duration_minutes ?? null,
            category: s.category ?? null,
          })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, variables) => {
      const newServiceName = variables.services.map(s => s.name).join(', ');

      // Log audit event
      logAudit.mutate({
        appointmentId: variables.appointmentId,
        organizationId: variables.organizationId,
        eventType: AUDIT_EVENTS.SERVICES_UPDATED,
        previousValue: { service_name: variables.previousServiceName },
        newValue: { service_name: newServiceName, services: variables.services },
      });

      // Invalidate all appointment queries
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dock-appointments'] });
      toast.success('Services updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update services: ' + error.message);
    },
  });
}
