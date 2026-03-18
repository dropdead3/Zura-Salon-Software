/**
 * BackroomInsightsSection — Top-level KPI cards + Employee Performance table.
 */

import { useState, useMemo } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  DollarSign, Beaker, ClipboardCheck, Trash2, AlertTriangle, Download, ArrowUpDown, ChevronDown, Loader2, MapPin,
} from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBackroomAnalytics } from '@/hooks/backroom/useBackroomAnalytics';
import { useBackroomStaffMetrics } from '@/hooks/backroom/useBackroomStaffMetrics';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { BackroomBrandUsageCard } from './BackroomBrandUsageCard';
import { BackroomHistoryChart } from './BackroomHistoryChart';
import { useActiveLocations } from '@/hooks/useLocations';
import { toast } from 'sonner';

type DatePreset = 'today' | '7d' | '30d' | 'this_month' | 'last_month' | '90d';

function getDateRange(preset: DatePreset): { start: string; end: string; label: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (preset) {
    case 'today': return { start: fmt(today), end: fmt(today), label: 'Today' };
    case '7d': return { start: fmt(subDays(today, 6)), end: fmt(today), label: 'Last 7 Days' };
    case '30d': return { start: fmt(subDays(today, 29)), end: fmt(today), label: 'Last 30 Days' };
    case 'this_month': return { start: fmt(startOfMonth(today)), end: fmt(today), label: 'This Month' };
    case 'last_month': { const lm = subMonths(today, 1); return { start: fmt(startOfMonth(lm)), end: fmt(endOfMonth(lm)), label: 'Last Month' }; }
    case '90d': return { start: fmt(subDays(today, 89)), end: fmt(today), label: 'Last 90 Days' };
  }
}

type SortKey = 'name' | 'sessions' | 'waste' | 'reweigh' | 'duration';

export function BackroomInsightsSection() {
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [sortKey, setSortKey] = useState<SortKey>('sessions');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('all');
  const { data: activeLocations = [] } = useActiveLocations();

  const { start, end, label: rangeLabel } = getDateRange(datePreset);
  const effectiveLocationId = selectedLocationId === 'all' ? undefined : selectedLocationId;
  const { data: analytics, isLoading: analyticsLoading } = useBackroomAnalytics(start, end, effectiveLocationId);
  const { data: staffMetrics, isLoading: staffLoading } = useBackroomStaffMetrics(start, end, effectiveLocationId);
  const { formatCurrency } = useFormatCurrency();
  const { formatNumber, formatPercent } = useFormatNumber();

  const sortedStaff = useMemo(() => {
    if (!staffMetrics?.length) return [];
    const arr = [...staffMetrics];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.staffName.localeCompare(b.staffName); break;
        case 'sessions': cmp = a.sessionsPerDay - b.sessionsPerDay; break;
        case 'waste': cmp = a.wastePct - b.wastePct; break;
        case 'reweigh': cmp = a.reweighCompliancePct - b.reweighCompliancePct; break;
        case 'duration': cmp = a.avgSessionDurationMinutes - b.avgSessionDurationMinutes; break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [staffMetrics, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => { if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(false); } };

  const handleExportCSV = () => {
    if (!sortedStaff.length) { toast.error('No data to export'); return; }
    const headers = ['Staff', 'Sessions/Day', 'Avg Duration (min)', 'Waste %', 'Reweigh %'];
    const rows = sortedStaff.map((s) => [s.staffName, s.sessionsPerDay, s.avgSessionDurationMinutes, s.wastePct, s.reweighCompliancePct]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `backroom-insights-${start}-to-${end}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const SortButton = ({ label, field }: { label: string; field: SortKey }) => (
    <button className="flex items-center gap-1 group" onClick={() => handleSort(field)}>
      <span>{label}</span>
      <ArrowUpDown className={cn('w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity', sortKey === field && 'opacity-100')} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className={tokens.heading.section}>Backroom Insights</h2>
          <p className="text-sm text-muted-foreground mt-1">High-level backroom performance for {rangeLabel.toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeLocations.length > 1 && (
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger className="w-fit gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {activeLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard icon={DollarSign} label="Product Cost" tooltip="Total wholesale cost of all chemicals dispensed during the selected period." loading={analyticsLoading}>
          <BlurredAmount className={tokens.kpi.value}>{formatCurrency(analytics?.totalProductCost ?? 0)}</BlurredAmount>
        </KPICard>
        <KPICard icon={Beaker} label="Product Dispensed" tooltip="Total quantity (grams) of product dispensed across all mixing sessions." loading={analyticsLoading}>
          <span className={tokens.kpi.value}>{formatNumber(analytics?.totalDispensedQty ?? 0, { maximumFractionDigits: 0 })}g</span>
        </KPICard>
        <KPICard icon={Scale} label="Reweighed %" tooltip="Percentage of bowls that were reweighed after application. Higher rates improve waste tracking accuracy." loading={analyticsLoading} accent={getComplianceAccent(analytics?.reweighCompliancePct)}>
          <span className={tokens.kpi.value}>{formatPercent(analytics?.reweighCompliancePct ?? 0, false)}</span>
        </KPICard>
        <KPICard icon={Trash2} label="Waste Rate" tooltip="Percentage of dispensed product recorded as waste. Lower is better — industry target is under 15%." loading={analyticsLoading} accent={getWasteAccent(analytics?.wastePct)}>
          <span className={tokens.kpi.value}>{formatPercent(analytics?.wastePct ?? 0, false)}</span>
        </KPICard>
        <KPICard icon={AlertTriangle} label="Est. Waste Cost" tooltip="Estimated dollar value of wasted product based on wholesale cost and recorded waste quantities." loading={analyticsLoading}>
          <BlurredAmount className={cn(tokens.kpi.value, 'text-destructive')}>{formatCurrency(((analytics?.totalProductCost ?? 0) * (analytics?.wastePct ?? 0)) / 100)}</BlurredAmount>
        </KPICard>
      </div>

      {/* Employee Performance Table */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Beaker className={tokens.card.icon} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>Employee Performance</CardTitle>
                <MetricInfoTooltip description="Per-stylist backroom efficiency metrics for the selected date range. Sessions/Day, average mix duration, waste percentage, and reweigh compliance." />
              </div>
              <CardDescription className="text-xs">{rangeLabel}</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!sortedStaff.length}>
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
        </CardHeader>
        <CardContent>
          {staffLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>
          ) : !sortedStaff.length ? (
            <div className={tokens.empty.container}>
              <Beaker className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No mixing data</h3>
              <p className={tokens.empty.description}>No completed mixing sessions found for this period.</p>
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><SortButton label="Staff" field="name" /></TableHead>
                    <TableHead className="text-right"><SortButton label="Sessions/Day" field="sessions" /></TableHead>
                    <TableHead className="text-right"><SortButton label="Avg Duration" field="duration" /></TableHead>
                    <TableHead className="text-right"><SortButton label="Waste %" field="waste" /></TableHead>
                    <TableHead className="text-right"><SortButton label="Reweigh %" field="reweigh" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStaff.map((s) => (
                    <TableRow key={s.staffUserId}>
                      <TableCell className="font-sans text-sm font-medium">{s.staffName}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.sessionsPerDay}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.avgSessionDurationMinutes} min</TableCell>
                      <TableCell className="text-right">
                        <span className={cn('tabular-nums', s.wastePct > 20 && 'text-destructive', s.wastePct <= 10 && 'text-primary')}>
                          {formatPercent(s.wastePct, false)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn('tabular-nums', s.reweighCompliancePct < 50 && 'text-destructive', s.reweighCompliancePct >= 80 && 'text-primary')}>
                          {formatPercent(s.reweighCompliancePct, false)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <BackroomHistoryChart startDate={start} endDate={end} rangeLabel={rangeLabel} locationId={effectiveLocationId} />
      <BackroomBrandUsageCard startDate={start} endDate={end} rangeLabel={rangeLabel} locationId={effectiveLocationId} />
    </div>
  );
}

function KPICard({ icon: Icon, label, tooltip, loading, children, accent }: {
  icon: typeof DollarSign; label: string; tooltip: string; loading: boolean; children: React.ReactNode; accent?: string;
}) {
  return (
    <div className={cn(tokens.kpi.tile, 'relative')}>
      <div className={tokens.kpi.infoIcon}><MetricInfoTooltip description={tooltip} /></div>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className={tokens.kpi.label}>{label}</span>
      </div>
      {loading ? <Skeleton className="h-7 w-24" /> : <div className={accent}>{children}</div>}
    </div>
  );
}

function getComplianceAccent(pct?: number): string | undefined {
  if (pct === undefined) return undefined;
  if (pct >= 80) return 'text-primary';
  if (pct < 50) return 'text-destructive';
  return 'text-warning';
}

function getWasteAccent(pct?: number): string | undefined {
  if (pct === undefined) return undefined;
  if (pct <= 10) return 'text-primary';
  if (pct > 20) return 'text-destructive';
  return 'text-warning';
}
