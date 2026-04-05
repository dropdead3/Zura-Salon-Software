import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLevelProgress } from '@/hooks/useLevelProgress';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { cn } from '@/lib/utils';

/**
 * Compact card showing a stylist's level progress on their dashboard home.
 * Shows composite score, next-level proximity, and retention warnings.
 */
export function LevelProgressNudge() {
  const { user } = useAuth();
  const { data: progress, isLoading } = useLevelProgress(user?.id);
  const { dashPath } = useOrgDashboardPath();

  if (isLoading || !progress) return null;

  const hasRetentionRisk = progress.retention.isAtRisk;
  const hasNextLevel = !!progress.nextLevelLabel;
  const score = Math.round(progress.compositeScore);

  return (
    <Link to={dashPath('/my-graduation')} className="block group">
      <Card className={cn(
        "relative p-4 rounded-xl transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5",
        hasRetentionRisk && "border-destructive/30"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            hasRetentionRisk ? "bg-destructive/10" : "bg-primary/10"
          )}>
            {hasRetentionRisk ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <GraduationCap className="w-5 h-5 text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-display tracking-wide">
                {progress.currentLevelLabel}
              </span>
              {hasNextLevel && (
                <>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-xs text-muted-foreground">{progress.nextLevelLabel}</span>
                </>
              )}
            </div>

            {hasNextLevel ? (
              <div className="flex items-center gap-2">
                <Progress value={score} className="h-1.5 flex-1" />
                <span className="text-xs font-medium tabular-nums text-muted-foreground">{score}%</span>
              </div>
            ) : hasRetentionRisk ? (
              <p className="text-xs text-destructive">
                {progress.retention.failures.length} metric{progress.retention.failures.length !== 1 ? 's' : ''} below minimum
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Top level — maintaining standards</p>
            )}
          </div>

          {hasRetentionRisk && (
            <Badge variant="destructive" className="text-[10px] shrink-0">At Risk</Badge>
          )}
          {progress.isFullyQualified && hasNextLevel && (
            <Badge variant="default" className="text-[10px] shrink-0">Ready</Badge>
          )}

          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}
