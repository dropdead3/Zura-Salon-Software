import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TriggerType = 'booking_confirmed' | 'reminder_24h' | 'reminder_2h' | 'follow_up_24h' | 'follow_up_7d';

export const TRIGGER_TYPES: { value: TriggerType; label: string; description: string }[] = [
  { value: 'booking_confirmed', label: 'Booking Confirmed', description: 'Sent immediately when appointment is booked' },
  { value: 'reminder_24h', label: 'Reminder (24h)', description: 'Sent 24 hours before appointment' },
  { value: 'reminder_2h', label: 'Reminder (2h)', description: 'Sent 2 hours before appointment' },
  { value: 'follow_up_24h', label: 'Follow-up (24h)', description: 'Sent 24 hours after appointment' },
  { value: 'follow_up_7d', label: 'Follow-up (7 days)', description: 'Sent 7 days after appointment' },
];

export interface ServiceCommunicationFlow {
  id: string;
  service_id: string;
  trigger_type: TriggerType;
  email_template_id: string | null;
  sms_template_id: string | null;
  timing_offset_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  email_template?: { id: string; name: string; template_key: string } | null;
  sms_template?: { id: string; name: string; template_key: string } | null;
}

export interface FlowConfig {
  trigger_type: TriggerType;
  email_template_id: string | null;
  sms_template_id: string | null;
  is_active: boolean;
  timing_offset_minutes?: number;
}

// Fetch flows for a specific service
export function useServiceCommunicationFlows(serviceId?: string) {
  return useQuery({
    queryKey: ['service-communication-flows', serviceId],
    queryFn: async () => {
      if (!serviceId) return [];

      const { data, error } = await supabase
        .from('service_communication_flows')
        .select(`
          *,
          email_template:email_templates(id, name, template_key),
          sms_template:sms_templates(id, name, template_key)
        `)
        .eq('service_id', serviceId)
        .order('trigger_type');

      if (error) throw error;
      return data as unknown as ServiceCommunicationFlow[];
    },
    enabled: !!serviceId,
  });
}

// Fetch all flows (for overview/stats)
export function useAllServiceCommunicationFlows() {
  return useQuery({
    queryKey: ['service-communication-flows', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_communication_flows')
        .select(`
          *,
          email_template:email_templates(id, name, template_key),
          sms_template:sms_templates(id, name, template_key)
        `)
        .order('service_id');

      if (error) throw error;
      return data as unknown as ServiceCommunicationFlow[];
    },
  });
}

// Get count of services with custom flows
export function useServicesWithFlowsCount() {
  return useQuery({
    queryKey: ['services-with-flows-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_communication_flows')
        .select('service_id')
        .eq('is_active', true);

      if (error) throw error;
      
      // Count unique service IDs
      const uniqueServices = new Set(data?.map(f => f.service_id));
      return uniqueServices.size;
    },
  });
}

// Upsert (create or update) a flow
export function useUpsertServiceFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceId,
      flow,
    }: {
      serviceId: string;
      flow: FlowConfig;
    }) => {
      // Check if flow exists for this service + trigger
      const { data: existing } = await supabase
        .from('service_communication_flows')
        .select('id')
        .eq('service_id', serviceId)
        .eq('trigger_type', flow.trigger_type)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('service_communication_flows')
          .update({
            email_template_id: flow.email_template_id,
            sms_template_id: flow.sms_template_id,
            is_active: flow.is_active,
            timing_offset_minutes: flow.timing_offset_minutes ?? 0,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('service_communication_flows')
          .insert({
            service_id: serviceId,
            trigger_type: flow.trigger_type,
            email_template_id: flow.email_template_id,
            sms_template_id: flow.sms_template_id,
            is_active: flow.is_active,
            timing_offset_minutes: flow.timing_offset_minutes ?? 0,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-communication-flows', variables.serviceId] });
      queryClient.invalidateQueries({ queryKey: ['service-communication-flows', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['services-with-flows-count'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save flow: ${error.message}`);
    },
  });
}

// Batch upsert multiple flows for a service
export function useBatchUpsertFlows() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceId,
      flows,
    }: {
      serviceId: string;
      flows: FlowConfig[];
    }) => {
      // Delete all existing flows for this service, then insert new ones
      await supabase
        .from('service_communication_flows')
        .delete()
        .eq('service_id', serviceId);

      // Only insert active flows
      const activeFlows = flows.filter(f => f.is_active);
      
      if (activeFlows.length === 0) return [];

      const { data, error } = await supabase
        .from('service_communication_flows')
        .insert(
          activeFlows.map(flow => ({
            service_id: serviceId,
            trigger_type: flow.trigger_type,
            email_template_id: flow.email_template_id,
            sms_template_id: flow.sms_template_id,
            is_active: flow.is_active,
            timing_offset_minutes: flow.timing_offset_minutes ?? 0,
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-communication-flows', variables.serviceId] });
      queryClient.invalidateQueries({ queryKey: ['service-communication-flows', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['services-with-flows-count'] });
      toast.success('Communication flows saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save flows: ${error.message}`);
    },
  });
}

// Delete a specific flow
export function useDeleteServiceFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flowId: string) => {
      const { error } = await supabase
        .from('service_communication_flows')
        .delete()
        .eq('id', flowId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-communication-flows'] });
      queryClient.invalidateQueries({ queryKey: ['services-with-flows-count'] });
      toast.success('Flow deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete flow: ${error.message}`);
    },
  });
}

// Helper to look up phorest service by name
export function usePhorestServiceByName(serviceName: string) {
  return useQuery({
    queryKey: ['phorest-service-by-name', serviceName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_all_services' as any)
        .select('id, name, category')
        .eq('name', serviceName)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
    enabled: !!serviceName,
  });
}

// Helper to check if a service has custom flows
export function useServiceHasFlows(serviceId?: string) {
  return useQuery({
    queryKey: ['service-has-flows', serviceId],
    queryFn: async () => {
      if (!serviceId) return false;

      const { count, error } = await supabase
        .from('service_communication_flows')
        .select('id', { count: 'exact', head: true })
        .eq('service_id', serviceId)
        .eq('is_active', true);

      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!serviceId,
  });
}
