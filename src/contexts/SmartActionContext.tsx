import { createContext, useContext, ReactNode, useCallback } from 'react';
import { useSmartActions, SmartAction } from '@/hooks/team-chat/useSmartActions';
import { SmartActionContainer } from '@/components/team-chat/SmartActionToast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SmartActionContextType {
  pendingActions: SmartAction[];
  isLoading: boolean;
  acceptAction: (actionId: string) => void;
  declineAction: (actionId: string, note?: string) => void;
  dismissAction: (actionId: string) => void;
  detectAction: (params: {
    messageId: string;
    messageContent: string;
    senderId: string;
    channelId: string;
    targetUserId?: string;
  }) => Promise<any>;
}

const SmartActionContext = createContext<SmartActionContextType | null>(null);

export function SmartActionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const {
    pendingActions,
    isLoading,
    acceptAction,
    declineAction,
    dismissAction,
    detectAction,
    isAccepting,
    isDeclining,
  } = useSmartActions();

  // Post confirmation message to chat on accept
  const handleAccept = useCallback(async (actionId: string) => {
    const action = pendingActions.find((a) => a.id === actionId);
    if (action && user?.id) {
      // Update the action status
      acceptAction(actionId);

      // Post confirmation message
      try {
        await supabase.from('chat_messages').insert({
          channel_id: action.channel_id,
          sender_id: user.id,
          content: `✅ I'll handle it! (${action.detected_intent})`,
          metadata: { smart_action_response: true, action_id: actionId },
        });
      } catch (error) {
        console.error('Failed to post confirmation message:', error);
      }
    }
  }, [pendingActions, acceptAction, user?.id]);

  // Post decline message to chat
  const handleDecline = useCallback(async (actionId: string, note?: string) => {
    const action = pendingActions.find((a) => a.id === actionId);
    if (action && user?.id) {
      declineAction({ actionId, note });

      // Post decline message
      try {
        await supabase.from('chat_messages').insert({
          channel_id: action.channel_id,
          sender_id: user.id,
          content: `❌ Sorry, I can't help with that right now.${note ? ` (${note})` : ''}`,
          metadata: { smart_action_response: true, action_id: actionId },
        });
      } catch (error) {
        console.error('Failed to post decline message:', error);
      }
    }
  }, [pendingActions, declineAction, user?.id]);

  return (
    <SmartActionContext.Provider
      value={{
        pendingActions,
        isLoading,
        acceptAction: handleAccept,
        declineAction: handleDecline,
        dismissAction,
        detectAction,
      }}
    >
      {children}
      <SmartActionContainer
        actions={pendingActions}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onDismiss={dismissAction}
        isAccepting={isAccepting}
        isDeclining={isDeclining}
      />
    </SmartActionContext.Provider>
  );
}

export function useSmartActionContext() {
  const context = useContext(SmartActionContext);
  if (!context) {
    throw new Error('useSmartActionContext must be used within SmartActionProvider');
  }
  return context;
}
