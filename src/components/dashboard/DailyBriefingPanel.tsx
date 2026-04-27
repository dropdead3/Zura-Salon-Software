import { useMemo } from 'react';
import {
  Zap, CheckCircle2, AlertTriangle, TrendingUp,
  Rocket, ShieldAlert, ArrowRight, Sparkles, Timer, Target,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  useDailyBriefingEngine,
  type BriefingRoleContext,
} from '@/hooks/useDailyBriefingEngine';
import { useTasks, type Task } from '@/hooks/useTasks';
import { MissedOpportunityBanner } from '@/components/dashboard/MissedOpportunityBanner';
import { toast } from 'sonner';

interface DailyBriefingPanelProps {
  tasks: Task[];
  roleContext?: BriefingRoleContext;
  /** Compact mode for Command Center embedding */
  compact?: boolean;
}

export function DailyBriefingPanel({
  tasks,
  roleContext = 'owner',
  compact = false,
}: DailyBriefingPanelProps) {
  const { formatCurrency } = useFormatCurrency();
  const { toggleTask } = useTasks();
  const briefing = useDailyBriefingEngine(tasks, roleContext);

  const {
    focus, automatedActions, shouldDoTasks, blockers,
    opportunityRemainingCents, capturedCents, activeGrowthMoves,
    atRiskCents, coachNudges, isLoading, hasContent,
  } = briefing;

  const handleCoachNudgeClick = (sectionId?: string) => {
    if (!sectionId) return;
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Completion handler with micro-interaction
  const handleComplete = (task: Task) => {
    toggleTask.mutate(
      { id: task.id, is_completed: true },
      {
        onSuccess: () => {
          if (task.estimated_revenue_impact_cents && task.estimated_revenue_impact_cents > 0) {
            toast.success(
              `+${formatCurrency(task.estimated_revenue_impact_cents / 100)} monthly impact unlocked`,
              { icon: '🚀' },
            );
          }
        },
      },
    );
  };

  // Empty / on-track state
  if (!isLoading && !hasContent) {
    return (
      <Card className="relative overflow-hidden p-6 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Sparkles className={tokens.card.icon} />
          </div>
          <div>
            <h2 className={tokens.card.title}>Daily Briefing</h2>
            <p className="text-xs text-muted-foreground font-sans">
              You're on track today — no critical actions needed.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (isLoading) return null;

  const capturedPercent = opportunityRemainingCents > 0
    ? Math.min(100, Math.round((capturedCents / (capturedCents + opportunityRemainingCents)) * 100))
    : 0;

  return (
    <Card className="relative overflow-hidden rounded-xl backdrop-blur-sm">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className={cn('p-6', compact && 'p-4')}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className={tokens.card.iconBox}>
            <Zap className={tokens.card.icon} />
          </div>
          <div>
            <h2 className={tokens.card.title}>Daily Briefing</h2>
            <p className="text-xs text-muted-foreground font-sans">
              What matters today
            </p>
          </div>
        </div>

        <div className={cn('space-y-5', compact && 'space-y-4')}>
          {/* ── A. TODAY'S FOCUS ───────────────────────────────────────── */}
          {focus && (
            <section>
              <p className={tokens.label.tiny}>TODAY'S FOCUS</p>
              <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-sans font-medium truncate">{focus.title}</p>
                    {focus.locationLabel && (
                      <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                        {focus.locationLabel}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground font-sans mt-1 line-clamp-2">
                      {focus.contextLine}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-sans font-medium text-emerald-600 dark:text-emerald-400">
                      <BlurredAmount>
                        +{formatCurrency(focus.revenueLiftCents / 100)}
                      </BlurredAmount>
                    </p>
                    <p className="text-[10px] text-muted-foreground font-sans">opportunity</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── B. ZURA ALREADY DID ───────────────────────────────────── */}
          {automatedActions.length > 0 && (
            <section>
              <p className={tokens.label.tiny}>ZURA ALREADY DID</p>
              <div className="mt-2 space-y-1.5">
                {automatedActions.slice(0, 5).map((action, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <p className="text-xs font-sans text-muted-foreground">
                      {action.label}
                      {action.count > 1 && (
                        <span className="text-foreground font-medium ml-1">×{action.count}</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── B2. COACH NUDGES (deterministic, non-monetary) ─────────── */}
          {coachNudges.length > 0 && (
            <section>
              <p className={tokens.label.tiny}>COACH</p>
              <div className="mt-2 space-y-1.5">
                {coachNudges.map((nudge) => (
                  <button
                    key={nudge.id}
                    type="button"
                    onClick={() => handleCoachNudgeClick(nudge.scrollToSectionId)}
                    className="w-full flex items-center gap-2 text-left rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors group"
                  >
                    <Target className="w-3.5 h-3.5 text-primary shrink-0" />
                    <p className="text-xs font-sans flex-1">{nudge.label}</p>
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── C. YOU SHOULD DO ───────────────────────────────────────── */}
          {shouldDoTasks.length > 0 && (
            <section>
              <p className={tokens.label.tiny}>YOU SHOULD DO</p>
              <div className="mt-2 space-y-2">
                {shouldDoTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2.5 group"
                  >
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => handleComplete(task)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-sans truncate">{task.title}</p>
                        {task.task_type && (
                          <span className={cn(
                            "shrink-0 text-[10px] font-sans px-1 py-0.5 rounded capitalize",
                            task.task_type === 'growth' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                            task.task_type === 'protection' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                            task.task_type === 'acceleration' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' :
                            'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                          )}>
                            {task.task_type}
                          </span>
                        )}
                        {task.estimated_revenue_impact_cents != null && task.estimated_revenue_impact_cents > 0 && (
                          <span className="shrink-0 text-[10px] font-sans text-emerald-600 dark:text-emerald-400">
                            <BlurredAmount>
                              ~{formatCurrency(task.estimated_revenue_impact_cents / 100)}
                            </BlurredAmount>/mo
                          </span>
                        )}
                        {task.execution_time_minutes != null && (
                          <span className="shrink-0 text-[10px] font-sans text-muted-foreground flex items-center gap-0.5">
                            <Timer className="w-2.5 h-2.5" />
                            {task.execution_time_minutes}m
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-[10px] text-muted-foreground font-sans mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                    {/* Priority score dot */}
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                      task.priority_score != null
                        ? (task.priority_score >= 80 ? 'bg-destructive'
                          : task.priority_score >= 60 ? 'bg-orange-500'
                          : task.priority_score >= 40 ? 'bg-blue-500'
                          : 'bg-muted-foreground')
                        : (task.priority === 'high' ? 'bg-orange-500'
                          : task.priority === 'normal' ? 'bg-blue-500'
                          : 'bg-muted-foreground'),
                    )} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── D. BLOCKERS ───────────────────────────────────────────── */}
          {blockers.length > 0 && (
            <section>
              <p className={cn(tokens.label.tiny, 'text-amber-600 dark:text-amber-400')}>
                BLOCKED BY
              </p>
              <div className="mt-2 space-y-1.5">
                {blockers.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <p className="text-xs font-sans">{b.label}</p>
                    {b.revenueLostCents != null && b.revenueLostCents > 0 && (
                      <span className="text-[10px] font-sans text-amber-600 dark:text-amber-400 shrink-0">
                        <BlurredAmount>
                          -{formatCurrency(b.revenueLostCents / 100)}
                        </BlurredAmount>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Missed Actions Warning ────────────────────────────────── */}
          {atRiskCents > 0 && blockers.length === 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs font-sans text-amber-700 dark:text-amber-300">
                <BlurredAmount>{formatCurrency(atRiskCents / 100)}</BlurredAmount> opportunity at risk from overdue tasks
              </p>
            </div>
          )}

          {/* ── Missed Revenue Banner ─────────────────────────────────── */}
          <MissedOpportunityBanner tasks={tasks} />

          {/* Bottom row: Opportunity Remaining + Active Growth Moves */}
          {(opportunityRemainingCents > 0 || activeGrowthMoves.length > 0) && (
            <div className={cn(
              'grid gap-4',
              activeGrowthMoves.length > 0 && opportunityRemainingCents > 0
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1',
            )}>
              {/* ── E. OPPORTUNITY REMAINING ─────────────────────────── */}
              {opportunityRemainingCents > 0 && (
                <section>
                  <p className={tokens.label.tiny}>OPPORTUNITY REMAINING</p>
                  <div className="mt-2">
                    <p className="text-sm font-sans font-medium">
                      <BlurredAmount>
                        +{formatCurrency(opportunityRemainingCents / 100)}
                      </BlurredAmount>
                      <span className="text-muted-foreground font-normal ml-1">this month</span>
                    </p>
                    {capturedCents > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground font-sans">
                            <BlurredAmount>{formatCurrency(capturedCents / 100)}</BlurredAmount> captured
                          </span>
                          <span className="text-[10px] text-muted-foreground font-sans">
                            {capturedPercent}%
                          </span>
                        </div>
                        <Progress
                          value={capturedPercent}
                          className="h-1.5"
                          indicatorClassName="bg-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* ── F. ACTIVE GROWTH MOVES ───────────────────────────── */}
              {activeGrowthMoves.length > 0 && (
                <section>
                  <p className={tokens.label.tiny}>ACTIVE GROWTH MOVES</p>
                  <div className="mt-2 space-y-1.5">
                    {activeGrowthMoves.map((move, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Rocket className="w-3.5 h-3.5 text-primary shrink-0" />
                        <p className="text-xs font-sans truncate">{move.title}</p>
                        <span className={cn(
                          'shrink-0 text-[10px] font-sans px-1.5 py-0.5 rounded-full',
                          move.status === 'active' || move.status === 'on_track'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : move.status === 'at_risk'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-muted text-muted-foreground',
                        )}>
                          {move.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
