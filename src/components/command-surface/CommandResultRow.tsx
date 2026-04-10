import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import type { RankedResult } from '@/lib/searchRanker';

interface CommandResultRowProps {
  result: RankedResult;
  isSelected: boolean;
  isTopResult?: boolean;
  onClick: () => void;
  query: string;
  onHover?: (result: RankedResult) => void;
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
  team: 'Person',
  client: 'Client',
  help: 'Help',
  action: 'Action',
  report: 'Report',
  utility: 'Utility',
  inventory: 'Inventory',
  task: 'Task',
  appointment: 'Appointment',
  insight: 'Insight',
};

export const CommandResultRow = React.forwardRef<HTMLButtonElement, CommandResultRowProps>(
  ({ result, isSelected, isTopResult, onClick, query, onHover }, ref) => {
    const actionChipLabel = result.type === 'action' ? 'Run' : result.type === 'navigation' ? 'Open' : null;

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        onMouseEnter={() => onHover?.(result)}
        onFocus={() => onHover?.(result)}
        tabIndex={-1}
        className={cn(
          'group/row w-full flex items-center gap-3 px-4 text-left transition-colors duration-150',
          isTopResult ? 'h-14 border-l-2 border-primary/40' : 'h-12',
          isSelected
            ? 'bg-accent text-accent-foreground shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.05)]'
            : 'hover:bg-muted/60'
        )}
      >
        <span className={cn(
          'shrink-0 flex items-center justify-center',
          isSelected
            ? 'w-7 h-7 rounded-md bg-muted/40 text-accent-foreground'
            : 'text-muted-foreground'
        )}>
          {result.icon}
        </span>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={cn(
            'font-sans text-sm truncate',
            isTopResult && 'text-foreground'
          )}>
            {highlightMatch(result.title, query)}
          </span>
          {result.subtitle && (
            <span className={cn(
              'font-sans text-xs text-muted-foreground truncate',
              isTopResult ? 'inline' : 'hidden sm:inline'
            )}>
              {result.subtitle}
            </span>
          )}
        </div>

        {result.metadata && (
          <span className="font-sans text-[10px] text-muted-foreground hidden lg:inline">
            {result.metadata}
          </span>
        )}

        {/* Inline action chip on hover/selected for top results */}
        {isTopResult && actionChipLabel && (
          <span className={cn(
            'font-sans text-[10px] px-2 py-0.5 rounded-full shrink-0 transition-opacity duration-150 will-change-[opacity]',
            'bg-primary/10 text-primary border border-primary/20',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'
          )}>
            {actionChipLabel}
          </span>
        )}

        <Badge
          variant="outline"
          className="font-sans text-[10px] px-1.5 py-0 h-5 shrink-0 capitalize border-border/50 bg-muted/40"
        >
          {TYPE_LABELS[result.type] ?? result.type}
        </Badge>

        <ChevronRight className={cn(
          'w-3 h-3 shrink-0 transition-opacity duration-150',
          isSelected
            ? 'text-accent-foreground/60 opacity-100'
            : 'text-muted-foreground/40 opacity-0 group-hover/row:opacity-100'
        )} />
      </button>
    );
  }
);
CommandResultRow.displayName = 'CommandResultRow';
