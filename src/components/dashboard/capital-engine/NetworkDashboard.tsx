import { Loader2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useNetworkSummary } from '@/hooks/useNetworkOwnership';
import { ZOSCard } from './ZOSCard';
import { DealPipelineCard } from './DealPipelineCard';
import { CapitalRecyclingCard } from './CapitalRecyclingCard';

export function NetworkDashboard() {
  const { topPerformers, pipelineSummary, capitalMetrics, isLoading } = useNetworkSummary();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-wide">Zura Network</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          Ownership intelligence and capital allocation across the network
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DealPipelineCard summary={pipelineSummary} />
        <CapitalRecyclingCard metrics={capitalMetrics} />
      </div>

      <div>
        <h2 className="font-display text-base tracking-wide mb-4">Top Performers</h2>
        {topPerformers.length === 0 ? (
          <div className={tokens.empty.container}>
            <p className={tokens.empty.description}>No ownership scores computed yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topPerformers.map((s: any) => (
              <ZOSCard
                key={s.id}
                orgName={s.organizations?.name ?? 'Unknown'}
                zosScore={Number(s.zos_score)}
                eligibility={s.eligibility_status}
                spiComponent={Number(s.spi_component)}
                consistencyComponent={Number(s.consistency_component)}
                executionReliability={Number(s.execution_reliability)}
                growthResponsiveness={Number(s.growth_responsiveness)}
                teamStability={Number(s.team_stability)}
                marketPosition={Number(s.market_position)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
