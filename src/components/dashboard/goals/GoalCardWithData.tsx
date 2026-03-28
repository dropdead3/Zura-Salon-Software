import { useEffect, useRef, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, TrendingUp, TrendingDown, Trophy, Loader2 } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useGoalCurrentValue } from '@/hooks/useGoalCurrentValue';
import confetti from 'canvas-confetti';
import type { OrganizationGoal } from '@/hooks/useOrganizationGoals';

interface GoalCardWithDataProps {
  goal: OrganizationGoal;
  onEdit: (goal: OrganizationGoal) => void;
  onDelete: (goal: OrganizationGoal) => void;
}

const INVERSED_METRICS = ['labor_cost_pct', 'product_cost_pct', 'noshow_rate'];

function getGoalStatus(goal: OrganizationGoal, currentValue: number | null) {
  if (currentValue === null || currentValue === undefined) return 'no-data';
  const isInversed = INVERSED_METRICS.includes(goal.metric_key);

  if (isInversed) {
    if (goal.critical_threshold !== null && currentValue >= goal.critical_threshold) return 'critical';
    if (goal.warning_threshold !== null && currentValue >= goal.warning_threshold) return 'warning';
    if (currentValue <= goal.target_value) return 'on-track';
    return 'warning';
  } else {
    if (goal.critical_threshold !== null && currentValue <= goal.critical_threshold) return 'critical';
    if (goal.warning_threshold !== null && currentValue <= goal.warning_threshold) return 'warning';
    if (currentValue >= goal.target_value) return 'on-track';
    return 'behind';
  }
}

function isGoalAchieved(goal: OrganizationGoal, currentValue: number | null): boolean {
  if (currentValue === null) return false;
  const isInversed = INVERSED_METRICS.includes(goal.metric_key);
  return isInversed ? currentValue <= goal.target_value : currentValue >= goal.target_value;
}

const STATUS_COLORS: Record<string, string> = {
  'on-track': 'bg-emerald-500',
  'warning': 'bg-amber-500',
  'behind': 'bg-amber-500',
  'critical': 'bg-destructive',
  'no-data': 'bg-muted-foreground/30',
};

const STATUS_LABELS: Record<string, string> = {
  'on-track': 'On Track',
  'warning': 'Warning',
  'behind': 'Behind',
  'critical': 'Critical',
  'no-data': 'No Data',
};

function formatGoalValue(value: number, unit: string): string {
  if (unit === '$') {
    if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
    return `$${value.toFixed(0)}`;
  }
  if (unit === '%') return `${value.toFixed(1)}%`;
  return value.toFixed(0);
}

export function GoalCardWithData({ goal, onEdit, onDelete }: GoalCardWithDataProps) {
  const { currentValue, projectedValue, isLoading } = useGoalCurrentValue(
    goal.metric_key,
    goal.goal_period,
    goal.location_id,
  );

  const status = getGoalStatus(goal, currentValue);
  const achieved = isGoalAchieved(goal, currentValue);
  const isInversed = INVERSED_METRICS.includes(goal.metric_key);
  const hasCelebrated = useRef(false);

  // Celebration confetti
  const triggerCelebration = useCallback(() => {
    if (hasCelebrated.current) return;
    hasCelebrated.current = true;
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10b981', '#f59e0b', '#6366f1'],
    });
  }, []);

  useEffect(() => {
    if (achieved && !hasCelebrated.current) {
      triggerCelebration();
    }
  }, [achieved, triggerCelebration]);

  // Calculate progress percentage
  let percentage = 0;
  if (currentValue !== null && goal.target_value > 0) {
    if (isInversed) {
      const critVal = goal.critical_threshold ?? goal.target_value * 2;
      percentage = Math.max(0, Math.min(100, ((critVal - currentValue) / (critVal - goal.target_value)) * 100));
    } else {
      percentage = Math.min(100, (currentValue / goal.target_value) * 100);
    }
  }

  // Pace indicator
  const showPace = projectedValue !== null && currentValue !== null;
  const paceAhead = projectedValue !== null ? projectedValue >= goal.target_value : false;

  return (
    <Card className={cn(
      tokens.card.wrapper,
      'group relative transition-all duration-300',
      achieved && 'ring-1 ring-emerald-500/30 bg-emerald-500/[0.03]',
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={cn(tokens.kpi.label, 'mb-0')}>{goal.display_name}</p>
              {achieved && (
                <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
            </div>
            {goal.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{goal.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(goal)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Value + Target */}
        <div className="flex items-end justify-between mb-2">
          <div>
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : currentValue !== null ? (
              <span className={tokens.kpi.value}>
                {goal.unit === '$' ? (
                  <BlurredAmount>{formatGoalValue(currentValue, goal.unit)}</BlurredAmount>
                ) : (
                  formatGoalValue(currentValue, goal.unit)
                )}
              </span>
            ) : (
              <span className={cn(tokens.kpi.value, 'text-muted-foreground')}>—</span>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Target: </span>
            <span className="text-xs font-medium">
              {goal.unit === '$' ? (
                <BlurredAmount>{formatGoalValue(goal.target_value, goal.unit)}</BlurredAmount>
              ) : (
                formatGoalValue(goal.target_value, goal.unit)
              )}
            </span>
          </div>
        </div>

        {/* Progress bar + status */}
        <div className="flex items-center gap-2">
          <Progress
            value={percentage}
            className="h-2 flex-1"
            indicatorClassName={achieved ? 'bg-emerald-500' : STATUS_COLORS[status]}
          />
          <span className={cn(
            'text-[10px] font-sans font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap',
            achieved && 'bg-emerald-500/10 text-emerald-600',
            !achieved && status === 'on-track' && 'bg-emerald-500/10 text-emerald-600',
            !achieved && status === 'warning' && 'bg-amber-500/10 text-amber-600',
            !achieved && status === 'behind' && 'bg-amber-500/10 text-amber-600',
            !achieved && status === 'critical' && 'bg-destructive/10 text-destructive',
            !achieved && status === 'no-data' && 'bg-muted text-muted-foreground',
          )}>
            {achieved ? '🎯 Goal Hit' : STATUS_LABELS[status]}
          </span>
        </div>

        {/* Pace projection */}
        {showPace && !achieved && (
          <div className="flex items-center gap-1.5 mt-2">
            {paceAhead ? (
              <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
            ) : (
              <TrendingDown className="w-3 h-3 text-amber-500 shrink-0" />
            )}
            <span className="text-[11px] text-muted-foreground">
              Projected:{' '}
              {goal.unit === '$' ? (
                <BlurredAmount>{formatGoalValue(projectedValue!, goal.unit)}</BlurredAmount>
              ) : (
                formatGoalValue(projectedValue!, goal.unit)
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
