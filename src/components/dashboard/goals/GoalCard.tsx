import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import type { OrganizationGoal } from '@/hooks/useOrganizationGoals';

interface GoalCardProps {
  goal: OrganizationGoal;
  currentValue?: number | null;
  onEdit: (goal: OrganizationGoal) => void;
  onDelete: (goal: OrganizationGoal) => void;
}

function getGoalStatus(goal: OrganizationGoal, currentValue: number | null) {
  if (currentValue === null || currentValue === undefined) return 'no-data';
  
  const isInversed = ['labor_cost_pct', 'product_cost_pct', 'noshow_rate'].includes(goal.metric_key);
  
  if (isInversed) {
    // Lower is better: critical > warning > target
    if (goal.critical_threshold !== null && currentValue >= goal.critical_threshold) return 'critical';
    if (goal.warning_threshold !== null && currentValue >= goal.warning_threshold) return 'warning';
    if (currentValue <= goal.target_value) return 'on-track';
    return 'warning';
  } else {
    // Higher is better: target > warning > critical
    if (goal.critical_threshold !== null && currentValue <= goal.critical_threshold) return 'critical';
    if (goal.warning_threshold !== null && currentValue <= goal.warning_threshold) return 'warning';
    if (currentValue >= goal.target_value) return 'on-track';
    return 'behind';
  }
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

export function GoalCard({ goal, currentValue = null, onEdit, onDelete }: GoalCardProps) {
  const status = getGoalStatus(goal, currentValue);
  const isInversed = ['labor_cost_pct', 'product_cost_pct', 'noshow_rate'].includes(goal.metric_key);
  
  // Calculate percentage towards goal
  let percentage = 0;
  if (currentValue !== null && goal.target_value > 0) {
    if (isInversed) {
      // For inversed: 100% when at or below target, 0% when at critical
      const critVal = goal.critical_threshold ?? goal.target_value * 2;
      percentage = Math.max(0, Math.min(100, ((critVal - currentValue) / (critVal - goal.target_value)) * 100));
    } else {
      percentage = Math.min(100, (currentValue / goal.target_value) * 100);
    }
  }

  return (
    <Card className={cn(tokens.card.wrapper, 'group relative')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p className={cn(tokens.kpi.label, 'mb-0.5')}>{goal.display_name}</p>
            {goal.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{goal.description}</p>
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

        <div className="flex items-end justify-between mb-2">
          <div>
            {currentValue !== null ? (
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

        <div className="flex items-center gap-2">
          <Progress
            value={percentage}
            className="h-2 flex-1"
            indicatorClassName={STATUS_COLORS[status]}
          />
          <span className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap',
            status === 'on-track' && 'bg-emerald-500/10 text-emerald-600',
            status === 'warning' && 'bg-amber-500/10 text-amber-600',
            status === 'behind' && 'bg-amber-500/10 text-amber-600',
            status === 'critical' && 'bg-destructive/10 text-destructive',
            status === 'no-data' && 'bg-muted text-muted-foreground',
          )}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
