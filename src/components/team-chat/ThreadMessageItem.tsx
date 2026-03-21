import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Smile, Plus, Reply, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import type { MessageWithSender } from '@/hooks/team-chat/useChatMessages';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { MessageEditDialog, canEditMessage, getEditTimeRemainingText } from './MessageEditDialog';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

interface ThreadMessageItemProps {
  message: MessageWithSender;
  onReact: (emoji: string) => void;
  onQuote?: () => void;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
  isParent?: boolean;
  isLast?: boolean;
}

export function ThreadMessageItem({ 
  message, 
  onReact, 
  onQuote,
  onEdit,
  onDelete,
  isParent,
  isLast 
}: ThreadMessageItemProps) {
  const { user } = useAuth();
  const { data: userProfile } = useEmployeeProfile();
  const [showActions, setShowActions] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const senderName = message.sender?.display_name || message.sender?.full_name || 'Unknown';
  const initials = senderName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const timestamp = formatDistanceToNow(new Date(message.created_at), { addSuffix: true });
  const isOwnMessage = user?.id === message.sender_id;
  const isSuperAdmin = userProfile?.is_super_admin === true;

  // Check if message can still be edited (within 5 minutes and is own message)
  const canEditMsg = useMemo(() => {
    return isOwnMessage && canEditMessage(message.created_at);
  }, [isOwnMessage, message.created_at]);

  // Can delete if super admin OR own message
  const canDeleteMsg = isSuperAdmin || isOwnMessage;

  // Parse and render quoted content with special styling
  const renderContent = () => {
    const lines = message.content.split('\n');
    const result: React.ReactNode[] = [];
    let quoteLines: string[] = [];
    let inQuote = false;

    lines.forEach((line, i) => {
      if (line.startsWith('> ')) {
        inQuote = true;
        quoteLines.push(line.slice(2)); // Remove "> " prefix
      } else {
        if (inQuote && quoteLines.length > 0) {
          result.push(
            <div key={`quote-${i}`} className="border-l-2 border-muted-foreground/30 pl-2 mb-2 text-muted-foreground italic">
              {quoteLines.map((ql, qi) => (
                <div key={qi}>{ql}</div>
              ))}
            </div>
          );
          quoteLines = [];
          inQuote = false;
        }
        if (line.trim()) {
          result.push(<div key={i}>{line}</div>);
        } else if (i < lines.length - 1) {
          result.push(<br key={i} />);
        }
      }
    });

    // Handle trailing quote
    if (quoteLines.length > 0) {
      result.push(
        <div key="quote-end" className="border-l-2 border-muted-foreground/30 pl-2 mb-2 text-muted-foreground italic">
          {quoteLines.map((ql, qi) => (
            <div key={qi}>{ql}</div>
          ))}
        </div>
      );
    }

    return result;
  };

  const handleEditSave = (content: string) => {
    onEdit?.(content);
  };

  return (
    <>
      <div
        className={cn(
          'group relative flex gap-3 rounded-md transition-colors',
          !isParent && 'hover:bg-accent/30 p-2'
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <Avatar className={cn(isParent ? 'h-10 w-10' : 'h-8 w-8')}>
          <AvatarImage src={message.sender?.photo_url || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-medium text-base">{senderName}</span>
            <span className="text-xs text-muted-foreground">{timestamp}</span>
            {message.is_edited && (
              <span className="text-[10px] text-muted-foreground">(edited)</span>
            )}
          </div>

          <div className="text-base whitespace-pre-wrap break-words">
            {renderContent()}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => onReact(reaction.emoji)}
                  className={cn(
                    'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px]',
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
        </div>

        {/* Hover actions */}
        {showActions && (
          <div className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Quote/Reply button */}
            {onQuote && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onQuote}
                title="Reply with quote"
              >
                <Reply className="h-3 w-3" />
              </Button>
            )}

            {/* Reaction popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Smile className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="end">
                <div className="flex gap-1">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onReact(emoji)}
                      className="text-lg hover:scale-125 transition-transform p-0.5"
                    >
                      {emoji}
                    </button>
                  ))}
                  <EmojiPickerPopover onEmojiSelect={onReact} side="right">
                    <button className="text-base hover:scale-110 transition-transform p-0.5 text-muted-foreground hover:text-foreground">
                      <Plus className="h-3 w-3" />
                    </button>
                  </EmojiPickerPopover>
                </div>
              </PopoverContent>
            </Popover>

            {/* More actions dropdown - shown if user can edit or delete */}
            {(canEditMsg || canDeleteMsg) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEditMsg && (
                    <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                      <span className="ml-auto text-xs text-muted-foreground">
                        {getEditTimeRemainingText(message.created_at)}
                      </span>
                    </DropdownMenuItem>
                  )}
                  {canDeleteMsg && onDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
