import { useState, useEffect, useMemo } from 'react';
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
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Building2, DollarSign, TrendingDown, Loader2, Activity, AlertCircle, CheckCircle2, Mail, History } from 'lucide-react';
import { useBackroomPlatformAnalytics, type CoachingSignal } from '@/hooks/platform/useBackroomPlatformAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

const COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours

function formatCooldownLabel(coachedAt: string): string {
  const diff = Date.now() - new Date(coachedAt).getTime();
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return 'Coached just now';
  if (hours < 24) return `Coached ${hours}h ago`;
  return `Coached ${Math.floor(hours / 24)}d ago`;
}

export function BackroomAnalyticsTab() {
  const [sendingOrgId, setSendingOrgId] = useState<string | null>(null);
  const [coachedMap, setCoachedMap] = useState<Record<string, string>>({});
  const { data: metrics, isLoading } = useBackroomPlatformAnalytics();

  // Fetch last_backroom_coached_at for coaching signal orgs
  useEffect(() => {
    if (!metrics?.coachingSignals.length) return;
    const orgIds = metrics.coachingSignals.map((s) => s.orgId);
    supabase
      .from('organizations')
      .select('id, last_backroom_coached_at')
      .in('id', orgIds)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        data.forEach((org: any) => {
          if (org.last_backroom_coached_at) map[org.id] = org.last_backroom_coached_at;
        });
        setCoachedMap(map);
      });
  }, [metrics?.coachingSignals]);

  const isOnCooldown = (orgId: string) => {
    const coachedAt = coachedMap[orgId];
    if (!coachedAt) return false;
    return Date.now() - new Date(coachedAt).getTime() < COOLDOWN_MS;
  };

  const handleSendCoachingEmail = async (signal: CoachingSignal) => {
    setSendingOrgId(signal.orgId);
    try {
      const { data, error } = await supabase.functions.invoke('send-coaching-email', {
        body: { org_id: signal.orgId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCoachedMap((prev) => ({ ...prev, [signal.orgId]: new Date().toISOString() }));
      toast({ title: 'Coaching email sent', description: data?.message || `Email sent to ${signal.orgName}` });
    } catch (err: any) {
      toast({ title: 'Failed to send email', description: err.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setSendingOrgId(null);
    }
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
        <KPICard
          icon={Mail}
          label="Coaching Emails"
          value={String(metrics.coachingEmailsSent ?? 0)}
          subtitle="Total outreach sent"
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

      {/* Coaching & Adoption Signals */}
      {metrics.coachingSignals.length > 0 && (
        <PlatformCard variant="glass">
          <PlatformCardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <PlatformCardTitle>Coaching & Adoption Signals</PlatformCardTitle>
                <PlatformCardDescription>
                  {metrics.coachingSignals.filter((s) => s.healthScore !== 'green').length} orgs need attention
                </PlatformCardDescription>
              </div>
            </div>
          </PlatformCardHeader>
          <PlatformCardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50">
                  <TableHead className="font-sans text-xs text-slate-400">Health</TableHead>
                  <TableHead className="font-sans text-xs text-slate-400">Organization</TableHead>
                  <TableHead className="font-sans text-xs text-slate-400">Reweigh %</TableHead>
                  <TableHead className="font-sans text-xs text-slate-400">Waste %</TableHead>
                  <TableHead className="font-sans text-xs text-slate-400">Sessions</TableHead>
                  <TableHead className="font-sans text-xs text-slate-400">Last Active</TableHead>
                  <TableHead className="font-sans text-xs text-slate-400">Signal</TableHead>
                  <TableHead className="font-sans text-xs text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.coachingSignals.map((signal) => (
                  <TableRow key={signal.orgId} className="border-slate-700/30">
                    <TableCell>
                      <HealthDot score={signal.healthScore} />
                    </TableCell>
                    <TableCell className="font-sans text-sm font-medium text-slate-200">
                      {signal.orgName}
                    </TableCell>
                    <TableCell className="font-sans text-sm tabular-nums">
                      {signal.avgReweighPct != null ? (
                        <PlatformBadge
                          variant={signal.avgReweighPct < 50 ? 'error' : signal.avgReweighPct < 75 ? 'warning' : 'success'}
                          size="sm"
                        >
                          {signal.avgReweighPct.toFixed(0)}%
                        </PlatformBadge>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-sans text-sm tabular-nums">
                      {signal.avgWastePct != null ? (
                        <span className="text-slate-300">{signal.avgWastePct.toFixed(1)}%</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-sans text-sm tabular-nums text-slate-300">
                      {signal.sessionCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-sans text-xs text-slate-500">
                      {signal.lastActiveDate
                        ? new Date(signal.lastActiveDate).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="font-sans text-xs text-slate-400 max-w-[200px] truncate">
                      {signal.reason}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block">
                              <PlatformButton
                                variant="ghost"
                                size="sm"
                                loading={sendingOrgId === signal.orgId}
                                disabled={sendingOrgId !== null || isOnCooldown(signal.orgId)}
                                onClick={() => handleSendCoachingEmail(signal)}
                                className="gap-1.5"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span className="font-sans text-xs">Coach</span>
                              </PlatformButton>
                            </span>
                          </TooltipTrigger>
                          {isOnCooldown(signal.orgId) && (
                            <TooltipContent>
                              <span className="font-sans text-xs">{formatCooldownLabel(coachedMap[signal.orgId])}</span>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PlatformCardContent>
        </PlatformCard>
      )}
    </div>
  );
}

function HealthDot({ score }: { score: 'green' | 'amber' | 'red' }) {
  const colors = {
    green: 'bg-emerald-400',
    amber: 'bg-amber-400',
    red: 'bg-red-400',
  };
  return (
    <div className="flex items-center justify-center">
      <div className={cn('w-2.5 h-2.5 rounded-full', colors[score])} />
    </div>
  );
}
