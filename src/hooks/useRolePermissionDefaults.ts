import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface RolePermissionDefault {
  id: string;
  role: AppRole;
  permission_id: string;
  created_at: string;
  updated_by: string | null;
}

export function useRolePermissionDefaults() {
  return useQuery({
    queryKey: ['role-permission-defaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permission_defaults')
        .select('*');

      if (error) throw error;
      return data as unknown as RolePermissionDefault[];
    },
  });
}

export function useSetRolePermissionDefaults() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      role,
      permissionIds,
    }: {
      role: AppRole;
      permissionIds: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Delete existing defaults for this role
      const { error: deleteError } = await supabase
        .from('role_permission_defaults')
        .delete()
        .eq('role', role);

      if (deleteError) throw deleteError;

      // Insert new defaults
      if (permissionIds.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permission_defaults')
          .insert(
            permissionIds.map(permissionId => ({
              role,
              permission_id: permissionId,
              updated_by: user?.id,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permission-defaults'] });
      toast({
        title: 'Defaults Updated',
        description: 'System defaults have been saved.',
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

export function useResetRoleToDefaults() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (role: AppRole) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get defaults for this role
      const { data: defaults, error: fetchError } = await supabase
        .from('role_permission_defaults')
        .select('permission_id')
        .eq('role', role);

      if (fetchError) throw fetchError;

      // Delete current permissions for this role
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role', role);

      if (deleteError) throw deleteError;

      // Insert default permissions
      if (defaults && defaults.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(
            defaults.map(d => ({
              role,
              permission_id: d.permission_id,
              granted_by: user?.id,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast({
        title: 'Permissions Reset',
        description: 'Role permissions have been reset to system defaults.',
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

export function useSaveCurrentAsDefaults() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (role: AppRole) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get current permissions for this role
      const { data: currentPerms, error: fetchError } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role', role);

      if (fetchError) throw fetchError;

      // Delete existing defaults for this role
      const { error: deleteError } = await supabase
        .from('role_permission_defaults')
        .delete()
        .eq('role', role);

      if (deleteError) throw deleteError;

      // Insert current as defaults
      if (currentPerms && currentPerms.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permission_defaults')
          .insert(
            currentPerms.map(p => ({
              role,
              permission_id: p.permission_id,
              updated_by: user?.id,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permission-defaults'] });
      toast({
        title: 'Defaults Saved',
        description: 'Current permissions saved as system defaults.',
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
