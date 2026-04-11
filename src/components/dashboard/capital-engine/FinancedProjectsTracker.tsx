import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/format';
import { useCapitalProjects } from '@/hooks/useCapitalProjects';
import {
  PROJECT_STATUS_LABELS,
  REPAYMENT_STATUS_LABELS,
  ACTIVATION_STATUS_LABELS,
} from '@/config/capital-engine/zura-capital-config';
import { Banknote } from 'lucide-react';

function c(cents: number): number { return cents / 100; }

export function FinancedProjectsTracker() {
  const { data: projects = [], isLoading } = useCapitalProjects(
    ['active', 'on_track', 'above_forecast', 'below_forecast', 'at_risk'],
  );

  if (isLoading || projects.length === 0) return null;

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Banknote className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className={tokens.card.title}>Funded Projects</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(projects as any[]).map((project) => {
          const statusInfo = PROJECT_STATUS_LABELS[project.status] ?? {
            label: project.status,
            color: 'text-muted-foreground',
          };

          const repaymentInfo = REPAYMENT_STATUS_LABELS[project.repayment_status] ?? {
            label: project.repayment_status,
            color: 'text-muted-foreground',
          };

          const activationInfo = ACTIVATION_STATUS_LABELS[project.activation_status] ?? {
            label: project.activation_status,
            color: 'text-muted-foreground',
          };

          const funded = Number(project.funded_amount_cents);
          const repaid = Number(project.actual_total_repayment_to_date_cents);
          const repaidPct = funded > 0 ? Math.round((repaid / funded) * 100) : 0;
          const revenue = Number(project.revenue_generated_to_date_cents);
          const predicted = Number(project.predicted_revenue_to_date_cents);
          const variancePct = project.variance_percent != null ? Number(project.variance_percent) : null;
          const roi = project.roi_to_date != null ? Number(project.roi_to_date) : null;
          const breakEvenPct = Number(project.break_even_progress_percent);
          const title = (project as any).capital_funding_opportunities?.title ?? 'Funded Project';

          return (
            <div
              key={project.id}
              className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm truncate">{title}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
                    {statusInfo.label}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${activationInfo.color}`}>
                    {activationInfo.label}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs text-muted-foreground font-sans flex-wrap">
                <span>Funded: {formatCurrency(c(funded), { noCents: true })}</span>
                <span>Repayment: <span className={repaymentInfo.color}>{repaymentInfo.label}</span></span>
                {roi != null && roi !== 0 && (
                  <span className={roi >= 0 ? 'text-green-600' : 'text-destructive'}>
                    ROI: {roi > 0 ? '+' : ''}{(roi * 100).toFixed(0)}%
                  </span>
                )}
                {breakEvenPct > 0 && (
                  <span>Break-even: {breakEvenPct.toFixed(0)}%</span>
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

              {/* Revenue performance */}
              {revenue > 0 && (
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="text-muted-foreground">
                    Revenue: {formatCurrency(c(revenue), { noCents: true })}
                    {predicted > 0 && (
                      <span className="text-muted-foreground/60">
                        {' '}(vs {formatCurrency(c(predicted), { noCents: true })} pred.)
                      </span>
                    )}
                  </span>
                  {variancePct != null && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        variancePct >= 15
                          ? 'text-green-600'
                          : variancePct > -10
                            ? 'text-green-600'
                            : variancePct > -25
                              ? 'text-amber-600'
                              : 'text-destructive'
                      }`}
                    >
                      {variancePct > 0 ? '+' : ''}{variancePct.toFixed(0)}%
                    </Badge>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
