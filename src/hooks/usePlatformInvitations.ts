import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PlatformRole } from './usePlatformRoles';

export interface PlatformInvitation {
  id: string;
  email: string;
  role: PlatformRole;
  invited_by: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
  inviter_name?: string;
}

export function usePlatformInvitations() {
  return useQuery({
    queryKey: ['platform-invitations'],
    queryFn: async (): Promise<PlatformInvitation[]> => {
      const { data, error } = await supabase
        .from('platform_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching platform invitations:', error);
        throw error;
      }

      // Fetch inviter names
      const inviterIds = [...new Set(data?.map(inv => inv.invited_by) || [])];
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name')
        .in('user_id', inviterIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return (data || []).map(inv => ({
        ...inv,
        role: inv.role as PlatformRole,
        status: inv.status as PlatformInvitation['status'],
        inviter_name: profileMap.get(inv.invited_by) || 'Unknown',
      }));
    },
  });
}

export function usePendingInvitations() {
  const { data: invitations, ...rest } = usePlatformInvitations();
  
  const pendingInvitations = invitations?.filter(
    inv => inv.status === 'pending' && new Date(inv.expires_at) > new Date()
  ) || [];

  return { data: pendingInvitations, ...rest };
}

export function useInvitationByToken(token: string | null) {
  return useQuery({
    queryKey: ['platform-invitation', token],
    queryFn: async (): Promise<PlatformInvitation | null> => {
      if (!token) return null;

      // Use secure RPC instead of direct table query
      const { data, error } = await supabase
        .rpc('lookup_platform_invitation_by_token', { p_token: token }) as any;

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const row = data[0];
      return {
        ...row,
        role: row.role as PlatformRole,
        status: row.status as PlatformInvitation['status'],
      };
    },
    enabled: !!token,
  });
}

export function useCreatePlatformInvitation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: PlatformRole }) => {
      // First create the invitation record
      const { data: invitation, error: insertError } = await supabase
        .from('platform_invitations')
        .insert({
          email: email.toLowerCase(),
          role,
          invited_by: user!.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Get inviter name
      const { data: profile } = await supabase
        .from('employee_profiles')
        .select('full_name')
        .eq('user_id', user!.id)
        .single();

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke(
        'send-platform-invitation',
        {
          body: {
            email: email.toLowerCase(),
            role,
            token: invitation.token,
            inviter_name: profile?.full_name || 'A platform administrator',
            base_url: window.location.origin,
          },
        }
      );

      if (emailError) {
        // Rollback: delete the invitation if email fails
        await supabase
          .from('platform_invitations')
          .delete()
          .eq('id', invitation.id);
        throw new Error('Failed to send invitation email');
      }

      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-invitations'] });
    },
  });
}

export function useCancelPlatformInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('platform_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-invitations'] });
    },
  });
}

export function useResendPlatformInvitation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      // Get the invitation
      const { data: invitation, error: fetchError } = await supabase
        .from('platform_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError) throw fetchError;

      // Generate new token and reset expiration
      const newToken = crypto.randomUUID();
      const { error: updateError } = await supabase
        .from('platform_invitations')
        .update({
          token: newToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      // Get inviter name
      const { data: profile } = await supabase
        .from('employee_profiles')
        .select('full_name')
        .eq('user_id', user!.id)
        .single();

      // Resend email
      const { error: emailError } = await supabase.functions.invoke(
        'send-platform-invitation',
        {
          body: {
            email: invitation.email,
            role: invitation.role,
            token: newToken,
            inviter_name: profile?.full_name || 'A platform administrator',
            base_url: window.location.origin,
          },
        }
      );

      if (emailError) throw new Error('Failed to resend invitation email');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-invitations'] });
    },
  });
}

export function useAcceptPlatformInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, userId }: { token: string; userId: string }) => {
      // Get the invitation via secure RPC
      const { data: invRows, error: fetchError } = await supabase
        .rpc('lookup_platform_invitation_by_token', { p_token: token }) as any;

      if (fetchError) throw fetchError;
      if (!invRows || invRows.length === 0) throw new Error('Invitation not found');
      const invitation = invRows[0];
      if (invitation.status !== 'pending') throw new Error('Invitation is no longer valid');
      if (new Date(invitation.expires_at) < new Date()) throw new Error('Invitation has expired');

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('platform_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      // Assign the platform role
      const { error: roleError } = await supabase
        .from('platform_roles')
        .insert({
          user_id: userId,
          role: invitation.role,
          granted_by: invitation.invited_by,
        });

      if (roleError) throw roleError;

      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
      queryClient.invalidateQueries({ queryKey: ['platform-team'] });
    },
  });
}
