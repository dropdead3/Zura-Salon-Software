import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandInputProps {
  query: string;
  onQueryChange: (q: string) => void;
  aiMode: boolean;
  onAiModeToggle: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
  /** Ghost-text typeahead completion (full string including query prefix) */
  completion?: string | null;
}

export function CommandInput({
  query, onQueryChange, aiMode, onAiModeToggle, onKeyDown, autoFocus = true, completion,
}: CommandInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Tab accepts typeahead completion
    if (e.key === 'Tab' && completion && query.trim()) {
      e.preventDefault();
      onQueryChange(completion);
      return;
    }
    onKeyDown(e);
  };

  // Build ghost text: show the remaining part after what user typed
  const ghostText = completion && query.trim().length >= 2
    ? completion.slice(query.length)
    : null;

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.03)]">
      <Search className="w-4 h-4 shrink-0 text-muted-foreground/70" strokeWidth={1.5} />

      <div className="relative flex-1 min-w-0">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search, run actions, or ask a question..."
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent border-none outline-none font-sans text-base leading-6 text-foreground placeholder:text-muted-foreground"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
        />
        {/* Ghost text overlay */}
        {ghostText && (
          <span
            className="absolute top-0 left-0 pointer-events-none font-sans text-base leading-6 whitespace-pre"
            aria-hidden="true"
          >
            <span className="invisible">{query}</span>
            <span className="text-muted-foreground/30">{ghostText}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
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
