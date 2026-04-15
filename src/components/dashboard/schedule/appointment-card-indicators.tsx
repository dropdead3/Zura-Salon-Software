import { cn } from '@/lib/utils';
import { RotateCcw, Repeat, ArrowRightLeft, Users, Star } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface IndicatorFlags {
  isNewClient?: boolean;
  isRedo?: boolean;
  isRescheduled?: boolean;
  isRecurring?: boolean;
  isAssisting?: boolean;
  hasAssistants?: boolean;
}

interface IndicatorDef {
  key: string;
  priority: number;
  label: string;
  render: (size: 'compact' | 'medium' | 'full') => React.ReactNode;
}

function buildIndicators(flags: IndicatorFlags): IndicatorDef[] {
  const list: IndicatorDef[] = [];

  if (flags.isNewClient) {
    list.push({
      key: 'new',
      priority: 1,
      label: 'New client',
      render: (size) => size === 'compact'
        ? <Star key="new" className="h-2.5 w-2.5 text-amber-500 shrink-0" />
        : <span key="new" className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-700/30 dark:border-amber-300/30 font-medium whitespace-nowrap">NEW</span>,
    });
  }

  if (flags.isRedo) {
    list.push({
      key: 'redo',
      priority: 2,
      label: 'Redo appointment',
      render: (size) => <RotateCcw key="redo" className={cn('text-amber-500 shrink-0', size === 'compact' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />,
    });
  }

  if (flags.isRescheduled) {
    list.push({
      key: 'rescheduled',
      priority: 3,
      label: 'Rescheduled',
      render: (size) => <ArrowRightLeft key="rescheduled" className={cn('text-blue-500 dark:text-blue-400 shrink-0', size === 'compact' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />,
    });
  }

  if (flags.isRecurring) {
    list.push({
      key: 'recurring',
      priority: 4,
      label: 'Recurring appointment',
      render: (size) => <Repeat key="recurring" className={cn('opacity-60 shrink-0', size === 'compact' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />,
    });
  }

  if (flags.isAssisting) {
    list.push({
      key: 'assisting',
      priority: 5,
      label: 'You are assisting',
      render: (size) => size === 'compact'
        ? <span key="assisting" className="bg-accent/80 text-accent-foreground text-[7px] px-0.5 py-px rounded-sm font-medium shrink-0">AST</span>
        : <span key="assisting" className="bg-accent/80 text-accent-foreground border border-accent-foreground/30 text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0">AST</span>,
    });
  } else if (flags.hasAssistants) {
    list.push({
      key: 'assistants',
      priority: 6,
      label: 'Has assistant(s)',
      render: (size) => <Users key="assistants" className={cn('opacity-60 shrink-0', size === 'compact' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />,
    });
  }

  return list.sort((a, b) => a.priority - b.priority);
}

const MAX_VISIBLE: Record<'compact' | 'medium' | 'full', number> = {
  compact: 2,
  medium: 4,
  full: Infinity,
};

export function IndicatorCluster({
  flags,
  size,
  className,
}: {
  flags: IndicatorFlags;
  size: 'compact' | 'medium' | 'full';
  className?: string;
}) {
  const indicators = buildIndicators(flags);
  if (indicators.length === 0) return null;

  const max = MAX_VISIBLE[size];
  const visible = indicators.slice(0, max);
  const overflow = indicators.length - visible.length;

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {visible.map((ind) => ind.render(size))}
      {overflow > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-[9px] px-1 py-px rounded-full bg-muted text-muted-foreground font-medium shrink-0 cursor-default">
              +{overflow}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {indicators.slice(max).map(ind => ind.label).join(', ')}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
