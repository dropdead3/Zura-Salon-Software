import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { useSEOGrowthOrchestration } from '@/hooks/useSEOGrowthOrchestration';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/components/ui/blurred-amount';
import { SEOLocationPriorityCard } from './SEOLocationPriorityCard';
import { Globe, TrendingUp, Target, AlertTriangle, Lightbulb } from 'lucide-react';

interface Props {
  organizationId: string | undefined;
}

export function SEOGlobalGrowthDashboard({ organizationId }: Props) {
  const { data: orchestration, isLoading } = useSEOGrowthOrchestration(organizationId);
  const { formatCurrency } = useFormatCurrency();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Network Growth Overview</CardTitle>
              <CardDescription>Loading orchestration data…</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!orchestration || orchestration.rankedOpportunities.length === 0) {
    return null;
  }

  const { networkSummary, locationStates } = orchestration;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Network Growth Overview</CardTitle>
              <CardDescription>Portfolio-level opportunity ranking across all locations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* KPI Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Network Revenue */}
            <div className="rounded-lg border border-border/60 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-sans">Total Network Revenue</p>
              </div>
              <p className="text-xl font-display tracking-wide">
                {networkSummary.totalNetworkRevenue > 0
                  ? <BlurredAmount>{formatCurrency(networkSummary.totalNetworkRevenue)}</BlurredAmount>
                  : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground font-sans">30d rolling</p>
            </div>

            {/* Top Growth Driver */}
            <div className="rounded-lg border border-border/60 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-sans">Top Growth Driver</p>
              </div>
              {networkSummary.topGrowthDriver ? (
                <>
                  <p className="text-sm font-sans font-medium truncate">
                    {networkSummary.topGrowthDriver.label}
                  </p>
                  <p className="text-xs text-muted-foreground font-sans">
                    <BlurredAmount>{formatCurrency(networkSummary.topGrowthDriver.lift)}</BlurredAmount> revenue
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground font-sans">—</p>
              )}
            </div>

            {/* Biggest Opportunity */}
            <div className="rounded-lg border border-border/60 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-sans">Biggest Opportunity</p>
              </div>
              {networkSummary.biggestOpportunity ? (
                <>
                  <p className="text-sm font-sans font-medium truncate">
                    {networkSummary.biggestOpportunity.label}
                  </p>
                  <p className="text-xs text-green-500 font-sans">
                    +<BlurredAmount>{formatCurrency(networkSummary.biggestOpportunity.lift)}</BlurredAmount> available
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground font-sans">—</p>
              )}
            </div>

            {/* At Risk */}
            <div className="rounded-lg border border-border/60 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-sans">At Risk</p>
              </div>
              {networkSummary.atRisk ? (
                <>
                  <p className="text-sm font-sans font-medium truncate">
                    {networkSummary.atRisk.label}
                  </p>
                  <Badge variant="destructive" className="text-[10px]">
                    ↓ Losing momentum
                  </Badge>
                </>
              ) : (
                <p className="text-sm text-muted-foreground font-sans">No locations at risk</p>
              )}
            </div>
          </div>

          {/* Focus Recommendation */}
          <div className="rounded-lg bg-muted/50 border border-border/40 px-4 py-3">
            <p className="text-xs text-muted-foreground font-sans mb-1">Focus Recommendation</p>
            <p className="text-sm font-sans font-medium">{networkSummary.focusRecommendation}</p>
          </div>
        </CardContent>
      </Card>

      {/* Location Priority Cards */}
      {locationStates.length > 0 && (
        <SEOLocationPriorityCard locationStates={locationStates} />
      )}
    </div>
  );
}
