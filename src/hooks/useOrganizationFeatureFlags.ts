import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OrganizationFeatureFlag {
  id: string;
  organization_id: string;
  flag_key: string;
  is_enabled: boolean;
  override_reason: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface MergedFeatureFlag {
  flag_key: string;
  global_enabled: boolean;
  org_enabled: boolean;
  has_override: boolean;
  override_reason: string | null;
  override_id: string | null;
}

export function useOrganizationFeatureFlags(organizationId: string) {
  return useQuery({
    queryKey: ['organization-feature-flags', organizationId],
    queryFn: async (): Promise<MergedFeatureFlag[]> => {
      // Get global feature flags
      const { data: globalFlags, error: globalError } = await supabase
        .from('feature_flags')
        .select('flag_key, is_enabled');

      if (globalError) throw globalError;

      // Get org-specific overrides
      const { data: orgOverrides, error: orgError } = await supabase
        .from('organization_feature_flags')
        .select('*')
        .eq('organization_id', organizationId);

      if (orgError) throw orgError;

      // Create a map of org overrides
      const overrideMap = new Map<string, OrganizationFeatureFlag>();
      for (const override of orgOverrides || []) {
        overrideMap.set(override.flag_key, override as OrganizationFeatureFlag);
      }

      // Merge global flags with org overrides
      const merged: MergedFeatureFlag[] = (globalFlags || []).map(flag => {
        const override = overrideMap.get(flag.flag_key);
        return {
          flag_key: flag.flag_key,
          global_enabled: flag.is_enabled,
          org_enabled: override ? override.is_enabled : flag.is_enabled,
          has_override: !!override,
          override_reason: override?.override_reason || null,
          override_id: override?.id || null,
        };
      });

      // Append org-only overrides not present in global flags
      const globalKeys = new Set((globalFlags || []).map(f => f.flag_key));
      for (const [key, override] of overrideMap) {
        if (!globalKeys.has(key)) {
          merged.push({
            flag_key: key,
            global_enabled: false,
            org_enabled: override.is_enabled,
            has_override: true,
            override_reason: override.override_reason || null,
            override_id: override.id || null,
          });
        }
      }

      return merged.sort((a, b) => a.flag_key.localeCompare(b.flag_key));
    },
    enabled: !!organizationId,
  });
}

export function useUpdateOrgFeatureFlag() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organizationId: string;
      flagKey: string;
      isEnabled: boolean;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('organization_feature_flags')
        .upsert({
          organization_id: params.organizationId,
          flag_key: params.flagKey,
          is_enabled: params.isEnabled,
          override_reason: params.reason || null,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id,flag_key',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['organization-feature-flags', variables.organizationId] 
      });
      // Cross-key invalidation: Color Bar surfaces watch different cache keys
      if (variables.flagKey === 'backroom_enabled') {
        queryClient.invalidateQueries({ queryKey: ['platform-color-bar-entitlements'] });
        queryClient.invalidateQueries({ queryKey: ['platform-color-bar-all-entitlement-counts'] });
        queryClient.invalidateQueries({ queryKey: ['color-bar-org-flag', variables.organizationId] });
        queryClient.invalidateQueries({ queryKey: ['color-bar-location-entitlements', variables.organizationId] });
      }
    },
  });
}

export function useDeleteOrgFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organizationId: string;
      flagKey: string;
    }) => {
      const { error } = await supabase
        .from('organization_feature_flags')
        .delete()
        .eq('organization_id', params.organizationId)
        .eq('flag_key', params.flagKey);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['organization-feature-flags', variables.organizationId] 
      });
      // Cross-key invalidation: Color Bar surfaces watch different cache keys
      if (variables.flagKey === 'backroom_enabled') {
        queryClient.invalidateQueries({ queryKey: ['platform-color-bar-entitlements'] });
        queryClient.invalidateQueries({ queryKey: ['platform-color-bar-all-entitlement-counts'] });
        queryClient.invalidateQueries({ queryKey: ['color-bar-org-flag', variables.organizationId] });
        queryClient.invalidateQueries({ queryKey: ['color-bar-location-entitlements', variables.organizationId] });
      }
    },
  });
}

export function useResetAllOrgFlags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { error } = await supabase
        .from('organization_feature_flags')
        .delete()
        .eq('organization_id', organizationId);

      if (error) throw error;
    },
    onSuccess: (_, organizationId) => {
      queryClient.invalidateQueries({ 
        queryKey: ['organization-feature-flags', organizationId] 
      });
    },
  });
}
