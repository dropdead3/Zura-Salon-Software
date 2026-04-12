import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useZuraCapital, type ZuraCapitalOpportunity } from '@/hooks/useZuraCapital';
import { useCapitalProjects } from '@/hooks/useCapitalProjects';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { CapitalQueueSummaryStrip } from '@/components/dashboard/capital-engine/CapitalQueueSummaryStrip';
import { CapitalQueueFilters, type CapitalFilters } from '@/components/dashboard/capital-engine/CapitalQueueFilters';
import { CapitalStatusBadge } from '@/components/dashboard/capital-engine/CapitalStatusBadge';
import { PageExplainer } from '@/components/ui/PageExplainer';
import {
  OPPORTUNITY_TYPE_LABELS,
} from '@/config/capital-engine/zura-capital-config';
import type { OpportunityType } from '@/config/capital-engine/zura-capital-config';
import { Landmark, ArrowRight, ShieldCheck } from 'lucide-react';

function c(cents: number) { return cents / 100; }

export default function CapitalQueue() {
  const { dashPath } = useOrgDashboardPath();
  const { opportunities, activeProjectCount, isLoading } = useZuraCapital();
  const { data: projects = [] } = useCapitalProjects(['active', 'on_track', 'above_forecast', 'below_forecast', 'at_risk']);
  const [filters, setFilters] = useState<CapitalFilters>({ type: 'all', status: 'all', risk: 'all' });

  const totalDeployed = useMemo(() =>
    (projects as any[]).reduce((sum, p) => sum + Number(p.funded_amount_cents || 0), 0),
    [projects],
  );

  const filtered = useMemo(() => {
    return opportunities.filter(o => {
      if (filters.type !== 'all' && o.opportunityType !== filters.type) return false;
      if (filters.status !== 'all' && o.eligibilityStatus !== filters.status) return false;
      if (filters.risk !== 'all' && o.riskLevel !== filters.risk) return false;
      return true;
    });
  }, [opportunities, filters]);

  return (
    <DashboardLayout>
      <div className={cn(tokens.layout.pageContainer, 'max-w-[1600px] mx-auto')}>
        <DashboardPageHeader
          title="Zura Capital"
          description="Ranked growth opportunities and funded projects"
          backTo={dashPath('/admin/growth-hub')}
          backLabel="Back to Growth Hub"
        />
        <PageExplainer pageId="capital-queue" />

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
          </div>
        ) : (
          <div className="space-y-6">
            <CapitalQueueSummaryStrip
              opportunities={opportunities}
              activeProjectCount={activeProjectCount}
              totalDeployed={totalDeployed}
            />

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CapitalQueueFilters filters={filters} onChange={setFilters} />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="font-sans text-xs" asChild>
                  <Link to={dashPath('/admin/capital/projects')}>View Funded Projects</Link>
                </Button>
                <Button variant="outline" size="sm" className="font-sans text-xs" asChild>
                  <Link to={dashPath('/admin/capital/settings')}>Settings</Link>
                </Button>
              </div>
            </div>

            <Card className={tokens.card.wrapper}>
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className={tokens.card.iconBox}>
                    <Landmark className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className={tokens.card.title}>Capital Queue</CardTitle>
                    <CardDescription className="font-sans text-sm">
                      Ranked growth opportunities across the organization
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-sans">
                  {filtered.length} opportunit{filtered.length === 1 ? 'y' : 'ies'}
                </Badge>
              </CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <div className={tokens.empty.container}>
                    <Landmark className={tokens.empty.icon} />
                    <h3 className={tokens.empty.heading}>No Opportunities</h3>
                    <p className={tokens.empty.description}>
                      When Zura identifies validated growth opportunities, they will appear here.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden lg:block space-y-1">
                      <div className="grid grid-cols-[1fr_90px_100px_100px_65px_65px_65px_90px_36px] gap-2 px-3 py-2 text-xs text-muted-foreground font-sans">
                        <span>Opportunity</span>
                        <span>Type</span>
                        <span className="text-right">Investment</span>
                        <span className="text-right">Expected Lift</span>
                        <span className="text-right">ROE</span>
                        <span className="text-right">B/E</span>
                        <span className="text-right">Risk</span>
                        <span className="text-right">Status</span>
                        <span />
                      </div>
                      {filtered.map(opp => (
                        <Link
                          key={opp.id}
                          to={dashPath(`/admin/capital/opportunities/${opp.id}`)}
                          className="grid grid-cols-[1fr_90px_100px_100px_65px_65px_65px_90px_36px] gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border/40"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-sans text-sm truncate">{opp.title}</span>
                              {!opp.zuraEligible && <ShieldCheck className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-sans truncate">
                            {OPPORTUNITY_TYPE_LABELS[opp.opportunityType as OpportunityType] ?? opp.opportunityType}
                          </span>
                          <span className="font-sans text-sm text-right"><BlurredAmount>{formatCurrency(c(opp.investmentCents), { noCents: true })}</BlurredAmount></span>
                          <span className="font-sans text-sm text-right"><BlurredAmount>+{formatCurrency(c(opp.predictedLiftExpectedCents), { noCents: true })}</BlurredAmount></span>
                          <span className={`font-display text-sm text-right tracking-wide ${opp.roe >= 1.8 ? 'text-primary' : ''}`}>{opp.roe.toFixed(1)}x</span>
                          <span className="font-sans text-sm text-right">{opp.breakEvenMonthsExpected}mo</span>
                          <span className="font-sans text-xs text-right capitalize text-muted-foreground">{opp.riskLevel}</span>
                          <div className="flex justify-end">
                            <CapitalStatusBadge status={opp.eligibilityStatus} />
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>

                    {/* Mobile Cards */}
                    <div className="lg:hidden space-y-2">
                      {filtered.map(opp => (
                        <Link
                          key={opp.id}
                          to={dashPath(`/admin/capital/opportunities/${opp.id}`)}
                          className="block p-3 rounded-lg bg-muted/30 border border-border/40 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-sans text-sm truncate">{opp.title}</span>
                            <CapitalStatusBadge status={opp.eligibilityStatus} />
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground font-sans">
                            <span><BlurredAmount>{formatCurrency(c(opp.investmentCents), { noCents: true })}</BlurredAmount></span>
                            <span><BlurredAmount>+{formatCurrency(c(opp.predictedLiftExpectedCents), { noCents: true })}</BlurredAmount></span>
                            <span className={opp.roe >= 1.8 ? 'text-primary font-display tracking-wide' : 'font-display tracking-wide'}>{opp.roe.toFixed(1)}x</span>
                            <span>{opp.breakEvenMonthsExpected}mo</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
