import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  category: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: AppRole;
  permission_id: string;
  granted_at: string;
  granted_by: string | null;
}

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) throw error;
      return data as unknown as Permission[];
    },
  });
}

export function useRolePermissions() {
  return useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');

      if (error) throw error;
      return data as unknown as RolePermission[];
    },
  });
}

export function useToggleRolePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      role,
      permissionId,
      hasPermission,
    }: {
      role: AppRole;
      permissionId: string;
      hasPermission: boolean;
    }) => {
      if (hasPermission) {
        // Remove permission
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role', role)
          .eq('permission_id', permissionId);

        if (error) throw error;
      } else {
        // Add permission
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('role_permissions')
          .insert({
            role,
            permission_id: permissionId,
            granted_by: user?.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success(
        variables.hasPermission
          ? 'Permission removed'
          : 'Permission granted'
      );
    },
    onError: (error) => {
      toast.error('Failed to update permission', {
        description: error.message,
      });
    },
  });
}

// Get permissions grouped by category
export function usePermissionsByCategory() {
  const { data: permissions, ...rest } = usePermissions();

  const grouped = permissions?.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return { data: grouped, permissions, ...rest };
}
