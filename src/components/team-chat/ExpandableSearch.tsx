import { useState, useEffect, useRef } from 'react';
import { Search, X, Hash, MapPin, MessageSquare, Loader2 } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMessageSearch } from '@/hooks/team-chat/useMessageSearch';
import { useTeamChatContext } from '@/contexts/TeamChatContext';
import { useChatChannels } from '@/hooks/team-chat/useChatChannels';

interface ExpandableSearchProps {
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export function ExpandableSearch({ isExpanded, onExpandedChange }: ExpandableSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { results, isLoading } = useMessageSearch(debouncedQuery, isExpanded);
  const { setActiveChannel } = useTeamChatContext();
  const { channels } = useChatChannels();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isExpanded) {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isExpanded]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onExpandedChange(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, onExpandedChange]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onExpandedChange(!isExpanded);
      }
      if (e.key === 'Escape' && isExpanded) {
        onExpandedChange(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onExpandedChange]);

  const handleResultClick = (result: typeof results[0]) => {
    const channel = channels.find((c) => c.id === result.channel_id);
    if (channel) {
      setActiveChannel(channel);
    }
    onExpandedChange(false);
  };

  const ChannelIcon = ({ type }: { type: string }) => {
    if (type === 'location') return <MapPin className="h-3 w-3" />;
    if (type === 'dm' || type === 'group_dm') return <MessageSquare className="h-3 w-3" />;
    return <Hash className="h-3 w-3" />;
  };

  // Just the search icon button when collapsed
  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onExpandedChange(true)}
        title="Search messages (⌘K)"
      >
        <Search className="h-5 w-5" />
      </Button>
    );
  }

  // Expanded search bar with dropdown results
  return (
    <div ref={containerRef} className="absolute right-0 top-0 h-14 flex items-center z-50">
      <div className="relative">
        {/* Search input container */}
        <div className="flex items-center bg-background border rounded-lg shadow-lg overflow-hidden animate-in slide-in-from-right-4 duration-200">
          <div className="flex items-center px-3 gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 w-64 sm:w-80 text-sm h-10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onExpandedChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results dropdown */}
        {(query || isLoading) && (
          <div className="absolute top-full right-0 mt-1 w-full min-w-80 sm:min-w-96 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
            <ScrollArea className="max-h-80">
              {isLoading && debouncedQuery ? (
                <DashboardLoader size="sm" className="py-8" />
              ) : results.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {debouncedQuery ? 'No messages found' : 'Type to search messages'}
                </div>
              ) : (
                <div className="p-1">
                  {results.map((result) => {
                    const senderName = result.sender?.display_name || result.sender?.full_name || 'Unknown';
                    const initials = senderName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                    return (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-start gap-3 p-2.5 rounded-md text-left hover:bg-accent transition-colors"
                      >
                        <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                          <AvatarImage src={result.sender?.photo_url || undefined} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
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
          </div>
        )}
      </div>
    </div>
  );
}

// Keep the old dialog export for backward compatibility if needed elsewhere
export { ExpandableSearch as SearchDialog };
