import React from 'react';
import { Sparkles, Search } from 'lucide-react';

interface CommandEmptyStateProps {
  query: string;
  onSwitchToAI: () => void;
}

export function CommandEmptyState({ query, onSwitchToAI }: CommandEmptyStateProps) {
  return (
    <div className="py-10 px-6 text-center">
      <Search className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
      <p className="font-sans text-sm text-muted-foreground mb-1">
        No results for "<span className="text-foreground font-medium">{query}</span>"
      </p>
      <p className="font-sans text-xs text-muted-foreground mb-3">
        Try a different search, or ask AI
      </p>
      <button
        type="button"
        onClick={onSwitchToAI}
        className="inline-flex items-center gap-1.5 font-sans text-xs font-medium text-primary hover:underline"
        tabIndex={-1}
      >
        <Sparkles className="w-3 h-3" />
        Ask AI instead
      </button>
    </div>
  );
}
