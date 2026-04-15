import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  color: string;
  icon: string;
  category: string;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const ROLE_CATEGORIES = [
  { value: 'leadership', label: 'Leadership' },
  { value: 'operations', label: 'Operations' },
  { value: 'stylists', label: 'Stylists' },
  { value: 'other', label: 'Other' },
] as const;

export type RoleCategory = typeof ROLE_CATEGORIES[number]['value'];

export interface CreateRoleData {
  name: string;
  display_name: string;
  description?: string;
  color: string;
  icon: string;
  category: string;
}

export interface UpdateRoleData {
  display_name?: string;
  description?: string;
  color?: string;
  icon?: string;
  category?: string;
  is_active?: boolean;
}

// Fetch only active roles (for general use)
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as unknown as Role[];
    },
  });
}

// Fetch all roles including inactive (for admin management)
export function useAllRoles() {
  return useQuery({
    queryKey: ['all-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return data as unknown as Role[];
    },
  });
}

// Get a single role by name
export function useRoleByName(name: string) {
  return useQuery({
    queryKey: ['role', name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('name', name)
        .single();

      if (error) throw error;
      return data as unknown as Role;
    },
    enabled: !!name,
  });
}

// Create a new role
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleData: CreateRoleData) => {
      // Get max sort_order
      const { data: maxOrder } = await supabase
        .from('roles')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      const newSortOrder = (maxOrder?.sort_order || 0) + 1;

      const { data, error } = await supabase
        .from('roles')
        .insert({
          ...roleData,
          sort_order: newSortOrder,
          is_system: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('A role with this name already exists');
        }
        throw error;
      }
      return data as unknown as Role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['all-roles'] });
      toast.success('Role created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create role', { description: error.message });
    },
  });
}

// Update an existing role
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRoleData }) => {
      const { data: updated, error } = await supabase
        .from('roles')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as Role;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['all-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', data.name] });
      toast.success('Role updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update role', { description: error.message });
    },
  });
}

// Archive/deactivate a role (soft delete)
export function useArchiveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if any users have this role
      const { data: role } = await supabase
        .from('roles')
        .select('name, is_system')
        .eq('id', id)
        .single();

      if (role?.is_system) {
        throw new Error('System roles cannot be archived');
      }

      const { count } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', role?.name as any);

      if (count && count > 0) {
        throw new Error(`Cannot archive role: ${count} user(s) are assigned to it`);
      }

      const { error } = await supabase
        .from('roles')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['all-roles'] });
      toast.success('Role archived successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to archive role', { description: error.message });
    },
  });
}

// Restore an archived role
export function useRestoreRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('roles')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['all-roles'] });
      toast.success('Role restored successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to restore role', { description: error.message });
    },
  });
}

// Reorder roles
export function useReorderRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('roles')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['all-roles'] });
      toast.success('Role order updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to reorder roles', { description: error.message });
    },
  });
}

// Delete a role permanently (non-system only)
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: role } = await supabase
        .from('roles')
        .select('name, is_system')
        .eq('id', id)
        .single();

      if (role?.is_system) {
        throw new Error('System roles cannot be deleted');
      }

      const { count } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', role?.name as any);

      if (count && count > 0) {
        throw new Error(`Cannot delete role: ${count} user(s) are assigned to it`);
      }

      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['all-roles'] });
      toast.success('Role deleted permanently');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete role', { description: error.message });
    },
  });
}

// Toggle system lock status (super admin only)
export function useToggleSystemRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isSystem }: { id: string; isSystem: boolean }) => {
      const { data, error } = await supabase
        .from('roles')
        .update({ is_system: isSystem })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Role;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['all-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', data.name] });
      toast.success(data.is_system ? 'Role marked as system role' : 'System lock removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to update role', { description: error.message });
    },
  });
}

// Helper functions for role metadata
export function getRoleColor(roleName: string, roles: Role[]): string {
  const role = roles.find(r => r.name === roleName);
  return role?.color || 'gray';
}

export function getRoleIcon(roleName: string, roles: Role[]): string {
  const role = roles.find(r => r.name === roleName);
  return role?.icon || 'User';
}

export function getRoleLabel(roleName: string, roles: Role[]): string {
  const role = roles.find(r => r.name === roleName);
  return role?.display_name || roleName;
}

export function getRoleDescription(roleName: string, roles: Role[]): string {
  const role = roles.find(r => r.name === roleName);
  return role?.description || '';
}
