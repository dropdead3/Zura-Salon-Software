import { useMemo, useState } from 'react';
import { Clock, MoreHorizontal, Trash2, Pencil, X, Search } from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAIConversations, type AIConversationSummary } from '@/hooks/team-chat/useAIConversations';
import { cn } from '@/lib/utils';

interface AIHistoryPanelProps {
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

type Bucket = 'Today' | 'Yesterday' | 'This week' | 'Older';

function bucketFor(d: Date): Bucket {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (differenceInCalendarDays(new Date(), d) < 7) return 'This week';
  return 'Older';
}

const BUCKET_ORDER: Bucket[] = ['Today', 'Yesterday', 'This week', 'Older'];

export function AIHistoryPanel({ activeConversationId, onSelect, onClose }: AIHistoryPanelProps) {
  const { conversations, isLoading, rename, remove } = useAIConversations();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [search, setSearch] = useState('');

  const startRename = (c: AIConversationSummary) => {
    setRenamingId(c.id);
    setRenameValue(c.title);
  };

  const submitRename = async () => {
    if (!renamingId) return;
    try {
      await rename({ id: renamingId, title: renameValue });
    } finally {
      setRenamingId(null);
      setRenameValue('');
    }
  };

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? conversations.filter((c) => (c.title || '').toLowerCase().includes(q))
      : conversations;
    const out: Record<Bucket, AIConversationSummary[]> = {
      Today: [],
      Yesterday: [],
      'This week': [],
      Older: [],
    };
    for (const c of filtered) {
      out[bucketFor(new Date(c.last_message_at))].push(c);
    }
    return out;
  }, [conversations, search]);

  const totalShown = BUCKET_ORDER.reduce((acc, b) => acc + grouped[b].length, 0);

  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-display text-sm tracking-wide uppercase">History</span>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {conversations.length > 0 && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="h-8 pl-8 rounded-full text-xs bg-muted/50 border-border/40"
              autoCapitalize="off"
            />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="px-3 py-3 space-y-3">
          {isLoading && (
            <p className="text-xs text-muted-foreground px-3 py-6 text-center">Loading…</p>
          )}
          {!isLoading && conversations.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-6 text-center">
              No previous conversations yet.
            </p>
          )}
          {!isLoading && conversations.length > 0 && totalShown === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-6 text-center">
              No matches for "{search}".
            </p>
          )}

          {BUCKET_ORDER.map((bucket) => {
            const items = grouped[bucket];
            if (items.length === 0) return null;
            return (
              <div key={bucket} className="space-y-1">
                <div className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-display">
                  {bucket}
                </div>
                {items.map((c) => {
                  const isActive = c.id === activeConversationId;
                  const isRenaming = renamingId === c.id;
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        'group flex items-center gap-2 rounded-xl px-3 py-2 transition-colors',
                        isActive
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/60 border border-transparent'
                      )}
                    >
                      {isRenaming ? (
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={submitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitRename();
                            if (e.key === 'Escape') {
                              setRenamingId(null);
                              setRenameValue('');
                            }
                          }}
                          className="h-7 text-sm rounded-full"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelect(c.id)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <p className="text-sm truncate">{c.title || 'Untitled chat'}</p>
                          <p className="text-[10px] text-muted-foreground/70">
                            {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                          </p>
                        </button>
                      )}

                      {!isRenaming && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                              aria-label="Conversation options"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => startRename(c)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => remove(c.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
