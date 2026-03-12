import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import type { PrioritySummary } from '@/lib/backroom/control-tower-engine';

interface ControlTowerSummaryBarProps {
  summary: PrioritySummary;
  className?: string;
}

const PRIORITY_CONFIG = [
  { key: 'critical' as const, label: 'Critical', color: 'bg-destructive/15 text-destructive border-destructive/30' },
  { key: 'high' as const, label: 'High', color: 'bg-warning/15 text-warning border-warning/30' },
  { key: 'medium' as const, label: 'Medium', color: 'bg-accent/60 text-accent-foreground border-border/50' },
  { key: 'informational' as const, label: 'Info', color: 'bg-muted/60 text-muted-foreground border-border/50' },
] as const;

export function ControlTowerSummaryBar({ summary, className }: ControlTowerSummaryBarProps) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {PRIORITY_CONFIG.map(({ key, label, color }) => {
        const count = summary[key];
        return (
          <div
            key={key}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
              color,
              key === 'critical' && count > 0 && 'animate-pulse'
            )}
          >
            <span className={tokens.label.tiny}>{label}</span>
            <span className="font-display text-sm font-medium">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
