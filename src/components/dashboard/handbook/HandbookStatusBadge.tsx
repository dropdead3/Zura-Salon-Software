import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const MAP: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' },
  reviewed: { label: 'In Review', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  approved: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  published: { label: 'Published', className: 'bg-primary/10 text-primary border-primary/30' },
  archived: { label: 'Archived', className: 'bg-muted/50 text-muted-foreground border-border' },
};

export function HandbookStatusBadge({ status }: { status?: string | null }) {
  const cfg = MAP[status || 'draft'] || MAP.draft;
  return (
    <Badge variant="outline" className={cn('font-sans text-xs uppercase tracking-wider', cfg.className)}>
      {cfg.label}
    </Badge>
  );
}
