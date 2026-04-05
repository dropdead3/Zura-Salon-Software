import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { TrendingUp, GraduationCap, CheckCircle2, ShieldCheck } from 'lucide-react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useLevelProgress, type LevelProgressResult } from '@/hooks/useLevelProgress';

interface LevelProgressCardProps {
  userId: string | undefined;
  compact?: boolean;
}

function CriterionRow({ label, current, target, percent, unit, gap }: {
  label: string;
  current: number;
  target: number;
  percent: number;
  unit: string;
  gap: number;
}) {
  const formatValue = (val: number) => {
    if (unit === '/mo' || unit === '$') return `$${val.toLocaleString()}`;
    if (unit === '%') return `${val.toFixed(1)}%`;
    if (unit === 'd') return `${val}d`;
    return String(val);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          <span className="text-foreground">{formatValue(current)}</span>
          <span className="text-muted-foreground"> / {formatValue(target)}</span>
        </span>
      </div>
      <Progress
        value={percent}
        className="h-1.5"
        indicatorClassName={cn(
          percent >= 100 ? 'bg-emerald-500' : percent >= 75 ? 'bg-primary' : 'bg-amber-500'
        )}
      />
      {gap > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {formatValue(Math.round(gap))} more needed
        </p>
      )}
    </div>
  );
}

export function LevelProgressCard({ userId, compact = false }: LevelProgressCardProps) {
  const progress = useLevelProgress(userId);

  if (!progress || !progress.nextLevelLabel || !progress.criteria) {
    return null; // No next level or no criteria configured
  }

  return (
    <Card>
      <CardHeader className={compact ? 'pb-3' : undefined}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={tokens.card.iconBox}>
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={cn(tokens.card.title, 'flex items-center gap-1.5')}>
                Level Progress
                <MetricInfoTooltip description="Shows how close this stylist is to meeting the graduation criteria for their next level, based on rolling performance data." />
              </CardTitle>
              <CardDescription className="text-xs">
                {progress.currentLevelLabel} → {progress.nextLevelLabel}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {progress.isFullyQualified ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Qualified
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs tabular-nums">
                {progress.compositeScore}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Composite progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium tabular-nums">{progress.compositeScore}%</span>
          </div>
          <Progress
            value={progress.compositeScore}
            className="h-2"
            indicatorClassName={cn(
              progress.compositeScore >= 100 ? 'bg-emerald-500' : 'bg-primary'
            )}
          />
        </div>

        {/* Per-criterion breakdown */}
        <div className="space-y-3">
          {progress.criteriaProgress.map(cp => (
            <CriterionRow
              key={cp.key}
              label={cp.label}
              current={cp.current}
              target={cp.target}
              percent={cp.percent}
              unit={cp.unit}
              gap={cp.gap}
            />
          ))}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
          <span>{progress.evaluationWindowDays}-day rolling window</span>
          {progress.requiresApproval && (
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Requires approval
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
