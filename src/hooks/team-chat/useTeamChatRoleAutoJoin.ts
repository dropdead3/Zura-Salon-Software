import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface RoleAutoJoinRule {
  id: string;
  organization_id: string;
  role: string;
  channel_id: string;
  created_at: string;
}

export function useTeamChatRoleAutoJoin() {
  const { effectiveOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();

  const { data: rules, isLoading, error } = useQuery({
    queryKey: ['team-chat-role-auto-join', effectiveOrganization?.id],
    queryFn: async () => {
      if (!effectiveOrganization?.id) return [];

      const { data, error } = await supabase
        .from('team_chat_role_auto_join')
        .select('*')
        .eq('organization_id', effectiveOrganization.id);

      if (error) throw error;
      return data as unknown as RoleAutoJoinRule[];
    },
    enabled: !!effectiveOrganization?.id,
  });

  const addRuleMutation = useMutation({
    mutationFn: async ({ role, channelId }: { role: string; channelId: string }) => {
      if (!effectiveOrganization?.id) {
        throw new Error('No organization context');
      }

      const { data, error } = await supabase
        .from('team_chat_role_auto_join')
        .insert({
          organization_id: effectiveOrganization.id,
          role,
          channel_id: channelId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-chat-role-auto-join'] });
    },
    onError: (error) => {
      console.error('Failed to add auto-join rule:', error);
      toast.error('Failed to add rule');
    },
  });

  const removeRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('team_chat_role_auto_join')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-chat-role-auto-join'] });
    },
    onError: (error) => {
      console.error('Failed to remove auto-join rule:', error);
      toast.error('Failed to remove rule');
    },
  });

  const setRulesForRoleMutation = useMutation({
    mutationFn: async ({ role, channelIds }: { role: string; channelIds: string[] }) => {
      if (!effectiveOrganization?.id) {
        throw new Error('No organization context');
      }

      // First delete all existing rules for this role
      const { error: deleteError } = await supabase
        .from('team_chat_role_auto_join')
        .delete()
        .eq('organization_id', effectiveOrganization.id)
        .eq('role', role);

      if (deleteError) throw deleteError;

      // Then insert new rules
      if (channelIds.length > 0) {
        const { error: insertError } = await supabase
          .from('team_chat_role_auto_join')
          .insert(
            channelIds.map((channelId) => ({
              organization_id: effectiveOrganization.id,
              role,
              channel_id: channelId,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-chat-role-auto-join'] });
      toast.success('Auto-join rules updated');
    },
    onError: (error) => {
      console.error('Failed to update auto-join rules:', error);
      toast.error('Failed to update rules');
    },
  });

  // Helper to get channel IDs for a specific role
  const getChannelsForRole = (role: string): string[] => {
    return (rules || [])
      .filter((r) => r.role === role)
      .map((r) => r.channel_id);
  };

  // Helper to get roles for a specific channel
  const getRolesForChannel = (channelId: string): string[] => {
    return (rules || [])
      .filter((r) => r.channel_id === channelId)
      .map((r) => r.role);
  };

  return {
    rules: rules ?? [],
    isLoading,
    error,
    addRule: addRuleMutation.mutate,
    removeRule: removeRuleMutation.mutate,
    setRulesForRole: setRulesForRoleMutation.mutate,
    getChannelsForRole,
    getRolesForChannel,
    isUpdating: addRuleMutation.isPending || removeRuleMutation.isPending || setRulesForRoleMutation.isPending,
  };
}
