import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export const ALL_ROLES: AppRole[] = ['super_admin', 'admin', 'manager', 'stylist', 'receptionist', 'assistant', 'stylist_assistant', 'admin_assistant', 'operations_assistant', 'booth_renter', 'bookkeeper'];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  stylist: 'Stylist',
  receptionist: 'Receptionist',
  assistant: 'Assistant', // Legacy - kept for backwards compatibility
  stylist_assistant: 'Stylist Assistant',
  admin_assistant: 'Admin Assistant',
  operations_assistant: 'Operations Assistant',
  booth_renter: 'Booth Renter',
  bookkeeper: 'Bookkeeper',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: 'Complete system access and user management',
  admin: 'Full access to all features and settings',
  manager: 'Can manage team, view reports, and approve requests',
  stylist: 'Access to stylist features and 75 Hard program',
  receptionist: 'Front desk and scheduling access',
  assistant: 'Legacy assistant role', // Legacy - kept for backwards compatibility
  stylist_assistant: 'Assists stylists with client services',
  admin_assistant: 'Provides administrative support to leadership',
  operations_assistant: 'Supports daily salon operations',
  booth_renter: 'Independent stylist renting space',
  bookkeeper: 'External accounting access for payroll, sales data, and financial reports',
};

export interface UserWithRoles {
  user_id: string;
  full_name: string;
  display_name: string | null;
  email: string | null;
  photo_url: string | null;
  roles: AppRole[];
  location_id: string | null;
  location_ids: string[] | null;
}

export function useAllUsersWithRoles() {
  return useQuery({
    queryKey: ['all-users-with-roles'],
    queryFn: async () => {
      // Get all active employee profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, email, photo_url, location_id, location_ids')
        .eq('is_active', true)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Get all roles
      const userIds = profiles?.map(p => p.user_id) || [];
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
      })) as UserWithRoles[];
    },
  });
}

export function useToggleUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role, hasRole }: { userId: string; role: AppRole; hasRole: boolean }) => {
      // Get current user for logging
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      if (hasRole) {
        // Remove role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);

        if (error) {
          if (error.message?.includes('row-level security')) {
            if (role === 'admin') {
              throw new Error('Only Super Admins can remove the Admin role. Request approval from account owner.');
            }
            throw new Error('Permission denied');
          }
          throw error;
        }

        // Log the action
        await supabase.from('account_approval_logs').insert({
          user_id: userId,
          action: `role_removed:${role}`,
          performed_by: currentUser.id,
        });
      } else {
        // Add role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });

        if (error) {
          if (error.code === '23505') {
            // Duplicate key - role already exists
            return;
          }
          if (error.message?.includes('row-level security')) {
            if (role === 'admin') {
              throw new Error('Only Super Admins can assign the Admin role. Request approval from account owner.');
            }
            throw new Error('Permission denied');
          }
          throw error;
        }

        // Log the action
        await supabase.from('account_approval_logs').insert({
          user_id: userId,
          action: `role_added:${role}`,
          performed_by: currentUser.id,
        });
      }
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['team-directory'] });
      queryClient.invalidateQueries({ queryKey: ['account-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['role-change-history'] });
      
      // Invalidate personal AI insights cache for this user so they get fresh role-appropriate data
      try {
        await supabase
          .from('ai_personal_insights' as any)
          .delete()
          .eq('user_id', variables.userId);
      } catch (err) {
        console.error('Failed to invalidate personal insights cache:', err);
      }
      queryClient.invalidateQueries({ queryKey: ['ai-personal-insights', variables.userId] });
      
      toast.success(
        variables.hasRole 
          ? `${ROLE_LABELS[variables.role]} role removed` 
          : `${ROLE_LABELS[variables.role]} role added`
      );
    },
    onError: (error: Error) => {
      console.error('Error toggling role:', error);
      toast.error('Failed to update role', { 
        description: error.message || 'An error occurred'
      });
    },
  });
}

// Hook to fetch role change history for a user
export function useRoleChangeHistory(userId: string) {
  return useQuery({
    queryKey: ['role-change-history', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_approval_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch performer names
      const performerIds = [...new Set(data?.map(log => log.performed_by) || [])];
      const { data: performers } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .in('user_id', performerIds);

      const performerMap = new Map(
        performers?.map(p => [p.user_id, p.display_name || p.full_name]) || []
      );

      return (data || []).map(log => ({
        ...log,
        performed_by_name: performerMap.get(log.performed_by) || 'Unknown',
      }));
    },
    enabled: !!userId,
  });
}
