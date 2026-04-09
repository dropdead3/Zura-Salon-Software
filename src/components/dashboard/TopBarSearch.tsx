import React from 'react';
import { Search, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarSearchProps {
  onClick: () => void;
  isOpen?: boolean;
}

export function TopBarSearch({ onClick, isOpen }: TopBarSearchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 w-full px-3 py-1.5 rounded-full',
        'bg-muted/60 border border-border/70',
        'shadow-sm shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)]',
        'hover:bg-muted/80 hover:border-border hover:shadow-md',
        'active:scale-[0.995]',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/10',
        'transition-all duration-200 ease-out cursor-pointer',
        'text-left',
        isOpen && 'opacity-0 pointer-events-none'
      )}
    >
      <Search className="w-4 h-4 shrink-0 text-muted-foreground/70" strokeWidth={1.5} />
      <span className="flex-1 min-w-0 font-sans text-sm text-muted-foreground tracking-wide truncate">
        Search or ask Zura...
      </span>
      <kbd className={cn(
        'hidden sm:inline-flex h-5 select-none items-center gap-1 rounded',
        'border border-border/50 bg-muted/70 px-1.5',
        'font-mono text-[11px] text-muted-foreground tracking-wider shrink-0',
        'transition-colors duration-200 group-hover:text-foreground/60'
      )}>
        <Command className="w-3 h-3" />K
      </kbd>
    </button>
  );
}
