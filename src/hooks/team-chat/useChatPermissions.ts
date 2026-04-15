import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { toast } from 'sonner';

// Chat permission keys
export const CHAT_PERMISSION_KEYS = {
  CREATE_CHANNEL: 'create_channel',
  CREATE_SECTION: 'create_section',
  DELETE_CHANNEL: 'delete_channel',
  ARCHIVE_CHANNEL: 'archive_channel',
  MANAGE_MEMBERS: 'manage_members',
  PIN_MESSAGES: 'pin_messages',
  DELETE_ANY_MESSAGE: 'delete_any_message',
} as const;

export type ChatPermissionKey = typeof CHAT_PERMISSION_KEYS[keyof typeof CHAT_PERMISSION_KEYS];

export interface ChatPermission {
  id: string;
  organization_id: string;
  permission_key: string;
  role: string;
  is_allowed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatPermissionUpdate {
  permission_key: string;
  role: string;
  is_allowed: boolean;
}

export function useChatPermissions() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['chat-permissions', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('chat_permissions')
        .select('*')
        .eq('organization_id', orgId);

      if (error) throw error;
      return data as unknown as ChatPermission[];
    },
    enabled: !!orgId,
  });

  const updatePermission = useMutation({
    mutationFn: async (update: ChatPermissionUpdate) => {
      if (!orgId) throw new Error('No organization selected');

      // Cast role to the expected enum type
      const roleValue = update.role as 'admin' | 'admin_assistant' | 'assistant' | 'bookkeeper' | 'booth_renter' | 'manager' | 'operations_assistant' | 'receptionist' | 'stylist' | 'stylist_assistant' | 'super_admin';

      const { error } = await supabase
        .from('chat_permissions')
        .upsert({
          organization_id: orgId,
          permission_key: update.permission_key,
          role: roleValue,
          is_allowed: update.is_allowed,
        }, {
          onConflict: 'organization_id,permission_key,role',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-permissions', orgId] });
    },
    onError: (error) => {
      toast.error('Failed to update permission');
      console.error(error);
    },
  });

  const bulkUpdatePermissions = useMutation({
    mutationFn: async (updates: ChatPermissionUpdate[]) => {
      if (!orgId) throw new Error('No organization selected');

      type AppRole = 'admin' | 'admin_assistant' | 'assistant' | 'bookkeeper' | 'booth_renter' | 'manager' | 'operations_assistant' | 'receptionist' | 'stylist' | 'stylist_assistant' | 'super_admin';

      const records = updates.map(u => ({
        organization_id: orgId,
        permission_key: u.permission_key,
        role: u.role as AppRole,
        is_allowed: u.is_allowed,
      }));

      const { error } = await supabase
        .from('chat_permissions')
        .upsert(records, {
          onConflict: 'organization_id,permission_key,role',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-permissions', orgId] });
      toast.success('Permissions updated');
    },
    onError: (error) => {
      toast.error('Failed to update permissions');
      console.error(error);
    },
  });

  // Helper to check if a specific role has a permission
  const hasPermission = (permissionKey: string, role: string): boolean => {
    const perm = permissions.find(
      p => p.permission_key === permissionKey && p.role === role
    );
    return perm?.is_allowed ?? false;
  };

  return {
    permissions,
    isLoading,
    updatePermission: updatePermission.mutate,
    bulkUpdatePermissions: bulkUpdatePermissions.mutate,
    hasPermission,
    isUpdating: updatePermission.isPending || bulkUpdatePermissions.isPending,
  };
}

// Hook to check if current user has a specific chat permission
export function useHasChatPermission(permissionKey: ChatPermissionKey) {
  const { user } = useAuth();
  const { data: profile } = useEmployeeProfile();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: hasPermission = false } = useQuery({
    queryKey: ['chat-permission-check', orgId, user?.id, permissionKey],
    queryFn: async () => {
      if (!orgId || !user?.id) return false;

      // Primary owners and super admins always have all permissions
      if (profile?.is_primary_owner || profile?.is_super_admin) {
        return true;
      }

      // Check using the database function
      const { data, error } = await supabase.rpc('has_chat_permission', {
        _user_id: user.id,
        _org_id: orgId,
        _permission_key: permissionKey,
      });

      if (error) {
        console.error('Error checking chat permission:', error);
        return false;
      }

      return data ?? false;
    },
    enabled: !!orgId && !!user?.id,
  });

  return hasPermission;
}
