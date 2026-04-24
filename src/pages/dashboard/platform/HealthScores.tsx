import { useState } from 'react';
import { RefreshCw, Activity, AlertTriangle, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformInput as Input } from '@/components/platform/ui/PlatformInput';
import { Select, PlatformSelectContent as SelectContent, PlatformSelectItem as SelectItem, PlatformSelectTrigger as SelectTrigger, SelectValue } from '@/components/platform/ui/PlatformSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  HealthScoreGauge,
  RiskAlertsList,
} from '@/components/platform/health';
import {
  useOrganizationHealthScores,
  useHealthStats,
  useRecalculateHealthScores,
} from '@/hooks/useOrganizationHealth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PageExplainer } from '@/components/ui/PageExplainer';

type RiskFilter = 'all' | 'healthy' | 'at_risk' | 'critical';

export default function HealthScores() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  
  const { data: scores, isLoading } = useOrganizationHealthScores();
  const stats = useHealthStats();
  const recalculate = useRecalculateHealthScores();

  const filteredScores = (scores || []).filter((s) => {
    const matchesSearch = !search || 
      s.organization?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesRisk = riskFilter === 'all' || s.risk_level === riskFilter;
    return matchesSearch && matchesRisk;
  }).sort((a, b) => Number(a.score) - Number(b.score));

  const handleRecalculate = async () => {
    try {
      await recalculate.mutateAsync(undefined);
      toast.success('Health scores recalculated');
    } catch (error) {
      toast.error('Failed to recalculate scores');
    }
  };

  const getTrendIcon = (trend?: string, diff?: number | null) => {
    if (!trend || diff === null || diff === undefined) return null;
    if (diff > 0) return <span className="text-emerald-400">↑{Math.abs(diff).toFixed(0)}</span>;
    if (diff < 0) return <span className="text-red-400">↓{Math.abs(diff).toFixed(0)}</span>;
    return <span className="text-slate-500">→</span>;
  };

  if (isLoading) {
    return (
      <PlatformPageContainer>
        <PlatformPageHeader title="Organization Health" description="Loading..." />
        <PageExplainer pageId="platform-health-scores" />
        <div className="grid gap-4 md:grid-cols-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </PlatformPageContainer>
    );
  }

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Organization Health"
        description="Monitor account health and identify at-risk tenants"
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <PlatformCard variant="interactive">
          <PlatformCardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Healthy</p>
                <p className="text-2xl font-medium text-white">{stats.healthy}</p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>

        <PlatformCard variant="interactive">
          <PlatformCardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500">At Risk</p>
                <p className="text-2xl font-medium text-white">{stats.atRisk}</p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>

        <PlatformCard variant="interactive">
          <PlatformCardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Critical</p>
                <p className="text-2xl font-medium text-white">{stats.critical}</p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>

        <PlatformCard variant="interactive">
          <PlatformCardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Activity className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Avg Score</p>
                <p className="text-2xl font-medium text-white">{stats.avgScore}</p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>
      </div>

      {/* Risk Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformCard variant="glass">
          <PlatformCardHeader>
            <PlatformCardTitle className="text-lg">At-Risk Organizations</PlatformCardTitle>
          </PlatformCardHeader>
          <PlatformCardContent>
            <RiskAlertsList scores={scores || []} maxItems={5} showViewAll={false} />
          </PlatformCardContent>
        </PlatformCard>

        <PlatformCard variant="glass">
          <PlatformCardHeader>
            <PlatformCardTitle className="text-lg">Health Distribution</PlatformCardTitle>
          </PlatformCardHeader>
          <PlatformCardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Healthy (≥70)</span>
                  <span className="text-emerald-400">{stats.healthy} orgs ({stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${stats.total > 0 ? (stats.healthy / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">At Risk (50-69)</span>
                  <span className="text-amber-400">{stats.atRisk} orgs ({stats.total > 0 ? Math.round((stats.atRisk / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${stats.total > 0 ? (stats.atRisk / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Critical (&lt;50)</span>
                  <span className="text-red-400">{stats.critical} orgs ({stats.total > 0 ? Math.round((stats.critical / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${stats.total > 0 ? (stats.critical / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>
      </div>

      {/* All Organizations Table */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <PlatformCardTitle className="text-lg">All Organizations</PlatformCardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-48 bg-slate-800/50 border-slate-700"
                />
              </div>
              <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskFilter)}>
                <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50">
                <TableHead className="text-slate-400">Organization</TableHead>
                <TableHead className="text-slate-400 text-center">Score</TableHead>
                <TableHead className="text-slate-400 text-center">Trend</TableHead>
                <TableHead className="text-slate-400 text-center">Adoption</TableHead>
                <TableHead className="text-slate-400 text-center">Engagement</TableHead>
                <TableHead className="text-slate-400 text-center">Performance</TableHead>
                <TableHead className="text-slate-400 text-center">Data Quality</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredScores.map((score) => {
                const trendDiff = score.trends?.score_7d_ago 
                  ? Number(score.score) - score.trends.score_7d_ago 
                  : null;

                return (
                  <TableRow 
                    key={score.id}
                    className="border-slate-700/50 cursor-pointer hover:bg-slate-800/50"
                    onClick={() => navigate(`/platform/accounts/${score.organization_id}?tab=health`)}
                  >
                    <TableCell className="font-medium text-white">
                      {score.organization?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        'font-medium px-2 py-1 rounded',
                        score.risk_level === 'healthy' && 'bg-emerald-500/10 text-emerald-400',
                        score.risk_level === 'at_risk' && 'bg-amber-500/10 text-amber-400',
                        score.risk_level === 'critical' && 'bg-red-500/10 text-red-400',
                      )}>
                        {Math.round(Number(score.score))}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getTrendIcon(score.trends?.trend, trendDiff)}
                    </TableCell>
                    <TableCell className="text-center text-slate-300">
                      {score.score_breakdown.adoption.score}
                    </TableCell>
                    <TableCell className="text-center text-slate-300">
                      {score.score_breakdown.engagement.score}
                    </TableCell>
                    <TableCell className="text-center text-slate-300">
                      {score.score_breakdown.performance.score}
                    </TableCell>
                    <TableCell className="text-center text-slate-300">
                      {score.score_breakdown.data_quality.score}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredScores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No organizations match your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </PlatformCardContent>
      </PlatformCard>
    </PlatformPageContainer>
  );
}
