import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import type { RankedResult } from '@/lib/searchRanker';

interface CommandResultRowProps {
  result: RankedResult;
  isSelected: boolean;
  onClick: () => void;
  query: string;
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      <span className="text-muted-foreground">{text.slice(0, idx)}</span>
      <span className="text-foreground font-medium">{text.slice(idx, idx + query.length)}</span>
      <span className="text-muted-foreground">{text.slice(idx + query.length)}</span>
    </>
  );
}

const TYPE_LABELS: Record<string, string> = {
  navigation: 'Page',
  team: 'Team',
  client: 'Client',
  help: 'Help',
  action: 'Action',
  report: 'Report',
  utility: 'Utility',
};

export const CommandResultRow = React.forwardRef<HTMLButtonElement, CommandResultRowProps>(
  ({ result, isSelected, onClick, query }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        tabIndex={-1}
        className={cn(
          'w-full flex items-center gap-3 px-4 h-11 text-left transition-colors',
          isSelected
            ? 'bg-accent text-accent-foreground'
            : 'hover:bg-muted'
        )}
      >
        <span className={cn(
          'shrink-0',
          isSelected ? 'text-accent-foreground' : 'text-muted-foreground'
        )}>
          {result.icon}
        </span>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-sans text-sm truncate">
            {highlightMatch(result.title, query)}
          </span>
          {result.subtitle && (
            <span className="font-sans text-xs text-muted-foreground truncate hidden sm:inline">
              {result.subtitle}
            </span>
          )}
        </div>

        {result.metadata && (
          <span className="font-sans text-[10px] text-muted-foreground hidden lg:inline">
            {result.metadata}
          </span>
        )}

        <Badge
          variant="outline"
          className="font-sans text-[10px] px-1.5 py-0 h-5 shrink-0 capitalize border-border/50"
        >
          {TYPE_LABELS[result.type] ?? result.type}
        </Badge>

        <ChevronRight className={cn(
          'w-3 h-3 shrink-0',
          isSelected ? 'text-accent-foreground/60' : 'text-muted-foreground/40'
        )} />
      </button>
    );
  }
);
CommandResultRow.displayName = 'CommandResultRow';
