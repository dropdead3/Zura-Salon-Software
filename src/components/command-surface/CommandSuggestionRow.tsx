import React from 'react';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import type { SuggestionFallback } from '@/lib/searchRanker';

interface CommandSuggestionRowProps {
  suggestion: SuggestionFallback;
  onClick: () => void;
}

function SuggestionIcon({ type }: { type: SuggestionFallback['type'] }) {
  switch (type) {
    case 'navigation':
      return <ArrowRight className="w-4 h-4 text-muted-foreground/50" />;
    case 'query_correction':
      return <Search className="w-4 h-4 text-muted-foreground/50" />;
    case 'topic':
      return <Sparkles className="w-4 h-4 text-primary/60" />;
    default:
      return <ArrowRight className="w-4 h-4 text-muted-foreground/50" />;
  }
}

export function CommandSuggestionRow({ suggestion, onClick }: CommandSuggestionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 h-10 text-left hover:bg-muted transition-colors duration-150"
      tabIndex={-1}
    >
      <SuggestionIcon type={suggestion.type} />
      <span className="font-sans text-sm text-muted-foreground">{suggestion.label}</span>
    </button>
  );
}

interface CommandSuggestionPanelProps {
  query: string;
  suggestions: SuggestionFallback[];
  onNavigate: (path: string) => void;
  onQueryChange: (query: string) => void;
  onSwitchToAI: () => void;
}

export function CommandSuggestionPanel({
  query,
  suggestions,
  onNavigate,
  onQueryChange,
  onSwitchToAI,
}: CommandSuggestionPanelProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="py-3 px-2">
      <p className="font-sans text-xs text-muted-foreground px-2 mb-2">
        No direct match. Try these instead:
      </p>
      <div className="py-1">
        {suggestions.map((suggestion) => (
          <CommandSuggestionRow
            key={suggestion.label}
            suggestion={suggestion}
            onClick={() => {
              if (suggestion.type === 'topic') {
                onSwitchToAI();
              } else if (suggestion.path) {
                onNavigate(suggestion.path);
              } else if (suggestion.query) {
                onQueryChange(suggestion.query);
              }
            }}
          />
        ))}
      </div>

      {/* AI continuation row at bottom */}
      <button
        type="button"
        onClick={onSwitchToAI}
        className="w-full flex items-center gap-3 px-4 h-10 text-left hover:bg-primary/5 transition-colors duration-150 mt-1 border-t border-border/20 pt-2"
      >
        <Sparkles className="w-4 h-4 text-primary/60" />
        <span className="font-sans text-sm text-muted-foreground">
          Ask Zura about "<span className="text-foreground font-medium">{query}</span>"
        </span>
      </button>
    </div>
  );
}
