import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/format';
import { useFinancedProjects } from '@/hooks/useFinancedProjects';
import { computeVariance } from '@/lib/capital-engine/financing-engine';
import { FINANCED_PROJECT_STATUS_LABELS, getVarianceLabel } from '@/config/capital-engine/financing-config';
import { Banknote } from 'lucide-react';

export function FinancedProjectsTracker() {
  const { data: projects = [], isLoading } = useFinancedProjects();

  const activeProjects = (projects as any[]).filter(
    (p) => p.status === 'active' || p.status === 'pending_payment',
  );

  if (isLoading || activeProjects.length === 0) return null;

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Banknote className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className={tokens.card.title}>Financed Projects</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeProjects.map((project: any) => {
          const statusInfo = FINANCED_PROJECT_STATUS_LABELS[project.status] ?? {
            label: project.status,
            color: 'text-muted-foreground',
          };

          const funded = Number(project.funded_amount);
          const remaining = Number(project.repayment_remaining);
          const repaidPct = funded > 0 ? Math.round(((funded - remaining) / funded) * 100) : 0;

          const predictedLift = Number(project.predicted_annual_lift);
          const realizedLift = Number(project.realized_revenue_lift);
          const variancePct = computeVariance(realizedLift, predictedLift);
          const variance = getVarianceLabel(variancePct);

          const monthsElapsed = project.funded_at
            ? Math.max(
                1,
                Math.round(
                  (Date.now() - new Date(project.funded_at).getTime()) / (1000 * 60 * 60 * 24 * 30),
                ),
              )
            : 0;

          return (
            <div
              key={project.id}
              className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm truncate">
                  {(project as any).expansion_opportunities?.title ?? 'Financed Project'}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs ${statusInfo.color}`}
                >
                  {statusInfo.label}
                </Badge>
              </div>

              <div className="flex items-center gap-6 text-xs text-muted-foreground font-sans flex-wrap">
                <span>
                  Funded: {formatCurrency(funded, { noCents: true })}
                </span>
                {monthsElapsed > 0 && (
                  <span>
                    {monthsElapsed} of {Number(project.predicted_break_even_months)} months
                  </span>
                )}
                {project.roi_to_date != null && Number(project.roi_to_date) !== 0 && (
                  <span className={Number(project.roi_to_date) >= 0 ? 'text-green-600' : 'text-destructive'}>
                    ROI: {Number(project.roi_to_date) > 0 ? '+' : ''}{Number(project.roi_to_date).toFixed(0)}%
                  </span>
                )}
                {project.break_even_progress_percent != null && Number(project.break_even_progress_percent) > 0 && (
                  <span>
                    Break-even: {Number(project.break_even_progress_percent).toFixed(0)}%
                  </span>
                )}
              </div>

              {/* Repayment progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="text-muted-foreground">Repayment</span>
                  <span>{repaidPct}%</span>
                </div>
                <Progress value={repaidPct} className="h-2" />
              </div>

              {/* Revenue lift comparison */}
              {realizedLift > 0 && (
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="text-muted-foreground">
                    Realized Lift: {formatCurrency(realizedLift, { noCents: true })}
                    <span className="text-muted-foreground/60">
                      {' '}(vs {formatCurrency(predictedLift, { noCents: true })} pred.)
                    </span>
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      variance.status === 'on_track'
                        ? 'text-green-600'
                        : variance.status === 'watch'
                          ? 'text-yellow-600'
                          : 'text-destructive'
                    }`}
                  >
                    {variancePct !== null ? `${variancePct > 0 ? '+' : ''}${variancePct}%` : ''} {variance.label}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
