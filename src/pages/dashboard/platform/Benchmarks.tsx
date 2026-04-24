import { useState } from 'react';
import { RefreshCw, BarChart3 } from 'lucide-react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { Select, PlatformSelectContent as SelectContent, PlatformSelectItem as SelectItem, PlatformSelectTrigger as SelectTrigger, SelectValue } from '@/components/platform/ui/PlatformSelect';
import { Skeleton } from '@/components/ui/skeleton';
import { BenchmarkLeaderboard, BenchmarkComparison } from '@/components/platform/benchmarks';
import { useMetricLeaderboards, useBenchmarkComparison, useRecalculateBenchmarks } from '@/hooks/useBenchmarkData';
import { useOrganizationHealthScores } from '@/hooks/useOrganizationHealth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PageExplainer } from '@/components/ui/PageExplainer';

export default function Benchmarks() {
  const [compareOrg1, setCompareOrg1] = useState<string>('');
  const [compareOrg2, setCompareOrg2] = useState<string>('');

  const { leaderboards, isLoading } = useMetricLeaderboards();
  const { data: healthScores } = useOrganizationHealthScores();
  const recalculate = useRecalculateBenchmarks();
  
  const { comparison, isLoading: comparisonLoading } = useBenchmarkComparison(
    compareOrg1 || undefined,
    compareOrg2 || undefined
  );

  const organizations = healthScores?.map((s) => ({
    id: s.organization_id,
    name: s.organization?.name || 'Unknown',
  })) || [];

  const org1Name = organizations.find((o) => o.id === compareOrg1)?.name || 'Organization 1';
  const org2Name = organizations.find((o) => o.id === compareOrg2)?.name || 'Organization 2';

  const handleRecalculate = async () => {
    try {
      await recalculate.mutateAsync();
      toast.success('Benchmarks recalculated');
    } catch (error) {
      toast.error('Failed to recalculate benchmarks');
    }
  };

  if (isLoading) {
    return (
      <PlatformPageContainer>
        <PlatformPageHeader title="Organization Benchmarks" description="Loading..." />
        <PageExplainer pageId="platform-benchmarks" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </PlatformPageContainer>
    );
  }

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Organization Benchmarks"
        description="Compare performance across all accounts"
        actions={
          <PlatformButton
            variant="secondary"
            onClick={handleRecalculate}
            disabled={recalculate.isPending}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', recalculate.isPending && 'animate-spin')} />
            Recalculate
          </PlatformButton>
        }
      />

      {/* Leaderboards Grid */}
      <div>
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          Metric Leaderboards
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {leaderboards.slice(0, 4).map((lb) => (
            <BenchmarkLeaderboard key={lb.metric_key} leaderboard={lb} />
          ))}
        </div>
        {leaderboards.length > 4 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
            {leaderboards.slice(4).map((lb) => (
              <BenchmarkLeaderboard key={lb.metric_key} leaderboard={lb} />
            ))}
          </div>
        )}
      </div>

      {/* Organization Comparison */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="text-lg">Organization Comparison</PlatformCardTitle>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Compare:</span>
              <Select value={compareOrg1} onValueChange={setCompareOrg1}>
                <SelectTrigger className="w-48 bg-slate-800/50 border-slate-700">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations
                    .filter((o) => o.id !== compareOrg2)
                    .map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-slate-500">vs</span>

            <Select value={compareOrg2} onValueChange={setCompareOrg2}>
              <SelectTrigger className="w-48 bg-slate-800/50 border-slate-700">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations
                  .filter((o) => o.id !== compareOrg1)
                  .map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {compareOrg1 && compareOrg2 && comparison ? (
            <BenchmarkComparison
              org1Name={org1Name}
              org2Name={org2Name}
              comparison={comparison}
            />
          ) : (
            <div className="text-center py-12 text-slate-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select two organizations to compare their metrics</p>
            </div>
          )}
        </PlatformCardContent>
      </PlatformCard>
    </PlatformPageContainer>
  );
}
