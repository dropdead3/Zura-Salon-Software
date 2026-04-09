import React from 'react';
import { Clock, ArrowRight, Sparkles, Search } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';

interface CommandRecentSectionProps {
  recentSearches: string[];
  recentPages: Array<{ label: string; path: string }>;
  onSearchSelect: (query: string) => void;
  onPageSelect: (path: string) => void;
  onClearRecents: () => void;
}

export function CommandRecentSection({
  recentSearches, recentPages, onSearchSelect, onPageSelect, onClearRecents,
}: CommandRecentSectionProps) {
  const hasRecents = recentSearches.length > 0;
  const hasPages = recentPages.length > 0;

  if (!hasRecents && !hasPages) {
    return (
      <div className="py-10 px-6 text-center">
        <Search className="w-6 h-6 mx-auto mb-3 text-muted-foreground/15" />
        <p className="font-sans text-sm text-muted-foreground">
          Search or ask Zura...
        </p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {hasRecents && (
        <div>
          <div className="px-4 pt-2 pb-1 flex items-center justify-between">
            <span className={tokens.heading.subsection}>Recent Searches</span>
            <button
              type="button"
              onClick={onClearRecents}
              className="font-sans text-[10px] text-muted-foreground hover:text-foreground transition-colors duration-150"
              tabIndex={-1}
            >
              Clear
            </button>
          </div>
          {recentSearches.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => onSearchSelect(q)}
              className="group/recent w-full flex items-center gap-3 px-4 h-10 text-left hover:bg-muted transition-colors duration-150"
              tabIndex={-1}
            >
              <Clock className="w-4 h-4 text-muted-foreground/40 group-hover/recent:text-muted-foreground transition-colors duration-150" />
              <span className="font-sans text-sm text-muted-foreground">{q}</span>
            </button>
          ))}
        </div>
      )}

      {hasPages && (
        <div>
          {hasRecents && <div className="mx-4 border-t border-border/30 my-1" />}
          <div className="px-4 pt-2 pb-1">
            <span className={tokens.heading.subsection}>Recently Viewed</span>
          </div>
          {recentPages.map(page => (
            <button
              key={page.path}
              type="button"
              onClick={() => onPageSelect(page.path)}
              className="group/recent w-full flex items-center gap-3 px-4 h-10 text-left hover:bg-muted transition-colors duration-150"
              tabIndex={-1}
            >
              <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover/recent:text-muted-foreground transition-colors duration-150" />
              <span className="font-sans text-sm text-muted-foreground">{page.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
