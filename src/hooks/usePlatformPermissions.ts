import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_support' | 'platform_developer';

export interface PlatformPermission {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  category: string;
  created_at: string;
}

export interface PlatformRolePermission {
  id: string;
  role: PlatformRole;
  permission_id: string;
  granted_at: string;
  granted_by: string | null;
}

export function usePlatformPermissions() {
  return useQuery({
    queryKey: ['platform-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) throw error;
      return data as unknown as PlatformPermission[];
    },
  });
}

export function usePlatformRolePermissions() {
  return useQuery({
    queryKey: ['platform-role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_role_permissions')
        .select('*');

      if (error) throw error;
      return data as unknown as PlatformRolePermission[];
    },
  });
}

export function useTogglePlatformPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      role,
      permissionId,
      hasPermission,
    }: {
      role: PlatformRole;
      permissionId: string;
      hasPermission: boolean;
    }) => {
      if (hasPermission) {
        // Remove permission
        const { error } = await supabase
          .from('platform_role_permissions')
          .delete()
          .eq('role', role)
          .eq('permission_id', permissionId);

        if (error) throw error;
      } else {
        // Add permission
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('platform_role_permissions')
          .insert({
            role,
            permission_id: permissionId,
            granted_by: user?.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-role-permissions'] });
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
export function usePlatformPermissionsByCategory() {
  const { data: permissions, ...rest } = usePlatformPermissions();

  const grouped = permissions?.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, PlatformPermission[]>);

  return { data: grouped, permissions, ...rest };
}

// Category metadata for display
export const PLATFORM_PERMISSION_CATEGORIES: Record<string, { label: string; icon: string }> = {
  accounts: { label: 'Account Management', icon: 'Building2' },
  migrations: { label: 'Data Migrations', icon: 'Upload' },
  revenue: { label: 'Revenue & Billing', icon: 'DollarSign' },
  settings: { label: 'Platform Settings', icon: 'Settings' },
  support: { label: 'Support', icon: 'Headset' },
  development: { label: 'Development', icon: 'Code' },
};

// Platform role metadata
export const PLATFORM_ROLES: { role: PlatformRole; label: string; description: string; icon: string; color: string }[] = [
  { role: 'platform_owner', label: 'Platform Owner', description: 'Full platform access, all permissions', icon: 'Crown', color: '#f59e0b' },
  { role: 'platform_admin', label: 'Platform Admin', description: 'Administrative access to most features', icon: 'Shield', color: '#8b5cf6' },
  { role: 'platform_support', label: 'Platform Support', description: 'Customer support and ticket management', icon: 'Headset', color: '#06b6d4' },
  { role: 'platform_developer', label: 'Platform Developer', description: 'Development and system monitoring', icon: 'Code', color: '#10b981' },
];
