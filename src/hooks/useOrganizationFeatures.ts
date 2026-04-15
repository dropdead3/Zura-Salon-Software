import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface FeatureCatalogItem {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  category: string;
  icon_name: string | null;
  is_core: boolean;
  requires_features: string[] | null;
  default_enabled: boolean;
  display_order: number;
}

export interface OrganizationFeature {
  id: string;
  organization_id: string;
  feature_key: string;
  is_enabled: boolean;
  last_known_config: Record<string, unknown>;
  disabled_at: string | null;
  enabled_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MergedFeature extends FeatureCatalogItem {
  is_enabled: boolean;
  has_override: boolean;
  disabled_at: string | null;
  last_known_config: Record<string, unknown>;
}

// Fetch feature catalog
export function useFeatureCatalog() {
  return useQuery({
    queryKey: ['feature-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_catalog')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as unknown as FeatureCatalogItem[];
    },
  });
}

// Fetch organization features with catalog merged
export function useOrganizationFeatures() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['organization-features', orgId ?? 'catalog-only'],
    queryFn: async (): Promise<MergedFeature[]> => {
      // Always fetch the catalog
      const { data: catalog, error: catalogError } = await supabase
        .from('feature_catalog')
        .select('*')
        .order('display_order', { ascending: true });

      if (catalogError) throw catalogError;

      // If no org selected, return catalog with default values
      if (!orgId) {
        return (catalog || []).map(item => ({
          ...item,
          is_enabled: item.default_enabled,
          has_override: false,
          disabled_at: null,
          last_known_config: {},
        })) as MergedFeature[];
      }

      // Get org-specific overrides
      const { data: orgFeatures, error: orgError } = await supabase
        .from('organization_features')
        .select('*')
        .eq('organization_id', orgId);

      if (orgError) throw orgError;

      // Create a map of org overrides
      const overrideMap = new Map<string, OrganizationFeature>();
      for (const feature of orgFeatures || []) {
        overrideMap.set(feature.feature_key, feature as OrganizationFeature);
      }

      // Merge catalog with org overrides
      return (catalog || []).map(item => {
        const override = overrideMap.get(item.feature_key);
        return {
          ...item,
          is_enabled: override ? override.is_enabled : item.default_enabled,
          has_override: !!override,
          disabled_at: override?.disabled_at || null,
          last_known_config: override?.last_known_config || {},
        } as MergedFeature;
      });
    },
    // Always enabled - just change behavior based on orgId presence
    enabled: true,
  });
}

// Get features grouped by category
export function useFeaturesByCategory() {
  const { data: features, isLoading, error } = useOrganizationFeatures();

  const groupedFeatures = features?.reduce((acc, feature) => {
    const category = feature.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, MergedFeature[]>) || {};

  // Category display info
  const categoryInfo: Record<string, { label: string; icon: string; order: number }> = {
    core: { label: 'Core Features', icon: 'Shield', order: 0 },
    team_development: { label: 'Team Development', icon: 'GraduationCap', order: 1 },
    operations: { label: 'Operations', icon: 'Settings', order: 2 },
    analytics: { label: 'Analytics', icon: 'BarChart3', order: 3 },
    client_experience: { label: 'Client Experience', icon: 'Heart', order: 4 },
    communications: { label: 'Communications', icon: 'MessageSquare', order: 5 },
    recruiting: { label: 'Recruiting', icon: 'UserPlus', order: 6 },
    financial: { label: 'Financial', icon: 'DollarSign', order: 7 },
    website: { label: 'Website', icon: 'Globe', order: 8 },
  };

  // Sort categories by order
  const sortedCategories = Object.keys(groupedFeatures).sort((a, b) => {
    const orderA = categoryInfo[a]?.order ?? 99;
    const orderB = categoryInfo[b]?.order ?? 99;
    return orderA - orderB;
  });

  return {
    features,
    groupedFeatures,
    sortedCategories,
    categoryInfo,
    isLoading,
    error,
  };
}

// Toggle a feature on/off
export function useToggleOrganizationFeature() {
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      featureKey: string;
      isEnabled: boolean;
      configToSave?: Json;
    }) => {
      const orgId = effectiveOrganization?.id;
      if (!orgId) throw new Error('No organization selected');

      const now = new Date().toISOString();
      
      // Build the upsert data object with proper typing
      const upsertRow: {
        organization_id: string;
        feature_key: string;
        is_enabled: boolean;
        updated_by: string | null;
        updated_at: string;
        enabled_at: string | null;
        disabled_at: string | null;
        last_known_config?: Json;
      } = {
        organization_id: orgId,
        feature_key: params.featureKey,
        is_enabled: params.isEnabled,
        updated_by: user?.id || null,
        updated_at: now,
        enabled_at: params.isEnabled ? now : null,
        disabled_at: params.isEnabled ? null : now,
      };

      // Add config when disabling
      if (!params.isEnabled && params.configToSave) {
        upsertRow.last_known_config = params.configToSave;
      }

      const { data, error } = await supabase
        .from('organization_features')
        .upsert([upsertRow], {
          onConflict: 'organization_id,feature_key',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-features'] });
      queryClient.invalidateQueries({ queryKey: ['org-feature'] });
      toast({
        title: variables.isEnabled ? 'Feature enabled' : 'Feature disabled',
        description: variables.isEnabled 
          ? 'The feature is now active for your organization.'
          : 'The feature has been disabled. All data has been preserved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update feature',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Bulk toggle features by category
export function useBulkToggleFeatures() {
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      featureKeys: string[];
      isEnabled: boolean;
    }) => {
      const orgId = effectiveOrganization?.id;
      if (!orgId) throw new Error('No organization selected');

      const now = new Date().toISOString();
      
      const upsertData = params.featureKeys.map(featureKey => ({
        organization_id: orgId,
        feature_key: featureKey,
        is_enabled: params.isEnabled,
        updated_by: user?.id,
        updated_at: now,
        disabled_at: params.isEnabled ? null : now,
        enabled_at: params.isEnabled ? now : null,
      }));

      const { data, error } = await supabase
        .from('organization_features')
        .upsert(upsertData, {
          onConflict: 'organization_id,feature_key',
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-features'] });
      queryClient.invalidateQueries({ queryKey: ['org-feature'] });
      toast({
        title: variables.isEnabled ? 'Features enabled' : 'Features disabled',
        description: `${variables.featureKeys.length} features have been updated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update features',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
