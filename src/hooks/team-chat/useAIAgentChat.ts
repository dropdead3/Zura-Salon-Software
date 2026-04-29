import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
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
  /** capability id (e.g. "team.deactivate_member"). */
  capability_id?: string;
  /** legacy alias of capability_id used by older preview UI. */
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

export function useAIAgentChat() {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);

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

      const assistantMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message || "I'm not sure how to help with that.",
        timestamp: new Date(),
        action: data.action || null,
      };

      setMessages(prev => prev.filter(m => !m.isLoading).concat(assistantMessage));

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
  }, [user?.id, effectiveOrganization?.id, messages]);

  const confirmAction = useCallback(async (confirmationInput?: string) => {
    if (!pendingAction || !user?.id) return;

    // Local confirmation-token check for high-risk actions before round-tripping.
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

      const resultMessage: AIMessage = {
        id: `result-${Date.now()}`,
        role: 'assistant',
        content: data.success ? `✅ ${data.message}` : `❌ ${data.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, resultMessage]);
      setPendingAction(null);

      if (data.success) toast.success(data.message);
      else toast.error(data.message);
    } catch (error) {
      console.error('Execute action error:', error);
      toast.error('Failed to execute action');
    } finally {
      setIsLoading(false);
    }
  }, [pendingAction, user?.id, effectiveOrganization?.id]);

  const cancelAction = useCallback(async () => {
    if (!pendingAction) return;

    // Tell the backend to flip the audit row to "denied".
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
      // Best-effort; the user-visible state still proceeds.
      console.warn('Audit denial failed:', e);
    }

    const cancelMessage: AIMessage = {
      id: `cancel-${Date.now()}`,
      role: 'assistant',
      content: 'Action cancelled. Anything else?',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, cancelMessage]);
    setPendingAction(null);
  }, [pendingAction, effectiveOrganization?.id]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setPendingAction(null);
  }, []);

  return {
    messages,
    isLoading,
    pendingAction,
    sendMessage,
    confirmAction,
    cancelAction,
    clearChat,
  };
}
