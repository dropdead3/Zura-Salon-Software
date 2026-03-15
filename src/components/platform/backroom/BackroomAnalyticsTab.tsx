import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Building2, DollarSign, TrendingDown, Loader2, Activity } from 'lucide-react';
import { useBackroomPlatformAnalytics } from '@/hooks/platform/useBackroomPlatformAnalytics';

function KPICard({ icon: Icon, label, value, subtitle }: { icon: any; label: string; value: string; subtitle?: string }) {
  return (
    <Card className="rounded-xl border-border/60 bg-card/80 backdrop-blur-xl relative">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className={tokens.kpi.label}>{label}</p>
            <p className={tokens.kpi.value}>{value}</p>
            {subtitle && <p className="font-sans text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={tokens.card.iconBox}>
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
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
        <Card className="rounded-xl border-border/60 bg-card/80 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>Adoption Timeline</CardTitle>
                <CardDescription className="font-sans text-sm">Monthly backroom activations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {metrics.adoptionTimeline.map((m) => {
                const maxCount = Math.max(...metrics.adoptionTimeline.map((t) => t.count), 1);
                const heightPct = (m.count / maxCount) * 100;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="font-sans text-[10px] text-muted-foreground tabular-nums">{m.count}</span>
                    <div
                      className="w-full rounded-t bg-primary/20 border border-primary/30 min-h-[4px] transition-all"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                    <span className="font-sans text-[10px] text-muted-foreground">{m.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Org Usage */}
      <Card className="rounded-xl border-border/60 bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Organization Usage</CardTitle>
              <CardDescription className="font-sans text-sm">
                {metrics.orgUsageStats.length} backroom-enabled organizations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {metrics.orgUsageStats.length === 0 ? (
            <div className={cn(tokens.empty.container, 'py-12')}>
              <Building2 className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No enabled organizations</h3>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Organization</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Snapshots</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Avg Waste %</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Sessions</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.orgUsageStats.map((org) => (
                  <TableRow key={org.orgId}>
                    <TableCell className="font-sans text-sm font-medium">{org.orgName}</TableCell>
                    <TableCell className="font-sans text-sm tabular-nums">{org.snapshotCount}</TableCell>
                    <TableCell className="font-sans text-sm tabular-nums">
                      {org.avgWastePct != null ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-sans text-xs',
                            org.avgWastePct > 10
                              ? 'text-destructive border-destructive/20'
                              : 'text-emerald-600 border-emerald-500/20'
                          )}
                        >
                          {org.avgWastePct.toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-sans text-sm tabular-nums">{org.totalSessions.toLocaleString()}</TableCell>
                    <TableCell className="font-sans text-xs text-muted-foreground">
                      {org.lastSnapshotDate ? new Date(org.lastSnapshotDate).toLocaleDateString() : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
