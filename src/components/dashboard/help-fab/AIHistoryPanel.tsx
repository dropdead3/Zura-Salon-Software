import { useState } from 'react';
import { Clock, MoreHorizontal, Trash2, Pencil, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

export function AIHistoryPanel({ activeConversationId, onSelect, onClose }: AIHistoryPanelProps) {
  const { conversations, isLoading, rename, remove } = useAIConversations();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

      <ScrollArea className="flex-1">
        <div className="px-3 py-3 space-y-1">
          {isLoading && (
            <p className="text-xs text-muted-foreground px-3 py-6 text-center">Loading…</p>
          )}
          {!isLoading && conversations.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-6 text-center">
              No previous conversations yet.
            </p>
          )}
          {conversations.map((c) => {
            const isActive = c.id === activeConversationId;
            const isRenaming = renamingId === c.id;
            return (
              <div
                key={c.id}
                className={cn(
                  'group flex items-center gap-2 rounded-xl px-3 py-2 transition-colors',
                  isActive ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/60 border border-transparent'
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
                    <p className="text-sm truncate">{c.title}</p>
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
                        className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
      </ScrollArea>
    </div>
  );
}
