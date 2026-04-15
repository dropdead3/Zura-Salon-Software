import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PendingAccount {
  user_id: string;
  full_name: string;
  display_name: string | null;
  email: string | null;
  photo_url: string | null;
  created_at: string;
  is_approved: boolean;
  is_super_admin: boolean;
  is_primary_owner: boolean;
  approved_by: string | null;
  approved_at: string | null;
  admin_approved_by: string | null;
  admin_approved_at: string | null;
}

export function useAccountApprovals() {
  return useQuery({
    queryKey: ['account-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, email, photo_url, created_at, is_approved, is_super_admin, is_primary_owner, approved_by, approved_at, admin_approved_by, admin_approved_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PendingAccount[];
    },
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, email, photo_url, created_at, is_approved')
        .eq('is_active', true)
        .eq('is_approved', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as PendingAccount[];
    },
  });
}

export function useCurrentUserApprovalStatus() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['current-user-approval', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('is_approved, is_super_admin, admin_approved_by')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useApproveAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, approve }: { userId: string; approve: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      const updateData = approve 
        ? { is_approved: true, approved_by: user.id, approved_at: new Date().toISOString() }
        : { is_approved: false, approved_by: null, approved_at: null };

      const { error: updateError } = await supabase
        .from('employee_profiles')
        .update(updateData)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Log the action
      const { error: logError } = await supabase
        .from('account_approval_logs')
        .insert({
          user_id: userId,
          action: approve ? 'approved' : 'revoked',
          performed_by: user.id,
        });

      if (logError) console.error('Failed to log approval action:', logError);
    },
    onSuccess: (_, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ['account-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['all-users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-change-history'] });
      toast.success(approve ? 'Account approved' : 'Account approval revoked');
    },
    onError: (error) => {
      toast.error('Failed to update approval status', { description: error.message });
    },
  });
}

export function useApproveAdminRole() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, approve }: { userId: string; approve: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if current user can approve admin roles
      const { data: canApprove, error: checkError } = await supabase
        .rpc('can_approve_admin_role', { _user_id: user.id });

      if (checkError) throw checkError;
      if (!canApprove) throw new Error('You do not have permission to approve admin roles');

      const updateData = approve 
        ? { admin_approved_by: user.id, admin_approved_at: new Date().toISOString() }
        : { admin_approved_by: null, admin_approved_at: null };

      const { error: updateError } = await supabase
        .from('employee_profiles')
        .update(updateData)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Log the action
      const { error: logError } = await supabase
        .from('account_approval_logs')
        .insert({
          user_id: userId,
          action: approve ? 'admin_approved' : 'admin_revoked',
          performed_by: user.id,
        });

      if (logError) console.error('Failed to log admin approval action:', logError);
    },
    onSuccess: (_, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ['account-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['all-users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-change-history'] });
      toast.success(approve ? 'Admin role approved' : 'Admin approval revoked');
    },
    onError: (error) => {
      toast.error('Failed to update admin approval', { description: error.message });
    },
  });
}

export function useToggleSuperAdmin() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if current user can grant super admin
      const { data: canApprove, error: checkError } = await supabase
        .rpc('can_approve_admin_role', { _user_id: user.id });

      if (checkError) throw checkError;
      if (!canApprove) throw new Error('You do not have permission to grant super admin status');

      // Check if target is primary owner - cannot revoke from them
      if (!grant) {
        const { data: targetProfile, error: profileError } = await supabase
          .from('employee_profiles')
          .select('is_primary_owner')
          .eq('user_id', userId)
          .single();
        
        if (profileError) throw profileError;
        if (targetProfile?.is_primary_owner) {
          throw new Error('Cannot revoke Super Admin from the Primary Owner');
        }
      }

      const { error: updateError } = await supabase
        .from('employee_profiles')
        .update({ is_super_admin: grant })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Log the action
      const { error: logError } = await supabase
        .from('account_approval_logs')
        .insert({
          user_id: userId,
          action: grant ? 'super_admin_granted' : 'super_admin_revoked',
          performed_by: user.id,
        });

      if (logError) console.error('Failed to log super admin action:', logError);
    },
    onSuccess: (_, { grant }) => {
      queryClient.invalidateQueries({ queryKey: ['account-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['all-users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-change-history'] });
      toast.success(grant ? 'Super Admin status granted' : 'Super Admin status revoked');
    },
    onError: (error) => {
      toast.error('Failed to update Super Admin status', { description: error.message });
    },
  });
}

export function useCanApproveAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['can-approve-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .rpc('can_approve_admin_role', { _user_id: user.id });

      if (error) {
        console.error('Error checking admin approval permission:', error);
        return false;
      }
      return data as unknown as boolean;
    },
    enabled: !!user,
  });
}
