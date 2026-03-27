/**
 * useDockCompleteAppointment — Marks an appointment as completed via the
 * update-phorest-appointment edge function, triggers overage charge
 * calculation for linked mix sessions, and invalidates all relevant caches.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompleteAppointmentParams {
  appointmentId: string;
  organizationId: string;
  source: 'phorest' | 'local';
}

export function useDockCompleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId, organizationId, source }: CompleteAppointmentParams) => {
      // Demo guard — don't hit edge function or DB for faux appointments
      if (appointmentId.startsWith('demo-')) {
        toast.success('Demo: Appointment completed');
        return { success: true, demo: true };
      }

      // 1. Update appointment status via edge function
      const { data, error } = await supabase.functions.invoke('update-phorest-appointment', {
        body: { appointment_id: appointmentId, status: 'COMPLETED' },
      });
      if (error) throw error;

      // 2. Fetch linked mix sessions that are completed
      const { data: sessions } = await supabase
        .from('mix_sessions')
        .select('id, status')
        .eq('appointment_id', appointmentId)
        .eq('status', 'completed');

      // NOTE: Overage/P&L charge calculation is handled at session-level completion
      // in DockServicesTab via useCalculateOverageCharge. The appointment-level
      // completion here only marks the appointment as done — no inline charge
      // insertion to avoid duplicate/broken records.

      // 3. Log audit event
      await supabase
        .from('appointment_audit_log')
        .insert({
          appointment_id: appointmentId,
          organization_id: organizationId,
          event_type: 'status_changed',
          new_value: { status: 'completed' },
          previous_value: { status: 'in_progress' },
        } as any);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dock-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dock-mix-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['checkout-usage-charges'] });
      toast.success('Appointment completed');
    },
    onError: (error) => {
      toast.error('Failed to complete: ' + (error as Error).message);
    },
  });
}
