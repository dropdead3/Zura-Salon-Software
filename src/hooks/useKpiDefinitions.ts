import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface KpiDefinition {
  id: string;
  organization_id: string;
  location_id: string | null;
  metric_key: string;
  display_name: string;
  description: string | null;
  target_value: number;
  warning_threshold: number;
  critical_threshold: number;
  unit: string;
  cadence: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useKpiDefinitions() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['kpi-definitions', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_definitions')
        .select('*')
        .eq('organization_id', orgId!)
        .order('metric_key');

      if (error) throw error;
      return data as unknown as KpiDefinition[];
    },
    enabled: !!orgId,
  });
}

export function useCreateKpiDefinition() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (params: {
      metric_key: string;
      display_name: string;
      description?: string;
      target_value: number;
      warning_threshold: number;
      critical_threshold: number;
      unit: string;
      cadence: string;
      location_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('kpi_definitions')
        .insert({
          organization_id: orgId!,
          ...params,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as KpiDefinition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-definitions', orgId] });
      toast.success('KPI defined successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to define KPI', { description: error.message });
    },
  });
}

export function useUpdateKpiDefinition() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<Pick<KpiDefinition, 'target_value' | 'warning_threshold' | 'critical_threshold' | 'is_active' | 'display_name' | 'description'>>;
    }) => {
      const { data, error } = await supabase
        .from('kpi_definitions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as KpiDefinition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-definitions', orgId] });
      toast.success('KPI updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update KPI', { description: error.message });
    },
  });
}

export function useDeleteKpiDefinition() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kpi_definitions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-definitions', orgId] });
      toast.success('KPI removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove KPI', { description: error.message });
    },
  });
}
