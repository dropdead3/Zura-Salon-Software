import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface RoleTemplate {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  color: string;
  icon: string;
  category: string;
  permission_ids: string[];
  is_system: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface CreateTemplateData {
  name: string;
  display_name: string;
  description?: string;
  color: string;
  icon: string;
  category: string;
  permission_ids: string[];
}

export function useRoleTemplates() {
  return useQuery({
    queryKey: ['role-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_templates')
        .select('*')
        .order('is_system', { ascending: false })
        .order('display_name', { ascending: true });

      if (error) throw error;
      return data as unknown as RoleTemplate[];
    },
  });
}

export function useCreateRoleTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: CreateTemplateData) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('role_templates')
        .insert({
          ...template,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates'] });
      toast({
        title: 'Template Created',
        description: 'Role template has been saved.',
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

export function useUpdateRoleTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateTemplateData> }) => {
      const { error } = await supabase
        .from('role_templates')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates'] });
      toast({
        title: 'Template Updated',
        description: 'Role template has been updated.',
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

export function useDeleteRoleTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('role_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates'] });
      toast({
        title: 'Template Deleted',
        description: 'Role template has been removed.',
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

// Hook to create a role from a template
export function useCreateRoleFromTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      template,
      roleName,
      displayName,
    }: {
      template: RoleTemplate;
      roleName: string;
      displayName: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Create the role
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .insert({
          name: roleName,
          display_name: displayName,
          description: template.description,
          color: template.color,
          icon: template.icon,
          category: template.category,
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // 2. Add the template's permissions to role_permissions
      if (template.permission_ids.length > 0) {
        const { error: permError } = await supabase
          .from('role_permissions')
          .insert(
            template.permission_ids.map(permId => ({
              role: roleName as AppRole,
              permission_id: permId,
              granted_by: user?.id,
            }))
          );

        if (permError) {
          // Rollback role creation on permission error
          await supabase.from('roles').delete().eq('id', role.id);
          throw permError;
        }

        // 3. Also set as defaults
        const { error: defaultError } = await supabase
          .from('role_permission_defaults')
          .insert(
            template.permission_ids.map(permId => ({
              role: roleName as AppRole,
              permission_id: permId,
              updated_by: user?.id,
            }))
          );

        if (defaultError) {
          console.warn('Failed to set defaults:', defaultError);
        }
      }

      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['role-permission-defaults'] });
      toast({
        title: 'Role Created',
        description: 'New role has been created from template with permissions applied.',
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

// Hook to save current role as a template
export function useSaveRoleAsTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      roleName,
      templateName,
      templateDisplayName,
    }: {
      roleName: string;
      templateName: string;
      templateDisplayName: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get role details
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('name', roleName)
        .single();

      if (roleError) throw roleError;

      // Get role permissions
      const { data: perms, error: permError } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role', roleName as AppRole);

      if (permError) throw permError;

      const permissionIds = perms?.map(p => p.permission_id) || [];

      // Create template
      const { data, error } = await supabase
        .from('role_templates')
        .insert({
          name: templateName,
          display_name: templateDisplayName,
          description: `Template based on ${role.display_name}`,
          color: role.color,
          icon: role.icon,
          category: role.category || 'other',
          permission_ids: permissionIds,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-templates'] });
      toast({
        title: 'Template Created',
        description: 'Role saved as a reusable template.',
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
