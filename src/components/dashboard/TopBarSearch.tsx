import React from 'react';
import { Search, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarSearchProps {
  onClick: () => void;
}

export function TopBarSearch({ onClick }: TopBarSearchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-1.5 rounded-full border border-border',
        'bg-muted/50 hover:bg-muted transition-colors cursor-pointer',
        'text-left'
      )}
    >
      <Search className="w-4 h-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 min-w-0 font-sans text-sm text-muted-foreground truncate">
        Search or ask...
      </span>
      <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted/50 px-1.5 font-mono text-[10px] text-muted-foreground shrink-0">
        <Command className="w-3 h-3" />K
      </kbd>
    </button>
  );
}
