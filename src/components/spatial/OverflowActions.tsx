import { type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSpatialState } from '@/lib/responsive/useSpatialState';
import { cn } from '@/lib/utils';

export interface ActionItem {
  key: string;
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  /** P0 = always inline; P1 = inline until compact; P2 = into overflow at compressed; P3 = always in overflow. */
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
}

interface OverflowActionsProps {
  actions: ActionItem[];
  className?: string;
}

/**
 * OverflowActions — collapses tertiary first, then secondary, into a kebab.
 * Primary always inline.
 *
 * Doctrine: mem://style/container-aware-responsiveness.md §7
 */
export function OverflowActions({ actions, className }: OverflowActionsProps) {
  const { ref, state } = useSpatialState<HTMLDivElement>('compact');

  const inline: ActionItem[] = [];
  const overflow: ActionItem[] = [];

  for (const a of actions) {
    const p = a.priority ?? 'P1';
    if (p === 'P0') inline.push(a);
    else if (p === 'P3') overflow.push(a);
    else if (p === 'P2') {
      if (state === 'default') inline.push(a);
      else overflow.push(a);
    } else {
      // P1
      if (state === 'compact' || state === 'stacked') overflow.push(a);
      else inline.push(a);
    }
  }

  return (
    <div ref={ref} data-spatial-state={state} className={cn('flex items-center gap-2', className)}>
      {inline.map((a) => (
        <Button key={a.key} size="sm" variant="ghost" onClick={a.onClick}>
          {a.icon}
          <span className={cn(state === 'compact' && a.icon ? 'sr-only' : 'ml-1.5')}>
            {a.label}
          </span>
        </Button>
      ))}
      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflow.map((a) => (
              <DropdownMenuItem key={a.key} onClick={a.onClick}>
                {a.icon}
                <span className={cn(a.icon && 'ml-2')}>{a.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
