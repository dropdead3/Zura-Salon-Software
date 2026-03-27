import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface BackroomAlertRule {
  id: string;
  organization_id: string;
  location_id: string | null;
  rule_type: string;
  threshold_value: number;
  threshold_unit: string;
  severity: string;
  creates_exception: boolean;
  creates_task: boolean;
  notify_roles: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const ALERT_RULE_TYPES = [
  { value: 'missing_reweigh', label: 'Missing Reweigh' },
  { value: 'usage_variance', label: 'Usage Variance' },
  { value: 'negative_inventory', label: 'Negative Inventory' },
  { value: 'waste_spike', label: 'Waste Spike' },
  { value: 'stockout_risk', label: 'Stockout Risk' },
  { value: 'profitability', label: 'Profitability Alert' },
  { value: 'assistant_workflow', label: 'Assistant Workflow' },
] as const;

export const SEVERITY_OPTIONS = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
] as const;

export function useBackroomAlertRules(locationId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['backroom-alert-rules', orgId, locationId],
    queryFn: async (): Promise<BackroomAlertRule[]> => {
      let query = supabase
        .from('backroom_alert_rules')
        .select('*')
        .eq('organization_id', orgId!)
        .order('rule_type');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as BackroomAlertRule[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useUpsertAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Partial<BackroomAlertRule> & { organization_id: string; rule_type: string; threshold_value: number }) => {
      const { id, created_at, updated_at, ...rest } = rule as any;

      if (id) {
        const { data, error } = await supabase
          .from('backroom_alert_rules')
          .update(rest)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('backroom_alert_rules')
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-alert-rules'] });
      toast.success('Alert rule saved');
    },
    onError: (error) => {
      toast.error('Failed to save alert rule: ' + error.message);
    },
  });
}

export function useDeleteAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('backroom_alert_rules')
        .delete()
        .eq('id', ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-alert-rules'] });
      toast.success('Alert rule removed');
    },
    onError: (error) => {
      toast.error('Failed to remove alert rule: ' + error.message);
    },
  });
}
