import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UnreadCount {
  channelId: string;
  count: number;
}

export function useUnreadMessages(channelIds: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Realtime listener — invalidate on new/deleted messages
  useEffect(() => {
    if (!user?.id || channelIds.length === 0) return;

    const channel = supabase
      .channel('unread-messages-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row = (payload.new ?? payload.old) as any;
          if (row?.channel_id && channelIds.includes(row.channel_id)) {
            queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, channelIds.join(','), queryClient]);

  const { data: unreadCounts } = useQuery({
    queryKey: ['unread-counts', channelIds, user?.id],
    queryFn: async () => {
      if (!user?.id || channelIds.length === 0) return [];

      // Single RPC call instead of N+1 loop
      const { data, error } = await supabase.rpc('get_unread_counts', {
        p_user_id: user.id,
        p_channel_ids: channelIds,
      });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        channelId: row.channel_id,
        count: Number(row.unread_count),
      })) as UnreadCount[];
    },
    enabled: !!user?.id && channelIds.length > 0,
    staleTime: 15_000,
    // No refetchInterval — realtime handles updates
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (channelId: string) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('chat_channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
    },
  });

  return {
    unreadCounts: unreadCounts ?? [],
    markAsRead: markAsReadMutation.mutate,
    getUnreadCount: (channelId: string) => 
      unreadCounts?.find((c) => c.channelId === channelId)?.count ?? 0,
  };
}
