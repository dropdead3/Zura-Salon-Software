import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface LevelRetentionCriteria {
  id: string;
  organization_id: string;
  stylist_level_id: string;
  retention_enabled: boolean;
  revenue_enabled: boolean;
  revenue_minimum: number;
  retail_enabled: boolean;
  retail_pct_minimum: number;
  rebooking_enabled: boolean;
  rebooking_pct_minimum: number;
  avg_ticket_enabled: boolean;
  avg_ticket_minimum: number;
  retention_rate_enabled: boolean;
  retention_rate_minimum: number;
  new_clients_enabled: boolean;
  new_clients_minimum: number;
  utilization_enabled: boolean;
  utilization_minimum: number;
  rev_per_hour_enabled: boolean;
  rev_per_hour_minimum: number;
  evaluation_window_days: number;
  grace_period_days: number;
  action_type: 'coaching_flag' | 'demotion_eligible';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type LevelRetentionCriteriaUpsert = Omit<LevelRetentionCriteria, 'id' | 'created_at' | 'updated_at'>;

export function useLevelRetentionCriteria() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['level-retention-criteria', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('level_retention_criteria')
        .select('*')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data as unknown as LevelRetentionCriteria[];
    },
    enabled: !!orgId,
  });
}

export function useLevelRetentionCriteriaForLevel(stylistLevelId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['level-retention-criteria', orgId, stylistLevelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('level_retention_criteria')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('stylist_level_id', stylistLevelId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as LevelRetentionCriteria | null;
    },
    enabled: !!orgId && !!stylistLevelId,
    refetchOnMount: 'always' as const,
  });
}

export function useUpsertLevelRetentionCriteria() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (criteria: LevelRetentionCriteriaUpsert) => {
      const { data, error } = await supabase
        .from('level_retention_criteria')
        .upsert(
          { ...criteria, organization_id: orgId! },
          { onConflict: 'organization_id,stylist_level_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['level-retention-criteria', orgId] });
      toast.success('Retention criteria saved');
    },
    onError: (error) => {
      toast.error('Failed to save retention criteria: ' + error.message);
    },
  });
}

export function useDeleteLevelRetentionCriteria() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (criteriaId: string) => {
      const { error } = await supabase
        .from('level_retention_criteria')
        .delete()
        .eq('id', criteriaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['level-retention-criteria', orgId] });
      toast.success('Retention criteria removed');
    },
    onError: (error) => {
      toast.error('Failed to remove retention criteria: ' + error.message);
    },
  });
}
