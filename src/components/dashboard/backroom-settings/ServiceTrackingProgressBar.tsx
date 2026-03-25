/**
 * ServiceTrackingProgressBar — Vertical step checklist for service tracking setup.
 * Shows three sequential steps with individual progress bars and descriptions.
 */
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
    <div className="space-y-2">
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

      {/* Vertical step checklist */}
      <div className="space-y-4">
        {milestones.map((m, i) => {
          const pct = m.total > 0 ? Math.round((m.current / m.total) * 100) : 0;
          const done = m.current === m.total && m.total > 0;
          const inProgress = m.current > 0 && !done;
          const notStarted = m.current === 0;

          return (
            <div key={i} className="space-y-1.5">
              {/* Header row: step number + label + count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <span className={cn(
                      'flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-sans shrink-0',
                      inProgress
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground',
                    )}>
                      {i + 1}
                    </span>
                  )}
                  <span className={cn(
                    'text-sm font-sans',
                    done ? 'text-primary' : inProgress ? 'text-foreground' : 'text-muted-foreground',
                  )}>
                    {m.label}
                  </span>
                </div>
                <span className={cn(
                  'text-xs tabular-nums font-sans',
                  done ? 'text-primary' : 'text-muted-foreground',
                )}>
                  {m.current} of {m.total}
                </span>
              </div>

              {/* Progress bar — skip for completed steps */}
              {!done && (
                <Progress
                  value={pct}
                  className="h-1.5"
                  indicatorClassName={cn(
                    inProgress ? 'bg-amber-500' : 'bg-muted-foreground/20',
                  )}
                />
              )}

              {/* Description */}
              {!done && (
                <p className="text-xs text-muted-foreground pl-6">
                  {m.tooltip}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
