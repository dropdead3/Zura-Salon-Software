import { useState } from 'react';
import { AtSign, Check, CheckCheck, MessageSquare, FileText, Megaphone, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUnreadMentionCount, useMentions, useMarkMentionAsRead, useMarkAllMentionsAsRead, type Mention } from '@/hooks/useMentions';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const SOURCE_ICONS = {
  chat: MessageSquare,
  account_note: FileText,
  task: ClipboardList,
  announcement: Megaphone,
};

const SOURCE_LABELS = {
  chat: 'Chat',
  account_note: 'Note',
  task: 'Task',
  announcement: 'Announcement',
};

export function MentionNotificationBadge() {
  const [open, setOpen] = useState(false);
  const unreadCount = useUnreadMentionCount();
  const { data: mentions = [], isLoading } = useMentions();
  const markAsRead = useMarkMentionAsRead();
  const markAllAsRead = useMarkAllMentionsAsRead();
  const navigate = useNavigate();

  const handleMentionClick = (mention: Mention) => {
    // Mark as read
    if (!mention.read_at) {
      markAsRead.mutate(mention.id);
    }

    // Navigate to source
    if (mention.source_type === 'chat' && mention.channel_id) {
      navigate(`/dashboard/team-chat?channel=${mention.channel_id}`);
    } else if (mention.source_type === 'account_note') {
      navigate('/dashboard/account-notes');
    }
    setOpen(false);
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <AtSign className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-medium">Mentions</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllRead}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : mentions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No mentions yet
            </div>
          ) : (
            <div className="divide-y">
              {mentions.map((mention) => {
                const Icon = SOURCE_ICONS[mention.source_type] || MessageSquare;
                return (
                  <button
                    key={mention.id}
                    onClick={() => handleMentionClick(mention)}
                    className={cn(
                      "w-full p-3 text-left hover:bg-muted/50 transition-colors",
                      !mention.read_at && "bg-primary/5"
                    )}
                  >
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={mention.author?.photo_url || undefined} />
                        <AvatarFallback>
                          {mention.author?.display_name?.[0] || mention.author?.full_name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {mention.author?.display_name || mention.author?.full_name || 'Unknown'}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            <Icon className="h-3 w-3 mr-1" />
                            {SOURCE_LABELS[mention.source_type]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {mention.source_context}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(mention.created_at), { addSuffix: true })}
                          </span>
                          {mention.read_at && (
                            <Check className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
