import { Zap, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useDailyBriefing } from '@/hooks/useDailyBriefing';
import { useZuraActionsAttribution } from '@/hooks/useZuraActionsAttribution';
import type { Task } from '@/hooks/useTasks';

interface DailyBriefingCardProps {
  tasks: Task[];
}

export function DailyBriefingCard({ tasks }: DailyBriefingCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const { topActions, urgentDecay, revenueAtRiskCents, completedToday } = useDailyBriefing(tasks);
  const { data: attribution } = useZuraActionsAttribution();

  const hasContent = topActions.length > 0 || urgentDecay.length > 0 || completedToday > 0;
  if (!hasContent && !attribution?.totalCents) return null;

  return (
    <Card className="relative overflow-hidden p-6 rounded-xl backdrop-blur-sm">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="flex items-center gap-3 mb-4">
        <div className={tokens.card.iconBox}>
          <Zap className={tokens.card.icon} />
        </div>
        <div>
          <h2 className={tokens.card.title}>Daily Briefing</h2>
          <p className="text-xs text-muted-foreground font-sans">What matters today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Focus */}
        {topActions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-display tracking-wide text-muted-foreground">YOU SHOULD DO</p>
            <div className="space-y-1.5">
              {topActions.map((task) => (
                <div key={task.id} className="flex items-start gap-2">
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                    task.priority === 'high' ? 'bg-orange-500' : task.priority === 'normal' ? 'bg-blue-500' : 'bg-muted-foreground'
                  )} />
                  <div className="min-w-0">
                    <p className="text-xs font-sans truncate">{task.title}</p>
                    {task.estimated_revenue_impact_cents != null && task.estimated_revenue_impact_cents > 0 && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        <BlurredAmount>~{formatCurrency(task.estimated_revenue_impact_cents / 100)}</BlurredAmount>/mo
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Today */}
        {completedToday > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-display tracking-wide text-muted-foreground">COMPLETED TODAY</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-sans">
                {completedToday} task{completedToday !== 1 ? 's' : ''} done
              </p>
            </div>
          </div>
        )}

        {/* Urgent Decay */}
        {urgentDecay.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-display tracking-wide text-amber-600 dark:text-amber-400">EXPIRING SOON</p>
            <div className="space-y-1.5">
              {urgentDecay.slice(0, 2).map((task) => (
                <div key={task.id} className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                  <p className="text-xs font-sans truncate">{task.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zura Attribution */}
        {attribution && attribution.totalCents > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-display tracking-wide text-muted-foreground">ZURA IMPACT THIS MONTH</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-sans">
                <BlurredAmount>{formatCurrency(attribution.totalCents / 100)}</BlurredAmount>
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground font-sans">
              from {attribution.taskCount} completed action{attribution.taskCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Revenue at Risk */}
        {revenueAtRiskCents > 0 && !urgentDecay.length && (
          <div className="space-y-2">
            <p className="text-[10px] font-display tracking-wide text-muted-foreground">REVENUE AT STAKE</p>
            <p className="text-sm font-sans">
              <BlurredAmount>{formatCurrency(revenueAtRiskCents / 100)}</BlurredAmount>/mo across open tasks
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
