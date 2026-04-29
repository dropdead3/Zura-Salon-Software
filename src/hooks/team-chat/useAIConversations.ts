import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface AIConversationSummary {
  id: string;
  title: string;
  last_message_at: string;
  created_at: string;
}

export function useAIConversations() {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = effectiveOrganization?.id;
  const userId = user?.id;
  const queryKey = ['ai-conversations', orgId, userId];

  const list = useQuery({
    queryKey,
    queryFn: async (): Promise<AIConversationSummary[]> => {
      if (!orgId || !userId) return [];
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('id, title, last_message_at, created_at')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .order('last_message_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as AIConversationSummary[];
    },
    enabled: !!orgId && !!userId,
    staleTime: 30_000,
  });

  const rename = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const trimmed = title.trim().slice(0, 120);
      if (!trimmed) throw new Error('Title required');
      const { error } = await supabase
        .from('ai_conversations')
        .update({ title: trimmed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to rename'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_conversations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete'),
  });

  return {
    conversations: list.data ?? [],
    isLoading: list.isLoading,
    refetch: list.refetch,
    rename: rename.mutateAsync,
    remove: remove.mutateAsync,
  };
}
