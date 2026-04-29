import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: AIAction | null;
  isLoading?: boolean;
}

export interface AIActionPreview {
  title: string;
  description: string;
  risk_level?: 'low' | 'med' | 'high';
  before?: {
    date?: string;
    time?: string;
    client?: string;
    service?: string;
    stylist?: string;
  };
  after?: {
    date?: string;
    time?: string;
    client?: string;
    service?: string;
    stylist?: string;
  };
  target?: {
    name?: string;
    hire_date?: string | null;
    upcoming_appointments?: number;
    reason?: string | null;
  };
}

export interface AIAction {
  capability_id?: string;
  type: string;
  status: 'pending_confirmation' | 'confirmed' | 'cancelled' | 'executed' | 'failed';
  preview: AIActionPreview;
  params: Record<string, unknown>;
  reasoning?: string | null;
  risk_level?: 'low' | 'med' | 'high';
  confirmation_token?: string | null;
  confirmation_token_field?: string | null;
  audit_id?: string | null;
}

function deriveTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 60) return cleaned || 'New conversation';
  return cleaned.slice(0, 57) + '…';
}

export function useAIAgentChat() {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  const setConvId = (id: string | null) => {
    conversationIdRef.current = id;
    setConversationId(id);
  };

  const invalidateConversations = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['ai-conversations', effectiveOrganization?.id, user?.id],
    });
  }, [queryClient, effectiveOrganization?.id, user?.id]);

  const persistMessage = useCallback(
    async (convId: string, role: 'user' | 'assistant', content: string, action?: AIAction | null) => {
      try {
        await supabase.from('ai_conversation_messages').insert({
          conversation_id: convId,
          role,
          content,
          action: (action as any) ?? null,
        });
        await supabase
          .from('ai_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', convId);
      } catch (err) {
        console.warn('Failed to persist AI message', err);
      }
    },
    []
  );

  const ensureConversation = useCallback(
    async (firstUserMessage: string): Promise<string | null> => {
      if (conversationIdRef.current) return conversationIdRef.current;
      if (!user?.id || !effectiveOrganization?.id) return null;
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          organization_id: effectiveOrganization.id,
          title: deriveTitle(firstUserMessage),
        })
        .select('id')
        .single();
      if (error || !data) {
        console.warn('Failed to create AI conversation', error);
        return null;
      }
      setConvId(data.id);
      invalidateConversations();
      return data.id;
    },
    [user?.id, effectiveOrganization?.id, invalidateConversations]
  );

  const sendMessage = useCallback(async (content: string) => {
    if (!user?.id || !content.trim()) return;

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: AIMessage = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);

    // Ensure a conversation exists and persist the user message early.
    const convId = await ensureConversation(content.trim());
    if (convId) await persistMessage(convId, 'user', content.trim());

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: content.trim() });

      const { data, error } = await supabase.functions.invoke('ai-agent-chat', {
        body: {
          messages: history,
          organizationId: effectiveOrganization?.id,
        },
      });

      if (error) throw error;

      const assistantContent = data.message || "I'm not sure how to help with that.";
      const assistantMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        action: data.action || null,
      };

      setMessages(prev => prev.filter(m => !m.isLoading).concat(assistantMessage));

      if (convId) await persistMessage(convId, 'assistant', assistantContent, data.action || null);
      invalidateConversations();

      if (data.action?.status === 'pending_confirmation') {
        setPendingAction(data.action);
      }
    } catch (error) {
      console.error('AI Agent error:', error);
      const errorMessage: AIMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => prev.filter(m => !m.isLoading).concat(errorMessage));
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, effectiveOrganization?.id, messages, ensureConversation, persistMessage, invalidateConversations]);

  const confirmAction = useCallback(async (confirmationInput?: string) => {
    if (!pendingAction || !user?.id) return;

    if (
      pendingAction.risk_level === 'high' &&
      pendingAction.confirmation_token &&
      (confirmationInput || '').trim().toLowerCase() !==
        pendingAction.confirmation_token.trim().toLowerCase()
    ) {
      toast.error('Confirmation text does not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('execute-ai-action', {
        body: {
          capability_id: pendingAction.capability_id || pendingAction.type,
          params: pendingAction.params,
          organizationId: effectiveOrganization?.id,
          audit_id: pendingAction.audit_id ?? undefined,
          confirmation_token: confirmationInput,
        },
      });
      if (error) throw error;

      const resultText = data.success ? `✅ ${data.message}` : `❌ ${data.message}`;
      const resultMessage: AIMessage = {
        id: `result-${Date.now()}`,
        role: 'assistant',
        content: resultText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, resultMessage]);
      setPendingAction(null);

      if (conversationIdRef.current) {
        await persistMessage(conversationIdRef.current, 'assistant', resultText);
      }

      if (data.success) toast.success(data.message);
      else toast.error(data.message);
    } catch (error) {
      console.error('Execute action error:', error);
      toast.error('Failed to execute action');
    } finally {
      setIsLoading(false);
    }
  }, [pendingAction, user?.id, effectiveOrganization?.id, persistMessage]);

  const cancelAction = useCallback(async () => {
    if (!pendingAction) return;

    try {
      await supabase.functions.invoke('execute-ai-action', {
        body: {
          capability_id: pendingAction.capability_id || pendingAction.type,
          params: pendingAction.params,
          organizationId: effectiveOrganization?.id,
          audit_id: pendingAction.audit_id ?? undefined,
          denied: true,
        },
      });
    } catch (e) {
      console.warn('Audit denial failed:', e);
    }

    const cancelText = 'Action cancelled. Anything else?';
    const cancelMessage: AIMessage = {
      id: `cancel-${Date.now()}`,
      role: 'assistant',
      content: cancelText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, cancelMessage]);
    setPendingAction(null);

    if (conversationIdRef.current) {
      await persistMessage(conversationIdRef.current, 'assistant', cancelText);
    }
  }, [pendingAction, effectiveOrganization?.id, persistMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setPendingAction(null);
    setConvId(null);
  }, []);

  const startNewChat = clearChat;

  const loadConversation = useCallback(async (id: string) => {
    if (!user?.id) return;
    setIsLoading(true);
    setPendingAction(null);
    try {
      const { data, error } = await supabase
        .from('ai_conversation_messages')
        .select('id, role, content, action, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const hydrated: AIMessage[] = (data || []).map((row: any) => ({
        id: row.id,
        role: row.role === 'assistant' ? 'assistant' : 'user',
        content: row.content || '',
        timestamp: new Date(row.created_at),
        action: row.action
          ? { ...(row.action as AIAction), status: 'executed' as const }
          : null,
      }));
      setMessages(hydrated);
      setConvId(id);
    } catch (e) {
      console.error('Failed to load conversation', e);
      toast.error('Could not load conversation');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  return {
    messages,
    isLoading,
    pendingAction,
    conversationId,
    sendMessage,
    confirmAction,
    cancelAction,
    clearChat,
    startNewChat,
    loadConversation,
  };
}
