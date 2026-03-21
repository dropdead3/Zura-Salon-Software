import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, MessageSquare, Smile, Trash2, Pencil, Pin, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { MessageWithSender } from '@/hooks/team-chat/useChatMessages';
import { renderContentWithMentions } from './MentionAutocomplete';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { MessageEditDialog, canEditMessage, getEditTimeRemainingText } from './MessageEditDialog';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

interface MessageItemProps {
  message: MessageWithSender;
  isConsecutive: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onDelete: () => void;
  onEdit?: (content: string) => void;
  onPin?: () => void;
  isPinned?: boolean;
  canDelete?: boolean;
}

export function MessageItem({
  message,
  isConsecutive,
  onReact,
  onReply,
  onDelete,
  onEdit,
  onPin,
  isPinned,
  canDelete = false,
}: MessageItemProps) {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const isOwn = message.sender_id === user?.id;

  // Check if message can still be edited (within 5 minutes and is own message)
  const canEditMsg = useMemo(() => {
    return isOwn && canEditMessage(message.created_at);
  }, [isOwn, message.created_at]);

  const senderName = message.sender?.display_name || message.sender?.full_name || 'Unknown';
  const initials = senderName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const timestamp = formatDistanceToNow(new Date(message.created_at), { addSuffix: true });

  const handleEditSave = (content: string) => {
    onEdit?.(content);
  };

  return (
    <>
      <div
        className={cn(
          'group relative flex gap-4 px-5 py-1.5 -mx-2 rounded-lg transition-colors',
          'hover:bg-accent/30',
          isConsecutive ? 'items-center' : 'items-start pt-2'
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onDoubleClick={onReply}
      >
        {/* Left column: Avatar or Timestamp */}
        <div className="w-10 shrink-0 flex items-start justify-center">
          {!isConsecutive ? (
            <Avatar className="h-10 w-10">
              <AvatarImage src={message.sender?.photo_url || undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          ) : (
            <span className={cn(
              "text-[10px] text-muted-foreground whitespace-nowrap transition-opacity pt-0.5",
              showActions ? "opacity-100" : "opacity-0"
            )}>
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {!isConsecutive && (
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="font-medium text-base">{senderName}</span>
              <span className="text-xs text-muted-foreground">{timestamp}</span>
              {message.is_edited && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>
          )}

          <div className="text-base whitespace-pre-wrap break-words">{renderContentWithMentions(message.content)}</div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => onReact(reaction.emoji)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                    'bg-accent/50 hover:bg-accent transition-colors',
                    reaction.users.includes(user?.id || '') && 'ring-1 ring-primary'
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          )}

        {/* Reply count with L-line threading */}
        {message.reply_count > 0 && (
          <div className="flex items-start mt-2 ml-4">
            {/* L-shaped connector using box-drawing approach */}
            <div className="flex flex-col items-end mr-2">
              <div className="w-4 h-3 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-md" />
            </div>
            
            <button
              onClick={onReply}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors -mt-0.5"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}
            </button>
          </div>
        )}
        </div>

        {/* Hover actions */}
        {showActions && (
          <div className="absolute right-2 top-0 -translate-y-1/2 flex items-center gap-0.5 bg-background border rounded-md shadow-sm p-0.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="end">
                <div className="flex gap-1">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onReact(emoji)}
                      className="text-xl hover:scale-125 transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                  <EmojiPickerPopover onEmojiSelect={onReact} side="right">
                    <button className="text-lg hover:scale-110 transition-transform p-1 text-muted-foreground hover:text-foreground">
                      <Plus className="h-4 w-4" />
                    </button>
                  </EmojiPickerPopover>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReply}>
              <MessageSquare className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onPin && (
                  <DropdownMenuItem onClick={onPin}>
                    <Pin className="h-4 w-4 mr-2" />
                    {isPinned ? 'Unpin message' : 'Pin message'}
                  </DropdownMenuItem>
                )}
                {canEditMsg && (
                  <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit message
                    <span className="ml-auto text-xs text-muted-foreground">
                      {getEditTimeRemainingText(message.created_at)}
                    </span>
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete message
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <MessageEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        content={message.content}
        createdAt={message.created_at}
        onSave={handleEditSave}
      />
    </>
  );
}
