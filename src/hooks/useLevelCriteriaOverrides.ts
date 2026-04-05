/**
 * useLevelCriteriaOverrides — Fetch/upsert per-location or per-group
 * criteria overrides for the level governance system.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface LevelCriteriaOverride {
  id: string;
  organization_id: string;
  stylist_level_id: string;
  location_id: string | null;
  location_group_id: string | null;
  criteria_type: 'promotion' | 'retention';
  override_field: string;
  override_value: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LevelCommissionOverride {
  id: string;
  organization_id: string;
  stylist_level_id: string;
  location_id: string;
  service_commission_rate: number | null;
  retail_commission_rate: number | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch all criteria overrides for the org */
export function useLevelCriteriaOverrides() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['level-criteria-overrides', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('level_criteria_overrides')
        .select('*')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return (data || []) as unknown as LevelCriteriaOverride[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

/** Fetch all commission overrides for the org */
export function useLevelCommissionOverrides() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['level-commission-overrides', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('level_commission_overrides')
        .select('*')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return (data || []) as unknown as LevelCommissionOverride[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

/** Upsert a criteria override */
export function useUpsertCriteriaOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      stylist_level_id: string;
      location_id?: string | null;
      location_group_id?: string | null;
      criteria_type: 'promotion' | 'retention';
      override_field: string;
      override_value: number;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Check if exists
      let query = supabase
        .from('level_criteria_overrides')
        .select('id')
        .eq('organization_id', params.organization_id)
        .eq('stylist_level_id', params.stylist_level_id)
        .eq('criteria_type', params.criteria_type)
        .eq('override_field', params.override_field);

      if (params.location_id) {
        query = query.eq('location_id', params.location_id);
      } else {
        query = query.is('location_id', null);
      }
      if (params.location_group_id) {
        query = query.eq('location_group_id', params.location_group_id);
      } else {
        query = query.is('location_group_id', null);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('level_criteria_overrides')
          .update({
            override_value: params.override_value,
            updated_by: userId,
          } as any)
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('level_criteria_overrides')
          .insert({
            organization_id: params.organization_id,
            stylist_level_id: params.stylist_level_id,
            location_id: params.location_id || null,
            location_group_id: params.location_group_id || null,
            criteria_type: params.criteria_type,
            override_field: params.override_field,
            override_value: params.override_value,
            updated_by: userId,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['level-criteria-overrides'] });
      toast.success('Override saved');
    },
    onError: (error: any) => {
      toast.error('Failed to save override: ' + error.message);
    },
  });
}

/** Delete a criteria override */
export function useDeleteCriteriaOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('level_criteria_overrides')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['level-criteria-overrides'] });
      toast.success('Override removed');
    },
    onError: (error: any) => {
      toast.error('Failed to remove override: ' + error.message);
    },
  });
}

/** Upsert commission override */
export function useUpsertCommissionOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      stylist_level_id: string;
      location_id: string;
      service_commission_rate: number | null;
      retail_commission_rate: number | null;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data: existing } = await supabase
        .from('level_commission_overrides')
        .select('id')
        .eq('organization_id', params.organization_id)
        .eq('stylist_level_id', params.stylist_level_id)
        .eq('location_id', params.location_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('level_commission_overrides')
          .update({
            service_commission_rate: params.service_commission_rate,
            retail_commission_rate: params.retail_commission_rate,
            updated_by: userId,
          } as any)
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('level_commission_overrides')
          .insert({
            ...params,
            updated_by: userId,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['level-commission-overrides'] });
      toast.success('Commission override saved');
    },
    onError: (error: any) => {
      toast.error('Failed to save commission override: ' + error.message);
    },
  });
}

/** Delete commission override */
export function useDeleteCommissionOverrideById() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('level_commission_overrides')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['level-commission-overrides'] });
      toast.success('Commission override removed');
    },
    onError: (error: any) => {
      toast.error('Failed to remove commission override: ' + error.message);
    },
  });
}

/**
 * Resolve a criteria value with override chain:
 * Location override → Group override → Org default
 */
export function resolveCriteriaValue(
  orgDefault: number,
  overrides: LevelCriteriaOverride[],
  levelId: string,
  criteriaType: 'promotion' | 'retention',
  field: string,
  locationId?: string | null,
  locationGroupId?: string | null,
): { value: number; isOverride: boolean; source: 'location' | 'group' | 'org' } {
  // 1. Location-specific override
  if (locationId) {
    const locOverride = overrides.find(
      o => o.stylist_level_id === levelId
        && o.criteria_type === criteriaType
        && o.override_field === field
        && o.location_id === locationId
    );
    if (locOverride) {
      return { value: locOverride.override_value, isOverride: true, source: 'location' };
    }
  }

  // 2. Group override
  if (locationGroupId) {
    const groupOverride = overrides.find(
      o => o.stylist_level_id === levelId
        && o.criteria_type === criteriaType
        && o.override_field === field
        && o.location_group_id === locationGroupId
    );
    if (groupOverride) {
      return { value: groupOverride.override_value, isOverride: true, source: 'group' };
    }
  }

  // 3. Org default
  return { value: orgDefault, isOverride: false, source: 'org' };
}
