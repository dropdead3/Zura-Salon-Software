import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Building2, DollarSign, TrendingDown, Loader2, Activity } from 'lucide-react';
import { useBackroomPlatformAnalytics } from '@/hooks/platform/useBackroomPlatformAnalytics';

function KPICard({ icon: Icon, label, value, subtitle }: { icon: any; label: string; value: string; subtitle?: string }) {
  return (
    <PlatformCard variant="glass" className="relative">
      <PlatformCardContent className="p-5 pt-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-display text-xs tracking-wide uppercase text-slate-400">{label}</p>
            <p className="font-display text-2xl tracking-tight text-[hsl(var(--platform-foreground))]">{value}</p>
            {subtitle && <p className="font-sans text-xs text-slate-500">{subtitle}</p>}
          </div>
          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
            <Icon className="w-5 h-5 text-violet-400" />
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}

export function BackroomAnalyticsTab() {
  const { data: metrics, isLoading } = useBackroomPlatformAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Building2}
          label="Enabled Orgs"
          value={String(metrics.totalEnabledOrgs)}
          subtitle={`${metrics.totalTrialOrgs} in trial`}
        />
        <KPICard
          icon={DollarSign}
          label="Est. MRR"
          value={`$${metrics.estimatedMRR.toLocaleString()}`}
          subtitle="Based on plan tiers"
        />
        <KPICard
          icon={TrendingDown}
          label="Avg Waste %"
          value={metrics.avgWasteReduction != null ? `${metrics.avgWasteReduction.toFixed(1)}%` : '—'}
          subtitle={metrics.avgWasteReduction != null ? 'Across active orgs' : 'No data yet'}
        />
        <KPICard
          icon={Activity}
          label="Total Sessions"
          value={metrics.orgUsageStats.reduce((s, o) => s + o.totalSessions, 0).toLocaleString()}
          subtitle="All-time backroom sessions"
        />
      </div>

      {/* Adoption Timeline */}
      {metrics.adoptionTimeline.length > 0 && (
        <PlatformCard variant="glass">
          <PlatformCardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <PlatformCardTitle>Adoption Timeline</PlatformCardTitle>
                <PlatformCardDescription>Monthly backroom activations</PlatformCardDescription>
              </div>
            </div>
          </PlatformCardHeader>
          <PlatformCardContent>
            <div className="flex items-end gap-2 h-32">
              {metrics.adoptionTimeline.map((m) => {
                const maxCount = Math.max(...metrics.adoptionTimeline.map((t) => t.count), 1);
                const heightPct = (m.count / maxCount) * 100;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="font-sans text-[10px] text-slate-500 tabular-nums">{m.count}</span>
                    <div
                      className="w-full rounded-t bg-violet-500/20 border border-violet-500/30 min-h-[4px] transition-all"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                    <span className="font-sans text-[10px] text-slate-500">{m.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </PlatformCardContent>
        </PlatformCard>
      )}

      {/* Per-Org Usage */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <PlatformCardTitle>Organization Usage</PlatformCardTitle>
              <PlatformCardDescription>
                {metrics.orgUsageStats.length} backroom-enabled organizations
              </PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="p-0">
          {metrics.orgUsageStats.length === 0 ? (
            <div className={cn(tokens.empty.container, 'py-12')}>
              <Building2 className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No enabled organizations</h3>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50">
                  <TableHead className="font-sans text-xs text-slate-400">Organization</TableHead>
                  <TableHead className="font-sans text-xs text-slate-400">Snapshots</TableHead>
                  <TableHead className="font-sans text-xs text-slate-400">Avg Waste %</TableHead>
                  <TableHead className="font-sans text-xs text-slate-400">Sessions</TableHead>
                  <TableHead className="font-sans text-xs text-slate-400">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.orgUsageStats.map((org) => (
                  <TableRow key={org.orgId} className="border-slate-700/30">
                    <TableCell className="font-sans text-sm font-medium text-slate-200">{org.orgName}</TableCell>
                    <TableCell className="font-sans text-sm tabular-nums text-slate-300">{org.snapshotCount}</TableCell>
                    <TableCell className="font-sans text-sm tabular-nums">
                      {org.avgWastePct != null ? (
                        <PlatformBadge
                          variant={org.avgWastePct > 10 ? 'error' : 'success'}
                          size="sm"
                        >
                          {org.avgWastePct.toFixed(1)}%
                        </PlatformBadge>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-sans text-sm tabular-nums text-slate-300">{org.totalSessions.toLocaleString()}</TableCell>
                    <TableCell className="font-sans text-xs text-slate-500">
                      {org.lastSnapshotDate ? new Date(org.lastSnapshotDate).toLocaleDateString() : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </PlatformCardContent>
      </PlatformCard>
    </div>
  );
}
