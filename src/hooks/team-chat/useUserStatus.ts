import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type UserStatusType = Database['public']['Enums']['chat_user_status_type'];

export interface UserStatus {
  userId: string;
  status: UserStatusType;
  statusMessage: string | null;
  statusExpiresAt: string | null;
}

export function useUserStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current user's status
  const { data: myStatus } = useQuery({
    queryKey: ['user-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('chat_user_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Set online status on mount
  useEffect(() => {
    if (!user?.id) return;

    const setOnline = async () => {
      await supabase
        .from('chat_user_status')
        .upsert({
          user_id: user.id,
          status: 'available' as const,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    };

    setOnline();

    // Set away on unmount (offline not in enum)
    return () => {
      supabase
        .from('chat_user_status')
        .update({ status: 'away' as const, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(() => {});
    };
  }, [user?.id]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      status,
      statusMessage,
      expiresAt,
    }: {
      status: UserStatusType;
      statusMessage?: string;
      expiresAt?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_user_status')
        .upsert({
          user_id: user.id,
          status,
          status_message: statusMessage || null,
          status_expires_at: expiresAt || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-status', user?.id] });
    },
  });

  return {
    myStatus,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
  };
}

export function useUserStatuses(userIds: string[]) {
  const { data: statuses } = useQuery({
    queryKey: ['user-statuses', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .from('chat_user_status')
        .select('*')
        .in('user_id', userIds);

      if (error) throw error;

      return data?.map((s) => ({
        userId: s.user_id,
        status: s.status,
        statusMessage: s.status_message,
        statusExpiresAt: s.status_expires_at,
      })) as UserStatus[];
    },
    enabled: userIds.length > 0,
    refetchInterval: 300_000, // Refresh every 5 minutes (presence handles real-time)
  });

  const getStatus = (userId: string): UserStatusType | 'offline' => {
    return statuses?.find((s) => s.userId === userId)?.status ?? 'away';
  };

  return { statuses: statuses ?? [], getStatus };
}
