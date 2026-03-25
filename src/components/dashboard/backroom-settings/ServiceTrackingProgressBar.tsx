/**
 * ServiceTrackingProgressBar — 4-segment progress indicator for service tracking setup.
 * Shows: Services Classified, Chemical Tracked, Components Mapped, Allowances Set.
 */
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { CheckCircle2 } from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

export interface ProgressMilestone {
  label: string;
  current: number;
  total: number;
  tooltip: string;
}

interface Props {
  milestones: ProgressMilestone[];
}

export function ServiceTrackingProgressBar({ milestones }: Props) {
  const overallCurrent = milestones.reduce((s, m) => s + m.current, 0);
  const overallTotal = milestones.reduce((s, m) => s + m.total, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallCurrent / overallTotal) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Overall bar */}
      <div className="flex items-center gap-3">
        <span className={cn(tokens.label.tiny, 'shrink-0')}>Setup Progress</span>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
          {milestones.map((m, i) => {
            const segPct = m.total > 0 ? (m.current / m.total) * (m.total / overallTotal) * 100 : 0;
            return (
              <div
                key={i}
                className={cn(
                  'h-full transition-all duration-500',
                  m.current === m.total && m.total > 0
                    ? 'bg-primary'
                    : m.current > 0
                      ? 'bg-primary/60'
                      : 'bg-muted-foreground/20',
                )}
                style={{ width: `${(m.total / overallTotal) * 100}%` }}
              >
                <div
                  className={cn(
                    'h-full rounded-full',
                    m.current === m.total && m.total > 0
                      ? 'bg-primary'
                      : 'bg-primary/60',
                  )}
                  style={{ width: m.total > 0 ? `${(m.current / m.total) * 100}%` : '0%' }}
                />
              </div>
            );
          })}
        </div>
        <span className={cn(tokens.body.emphasis, 'shrink-0 tabular-nums text-xs')}>
          {overallPct}%
        </span>
      </div>

      {/* Milestone chips */}
      <div className="flex flex-wrap gap-2">
        {milestones.map((m, i) => {
          const done = m.current === m.total && m.total > 0;
          const partial = m.current > 0 && !done;
          return (
            <div
              key={i}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-sans border transition-colors',
                done
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : partial
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-muted border-border text-muted-foreground',
              )}
            >
              {done && <CheckCircle2 className="w-3 h-3" />}
              <span>{m.label}</span>
              <span className="tabular-nums">
                {m.current}/{m.total}
              </span>
              <MetricInfoTooltip description={m.tooltip} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
