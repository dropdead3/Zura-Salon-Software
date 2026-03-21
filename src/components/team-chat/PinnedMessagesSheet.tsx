import { X, Pin, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { usePinnedMessages } from '@/hooks/team-chat/usePinnedMessages';
import { useTeamChatContext } from '@/contexts/TeamChatContext';
import { Loader2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';

interface PinnedMessagesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PinnedMessagesSheet({ open, onOpenChange }: PinnedMessagesSheetProps) {
  const { activeChannel, openThread } = useTeamChatContext();
  const { pinnedMessages, isLoading, unpinMessage } = usePinnedMessages(activeChannel?.id || null);

  const handleViewThread = (messageId: string) => {
    openThread(messageId);
    onOpenChange(false);
  };

  return (
    <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="440px">
      <div className="p-5 pb-3 border-b border-border/40">
        <h2 className="font-display text-sm tracking-wide uppercase flex items-center gap-2">
          <Pin className="h-5 w-5" />
          Pinned Messages
        </h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : pinnedMessages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No pinned messages in this channel
        </div>
      ) : (
        <ScrollArea className="flex-1 p-5">
          <div className="space-y-4">
            {pinnedMessages.map((pm) => {
              const senderName = pm.message.sender?.display_name || pm.message.sender?.full_name || 'Unknown';
              const initials = senderName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

              return (
                <div key={pm.pinnedId} className="group relative border rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={pm.message.sender?.photo_url || undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium text-sm">{senderName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(pm.message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap line-clamp-3">{pm.message.content}</p>

                      {pm.replyCount > 0 && (
                        <div className="mt-2 space-y-1">
                          <Badge variant="secondary" className="text-xs">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {pm.replyCount} {pm.replyCount === 1 ? 'reply' : 'replies'}
                          </Badge>

                          {pm.threadPreviews.length > 0 && (
                            <div className="ml-2 border-l-2 border-muted pl-2 space-y-1">
                              {pm.threadPreviews.map((preview) => (
                                <div key={preview.id} className="text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    {preview.sender?.display_name || preview.sender?.full_name || 'Unknown'}:
                                  </span>{' '}
                                  <span className="line-clamp-1">{preview.content}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <Button
                            variant="link"
                            size={tokens.button.inline}
                            className="h-auto p-0 text-xs"
                            onClick={() => handleViewThread(pm.message.id)}
                          >
                            View thread →
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => unpinMessage(pm.pinnedId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </PremiumFloatingPanel>
  );
}
