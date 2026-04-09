import { CheckSquare, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RankedResult } from '@/lib/searchRanker';

const PRIORITY_STYLES: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-muted-foreground',
};

interface TaskPreviewProps {
  result: RankedResult;
}

export function TaskPreview({ result }: TaskPreviewProps) {
  const priority = result.metadata || 'medium';
  const isCompleted = result.subtitle?.toLowerCase().includes('completed');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          isCompleted ? 'bg-emerald-500/10' : 'bg-muted/40',
        )}>
          <CheckSquare className={cn('w-4 h-4', isCompleted ? 'text-emerald-500' : 'text-primary/60')} />
        </div>
        <div>
          <h3 className="font-display text-sm tracking-wide text-foreground">{result.title}</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/30 rounded-lg px-3 py-2.5 space-y-1">
          <span className="font-sans text-[10px] text-muted-foreground/70 uppercase tracking-wider">Priority</span>
          <div className={cn('font-sans text-sm capitalize', PRIORITY_STYLES[priority] || 'text-foreground')}>
            {priority}
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg px-3 py-2.5 space-y-1">
          <span className="font-sans text-[10px] text-muted-foreground/70 uppercase tracking-wider">Status</span>
          <div className="font-sans text-sm text-foreground">
            {result.subtitle || 'Open'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs font-sans text-primary/80 pt-1">
        <span>View Tasks</span>
        <ArrowRight className="w-3 h-3" />
      </div>
    </div>
  );
}
