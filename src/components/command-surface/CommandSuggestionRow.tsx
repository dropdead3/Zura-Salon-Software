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
      return <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50" />;
    case 'query_correction':
      return <Search className="w-3.5 h-3.5 text-muted-foreground/50" />;
    case 'topic':
      return <Sparkles className="w-3.5 h-3.5 text-primary/60" />;
    default:
      return <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50" />;
  }
}

export function CommandSuggestionRow({ suggestion, onClick }: CommandSuggestionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 h-9 text-left hover:bg-muted transition-colors"
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
    <div className="py-4 px-2">
      <div className="text-center mb-3">
        <Search className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
        <p className="font-sans text-sm text-muted-foreground">
          No results for "<span className="text-foreground font-medium">{query}</span>"
        </p>
      </div>
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
    </div>
  );
}
