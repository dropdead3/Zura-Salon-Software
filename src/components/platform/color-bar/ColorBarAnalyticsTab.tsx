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
import { PlatformTable as Table, PlatformTableBody as TableBody, PlatformTableCell as TableCell, PlatformTableHead as TableHead, PlatformTableHeader as TableHeader, PlatformTableRow as TableRow } from '@/components/platform/ui/PlatformTable';
import { BarChart3, Building2, DollarSign, TrendingDown, Loader2, Activity, AlertCircle, CheckCircle2, Mail, History, UserPlus } from 'lucide-react';
import { useColorBarPlatformAnalytics, type CoachingSignal } from '@/hooks/platform/useColorBarPlatformAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CoachingHistoryDrawer } from './CoachingHistoryDrawer';
import { useCoachAssignments, useAssignCoach, useUnassignCoach } from '@/hooks/platform/useCoachAssignments';
import { usePlatformTeam } from '@/hooks/usePlatformRoles';

function KPICard({ icon: Icon, label, value, subtitle }: { icon: any; label: string; value: string; subtitle?: string }) {
  return (
    <PlatformCard variant="glass" className="relative">
      <PlatformCardContent className="p-5 pt-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">{label}</p>
            <p className="font-display text-2xl tracking-tight text-[hsl(var(--platform-foreground))]">{value}</p>
            {subtitle && <p className="font-sans text-xs text-[hsl(var(--platform-foreground-subtle))]">{subtitle}</p>}
          </div>
          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
            <Icon className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}

/* ── Table Cell Helpers ── */

const HEALTH_MAP: Record<CoachingSignal['healthScore'], { label: string; color: string }> = {
  green: { label: 'Healthy', color: 'emerald-400' },
  amber: { label: 'Needs Attention', color: 'amber-400' },
  red: { label: 'Critical', color: 'red-400' },
};

const COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours

function formatCooldownLabel(coachedAt: string): string {
  const diff = Date.now() - new Date(coachedAt).getTime();
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return 'Coached just now';
  if (hours < 24) return `Coached ${hours}h ago`;
  return `Coached ${Math.floor(hours / 24)}d ago`;
}

export function ColorBarAnalyticsTab() {
  const [sendingOrgId, setSendingOrgId] = useState<string | null>(null);
  const [coachedMap, setCoachedMap] = useState<Record<string, string>>({});
  const [historyOrg, setHistoryOrg] = useState<{ id: string; name: string } | null>(null);
  const { data: metrics, isLoading } = useColorBarPlatformAnalytics();
  const { data: assignments } = useCoachAssignments();
  const { data: teamMembers } = usePlatformTeam();
  const assignCoach = useAssignCoach();
  const unassignCoach = useUnassignCoach();

  // Build a map of orgId -> coach assignment
  const coachByOrg = useMemo(() => {
    const map = new Map<string, { coachUserId: string; coachName: string }>();
    (assignments || []).forEach(a => {
      map.set(a.organization_id, {
        coachUserId: a.coach_user_id,
        coachName: a.coach_name || a.coach_email || 'Unknown',
      });
    });
    return map;
  }, [assignments]);

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
          subtitle="All-time color bar sessions"
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
        <PlatformCard variant="glass" size="container">
          <PlatformCardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
              </div>
              <div>
                <PlatformCardTitle>Adoption Timeline</PlatformCardTitle>
                <PlatformCardDescription>Monthly color bar activations</PlatformCardDescription>
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
                    <span className="font-sans text-[10px] text-[hsl(var(--platform-foreground-subtle))] tabular-nums">{m.count}</span>
                    <div
                      className="w-full rounded-t bg-[hsl(var(--platform-primary)/0.2)] border border-[hsl(var(--platform-primary)/0.3)] min-h-[4px] transition-all"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                    <span className="font-sans text-[10px] text-[hsl(var(--platform-foreground-subtle))]">{m.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </PlatformCardContent>
        </PlatformCard>
      )}

      {/* Per-Org Usage */}
       <PlatformCard variant="glass" size="container">
        <PlatformCardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
            </div>
            <div>
              <PlatformCardTitle>Organization Usage</PlatformCardTitle>
              <PlatformCardDescription>
                {metrics.orgUsageStats.length} color-bar-enabled organizations
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
                <TableRow className="border-[hsl(var(--platform-border)/0.5)]">
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Organization</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Snapshots</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Avg Waste %</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Sessions</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.orgUsageStats.map((org) => (
                  <TableRow key={org.orgId} className="border-[hsl(var(--platform-border)/0.3)]">
                    <TableCell className="font-sans text-sm font-medium text-[hsl(var(--platform-foreground))]">{org.orgName}</TableCell>
                    <TableCell className="font-sans text-sm tabular-nums text-[hsl(var(--platform-foreground)/0.85)]">{org.snapshotCount}</TableCell>
                    <TableCell className="font-sans text-sm tabular-nums">
                      {org.avgWastePct != null ? (
                        <PlatformBadge
                          variant={org.avgWastePct > 10 ? 'error' : 'success'}
                          size="sm"
                        >
                          {org.avgWastePct.toFixed(1)}%
                        </PlatformBadge>
                      ) : (
                        <span className="text-[hsl(var(--platform-foreground-subtle))]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-sans text-sm tabular-nums text-[hsl(var(--platform-foreground)/0.85)]">{org.totalSessions.toLocaleString()}</TableCell>
                    <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground-subtle))]">
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
        <PlatformCard variant="glass" size="container">
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
                <TableRow className="border-[hsl(var(--platform-border)/0.5)]">
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Health</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Organization</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Coach</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Reweigh %</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Waste %</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Sessions</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Last Active</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Signal</TableHead>
                  <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.coachingSignals.map((signal) => (
                  <TableRow key={signal.orgId} className="border-[hsl(var(--platform-border)/0.3)]">
                    <TableCell>
                      <HealthDot score={signal.healthScore} />
                    </TableCell>
                    <TableCell className="font-sans text-sm font-medium text-[hsl(var(--platform-foreground))]">
                      {signal.orgName}
                    </TableCell>
                    <TableCell>
                      <CoachAssignCell
                        orgId={signal.orgId}
                        coachByOrg={coachByOrg}
                        teamMembers={teamMembers || []}
                        onAssign={(coachUserId) => assignCoach.mutate({ coachUserId, organizationId: signal.orgId })}
                        onUnassign={(coachUserId) => unassignCoach.mutate({ coachUserId, organizationId: signal.orgId })}
                      />
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
                        <span className="text-[hsl(var(--platform-foreground-subtle))]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-sans text-sm tabular-nums">
                      {signal.avgWastePct != null ? (
                        <span className="text-[hsl(var(--platform-foreground)/0.85)]">{signal.avgWastePct.toFixed(1)}%</span>
                      ) : (
                        <span className="text-[hsl(var(--platform-foreground-subtle))]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-sans text-sm tabular-nums text-[hsl(var(--platform-foreground)/0.85)]">
                      {signal.sessionCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground-subtle))]">
                      {signal.lastActiveDate
                        ? new Date(signal.lastActiveDate).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] max-w-[200px] truncate">
                      {signal.reason}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
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
                        <PlatformButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoryOrg({ id: signal.orgId, name: signal.orgName })}
                          className="gap-1.5"
                        >
                          <History className="w-3.5 h-3.5" />
                        </PlatformButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PlatformCardContent>
        </PlatformCard>
      )}

      <CoachingHistoryDrawer
        orgId={historyOrg?.id ?? null}
        orgName={historyOrg?.name ?? ''}
        open={!!historyOrg}
        onOpenChange={(v) => { if (!v) setHistoryOrg(null); }}
      />
    </div>
  );
}

/* ── Helper Components ── */

function HealthDot({ score }: { score: CoachingSignal['healthScore'] }) {
  const cfg = HEALTH_MAP[score];
  return <span className={cn('block w-3 h-3 rounded-full', `bg-${cfg.color}`)} />;
}

function CoachAssignCell({
  orgId,
  coachByOrg,
  teamMembers,
  onAssign,
  onUnassign,
}: {
  orgId: string;
  coachByOrg: Map<string, { coachUserId: string; coachName: string }>;
  teamMembers: Array<{ user_id: string; full_name?: string | null; email?: string | null }>;
  onAssign: (coachUserId: string) => void;
  onUnassign: (coachUserId: string) => void;
}) {
  const assignment = coachByOrg.get(orgId);

  if (assignment) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-sans text-xs text-[hsl(var(--platform-foreground)/0.85)] truncate max-w-[120px]">{assignment.coachName}</span>
        <PlatformButton
          variant="ghost"
          size="icon-sm"
          className="h-5 w-5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={() => onUnassign(assignment.coachUserId)}
          title="Remove coach"
        >
          ×
        </PlatformButton>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <PlatformButton variant="ghost" size="sm" className="gap-1 text-xs h-7">
          <UserPlus className="w-3 h-3" />
          Assign
        </PlatformButton>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1 bg-[hsl(var(--platform-bg-elevated))] border-[hsl(var(--platform-border))]" align="start">
        {teamMembers.length === 0 ? (
          <p className="p-2 font-sans text-xs text-[hsl(var(--platform-foreground-subtle))]">No team members</p>
        ) : (
          teamMembers.map((m) => (
            <button
              key={m.user_id}
              onClick={() => onAssign(m.user_id)}
              className="w-full text-left px-2 py-1.5 rounded font-sans text-xs text-[hsl(var(--platform-foreground)/0.85)] hover:bg-[hsl(var(--platform-bg-hover))] transition-colors"
            >
              {m.full_name || m.email}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
