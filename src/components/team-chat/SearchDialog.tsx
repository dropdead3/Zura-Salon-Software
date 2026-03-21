import { useState, useEffect, useCallback } from 'react';
import { Search, X, Hash, MapPin, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useMessageSearch } from '@/hooks/team-chat/useMessageSearch';
import { useTeamChatContext } from '@/contexts/TeamChatContext';
import { useChatChannels } from '@/hooks/team-chat/useChatChannels';
import { Loader2 } from 'lucide-react';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { results, isLoading } = useMessageSearch(debouncedQuery, open);
  const { setActiveChannel } = useTeamChatContext();
  const { channels } = useChatChannels();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleResultClick = (result: typeof results[0]) => {
    const channel = channels.find((c) => c.id === result.channel_id);
    if (channel) {
      setActiveChannel(channel);
    }
    onOpenChange(false);
  };

  const ChannelIcon = ({ type }: { type: string }) => {
    if (type === 'location') return <MapPin className="h-3 w-3" />;
    if (type === 'dm' || type === 'group_dm') return <MessageSquare className="h-3 w-3" />;
    return <Hash className="h-3 w-3" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0">
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search messages... (⌘K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 text-base"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {isLoading && debouncedQuery ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {debouncedQuery ? 'No messages found' : 'Type to search messages'}
            </div>
          ) : (
            <div className="p-2">
              {results.map((result) => {
                const senderName = result.sender?.display_name || result.sender?.full_name || 'Unknown';
                const initials = senderName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-start gap-3 p-3 rounded-md text-left hover:bg-accent transition-colors"
                  >
                    <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                      <AvatarImage src={result.sender?.photo_url || undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span className="font-medium text-foreground">{senderName}</span>
                        <span>in</span>
                        <span className="flex items-center gap-1">
                          <ChannelIcon type={result.channelType} />
                          {result.channelName}
                        </span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className="text-sm line-clamp-2">{result.content}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
