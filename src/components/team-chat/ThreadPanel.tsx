import { useRef, useEffect } from 'react';
import { X, Send, Smile, AtSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useTeamChatContext } from '@/contexts/TeamChatContext';
import { useThreadMessages } from '@/hooks/team-chat/useThreadMessages';
import { ThreadMessageItem } from './ThreadMessageItem';
import { MentionInput, MentionInputRef } from './MentionInput';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { cn } from '@/lib/utils';

export function ThreadPanel() {
  const { threadMessageId, closeThread, activeChannel, quotedMessage, setQuotedMessage } = useTeamChatContext();
  const { 
    parentMessage, 
    replies, 
    isLoading, 
    sendReply, 
    toggleReaction, 
    editMessage,
    deleteMessage,
    isSending 
  } = useThreadMessages(threadMessageId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mentionInputRef = useRef<MentionInputRef>(null);
  const lastReplyIdRef = useRef<string | null>(null);

  // Auto-scroll when new replies arrive
  useEffect(() => {
    if (replies.length > 0) {
      const lastReply = replies[replies.length - 1];
      if (lastReply.id !== lastReplyIdRef.current) {
        lastReplyIdRef.current = lastReply.id;
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [replies]);

  // Escape key to close thread
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && threadMessageId) {
        closeThread();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [threadMessageId, closeThread]);

  // Clear quote when thread changes
  useEffect(() => {
    setQuotedMessage(null);
  }, [threadMessageId, setQuotedMessage]);

  const handleSendReply = (content: string) => {
    if (!content.trim() || isSending) return;

    let finalContent = content;
    
    // Prepend quoted message if present
    if (quotedMessage) {
      const quotedName = quotedMessage.sender?.display_name || quotedMessage.sender?.full_name || 'Unknown';
      const quotedText = quotedMessage.content.split('\n').map(line => `> ${line}`).join('\n');
      finalContent = `> **${quotedName}** wrote:\n${quotedText}\n\n${content}`;
    }

    sendReply(finalContent);
    setQuotedMessage(null);
  };

  const handleInsertEmoji = (emoji: string) => {
    mentionInputRef.current?.insertEmoji(emoji);
  };

  const handleTriggerMention = () => {
    mentionInputRef.current?.triggerMention();
  };

  // Calculate thread metadata
  const participantIds = new Set<string>();
  if (parentMessage?.sender?.id) participantIds.add(parentMessage.sender.id);
  replies.forEach(r => {
    if (r.sender?.id) participantIds.add(r.sender.id);
  });
  const participantCount = participantIds.size;
  
  const lastActivity = replies.length > 0 
    ? replies[replies.length - 1].created_at 
    : parentMessage?.created_at;

  if (!threadMessageId) return null;

  return (
    <div className="w-80 lg:w-96 border-l flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Thread</div>
          <Button variant="ghost" size="icon" onClick={closeThread} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {!isLoading && (
          <div className="text-xs text-muted-foreground mt-1">
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
            {lastActivity && (
              <> · Last reply {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}</>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Parent message */}
              {parentMessage && (
                <div className="border-b pb-4">
                  <ThreadMessageItem
                    message={parentMessage}
                    onReact={(emoji) => toggleReaction(parentMessage.id, emoji)}
                    onQuote={() => setQuotedMessage(parentMessage)}
                    onEdit={(content) => editMessage({ messageId: parentMessage.id, content })}
                    onDelete={() => deleteMessage(parentMessage.id)}
                    isParent
                  />
                </div>
              )}

              {/* Replies count */}
              {replies.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex-1 h-px bg-border" />
                  <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* Replies with L-line threading */}
              {replies.length > 0 && (
                <div className="relative ml-5 pl-4 border-l-2 border-muted-foreground/20">
                  <div className="space-y-0">
                    {replies.map((reply, index) => (
                      <div key={reply.id} className="relative">
                        {/* Horizontal connector line */}
                        <div className="absolute -left-4 top-4 w-4 h-px bg-muted-foreground/20" />
                        <ThreadMessageItem
                          message={reply}
                          onReact={(emoji) => toggleReaction(reply.id, emoji)}
                          onQuote={() => setQuotedMessage(reply)}
                          onEdit={(content) => editMessage({ messageId: reply.id, content })}
                          onDelete={() => deleteMessage(reply.id)}
                          isLast={index === replies.length - 1}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Reply input */}
          {activeChannel?.membership && (
            <div className="border-t p-3">
              {/* Quote preview */}
              {quotedMessage && (
                <div className="mb-2 p-2 bg-muted/50 rounded-md border-l-2 border-primary">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-primary mb-0.5">
                        Replying to {quotedMessage.sender?.display_name || quotedMessage.sender?.full_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {quotedMessage.content}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => setQuotedMessage(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-end gap-2 rounded-lg border bg-background p-2">
                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <EmojiPickerPopover onEmojiSelect={handleInsertEmoji} side="top" align="start">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </EmojiPickerPopover>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleTriggerMention}
                  >
                    <AtSign className="h-4 w-4" />
                  </Button>
                </div>

                {/* Input */}
                <MentionInput
                  ref={mentionInputRef}
                  placeholder="Reply in thread..."
                  onSend={handleSendReply}
                  disabled={isSending}
                  className="min-h-[36px] max-h-[120px]"
                />

                {/* Send button */}
                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    // Trigger send via keyboard simulation
                    const event = new KeyboardEvent('keydown', { key: 'Enter' });
                    document.activeElement?.dispatchEvent(event);
                  }}
                  disabled={isSending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
