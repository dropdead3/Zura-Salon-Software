import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { useCapitalProjects } from '@/hooks/useCapitalProjects';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { CapitalStatusBadge } from '@/components/dashboard/capital-engine/CapitalStatusBadge';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { Banknote, ArrowRight } from 'lucide-react';

function c(cents: number) { return cents / 100; }

export default function CapitalProjects() {
  const { dashPath } = useOrgDashboardPath();
  const { data: projects = [], isLoading } = useCapitalProjects();

  return (
    <DashboardLayout>
      <div className={cn(tokens.layout.pageContainer, 'max-w-[1600px] mx-auto')}>
        <DashboardPageHeader
          title="Funded Projects"
          description="Track repayment, performance, and ROI across all funded capital projects"
          backTo={dashPath('/admin/capital')}
          backLabel="Back to Capital Queue"
        />
        <PageExplainer pageId="capital-projects" />

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
          </div>
        ) : (projects as any[]).length === 0 ? (
          <Card className={tokens.card.wrapper}>
            <CardContent className="py-12">
              <div className={tokens.empty.container}>
                <Banknote className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>No Funded Projects</h3>
                <p className={tokens.empty.description}>When capital opportunities are funded, their performance will be tracked here.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className={tokens.card.wrapper}>
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <div className={tokens.card.iconBox}><Banknote className="w-5 h-5 text-primary" /></div>
              <div>
                <CardTitle className={tokens.card.title}>All Projects</CardTitle>
                <CardDescription className="font-sans text-sm">{(projects as any[]).length} funded project{(projects as any[]).length !== 1 ? 's' : ''}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Desktop table */}
              <div className="hidden lg:block space-y-1">
                <div className="grid grid-cols-[1fr_100px_100px_80px_80px_80px_80px_90px_36px] gap-2 px-3 py-2 text-xs text-muted-foreground font-sans">
                  <span>Project</span>
                  <span className="text-right">Funded</span>
                  <span className="text-right">Revenue</span>
                  <span className="text-right">Repayment</span>
                  <span className="text-right">ROI</span>
                  <span className="text-right">Forecast</span>
                  <span className="text-right">Activation</span>
                  <span className="text-right">Status</span>
                  <span />
                </div>
                {(projects as any[]).map(p => {
                  const title = p.capital_funding_opportunities?.title ?? 'Funded Project';
                  const funded = Number(p.funded_amount_cents);
                  const revenue = Number(p.revenue_generated_to_date_cents);
                  const repaidPct = funded > 0 ? Math.round((Number(p.actual_total_repayment_to_date_cents) / funded) * 100) : 0;
                  const roi = p.roi_to_date != null ? Number(p.roi_to_date) : null;
                  return (
                    <Link
                      key={p.id}
                      to={dashPath(`/admin/capital/projects/${p.id}`)}
                      className="grid grid-cols-[1fr_100px_100px_80px_80px_80px_80px_90px_36px] gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border/40"
                    >
                      <span className="font-sans text-sm truncate">{title}</span>
                      <span className="font-sans text-sm text-right">{formatCurrency(c(funded), { noCents: true })}</span>
                      <span className="font-sans text-sm text-right">{formatCurrency(c(revenue), { noCents: true })}</span>
                      <span className="font-sans text-sm text-right">{repaidPct}%</span>
                      <span className={`font-sans text-sm text-right ${roi != null && roi >= 0 ? 'text-green-600' : roi != null ? 'text-destructive' : ''}`}>
                        {roi != null ? `${roi > 0 ? '+' : ''}${(roi * 100).toFixed(0)}%` : '—'}
                      </span>
                      <div className="flex justify-end"><CapitalStatusBadge status={p.status} type="project" /></div>
                      <div className="flex justify-end"><CapitalStatusBadge status={p.activation_status} type="activation" /></div>
                      <div className="flex justify-end"><CapitalStatusBadge status={p.repayment_status} type="repayment" /></div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>

              {/* Mobile */}
              <div className="lg:hidden space-y-2">
                {(projects as any[]).map(p => {
                  const title = p.capital_funding_opportunities?.title ?? 'Funded Project';
                  const funded = Number(p.funded_amount_cents);
                  const repaidPct = funded > 0 ? Math.round((Number(p.actual_total_repayment_to_date_cents) / funded) * 100) : 0;
                  return (
                    <Link key={p.id} to={dashPath(`/admin/capital/projects/${p.id}`)} className="block p-3 rounded-lg bg-muted/30 border border-border/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-sm truncate">{title}</span>
                        <CapitalStatusBadge status={p.status} type="project" />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-sans">
                        <span>{formatCurrency(c(funded), { noCents: true })}</span>
                        <span>Repaid: {repaidPct}%</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
