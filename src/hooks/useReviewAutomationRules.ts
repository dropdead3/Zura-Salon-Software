import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface AutomationRule {
  id: string;
  organization_id: string;
  name: string;
  is_active: boolean;
  send_delay_minutes: number;
  eligible_service_categories: string[] | null;
  excluded_service_categories: string[];
  excluded_service_names: string[];
  frequency_cap_days: number;
  stylist_inclusion_mode: 'all' | 'include' | 'exclude';
  stylist_user_ids: string[];
  location_ids: string[] | null;
  channel: 'email' | 'sms' | 'both';
  created_at: string;
  updated_at: string;
}

export type AutomationRuleInput = Omit<AutomationRule, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useReviewAutomationRules() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useQuery({
    queryKey: ['review-automation-rules', orgId],
    queryFn: async (): Promise<AutomationRule[]> => {
      const { data, error } = await supabase
        .from('review_request_automation_rules')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AutomationRule[];
    },
    enabled: !!orgId,
  });
}

export function useSaveAutomationRule() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useMutation({
    mutationFn: async (input: AutomationRuleInput & { id?: string }) => {
      if (!orgId) throw new Error('No organization');
      const { id, ...patch } = input;
      if (id) {
        const { error } = await supabase
          .from('review_request_automation_rules')
          .update(patch)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('review_request_automation_rules')
          .insert({ ...patch, organization_id: orgId });
        if (error) throw error;
      }
      await supabase.from('review_compliance_log').insert({
        organization_id: orgId,
        event_type: 'rule_changed',
        payload: { name: input.name, is_active: input.is_active },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-automation-rules', orgId] });
      toast.success('Automation rule saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAutomationRule() {
  const qc = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('review_request_automation_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-automation-rules', orgId] });
      toast.success('Rule deleted');
    },
  });
}
