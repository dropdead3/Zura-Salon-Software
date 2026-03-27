/**
 * ServiceTrackingProgressBar — Setup progress with Completed / Remaining grouping.
 */
import { useRef, useEffect, useState, useMemo } from 'react';
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
  onQuickSetup?: () => void;
}

export function ServiceTrackingProgressBar({ milestones, onQuickSetup }: Props) {
  const completed = useMemo(() => milestones.filter(m => m.current >= m.total && m.total > 0), [milestones]);
  const remaining = useMemo(() => milestones.filter(m => m.current < m.total || m.total === 0), [milestones]);

  const allComplete = milestones.length > 0 && remaining.length === 0;
  const overallPct = milestones.length > 0 ? Math.round((completed.length / milestones.length) * 100) : 0;

  const prevComplete = useRef(allComplete);
  const [showCelebration, setShowCelebration] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (allComplete && !prevComplete.current) {
      setShowCelebration(true);
    }
    prevComplete.current = allComplete;
  }, [allComplete]);

  // Track remaining step numbers (sequential after completed)
  let remainingIndex = 0;

  return (
    <div className="rounded-xl border border-amber-500/30 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/[0.08] p-5 space-y-4">
      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/[0.08] p-6"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <motion.div
                initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
                animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10"
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
                    className="text-amber-500"
                  />
                </svg>
              </motion.div>
              <h3 className="font-display text-sm tracking-[0.14em] uppercase text-foreground">
                Setup Complete
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                All service tracking milestones are configured. Your color bar is ready for chemical tracking.
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

      {/* Overall progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-display text-xs tracking-[0.08em] uppercase text-foreground">
            Setup Progress
          </span>
          <span className="text-xs tabular-nums font-sans text-muted-foreground">
            {completed.length} of {milestones.length} complete
          </span>
        </div>
        <Progress
          value={overallPct}
          className="h-1.5"
          indicatorClassName="bg-amber-500"
        />
      </div>

      {/* Completed section */}
      {completed.length > 0 && (
        <div className="space-y-1.5">
          <span className="font-display text-[10px] tracking-[0.08em] uppercase text-muted-foreground/60">
            Completed
          </span>
          <div className="rounded-lg bg-amber-500/10 dark:bg-amber-500/10 divide-y divide-amber-500/20">
            {completed.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-sm font-sans text-amber-600 dark:text-amber-400">{m.label}</span>
                </div>
                <span className="text-xs tabular-nums font-sans text-amber-600 dark:text-amber-400">
                  {m.current} of {m.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remaining section */}
      {remaining.length > 0 && (
        <div className="space-y-1.5">
          <span className="font-display text-[10px] tracking-[0.08em] uppercase text-muted-foreground/60">
            Remaining
          </span>
          <div className="space-y-3">
            {remaining.map((m, i) => {
              remainingIndex++;
              const globalIdx = completed.length + remainingIndex;
              const pct = m.total > 0 ? Math.round((m.current / m.total) * 100) : 0;
              const inProgress = m.current > 0;

              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-sans shrink-0',
                        inProgress
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'bg-muted text-muted-foreground',
                      )}>
                        {globalIdx}
                      </span>
                      <span className={cn(
                        'text-sm font-sans',
                        inProgress ? 'text-foreground' : 'text-muted-foreground',
                      )}>
                        {m.label}
                      </span>
                    </div>
                    <span className="text-xs tabular-nums font-sans text-muted-foreground">
                      {m.current} of {m.total}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className="h-1.5"
                    indicatorClassName={cn(
                      inProgress ? 'bg-amber-500' : 'bg-muted-foreground/20',
                    )}
                  />
                  <p className="text-xs text-muted-foreground pl-6">
                    {m.tooltip}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
