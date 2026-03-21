import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface OrganizationUser {
  user_id: string;
  full_name: string;
  display_name: string | null;
  email: string | null;
  photo_url: string | null;
  phone: string | null;
  is_active: boolean | null;
  is_super_admin: boolean | null;
  hire_date: string | null;
  roles: AppRole[];
}

export function useOrganizationUsers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-users', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Get all employee profiles for the organization
      const { data: profiles, error: profilesError } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, email, photo_url, phone, is_active, is_super_admin, hire_date')
        .eq('organization_id', organizationId)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Get all roles for these users
      const userIds = profiles?.map(p => p.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Map roles to users
      const rolesMap = new Map<string, AppRole[]>();
      rolesData?.forEach(r => {
        const existing = rolesMap.get(r.user_id) || [];
        rolesMap.set(r.user_id, [...existing, r.role as AppRole]);
      });

      return (profiles || []).map(profile => ({
        ...profile,
        roles: rolesMap.get(profile.user_id) || [],
      })) as OrganizationUser[];
    },
    enabled: !!organizationId,
  });
}

export function useUpdateOrganizationUserRole(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role, action }: { userId: string; role: AppRole; action: 'add' | 'remove' }) => {
      if (action === 'add') {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        if (error && error.code !== '23505') throw error; // Ignore duplicate key error
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-users', organizationId] });
      toast.success(`Role ${variables.action === 'add' ? 'added' : 'removed'} successfully`);
    },
    onError: (error: Error) => {
      toast.error('Failed to update role', { description: error.message });
    },
  });
}

export function useRemoveOrganizationUser(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Deactivate user by setting is_active to false and clearing organization
      const { error } = await supabase
        .from('employee_profiles')
        .update({ 
          is_active: false,
          organization_id: null,
        })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-users', organizationId] });
      toast.success('User removed from organization');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove user', { description: error.message });
    },
  });
}

export function useToggleUserActive(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('employee_profiles')
        .update({ is_active: isActive })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['organization-users', organizationId] });
      toast.success(isActive ? 'User activated' : 'User deactivated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update user status', { description: error.message });
    },
  });
}
