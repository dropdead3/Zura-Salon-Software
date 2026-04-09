import React, { useRef, useEffect } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandInputProps {
  query: string;
  onQueryChange: (q: string) => void;
  aiMode: boolean;
  onAiModeToggle: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
}

export function CommandInput({
  query, onQueryChange, aiMode, onAiModeToggle, onKeyDown, autoFocus = true,
}: CommandInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.03)]">
      {aiMode ? (
        <Sparkles className="w-4 h-4 shrink-0 text-primary" />
      ) : (
        <Search className="w-4 h-4 shrink-0 text-muted-foreground/70" strokeWidth={1.5} />
      )}

      <input
        ref={inputRef}
        type="text"
        placeholder={aiMode ? 'Ask a question...' : 'Search or ask Zura...'}
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="flex-1 min-w-0 bg-transparent border-none outline-none font-sans text-base text-foreground placeholder:text-muted-foreground"
        autoCapitalize="off"
        autoComplete="off"
        spellCheck={false}
      />

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onAiModeToggle}
          className={cn(
            'flex items-center gap-1 h-6 px-2 rounded-full text-xs font-sans font-medium transition-colors duration-150',
            aiMode
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
          tabIndex={-1}
        >
          <Sparkles className="w-3 h-3" />
          AI
        </button>

        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="text-muted-foreground hover:text-foreground p-0.5"
            tabIndex={-1}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border/50 bg-muted/70 px-1.5 font-mono text-[11px] text-muted-foreground">
          Esc
        </kbd>
      </div>
    </div>
  );
}
