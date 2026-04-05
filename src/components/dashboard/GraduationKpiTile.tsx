import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTeamLevelProgress } from '@/hooks/useTeamLevelProgress';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { cn } from '@/lib/utils';

/**
 * Compact admin KPI tile for the Command Center showing
 * graduation-ready and at-risk counts with a link to the tracker.
 */
export function GraduationKpiTile() {
  const { counts, isLoading } = useTeamLevelProgress();
  const { dashPath } = useOrgDashboardPath();

  if (isLoading || counts.total === 0) return null;

  const hasUrgent = counts.atRisk > 0 || counts.belowStandard > 0;

  return (
    <Link to={dashPath('/admin/graduation-tracker')} className="block group">
      <Card className={cn(
        "relative p-4 rounded-xl transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5",
        hasUrgent && "border-destructive/30"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            hasUrgent ? "bg-destructive/10" : "bg-primary/10"
          )}>
            <GraduationCap className={cn("w-5 h-5", hasUrgent ? "text-destructive" : "text-primary")} />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-xs font-display tracking-wide">LEVEL PROGRESS</span>
            <div className="flex items-center gap-3 mt-1">
              {counts.ready > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">{counts.ready} ready</span>
                </div>
              )}
              {counts.atRisk > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-rose-700 dark:text-rose-400 tabular-nums">{counts.atRisk} at risk</span>
                </div>
              )}
              {counts.belowStandard > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                  <span className="text-red-700 dark:text-red-400 tabular-nums">{counts.belowStandard} below standard</span>
                </div>
              )}
              {counts.ready === 0 && counts.atRisk === 0 && counts.belowStandard === 0 && (
                <span className="text-xs text-muted-foreground">{counts.inProgress} in progress</span>
              )}
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}
