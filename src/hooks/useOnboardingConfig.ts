import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface OnboardingSectionConfig {
  id: string;
  organization_id: string;
  section_key: string;
  role: string;
  is_enabled: boolean;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingTaskConfig {
  id: string;
  title: string;
  description: string | null;
  visible_to_roles: AppRole[];
  is_required: boolean;
  is_active: boolean;
  display_order: number;
}

export type { AppRole };

export function useOnboardingSectionConfig(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding-section-config', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('onboarding_section_config')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;
      return data as unknown as OnboardingSectionConfig[];
    },
    enabled: !!organizationId,
  });
}

export function useOnboardingTasksConfig() {
  return useQuery({
    queryKey: ['onboarding-tasks-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_tasks')
        .select('id, title, description, visible_to_roles, is_required, is_active, display_order')
        .order('display_order');

      if (error) throw error;
      return data as unknown as OnboardingTaskConfig[];
    },
  });
}

export function useUpdateTaskVisibility() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      role, 
      isVisible, 
      currentRoles 
    }: { 
      taskId: string; 
      role: AppRole; 
      isVisible: boolean; 
      currentRoles: AppRole[];
    }) => {
      const newRoles: AppRole[] = isVisible
        ? [...currentRoles, role]
        : currentRoles.filter(r => r !== role);

      const { error } = await supabase
        .from('onboarding_tasks')
        .update({ visible_to_roles: newRoles })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks-config'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

export function useUpdateTaskRequired() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      isRequired 
    }: { 
      taskId: string; 
      isRequired: boolean;
    }) => {
      const { error } = await supabase
        .from('onboarding_tasks')
        .update({ is_required: isRequired })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks-config'] });
      toast({
        title: 'Updated',
        description: 'Task requirement updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

export function useUpsertSectionConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      organizationId, 
      sectionKey, 
      role, 
      isEnabled, 
      isRequired 
    }: { 
      organizationId: string;
      sectionKey: string;
      role: string;
      isEnabled: boolean;
      isRequired: boolean;
    }) => {
      const { error } = await supabase
        .from('onboarding_section_config')
        .upsert({
          organization_id: organizationId,
          section_key: sectionKey,
          role: role,
          is_enabled: isEnabled,
          is_required: isRequired,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id,section_key,role',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-section-config'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

// Helper to get config for a specific section and role
export function getSectionConfig(
  configs: OnboardingSectionConfig[] | undefined,
  sectionKey: string,
  role: string
): { isEnabled: boolean; isRequired: boolean } {
  const config = configs?.find(c => c.section_key === sectionKey && c.role === role);
  // Default: enabled and not required if no config exists
  return {
    isEnabled: config?.is_enabled ?? true,
    isRequired: config?.is_required ?? false,
  };
}
