import { useRef, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { useChatMessages, type MessageWithSender } from '@/hooks/team-chat/useChatMessages';
import { usePinnedMessages } from '@/hooks/team-chat/usePinnedMessages';
import { useChannelMembers } from '@/hooks/team-chat/useChannelMembers';
import { getChannelDisplayName } from '@/hooks/team-chat/useChannelDisplayName';
import { useTeamChatContext } from '@/contexts/TeamChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';

export function MessageList() {
  const { user } = useAuth();
  const { data: userProfile } = useEmployeeProfile();
  const { activeChannel, openThread } = useTeamChatContext();
  const { members } = useChannelMembers(activeChannel?.id || null);
  
  // Get member IDs for DM detection
  const memberIds = useMemo(() => members.map(m => m.userId), [members]);
  
  const { messages, isLoading, toggleReaction, deleteMessage, editMessage } = useChatMessages(
    activeChannel?.id || null,
    activeChannel?.type,
    memberIds
  );
  const { pinMessage, unpinMessage, isPinned, getPinnedItem } = usePinnedMessages(activeChannel?.id || null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Check if current user is super admin
  const isSuperAdmin = userProfile?.is_super_admin === true;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.id !== lastMessageIdRef.current) {
        lastMessageIdRef.current = lastMessage.id;
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  if (!activeChannel) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a channel to start chatting
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    const isDM = activeChannel.type === 'dm' || activeChannel.type === 'group_dm';
    
    // For DMs, try to get partner name from dm_partner or from members list
    let displayName = getChannelDisplayName(activeChannel);
    if (isDM && displayName === 'Team Member' && members.length > 0) {
      // Find a member with a display name
      const partner = members.find(m => m.profile?.displayName || m.profile?.fullName);
      if (partner) {
        displayName = partner.profile.displayName || partner.profile.fullName || displayName;
      }
    }
    
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="text-4xl mb-4">{isDM ? '👋' : '💬'}</div>
        <h3 className="font-medium text-lg">
          {isDM ? `Start a conversation with ${displayName}` : `Welcome to #${displayName}`}
        </h3>
        <p className="text-muted-foreground text-sm mt-1">
          {activeChannel.description || (isDM ? 'Say hello!' : 'This is the start of the conversation.')}
        </p>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: MessageWithSender[] }[] = [];
  let currentDate = '';

  messages.forEach((msg) => {
    const msgDate = new Date(msg.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">{group.date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-2">
              {group.messages.map((message, index) => {
                const prevMessage = index > 0 ? group.messages[index - 1] : null;
                const isConsecutive =
                  prevMessage &&
                  prevMessage.sender_id === message.sender_id &&
                  new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() < 5 * 60 * 1000;

                // User can delete if they're super admin OR if it's their own message
                const canDeleteMessage = isSuperAdmin || message.sender_id === user?.id;

                return (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isConsecutive={isConsecutive || false}
                    onReact={(emoji) => toggleReaction(message.id, emoji)}
                    onReply={() => openThread(message.id)}
                    onDelete={() => deleteMessage(message.id)}
                    onEdit={(content) => editMessage({ messageId: message.id, content })}
                    onPin={() => {
                      const pinnedItem = getPinnedItem(message.id);
                      if (pinnedItem) {
                        unpinMessage(pinnedItem.pinnedId);
                      } else {
                        pinMessage(message.id);
                      }
                    }}
                    isPinned={isPinned(message.id)}
                    canDelete={canDeleteMessage}
                  />
                );
              })}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
