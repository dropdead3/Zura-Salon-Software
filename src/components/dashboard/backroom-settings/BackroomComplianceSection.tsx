/**
 * BackroomComplianceSection — Compliance dashboard for Backroom Settings.
 * Shows daily/weekly compliance stats, staff leaderboard, missing sessions,
 * and a trend chart.
 */

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  ShieldCheck, ShieldAlert, ShieldX, RefreshCw, Loader2, Beaker, Users, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
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
  return {
    from: format(subDays(new Date(), daysMap[key]), 'yyyy-MM-dd'),
    to: today,
  };
}

function getComplianceBadge(rate: number) {
  if (rate >= 90) return { color: 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800', icon: ShieldCheck, label: 'Strong' };
  if (rate >= 70) return { color: 'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800', icon: ShieldAlert, label: 'Watch' };
  return { color: 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-800', icon: ShieldX, label: 'Needs Attention' };
}

export function BackroomComplianceSection() {
  const [range, setRange] = useState<RangeKey>('7d');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const { from, to } = useMemo(() => getDateRange(range), [range]);

  const { data, isLoading } = useBackroomComplianceTracker(
    from,
    to,
    undefined,
    staffFilter !== 'all' ? staffFilter : undefined,
  );
  const evaluate = useEvaluateComplianceLog();

  // Auto-evaluate today on first load if empty
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
      <Infotainer
        id="backroom-compliance-guide"
        title="Backroom Compliance"
        description="Track whether color/chemical appointments are being properly logged. Shows which stylists are weighing their bowls and which are skipping steps."
        icon={<ShieldCheck className="h-4 w-4 text-primary" />}
      />
      {/* Header + Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className={tokens.card.title}>Backroom Compliance</h2>
            <p className="font-sans text-sm text-muted-foreground">
              Track which color appointments are being properly logged in Zura Backroom
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size={tokens.button.card}
            onClick={() => evaluate.mutate({ date: today })}
            disabled={evaluate.isPending}
          >
            {evaluate.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Evaluate Today
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className={tokens.loading.spinner} />
        </div>
      ) : !summary || summary.totalColorAppointments === 0 ? (
        <div className={tokens.empty.container}>
          <Beaker className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>No Compliance Data</h3>
          <p className={tokens.empty.description}>
            No color/chemical appointments found for the selected period. Click "Evaluate Today" to scan.
          </p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground font-display tracking-wider uppercase">Compliance Rate</p>
                  <MetricInfoTooltip description="Percentage of color appointments with a mix session AND reweigh." />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-display tabular-nums">{summary.complianceRate}%</span>
                  {badge && (
                    <Badge variant="outline" className={cn('text-[10px]', badge.color)}>
                      {badge.label}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Beaker className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground font-display tracking-wider uppercase">Color Appointments</p>
                </div>
                <span className="text-2xl font-display tabular-nums">{summary.totalColorAppointments}</span>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {summary.compliant} tracked · {summary.missing} missing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground font-display tracking-wider uppercase">Reweigh Rate</p>
                  <MetricInfoTooltip description="Of sessions that exist, how many had bowls reweighed after service." />
                </div>
                <span className="text-2xl font-display tabular-nums">{summary.reweighRate}%</span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground font-display tracking-wider uppercase">Repeat Offenders</p>
                  <MetricInfoTooltip description="Staff with compliance rate below 70%." />
                </div>
                <span className="text-2xl font-display tabular-nums">
                  {data?.staffBreakdown.filter((s) => s.complianceRate < 70 && s.total >= 2).length ?? 0}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Trend Chart */}
          {(data?.trend.length ?? 0) >= 2 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>Compliance Trend</CardTitle>
                  <MetricInfoTooltip description="Daily compliance rate over the selected period." />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data!.trend} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="complianceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => { const p = d.split('-'); return `${parseInt(p[1])}/${parseInt(p[2])}`; }}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(v: number) => [`${v}%`, 'Compliance']}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      />
                      <Area type="monotone" dataKey="complianceRate" stroke="hsl(var(--chart-2))" fill="url(#complianceGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Two-column: Staff Leaderboard + Missing Sessions */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Staff Leaderboard */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>Staff Compliance</CardTitle>
                  <MetricInfoTooltip description="Per-stylist compliance rates, sorted worst to best." />
                </div>
              </CardHeader>
              <CardContent>
                {(data?.staffBreakdown.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stylist</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Missed</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data!.staffBreakdown.map((s) => {
                        const b = getComplianceBadge(s.complianceRate);
                        return (
                          <TableRow
                            key={s.staffUserId}
                            className={cn(
                              'cursor-pointer hover:bg-muted/30',
                              staffFilter === s.staffUserId && 'bg-muted/40',
                            )}
                            onClick={() => setStaffFilter(staffFilter === s.staffUserId ? 'all' : s.staffUserId)}
                          >
                            <TableCell className="font-medium">{s.staffName}</TableCell>
                            <TableCell className="text-right tabular-nums">{s.total}</TableCell>
                            <TableCell className="text-right tabular-nums">{s.missing}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={cn('text-[10px] tabular-nums', b.color)}>
                                {s.complianceRate}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Missing Sessions */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>Missing Sessions</CardTitle>
                  <MetricInfoTooltip description="Color appointments with no mix session recorded." />
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const missing = data?.items.filter((i) => i.complianceStatus === 'missing') ?? [];
                  if (missing.length === 0) {
                    return <p className="text-sm text-muted-foreground text-center py-4">All sessions tracked — great work!</p>;
                  }
                  return (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto">
                      {missing.slice(0, 20).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-background/50">
                          <div className="min-w-0">
                            <p className="font-sans text-sm truncate">{item.serviceName ?? 'Color Service'}</p>
                            <p className="font-sans text-xs text-muted-foreground truncate">
                              {item.staffName ?? 'Unknown'} · {item.appointmentDate}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] text-red-600 border-red-300 dark:text-red-400 dark:border-red-800 shrink-0">
                            Missing
                          </Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
