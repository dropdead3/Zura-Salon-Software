/**
 * ServiceTrackingProgressBar — 4-segment progress indicator for service tracking setup.
 * Shows: Services Classified, Chemical Tracked, Components Mapped, Allowances Set.
 * Includes a completion celebration when all milestones hit 100%.
 */
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { CheckCircle2 } from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';

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

  const allComplete = milestones.length > 0 && milestones.every(m => m.current === m.total && m.total > 0);
  const prevComplete = useRef(allComplete);
  const [showCelebration, setShowCelebration] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (allComplete && !prevComplete.current) {
      setShowCelebration(true);
    }
    prevComplete.current = allComplete;
  }, [allComplete]);

  return (
    <div className="space-y-3">
      {/* Completion celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-6"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <motion.div
                initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
                animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <motion.path
                    d="M20 6L9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                    animate={reduceMotion ? undefined : { pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.28, ease: 'easeOut', delay: 0.05 }}
                    className="text-primary"
                  />
                </svg>
              </motion.div>
              <h3 className="font-display text-sm tracking-[0.14em] uppercase text-foreground">
                Setup Complete
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                All service tracking milestones are configured. Your backroom is ready for chemical tracking.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 font-sans"
                onClick={() => setShowCelebration(false)}
              >
                Dismiss
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overall bar */}
      <div className="flex items-center gap-3">
        <span className={cn(tokens.label.tiny, 'shrink-0')}>Setup Progress</span>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
          {milestones.map((m, i) => {
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
