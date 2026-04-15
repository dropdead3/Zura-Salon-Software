import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface StaffInvitation {
  id: string;
  email: string;
  role: AppRole;
  invited_by: string;
  token: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
  inviter_name?: string;
}

export function useStaffInvitations() {
  return useQuery({
    queryKey: ['staff-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch inviter names
      const inviterIds = [...new Set(data?.map(i => i.invited_by) || [])];
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .in('user_id', inviterIds);
      
      const profileMap = new Map(
        profiles?.map(p => [p.user_id, formatDisplayName(p.full_name || '', p.display_name)]) || []
      );
      
      return data?.map(invitation => ({
        ...invitation,
        inviter_name: profileMap.get(invitation.invited_by) || 'Unknown'
      })) as StaffInvitation[];
    },
  });
}

export function usePendingInvitations() {
  return useQuery({
    queryKey: ['staff-invitations', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as StaffInvitation[];
    },
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  const { user, roles: userRoles } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Role hierarchy validation
      const leadershipRoles: AppRole[] = ['super_admin', 'admin', 'manager'];
      const isSuperAdmin = userRoles.includes('super_admin');
      const isAdmin = userRoles.includes('admin');
      const isManager = userRoles.includes('manager');
      
      // Check if user can invite this role
      if (leadershipRoles.includes(role)) {
        if (!isSuperAdmin) {
          throw new Error('Only Super Admins can invite leadership roles (Admin, Manager, Super Admin)');
        }
      } else {
        // General roles - manager or above can invite
        if (!isSuperAdmin && !isAdmin && !isManager) {
          throw new Error('You do not have permission to invite team members');
        }
      }
      
      // Check if there's already a pending invitation for this email
      const { data: existing } = await supabase
        .from('staff_invitations')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (existing) {
        throw new Error('There is already a pending invitation for this email');
      }
      
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('employee_profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single();
      
      if (existingUser) {
        throw new Error('A user with this email already exists');
      }
      
      const { data, error } = await supabase
        .from('staff_invitations')
        .insert({
          email: email.toLowerCase().trim(),
          role,
          invited_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations'] });
      toast({
        title: 'Invitation sent!',
        description: `Invitation sent to ${data.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to send invitation',
        description: error.message,
      });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('staff_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations'] });
      toast({
        title: 'Invitation cancelled',
        description: 'The invitation has been cancelled.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to cancel invitation',
        description: error.message,
      });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Cancel any existing pending invitations for this email
      await supabase
        .from('staff_invitations')
        .update({ status: 'cancelled' })
        .eq('email', email.toLowerCase().trim())
        .eq('status', 'pending');
      
      // Create new invitation
      const { data, error } = await supabase
        .from('staff_invitations')
        .insert({
          email: email.toLowerCase().trim(),
          role,
          invited_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations'] });
      toast({
        title: 'Invitation resent!',
        description: `New invitation sent to ${data.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to resend invitation',
        description: error.message,
      });
    },
  });
}

// Hook to check if an email has a valid invitation (for signup flow)
export function useCheckInvitation(email: string) {
  return useQuery({
    queryKey: ['invitation-check', email],
    queryFn: async () => {
      if (!email) return null;
      
      // Staff invitation check still uses direct table query (authenticated users have access
      // via the "Admins and managers can view invitations" policy).
      // For the signup flow, the user is authenticated by this point.
      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as StaffInvitation | null;
    },
    enabled: !!email && email.includes('@'),
  });
}

// Hook to accept an invitation after signup
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, userId }: { email: string; userId: string }) => {
      const { error } = await supabase
        .from('staff_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: userId
        })
        .eq('email', email.toLowerCase().trim())
        .eq('status', 'pending');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations'] });
    },
  });
}
