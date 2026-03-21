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

      // 3. For each completed session, trigger overage charge calculation
      // (uses the existing billing service pattern)
      if (sessions && sessions.length > 0) {
        for (const session of sessions) {
          // Check if a charge already exists for this session
          const { data: existingCharge } = await supabase
            .from('checkout_usage_charges' as any)
            .select('id')
            .eq('mix_session_id', session.id)
            .maybeSingle();

          if (existingCharge) continue; // Already calculated

          // Look up the service for this appointment to find the policy
          const { data: appt } = await supabase
            .from(source === 'phorest' ? 'phorest_appointments' : 'appointments')
            .select('service_name')
            .eq('id', appointmentId)
            .maybeSingle();

          // Get session totals from projection
          const { data: projection } = await supabase
            .from('mix_session_projections')
            .select('running_dispensed_weight, running_estimated_cost')
            .eq('mix_session_id', session.id)
            .maybeSingle();

          if (!projection) continue;

          // Look up allowance policy by service name
          const { data: policy } = await supabase
            .from('service_allowance_policies')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          if (!policy) continue;

          // Insert basic charge record
          await supabase
            .from('checkout_usage_charges' as any)
            .insert({
              organization_id: organizationId,
              appointment_id: appointmentId,
              mix_session_id: session.id,
              service_name: appt?.service_name || 'Unknown',
              included_allowance_qty: policy.included_allowance_qty || 0,
              actual_usage_qty: projection.running_dispensed_weight || 0,
              overage_qty: Math.max(0, (projection.running_dispensed_weight || 0) - (policy.included_allowance_qty || 0)),
              charge_amount: 0, // Will be refined by full billing calc
              status: 'pending',
            } as any);
        }
      }

      // 4. Log audit event
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
