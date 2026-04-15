import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface LevelPromotionCriteria {
  id: string;
  organization_id: string;
  stylist_level_id: string;
  revenue_enabled: boolean;
  revenue_threshold: number;
  retail_enabled: boolean;
  retail_pct_threshold: number;
  rebooking_enabled: boolean;
  rebooking_pct_threshold: number;
  avg_ticket_enabled: boolean;
  avg_ticket_threshold: number;
  tenure_enabled: boolean;
  tenure_days: number;
  revenue_weight: number;
  retail_weight: number;
  rebooking_weight: number;
  avg_ticket_weight: number;
  retention_rate_enabled: boolean;
  retention_rate_threshold: number;
  retention_rate_weight: number;
  new_clients_enabled: boolean;
  new_clients_threshold: number;
  new_clients_weight: number;
  utilization_enabled: boolean;
  utilization_threshold: number;
  utilization_weight: number;
  rev_per_hour_enabled: boolean;
  rev_per_hour_threshold: number;
  rev_per_hour_weight: number;
  evaluation_window_days: number;
  requires_manual_approval: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type LevelPromotionCriteriaUpsert = Omit<LevelPromotionCriteria, 'id' | 'created_at' | 'updated_at'>;

export function useLevelPromotionCriteria() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['level-promotion-criteria', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('level_promotion_criteria')
        .select('*')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data as unknown as LevelPromotionCriteria[];
    },
    enabled: !!orgId,
  });
}

export function useLevelPromotionCriteriaForLevel(stylistLevelId: string | undefined) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['level-promotion-criteria', orgId, stylistLevelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('level_promotion_criteria')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('stylist_level_id', stylistLevelId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as LevelPromotionCriteria | null;
    },
    enabled: !!orgId && !!stylistLevelId,
    refetchOnMount: 'always',
  });
}

export function useUpsertLevelPromotionCriteria() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (criteria: LevelPromotionCriteriaUpsert) => {
      const { data, error } = await supabase
        .from('level_promotion_criteria')
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
      queryClient.invalidateQueries({ queryKey: ['level-promotion-criteria', orgId] });
      toast.success('Level criteria saved');
    },
    onError: (error) => {
      toast.error('Failed to save criteria: ' + error.message);
    },
  });
}

export function useDeleteLevelPromotionCriteria() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async (criteriaId: string) => {
      const { error } = await supabase
        .from('level_promotion_criteria')
        .delete()
        .eq('id', criteriaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['level-promotion-criteria', orgId] });
      toast.success('Level criteria removed');
    },
    onError: (error) => {
      toast.error('Failed to remove criteria: ' + error.message);
    },
  });
}
