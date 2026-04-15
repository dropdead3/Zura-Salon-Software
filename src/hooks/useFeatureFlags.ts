import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_name: string;
  description: string | null;
  category: string;
  is_enabled: boolean;
  enabled_for_roles: string[];
  enabled_for_users: string[];
  percentage_rollout: number;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type FeatureFlagInsert = Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>;
export type FeatureFlagUpdate = Partial<Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>>;

// Fetch all feature flags
export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('category', { ascending: true })
        .order('flag_name', { ascending: true });

      if (error) throw error;
      return data as unknown as FeatureFlag[];
    },
  });
}

// Fetch feature flag categories
export function useFeatureFlagCategories() {
  return useQuery({
    queryKey: ['feature-flag-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('category')
        .order('category');

      if (error) throw error;
      const unique = [...new Set(data.map(d => d.category))];
      return unique;
    },
  });
}

// Check if a specific flag is enabled for the current user
export function useFeatureFlag(flagKey: string) {
  const { user, roles } = useAuth();

  return useQuery({
    queryKey: ['feature-flag', flagKey, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('flag_key', flagKey)
        .maybeSingle();

      if (error) throw error;
      if (!data) return false;

      const flag = data as FeatureFlag;
      return isFeatureEnabled(flag, user?.id, roles);
    },
    enabled: !!user,
  });
}

// Helper function to check if feature is enabled for user
export function isFeatureEnabled(
  flag: FeatureFlag,
  userId?: string,
  userRoles: string[] = []
): boolean {
  // If globally disabled, check for overrides
  if (!flag.is_enabled) {
    // Check user-specific override
    if (userId && flag.enabled_for_users.includes(userId)) {
      return true;
    }
    // Check role-specific override
    if (flag.enabled_for_roles.some(role => userRoles.includes(role))) {
      return true;
    }
    return false;
  }

  // If globally enabled, apply percentage rollout
  if (flag.percentage_rollout < 100 && userId) {
    // Use a deterministic hash based on user ID and flag key
    const hash = hashCode(`${userId}:${flag.flag_key}`);
    const percentage = Math.abs(hash % 100);
    return percentage < flag.percentage_rollout;
  }

  return true;
}

// Simple hash function for percentage rollout
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// Create a new feature flag
export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (flag: {
      flag_key: string;
      flag_name: string;
      description?: string;
      category?: string;
      is_enabled?: boolean;
      enabled_for_roles?: string[];
      enabled_for_users?: string[];
      percentage_rollout?: number;
    }) => {
      const { data, error } = await supabase
        .from('feature_flags')
        .insert({
          flag_key: flag.flag_key,
          flag_name: flag.flag_name,
          description: flag.description || null,
          category: flag.category || 'general',
          is_enabled: flag.is_enabled ?? false,
          enabled_for_roles: flag.enabled_for_roles || [],
          enabled_for_users: flag.enabled_for_users || [],
          percentage_rollout: flag.percentage_rollout ?? 100,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as FeatureFlag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flag-categories'] });
      toast({ title: 'Feature flag created' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create feature flag',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update a feature flag
export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: {
        flag_name?: string;
        description?: string;
        category?: string;
        is_enabled?: boolean;
        enabled_for_roles?: string[];
        enabled_for_users?: string[];
        percentage_rollout?: number;
      }
    }) => {
      const { data, error } = await supabase
        .from('feature_flags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as FeatureFlag;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flag', data.flag_key] });
      toast({ title: 'Feature flag updated' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update feature flag',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Delete a feature flag
export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flag-categories'] });
      toast({ title: 'Feature flag deleted' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete feature flag',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Toggle a feature flag on/off
export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { data, error } = await supabase
        .from('feature_flags')
        .update({ is_enabled })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as FeatureFlag;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flag', data.flag_key] });
      toast({ 
        title: data.is_enabled ? 'Feature enabled' : 'Feature disabled',
        description: data.flag_name,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to toggle feature flag',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
