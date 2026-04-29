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
  // Generic target shape used by HR / non-appointment proposals.
  target?: {
    name?: string;
    hire_date?: string | null;
    upcoming_appointments?: number;
    reason?: string | null;
  };
}

export interface AIAction {
  type:
    | 'reschedule'
    | 'cancel'
    | 'create_booking'
    | 'deactivate_team_member'
    | 'reactivate_team_member';
  status: 'pending_confirmation' | 'confirmed' | 'cancelled' | 'executed' | 'failed';
  preview: AIActionPreview;
  params: Record<string, unknown>;
  actionId?: string;
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
      // Build conversation history for context
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      history.push({ role: 'user', content: content.trim() });

      const { data, error } = await supabase.functions.invoke('ai-agent-chat', {
        body: {
          messages: history,
          userId: user.id,
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

      // Replace loading message with actual response
      setMessages(prev => 
        prev.filter(m => !m.isLoading).concat(assistantMessage)
      );

      // If there's a pending action, track it
      if (data.action?.status === 'pending_confirmation') {
        setPendingAction(data.action);
        
        // Store action in database for tracking
        await supabase.from('ai_agent_actions').insert({
          organization_id: effectiveOrganization?.id,
          user_id: user.id,
          action_type: data.action.type,
          action_params: data.action.params,
          status: 'pending',
        });
      }

    } catch (error) {
      console.error('AI Agent error:', error);
      
      // Replace loading message with error
      const errorMessage: AIMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages(prev => 
        prev.filter(m => !m.isLoading).concat(errorMessage)
      );
      
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, effectiveOrganization?.id, messages]);

  const confirmAction = useCallback(async () => {
    if (!pendingAction || !user?.id) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('execute-ai-action', {
        body: {
          actionType: pendingAction.type,
          params: pendingAction.params,
          userId: user.id,
          organizationId: effectiveOrganization?.id,
        },
      });

      if (error) throw error;

      const resultMessage: AIMessage = {
        id: `result-${Date.now()}`,
        role: 'assistant',
        content: data.success 
          ? `✅ ${data.message}` 
          : `❌ ${data.message}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, resultMessage]);
      setPendingAction(null);

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }

    } catch (error) {
      console.error('Execute action error:', error);
      toast.error('Failed to execute action');
    } finally {
      setIsLoading(false);
    }
  }, [pendingAction, user?.id, effectiveOrganization?.id]);

  const cancelAction = useCallback(async () => {
    if (!pendingAction) return;

    const cancelMessage: AIMessage = {
      id: `cancel-${Date.now()}`,
      role: 'assistant',
      content: "Action cancelled. Is there anything else I can help you with?",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, cancelMessage]);
    setPendingAction(null);
  }, [pendingAction]);

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
