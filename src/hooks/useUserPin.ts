import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

interface PinValidationResult {
  user_id: string;
  display_name: string;
  photo_url: string | null;
  is_super_admin: boolean;
  is_primary_owner: boolean;
}

interface PinChangelogEntry {
  id: string;
  employee_profile_id: string;
  changed_by: string;
  changed_at: string;
  reason: string | null;
  changer_name?: string;
  target_name?: string;
}

/**
 * Check if the current user has a PIN set
 */
export function useUserPinStatus(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['user-pin-status', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return { hasPin: false };

      const { data, error } = await supabase
        .rpc('check_user_has_pin', { _user_id: targetUserId });

      if (error) throw error;
      return { hasPin: !!data };
    },
    enabled: !!targetUserId,
  });
}

/**
 * Set or change the current user's own PIN
 */
export function useSetUserPin() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ pin, reason }: { pin: string; reason?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits');

      // Get the employee profile ID for changelog
      const { data: profile, error: profileError } = await supabase
        .from('employee_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Set PIN via secure RPC
      const { error: updateError } = await supabase
        .rpc('set_employee_pin', { _target_user_id: user.id, _pin: pin });

      if (updateError) throw updateError;

      // Log the change
      const { error: logError } = await supabase
        .from('employee_pin_changelog')
        .insert({
          employee_profile_id: profile.id,
          changed_by: user.id,
          reason: reason || 'PIN set by user',
        });

      if (logError) console.error('Failed to log PIN change:', logError);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pin-status'] });
      toast.success('PIN updated successfully');
    },
    onError: (error) => {
      console.error('Error setting PIN:', error);
      toast.error('Failed to update PIN');
    },
  });
}

/**
 * Admin: Set or reset another user's PIN (except primary owner)
 */
export function useAdminSetUserPin() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      targetUserId, 
      pin, 
      reason 
    }: { 
      targetUserId: string; 
      pin: string | null; 
      reason?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (pin && !/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits');

      // Get the target employee profile
      const { data: profile, error: profileError } = await supabase
        .from('employee_profiles')
        .select('id, is_primary_owner')
        .eq('user_id', targetUserId)
        .single();

      if (profileError) throw profileError;

      // Check if target is primary owner
      if (profile.is_primary_owner && targetUserId !== user.id) {
        throw new Error('Cannot modify the Primary Owner\'s PIN');
      }

      // Set or clear PIN via secure RPC
      const { error: updateError } = await supabase
        .rpc('set_employee_pin', { _target_user_id: targetUserId, _pin: pin });

      if (updateError) throw updateError;

      // Log the change
      const { error: logError } = await supabase
        .from('employee_pin_changelog')
        .insert({
          employee_profile_id: profile.id,
          changed_by: user.id,
          reason: reason || (pin ? 'PIN reset by admin' : 'PIN cleared by admin'),
        });

      if (logError) console.error('Failed to log PIN change:', logError);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pin-status'] });
      queryClient.invalidateQueries({ queryKey: ['team-pin-status'] });
      toast.success('PIN updated successfully');
    },
    onError: (error: Error) => {
      console.error('Error setting PIN:', error);
      toast.error(error.message || 'Failed to update PIN');
    },
  });
}

/**
 * Validate a PIN against all organization members
 */
export function useValidatePin() {
  const { effectiveOrganization, currentOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async (pin: string): Promise<PinValidationResult | null> => {
      const orgId = effectiveOrganization?.id || currentOrganization?.id;
      
      if (!orgId) throw new Error('No organization context');

      const { data, error } = await supabase
        .rpc('validate_user_pin', {
          _organization_id: orgId,
          _pin: pin,
        });

      if (error) throw error;
      
      return data && data.length > 0 ? data[0] : null;
    },
  });
}

/**
 * Get PIN changelog for a specific user or all users (for admins)
 */
export function usePinChangelog(profileId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pin-changelog', profileId],
    queryFn: async () => {
      let query = supabase
        .from('employee_pin_changelog')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(50);

      if (profileId) {
        query = query.eq('employee_profile_id', profileId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const changerIds = [...new Set(data?.map(d => d.changed_by) || [])];
      const { data: changers } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .in('user_id', changerIds);

      const changerMap = new Map(
        changers?.map(c => [c.user_id, formatDisplayName(c.full_name || '', c.display_name)]) || []
      );

      return (data || []).map(entry => ({
        ...entry,
        changer_name: changerMap.get(entry.changed_by) || 'Unknown',
      })) as PinChangelogEntry[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Get all team members with their PIN status (for admin management)
 */
export function useTeamPinStatus() {
  const { effectiveOrganization, currentOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id || currentOrganization?.id;

  return useQuery({
    queryKey: ['team-pin-status', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      // Get team members
      const { data: profiles, error: profilesError } = await supabase
        .from('employee_profiles')
        .select('id, user_id, full_name, display_name, photo_url, is_super_admin, is_primary_owner')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Get PIN statuses via secure RPC
      const { data: pinStatuses, error: pinError } = await supabase
        .rpc('get_team_pin_statuses', { _organization_id: orgId });

      if (pinError) throw pinError;

      const pinMap = new Map(
        (pinStatuses || []).map((s: { user_id: string; has_pin: boolean }) => [s.user_id, s.has_pin])
      );

      return (profiles || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        name: formatDisplayName(profile.full_name || '', profile.display_name),
        photo_url: profile.photo_url,
        is_super_admin: profile.is_super_admin,
        is_primary_owner: profile.is_primary_owner,
        has_pin: pinMap.get(profile.user_id) || false,
      }));
    },
    enabled: !!orgId,
  });
}
