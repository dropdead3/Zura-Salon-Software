/**
 * BackroomComplianceSection — Compliance dashboard for Backroom Settings.
 */

import { useState, useMemo, useEffect } from 'react';
import { PlatformCard, PlatformCardContent, PlatformCardHeader, PlatformCardTitle, PlatformCardDescription } from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { PlatformTable, PlatformTableBody, PlatformTableCell, PlatformTableHead, PlatformTableHeader, PlatformTableRow } from '@/components/platform/ui/PlatformTable';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  ShieldCheck, ShieldAlert, ShieldX, RefreshCw, Loader2, Beaker, Users, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Infotainer } from '@/components/ui/Infotainer';
import { format, subDays } from 'date-fns';
import { useBackroomComplianceTracker } from '@/hooks/backroom/useBackroomComplianceTracker';
import { useEvaluateComplianceLog } from '@/hooks/backroom/useEvaluateComplianceLog';

type RangeKey = 'today' | '7d' | '14d' | '30d';

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '14d', label: 'Last 14 Days' },
  { key: '30d', label: 'Last 30 Days' },
];

function getDateRange(key: RangeKey): { from: string; to: string } {
  const today = format(new Date(), 'yyyy-MM-dd');
  const daysMap: Record<RangeKey, number> = { today: 0, '7d': 6, '14d': 13, '30d': 29 };
  return { from: format(subDays(new Date(), daysMap[key]), 'yyyy-MM-dd'), to: today };
}

function getComplianceBadge(rate: number) {
  if (rate >= 90) return { variant: 'success' as const, icon: ShieldCheck, label: 'Strong' };
  if (rate >= 70) return { variant: 'warning' as const, icon: ShieldAlert, label: 'Watch' };
  return { variant: 'error' as const, icon: ShieldX, label: 'Needs Attention' };
}

export function BackroomComplianceSection() {
  const [range, setRange] = useState<RangeKey>('7d');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const { from, to } = useMemo(() => getDateRange(range), [range]);

  const { data, isLoading } = useBackroomComplianceTracker(from, to, undefined, staffFilter !== 'all' ? staffFilter : undefined);
  const evaluate = useEvaluateComplianceLog();

  const today = format(new Date(), 'yyyy-MM-dd');
  const [autoEvaluated, setAutoEvaluated] = useState(false);

  useEffect(() => {
    if (!isLoading && data && data.items.length === 0 && !autoEvaluated && !evaluate.isPending) {
      setAutoEvaluated(true);
      evaluate.mutate({ date: today });
    }
  }, [isLoading, data, autoEvaluated, evaluate, today]);

  const summary = data?.summary;
  const badge = summary ? getComplianceBadge(summary.complianceRate) : null;

  return (
    <div className="space-y-6">
      <Infotainer id="backroom-compliance-guide" title="Backroom Compliance" description="Track whether color/chemical appointments are being properly logged. Shows which stylists are weighing their bowls and which are skipping steps." icon={<ShieldCheck className="h-4 w-4 text-primary" />} />

      {/* Header + Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
          </div>
          <div>
            <h2 className={tokens.card.title}>Backroom Compliance</h2>
            <p className="font-sans text-sm text-[hsl(var(--platform-foreground-muted))]">Track which color appointments are being properly logged in Zura Backroom</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{RANGE_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <PlatformButton variant="outline" size="sm" onClick={() => evaluate.mutate({ date: today })} disabled={evaluate.isPending}>
            {evaluate.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Evaluate Today
          </PlatformButton>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>
      ) : !summary || summary.totalColorAppointments === 0 ? (
        <div className={tokens.empty.container}>
          <Beaker className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>No Compliance Data</h3>
          <p className={tokens.empty.description}>No color/chemical appointments found for the selected period. Click "Evaluate Today" to scan.</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PlatformCard variant="default">
              <PlatformCardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted))]" />
                  <p className="text-[11px] text-[hsl(var(--platform-foreground-muted))] font-display tracking-wider uppercase">Compliance Rate</p>
                  <MetricInfoTooltip description="Percentage of color appointments with a mix session AND reweigh." />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-display tabular-nums text-[hsl(var(--platform-foreground))]">{summary.complianceRate}%</span>
                  {badge && <PlatformBadge variant={badge.variant} size="sm">{badge.label}</PlatformBadge>}
                </div>
              </PlatformCardContent>
            </PlatformCard>

            <PlatformCard variant="default">
              <PlatformCardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Beaker className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted))]" />
                  <p className="text-[11px] text-[hsl(var(--platform-foreground-muted))] font-display tracking-wider uppercase">Color Appointments</p>
                </div>
                <span className="text-2xl font-display tabular-nums text-[hsl(var(--platform-foreground))]">{summary.totalColorAppointments}</span>
                <p className="text-[10px] text-[hsl(var(--platform-foreground-muted))] mt-1">{summary.compliant} tracked · {summary.missing} missing</p>
              </PlatformCardContent>
            </PlatformCard>

            <PlatformCard variant="default">
              <PlatformCardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted))]" />
                  <p className="text-[11px] text-[hsl(var(--platform-foreground-muted))] font-display tracking-wider uppercase">Reweigh Rate</p>
                  <MetricInfoTooltip description="Of sessions that exist, how many had bowls reweighed after service." />
                </div>
                <span className="text-2xl font-display tabular-nums text-[hsl(var(--platform-foreground))]">{summary.reweighRate}%</span>
              </PlatformCardContent>
            </PlatformCard>

            <PlatformCard variant="default">
              <PlatformCardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted))]" />
                  <p className="text-[11px] text-[hsl(var(--platform-foreground-muted))] font-display tracking-wider uppercase">Repeat Offenders</p>
                  <MetricInfoTooltip description="Staff with compliance rate below 70%." />
                </div>
                <span className="text-2xl font-display tabular-nums text-[hsl(var(--platform-foreground))]">
                  {data?.staffBreakdown.filter((s) => s.complianceRate < 70 && s.total >= 2).length ?? 0}
                </span>
              </PlatformCardContent>
            </PlatformCard>
          </div>

          {/* Trend Chart */}
          {(data?.trend.length ?? 0) >= 2 && (
            <PlatformCard variant="default">
              <PlatformCardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <PlatformCardTitle>Compliance Trend</PlatformCardTitle>
                  <MetricInfoTooltip description="Daily compliance rate over the selected period." />
                </div>
              </PlatformCardHeader>
              <PlatformCardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data!.trend} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="complianceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-[hsl(var(--platform-border)/0.3)]" />
                      <XAxis dataKey="date" tickFormatter={(d) => { const p = d.split('-'); return `${parseInt(p[1])}/${parseInt(p[2])}`; }} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(v: number) => [`${v}%`, 'Compliance']} contentStyle={{ backgroundColor: 'hsl(var(--platform-bg-card))', border: '1px solid hsl(var(--platform-border))', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="complianceRate" stroke="hsl(var(--chart-2))" fill="url(#complianceGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </PlatformCardContent>
            </PlatformCard>
          )}

          {/* Two-column: Staff Leaderboard + Missing Sessions */}
          <div className="grid md:grid-cols-2 gap-4">
            <PlatformCard variant="default">
              <PlatformCardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <PlatformCardTitle>Staff Compliance</PlatformCardTitle>
                  <MetricInfoTooltip description="Per-stylist compliance rates, sorted worst to best." />
                </div>
              </PlatformCardHeader>
              <PlatformCardContent>
                {(data?.staffBreakdown.length ?? 0) === 0 ? (
                  <p className="text-sm text-[hsl(var(--platform-foreground-muted))] text-center py-4">No data</p>
                ) : (
                  <PlatformTable>
                    <PlatformTableHeader>
                      <PlatformTableRow>
                        <PlatformTableHead>Stylist</PlatformTableHead>
                        <PlatformTableHead className="text-right">Total</PlatformTableHead>
                        <PlatformTableHead className="text-right">Missed</PlatformTableHead>
                        <PlatformTableHead className="text-right">Rate</PlatformTableHead>
                      </PlatformTableRow>
                    </PlatformTableHeader>
                    <PlatformTableBody>
                      {data!.staffBreakdown.map((s) => {
                        const b = getComplianceBadge(s.complianceRate);
                        return (
                          <PlatformTableRow
                            key={s.staffUserId}
                            className={cn('cursor-pointer', staffFilter === s.staffUserId && 'bg-[hsl(var(--platform-bg-hover)/0.5)]')}
                            onClick={() => setStaffFilter(staffFilter === s.staffUserId ? 'all' : s.staffUserId)}
                          >
                            <PlatformTableCell className="font-medium">{s.staffName}</PlatformTableCell>
                            <PlatformTableCell className="text-right tabular-nums">{s.total}</PlatformTableCell>
                            <PlatformTableCell className="text-right tabular-nums">{s.missing}</PlatformTableCell>
                            <PlatformTableCell className="text-right">
                              <PlatformBadge variant={b.variant} size="sm">{s.complianceRate}%</PlatformBadge>
                            </PlatformTableCell>
                          </PlatformTableRow>
                        );
                      })}
                    </PlatformTableBody>
                  </PlatformTable>
                )}
              </PlatformCardContent>
            </PlatformCard>

            <PlatformCard variant="default">
              <PlatformCardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <PlatformCardTitle>Missing Sessions</PlatformCardTitle>
                  <MetricInfoTooltip description="Color appointments with no mix session recorded." />
                </div>
              </PlatformCardHeader>
              <PlatformCardContent>
                {(() => {
                  const missing = data?.items.filter((i) => i.complianceStatus === 'missing') ?? [];
                  if (missing.length === 0) {
                    return <p className="text-sm text-[hsl(var(--platform-foreground-muted))] text-center py-4">All sessions tracked — great work!</p>;
                  }
                  return (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto">
                      {missing.slice(0, 20).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)]">
                          <div className="min-w-0">
                            <p className="font-sans text-sm text-[hsl(var(--platform-foreground))] truncate">{item.serviceName ?? 'Color Service'}</p>
                            <p className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] truncate">{item.staffName ?? 'Unknown'} · {item.appointmentDate}</p>
                          </div>
                          <PlatformBadge variant="error" size="sm">Missing</PlatformBadge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </PlatformCardContent>
            </PlatformCard>
          </div>
        </>
      )}
    </div>
  );
}
