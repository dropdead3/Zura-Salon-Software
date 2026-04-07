import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SmartAction {
  id: string;
  organization_id: string;
  channel_id: string;
  message_id: string;
  sender_id: string;
  target_user_id: string;
  action_type: 'client_handoff' | 'assistant_request' | 'shift_cover' | 'availability_check' | 'product_request';
  confidence: number;
  detected_intent: string;
  extracted_data: {
    time?: string;
    date?: string;
    client_name?: string;
    service?: string;
    notes?: string;
  };
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'dismissed';
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  linked_action_type: string | null;
  linked_action_id: string | null;
  created_at: string;
  expires_at: string;
  sender?: {
    full_name: string | null;
    display_name: string | null;
  };
}

export function useSmartActions() {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch pending smart actions for the current user
  const { data: pendingActions, isLoading } = useQuery({
    queryKey: ['smart-actions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('chat_smart_actions')
        .select(`
          *,
          sender:employee_profiles!chat_smart_actions_sender_id_fkey (
            full_name,
            display_name
          )
        `)
        .eq('target_user_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch smart actions:', error);
        return [];
      }

      return data as unknown as SmartAction[];
    },
    enabled: !!user?.id,
    staleTime: 30000, // Has realtime subscription, no polling needed
  });

  // Subscribe to realtime changes for new smart actions
  useEffect(() => {
    if (!user?.id) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`smart-actions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_smart_actions',
          filter: `target_user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate query to show new action
          queryClient.invalidateQueries({ queryKey: ['smart-actions', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_smart_actions',
          filter: `target_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['smart-actions', user.id] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, queryClient]);

  // Accept action mutation
  const acceptMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('chat_smart_actions')
        .update({
          status: 'accepted',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', actionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-actions'] });
      toast.success('Action accepted');
    },
    onError: () => {
      toast.error('Failed to accept action');
    },
  });

  // Decline action mutation
  const declineMutation = useMutation({
    mutationFn: async ({ actionId, note }: { actionId: string; note?: string }) => {
      const { error } = await supabase
        .from('chat_smart_actions')
        .update({
          status: 'declined',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolution_note: note || null,
        })
        .eq('id', actionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-actions'] });
      toast.info('Action declined');
    },
    onError: () => {
      toast.error('Failed to decline action');
    },
  });

  // Dismiss action (hide without responding)
  const dismissMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('chat_smart_actions')
        .update({
          status: 'dismissed',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', actionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-actions'] });
    },
  });

  // Detect action from message
  const detectAction = async (params: {
    messageId: string;
    messageContent: string;
    senderId: string;
    channelId: string;
    targetUserId?: string;
  }) => {
    if (!effectiveOrganization?.id) return null;

    try {
      const response = await supabase.functions.invoke('detect-chat-action', {
        body: {
          ...params,
          organizationId: effectiveOrganization.id,
        },
      });

      if (response.error) {
        console.error('Detection error:', response.error);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Failed to detect action:', error);
      return null;
    }
  };

  return {
    pendingActions: pendingActions ?? [],
    isLoading,
    acceptAction: acceptMutation.mutate,
    declineAction: declineMutation.mutate,
    dismissAction: dismissMutation.mutate,
    detectAction,
    isAccepting: acceptMutation.isPending,
    isDeclining: declineMutation.isPending,
  };
}
