import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/format';
import { useCapitalEngine } from '@/hooks/useCapitalEngine';
import { useEnforcementGate } from '@/hooks/useEnforcementGate';
import { SPICard } from './SPICard';
import { CapitalPriorityQueue } from './CapitalPriorityQueue';
import { ExpansionSimulator } from './ExpansionSimulator';
import { Landmark, TrendingUp, ShieldCheck } from 'lucide-react';

interface Props {
  organizationId: string | undefined;
}

export function CapitalDashboard({ organizationId }: Props) {
  const { locationSPIs, capitalQueue, topOpportunity, isLoading } = useCapitalEngine();
  const { isCompleted: marginGateCompleted, isLoading: gateLoading } = useEnforcementGate('gate_margin_baselines');

  if (isLoading || gateLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className={tokens.loading.skeleton} />
        ))}
      </div>
    );
  }

  if (!marginGateCompleted) {
    return (
      <Card className={tokens.card.base}>
        <CardContent className="py-12">
          <div className={tokens.empty.container}>
            <ShieldCheck className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>Margin Baselines Required</h3>
            <p className={tokens.empty.description}>
              Before expansion analytics activate, define your margin baselines — the financial guardrails that protect growth.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Opportunity Highlight */}
      {topOpportunity && (
        <Card className={`${tokens.card.base} border-primary/20`}>
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Landmark className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>Top Opportunity</CardTitle>
                <CardDescription className="font-sans text-sm">
                  Highest ROE expansion target
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="font-display text-xl tracking-wide">{topOpportunity.title}</span>
                {topOpportunity.city && (
                  <span className="text-sm text-muted-foreground font-sans block">{topOpportunity.city}</span>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <span className="font-display text-2xl tracking-wide text-primary">
                    {topOpportunity.roe.toFixed(1)}x
                  </span>
                  <span className="text-xs text-muted-foreground font-sans block">ROE</span>
                </div>
                <div className="text-center">
                  <span className="font-display text-lg tracking-wide">
                    {formatCurrency(topOpportunity.capitalRequired, { noCents: true })}
                  </span>
                  <span className="text-xs text-muted-foreground font-sans block">Investment</span>
                </div>
                <div className="text-center">
                  <span className="font-display text-lg tracking-wide">
                    {formatCurrency(topOpportunity.predictedAnnualLift, { noCents: true })}
                  </span>
                  <span className="text-xs text-muted-foreground font-sans block">Return</span>
                </div>
                <div className="text-center">
                  <span className="font-display text-lg tracking-wide">
                    {topOpportunity.breakEvenMonths}mo
                  </span>
                  <span className="text-xs text-muted-foreground font-sans block">Payback</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Performance Index */}
      {locationSPIs.length > 0 && (
        <div>
          <h2 className="font-display text-base tracking-wide uppercase mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Location Performance Index
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {locationSPIs.map((spi: any) => (
              <SPICard key={spi.locationId} spiData={spi} />
            ))}
          </div>
        </div>
      )}

      {/* Capital Priority Queue */}
      <CapitalPriorityQueue queue={capitalQueue} />

      {/* Investment Simulator */}
      <ExpansionSimulator opportunities={capitalQueue} />
    </div>
  );
}
