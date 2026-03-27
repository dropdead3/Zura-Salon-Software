/**
 * ProcessingTimerBar — Compact timer pills for active processing bowls.
 * Shows elapsed time, target, and alert states.
 */

import { Timer, X, Play, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import type { TimerSnapshot } from '@/hooks/backroom/useProcessingTimers';

interface ProcessingTimerBarProps {
  timers: TimerSnapshot[];
  onStop: (id: string) => void;
  onRemove: (id: string) => void;
  onStart?: (id: string, label: string, targetMinutes?: number) => void;
  className?: string;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatStartTime(startedAt: number): string {
  const d = new Date(startedAt);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function ProcessingTimerBar({
  timers,
  onStop,
  onRemove,
  className,
}: ProcessingTimerBarProps) {
  if (timers.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Timer className="h-3.5 w-3.5 text-primary" />
        <span className={tokens.heading.subsection}>Processing Timers</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {timers.map((timer) => {
          const isRunning = !timer.stoppedAt;
          const borderClass = timer.isOvertime
            ? 'border-destructive/60 bg-destructive/5'
            : timer.isWarning
            ? 'border-amber-400/60 bg-amber-500/5'
            : 'border-border/60 bg-card';

          return (
            <div
              key={timer.id}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors',
                borderClass,
              )}
            >
              {/* Status dot */}
              <div className={cn(
                'h-2 w-2 rounded-full',
                timer.isOvertime
                  ? 'bg-destructive animate-pulse'
                  : timer.isWarning
                  ? 'bg-amber-500 animate-pulse'
                  : isRunning
                  ? 'bg-emerald-500'
                  : 'bg-muted-foreground',
              )} />

              {/* Label */}
              <span className="font-medium">{timer.label}</span>

              {/* Started at */}
              <span className="text-muted-foreground">{formatStartTime(timer.startedAt)}</span>

              {/* Elapsed */}
              <span className={cn(
                'font-mono tabular-nums',
                timer.isOvertime ? 'text-destructive' : timer.isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
              )}>
                {formatElapsed(timer.elapsedSeconds)}
              </span>

              {/* Target */}
              {timer.targetMinutes && (
                <span className="text-muted-foreground">
                  / {timer.targetMinutes}m
                </span>
              )}

              {/* Actions */}
              {isRunning ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full"
                  onClick={() => onStop(timer.id)}
                >
                  <Square className="h-2.5 w-2.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full"
                  onClick={() => onRemove(timer.id)}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
