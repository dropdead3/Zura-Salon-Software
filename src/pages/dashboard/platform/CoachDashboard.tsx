import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Loader2, Building2, BarChart3, AlertCircle } from 'lucide-react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMyCoachAssignments } from '@/hooks/platform/useCoachAssignments';
import { useBackroomPlatformAnalytics } from '@/hooks/platform/useBackroomPlatformAnalytics';

export default function CoachDashboard() {
  const { data: assignments, isLoading: assignmentsLoading } = useMyCoachAssignments();
  const { data: metrics, isLoading: metricsLoading } = useBackroomPlatformAnalytics();

  const isLoading = assignmentsLoading || metricsLoading;

  if (isLoading) {
    return (
      <PlatformPageContainer>
        <div className="flex items-center justify-center h-64">
          <Loader2 className={tokens.loading.spinner} />
        </div>
      </PlatformPageContainer>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <PlatformPageContainer>
        <PlatformPageHeader
          title="Coach Dashboard"
          description="Your assigned organizations"
        />
        <div className={cn(tokens.empty.container, 'mt-12')}>
          <Building2 className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>No assignments yet</h3>
          <p className={tokens.empty.description}>
            You haven't been assigned to any organizations. Contact a platform admin to get started.
          </p>
        </div>
      </PlatformPageContainer>
    );
  }

  const assignedOrgIds = new Set(assignments.map(a => a.organization_id));

  // Filter metrics to only assigned orgs
  const myOrgUsage = (metrics?.orgUsageStats || []).filter(o => assignedOrgIds.has(o.orgId));
  const myCoachingSignals = (metrics?.coachingSignals || []).filter(s => assignedOrgIds.has(s.orgId));

  return (
    <PlatformPageContainer>
      <PlatformPageHeader
        title="Coach Dashboard"
        description={`${assignments.length} assigned organization${assignments.length !== 1 ? 's' : ''}`}
      />

      <div className="space-y-6 mt-6">
        {/* Assigned Orgs Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map(a => {
            const usage = myOrgUsage.find(u => u.orgId === a.organization_id);
            return (
              <PlatformCard key={a.id} variant="glass">
                <PlatformCardContent className="p-5">
                  <div className="space-y-2">
                    <p className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
                      {a.org_name || 'Unknown Org'}
                    </p>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-sans text-slate-400">
                        {usage?.totalSessions.toLocaleString() ?? 0} sessions
                      </span>
                      {usage?.avgWastePct != null && (
                        <PlatformBadge
                          variant={usage.avgWastePct > 10 ? 'error' : 'success'}
                          size="sm"
                        >
                          {usage.avgWastePct.toFixed(1)}% waste
                        </PlatformBadge>
                      )}
                    </div>
                    <p className="font-sans text-xs text-slate-500">
                      Last active: {usage?.lastSnapshotDate
                        ? new Date(usage.lastSnapshotDate).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </PlatformCardContent>
              </PlatformCard>
            );
          })}
        </div>

        {/* Coaching Signals for my orgs */}
        {myCoachingSignals.length > 0 && (
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <PlatformCardTitle>Coaching Signals</PlatformCardTitle>
                  <PlatformCardDescription>
                    {myCoachingSignals.length} organization{myCoachingSignals.length !== 1 ? 's' : ''} need attention
                  </PlatformCardDescription>
                </div>
              </div>
            </PlatformCardHeader>
            <PlatformCardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50">
                    <TableHead className="font-sans text-xs text-slate-400">Organization</TableHead>
                    <TableHead className="font-sans text-xs text-slate-400">Reweigh %</TableHead>
                    <TableHead className="font-sans text-xs text-slate-400">Waste %</TableHead>
                    <TableHead className="font-sans text-xs text-slate-400">Sessions</TableHead>
                    <TableHead className="font-sans text-xs text-slate-400">Signal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myCoachingSignals.map(signal => (
                    <TableRow key={signal.orgId} className="border-slate-700/30">
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
                      <TableCell className="font-sans text-xs text-slate-400 max-w-[200px] truncate">
                        {signal.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </PlatformCardContent>
          </PlatformCard>
        )}

        {/* Usage Table */}
        {myOrgUsage.length > 0 && (
          <PlatformCard variant="glass">
            <PlatformCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <PlatformCardTitle>Organization Usage</PlatformCardTitle>
                  <PlatformCardDescription>Detailed backroom metrics</PlatformCardDescription>
                </div>
              </div>
            </PlatformCardHeader>
            <PlatformCardContent className="p-0">
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
                  {myOrgUsage.map(org => (
                    <TableRow key={org.orgId} className="border-slate-700/30">
                      <TableCell className="font-sans text-sm font-medium text-slate-200">{org.orgName}</TableCell>
                      <TableCell className="font-sans text-sm tabular-nums text-slate-300">{org.snapshotCount}</TableCell>
                      <TableCell className="font-sans text-sm tabular-nums">
                        {org.avgWastePct != null ? (
                          <PlatformBadge variant={org.avgWastePct > 10 ? 'error' : 'success'} size="sm">
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
            </PlatformCardContent>
          </PlatformCard>
        )}
      </div>
    </PlatformPageContainer>
  );
}
