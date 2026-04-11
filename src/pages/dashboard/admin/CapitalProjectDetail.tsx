import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { useCapitalProject } from '@/hooks/useCapitalProjects';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { CapitalMetricTile } from '@/components/dashboard/capital-engine/CapitalMetricTile';
import { CapitalStatusBadge } from '@/components/dashboard/capital-engine/CapitalStatusBadge';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { DollarSign, TrendingUp, BarChart3, Clock, Activity, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format } from 'date-fns';

function c(cents: number) { return cents / 100; }

export default function CapitalProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { dashPath } = useOrgDashboardPath();
  const { data: project, isLoading } = useCapitalProject(projectId);
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: events = [] } = useQuery({
    queryKey: ['capital-project-events', orgId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capital_event_log')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('funding_project_id', projectId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!projectId,
  });

  if (isLoading || !project) {
    return (
      <DashboardLayout>
        <div className={cn(tokens.layout.pageContainer, 'max-w-[1200px] mx-auto')}>
          <DashboardPageHeader title="Loading…" backTo={dashPath('/admin/capital/projects')} backLabel="Back to Projects" />
          <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>
        </div>
      </DashboardLayout>
    );
  }

  const p = project as any;
  const title = p.capital_funding_opportunities?.title ?? 'Funded Project';
  const funded = Number(p.funded_amount_cents);
  const revenue = Number(p.revenue_generated_to_date_cents);
  const predicted = Number(p.predicted_revenue_to_date_cents);
  const repaid = Number(p.actual_total_repayment_to_date_cents);
  const repaidPct = funded > 0 ? Math.round((repaid / funded) * 100) : 0;
  const roi = p.roi_to_date != null ? Number(p.roi_to_date) : null;
  const variancePct = p.variance_percent != null ? Number(p.variance_percent) : null;
  const breakEvenPct = Number(p.break_even_progress_percent);

  return (
    <DashboardLayout>
      <div className={cn(tokens.layout.pageContainer, 'max-w-[1200px] mx-auto')}>
        <DashboardPageHeader
          title={title}
          description={`Funded ${formatCurrency(c(funded), { noCents: true })} · Started ${p.funding_start_date}`}
          backTo={dashPath('/admin/capital/projects')}
          backLabel="Back to Projects"
          actions={
            <div className="flex items-center gap-2">
              <CapitalStatusBadge status={p.status} type="project" />
              <CapitalStatusBadge status={p.activation_status} type="activation" />
              <CapitalStatusBadge status={p.repayment_status} type="repayment" />
            </div>
          }
        />

        <div className="space-y-6">
          {/* Performance Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <CapitalMetricTile icon={<DollarSign className="w-3.5 h-3.5 text-muted-foreground" />} label="Funded" value={formatCurrency(c(funded), { noCents: true })} />
            <CapitalMetricTile icon={<TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />} label="Revenue Generated" value={formatCurrency(c(revenue), { noCents: true })} />
            <CapitalMetricTile icon={<BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />} label="ROI to Date" value={roi != null ? `${roi > 0 ? '+' : ''}${(roi * 100).toFixed(0)}%` : '—'} highlight={roi != null && roi > 0} />
            <CapitalMetricTile icon={<Zap className="w-3.5 h-3.5 text-muted-foreground" />} label="Variance" value={variancePct != null ? `${variancePct > 0 ? '+' : ''}${variancePct.toFixed(0)}%` : '—'} highlight={variancePct != null && variancePct >= 15} />
            <CapitalMetricTile icon={<Clock className="w-3.5 h-3.5 text-muted-foreground" />} label="Break-Even" value={`${breakEvenPct.toFixed(0)}%`} />
            <CapitalMetricTile icon={<DollarSign className="w-3.5 h-3.5 text-muted-foreground" />} label="Predicted Revenue" value={formatCurrency(c(predicted), { noCents: true })} />
          </div>

          {/* Repayment */}
          <Card className={tokens.card.wrapper}>
            <CardContent className="p-5 space-y-3">
              <h3 className={cn(tokens.heading.subsection, 'mb-1')}>Repayment Progress</h3>
              <div className="flex items-center justify-between text-sm font-sans">
                <span className="text-muted-foreground">Repaid: {formatCurrency(c(repaid), { noCents: true })}</span>
                <span>{repaidPct}%</span>
              </div>
              <Progress value={repaidPct} className="h-2" />
              {p.estimated_total_repayment_cents && (
                <p className="text-xs text-muted-foreground font-sans">
                  Total repayment: {formatCurrency(c(Number(p.estimated_total_repayment_cents)), { noCents: true })}
                  {p.expected_monthly_payment_cents && ` · ${formatCurrency(c(Number(p.expected_monthly_payment_cents)), { noCents: true })}/mo expected`}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Forecast */}
          <Card className={tokens.card.wrapper}>
            <CardContent className="p-5">
              <h3 className={cn(tokens.heading.subsection, 'mb-3')}>Forecast Status</h3>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-2">
                <div className="flex items-center justify-between text-sm font-sans">
                  <span className="text-muted-foreground">Revenue vs Predicted</span>
                  <span>{formatCurrency(c(revenue), { noCents: true })} / {formatCurrency(c(predicted), { noCents: true })}</span>
                </div>
                {variancePct != null && (
                  <p className={`text-xs font-sans ${variancePct >= 15 ? 'text-green-600' : variancePct > -10 ? 'text-green-600' : variancePct > -25 ? 'text-amber-600' : 'text-destructive'}`}>
                    {variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}% variance from forecast
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          {(events as any[]).length > 0 && (
            <Card className={tokens.card.wrapper}>
              <CardContent className="p-5">
                <h3 className={cn(tokens.heading.subsection, 'mb-3')}>Activity Timeline</h3>
                <div className="space-y-2">
                  {(events as any[]).map(e => (
                    <div key={e.id} className="flex items-center gap-3 text-xs font-sans">
                      <Activity className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{format(new Date(e.created_at), 'MMM d, yyyy h:mm a')}</span>
                      <span className="capitalize">{(e.event_type as string).replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
