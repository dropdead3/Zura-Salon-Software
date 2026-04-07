import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface Mention {
  id: string;
  organization_id: string;
  user_id: string;
  mentioned_by: string;
  source_type: 'chat' | 'account_note' | 'task' | 'announcement';
  source_id: string;
  channel_id: string | null;
  source_context: string | null;
  read_at: string | null;
  notified_at: string | null;
  created_at: string;
  author?: {
    full_name: string | null;
    display_name: string | null;
    photo_url: string | null;
  };
}

export function useMentions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mentions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get mentions
      const { data: mentions, error } = await supabase
        .from('user_mentions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!mentions || mentions.length === 0) return [];

      // Get unique author IDs
      const authorIds = [...new Set(mentions.map(m => m.mentioned_by).filter(Boolean))];
      
      // Fetch author profiles
      const { data: authors } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url')
        .in('user_id', authorIds);

      const authorMap = new Map(authors?.map(a => [a.user_id, a]) || []);

      // Combine data
      const result = mentions.map(m => ({
        ...m,
        source_type: m.source_type as Mention['source_type'],
        author: m.mentioned_by ? authorMap.get(m.mentioned_by) : undefined,
      }));

      return result as Mention[];
    },
    enabled: !!user?.id,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user-mentions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_mentions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mentions', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}

export function useUnreadMentionCount() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['mentions-unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('user_mentions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  return data || 0;
}

export function useMarkMentionAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (mentionId: string) => {
      const { error } = await supabase
        .from('user_mentions')
        .update({ read_at: new Date().toISOString() })
        .eq('id', mentionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['mentions-unread-count', user?.id] });
    },
  });
}

export function useMarkAllMentionsAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('user_mentions')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['mentions-unread-count', user?.id] });
    },
  });
}

// Helper to process mentions after sending a message
export async function processMentions(params: {
  sourceType: 'chat' | 'account_note' | 'task' | 'announcement';
  sourceId: string;
  content: string;
  authorId: string;
  organizationId: string;
  channelId?: string;
}) {
  try {
    await supabase.functions.invoke('process-mention-notifications', {
      body: params,
    });
  } catch (error) {
    console.error('Failed to process mentions:', error);
  }
}
