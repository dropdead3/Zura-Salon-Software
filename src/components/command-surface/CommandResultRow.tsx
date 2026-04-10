import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { ZuraZIcon } from '@/components/icons/ZuraZIcon';
import type { RankedResult, QuickAction } from '@/lib/searchRanker';
import { useNavigate } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

interface CommandResultRowProps {
  result: RankedResult;
  isSelected: boolean;
  isTopResult?: boolean;
  /** Whether this is the #1 dominant result in the "Top Result" group */
  isDominant?: boolean;
  onClick: () => void;
  query: string;
  onHover?: (result: RankedResult) => void;
  onClose?: () => void;
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

/** Get the action verb for a result type */
function getActionVerb(type: string): string {
  switch (type) {
    case 'action': return 'Run';
    case 'navigation': return 'Open';
    case 'team':
    case 'client':
    case 'inventory':
    case 'appointment':
    case 'task': return 'View';
    case 'help': return 'Learn';
    default: return 'Open';
  }
}

/** Get the action chip config for a result type */
function getActionChip(type: string): { label: string; className: string } | null {
  switch (type) {
    case 'action':
      return { label: 'Run', className: 'bg-primary/10 text-primary border-primary/20' };
    case 'navigation':
      return { label: 'Open', className: 'bg-muted/60 text-muted-foreground border-border/40' };
    case 'team':
    case 'client':
    case 'inventory':
    case 'appointment':
    case 'task':
      return { label: 'View', className: 'bg-accent/40 text-accent-foreground/70 border-border/40' };
    case 'help':
      return { label: 'Learn', className: 'bg-primary/5 text-primary/70 border-primary/15' };
    default:
      return null;
  }
}

export const CommandResultRow = React.forwardRef<HTMLButtonElement, CommandResultRowProps>(
  ({ result, isSelected, isTopResult, isDominant, onClick, query, onHover, onClose }, ref) => {
    const chip = getActionChip(result.type);
    const isAction = result.type === 'action';
    const isEntity = ['team', 'client', 'inventory', 'appointment', 'task'].includes(result.type);
    const isHelp = result.type === 'help';
    const navigate = useNavigate();
    const { dashPath } = useOrgDashboardPath();

    const handleQuickAction = (e: React.MouseEvent, qa: QuickAction) => {
      e.stopPropagation();
      const resolvedPath = qa.path.startsWith('/dashboard')
        ? dashPath(qa.path.slice('/dashboard'.length))
        : qa.path;
      navigate(resolvedPath);
      onClose?.();
    };

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
          // Height hierarchy: dominant > top result > regular
          isDominant ? 'h-16' : isTopResult ? 'h-14' : 'h-12',
          // Left border for actions and top results
          (isAction || isTopResult) && 'border-l-2 border-primary/40',
          // Dominant result background
          isDominant && 'bg-accent/30',
          // Entity background tint
          isEntity && !isSelected && !isDominant && 'bg-muted/20',
          // Selected state
          isSelected
            ? 'bg-accent text-accent-foreground shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.05)]'
            : 'hover:bg-muted/60'
        )}
      >
        {/* Icon with type-specific tinting */}
        <span className={cn(
          'shrink-0 flex items-center justify-center',
          isSelected
            ? 'w-7 h-7 rounded-md bg-muted/40 text-accent-foreground'
            : isAction
              ? 'text-primary/70'
              : isHelp
                ? 'text-primary/50'
                : 'text-muted-foreground'
        )}>
          {isHelp ? <ZuraZIcon className="w-4 h-4" /> : result.icon}
        </span>

        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-sans text-sm truncate',
              (isTopResult || isDominant) && 'text-foreground'
            )}>
              {highlightMatch(result.title, query)}
            </span>
            {result.subtitle && (
              <span className={cn(
                'font-sans text-xs text-muted-foreground truncate',
                isTopResult ? 'inline' : 'hidden sm:inline',
                isHelp && 'italic'
              )}>
                {result.subtitle}
              </span>
            )}
          </div>

          {/* Quick actions for dominant results */}
          {isDominant && result.quickActions && result.quickActions.length > 0 && (
            <div className="flex items-center gap-2">
              {result.quickActions.map((qa) => (
                <span
                  key={qa.path}
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => handleQuickAction(e, qa)}
                  className="font-sans text-[10px] text-primary/60 hover:text-primary cursor-pointer transition-colors"
                >
                  {qa.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {result.metadata && (
          <span className="font-sans text-[10px] text-muted-foreground hidden lg:inline">
            {result.metadata}
          </span>
        )}

        {/* Type hint — subtle text, visible on hover only */}
        <span className={cn(
          'font-sans text-[10px] text-muted-foreground/40 shrink-0 capitalize transition-opacity duration-150',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'
        )}>
          {result.type === 'navigation' ? 'page' : result.type === 'team' ? 'person' : result.type}
        </span>

        {/* Dominant result: prominent action button */}
        {isDominant ? (
          <span className="font-sans text-xs font-medium px-3 py-1 rounded-full bg-primary text-primary-foreground shrink-0">
            {getActionVerb(result.type)} {result.title}
          </span>
        ) : (
          /* Inline action chip for non-dominant rows */
          chip && (
            <span className={cn(
              'font-sans text-[10px] px-2 py-0.5 rounded-full shrink-0 transition-opacity duration-150 will-change-[opacity] border',
              chip.className,
              isAction || isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'
            )}>
              {chip.label}
            </span>
          )
        )}

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
