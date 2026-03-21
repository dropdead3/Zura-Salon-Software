/**
 * BackroomInsightsSection — Top-level KPI cards + Employee Performance table.
 */

import { useState, useMemo } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  DollarSign, Beaker, ClipboardCheck, Trash2, AlertTriangle, Download, ArrowUpDown, ChevronUp, ChevronDown, Loader2, MapPin, Eye, EyeOff,
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
import { useBackroomAnalytics } from '@/hooks/backroom/useBackroomAnalytics';
import { useBackroomStaffMetrics } from '@/hooks/backroom/useBackroomStaffMetrics';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { BackroomBrandUsageCard } from './BackroomBrandUsageCard';
import { BackroomHistoryChart } from './BackroomHistoryChart';
import { BackroomProductAnalyticsCard } from './BackroomProductAnalyticsCard';
import { useActiveLocations } from '@/hooks/useLocations';
import { toast } from 'sonner';
import type { StaffMetric } from '@/lib/backroom/analytics-engine';

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

// Sortable column keys
type SortKey = 'name' | 'totalServices' | 'totalProductCost' | 'productPerServiceCost' | 'reweigh' | 'wastePerServiceCost' | 'productCharges' | 'sessionsPerDay' | 'duration' | 'waste' | 'variance';

// Staff avatar colors (cycling)
const AVATAR_COLORS = [
  'bg-primary/20 text-primary',
  'bg-accent/20 text-accent-foreground',
  'bg-destructive/10 text-destructive',
  'bg-muted text-muted-foreground',
  'bg-secondary text-secondary-foreground',
  'bg-primary/30 text-primary',
];

function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

interface BackroomInsightsSectionProps {
  locationId?: string;
  datePreset?: DatePreset;
  hideFilters?: boolean;
}

export function BackroomInsightsSection({ locationId: propLocationId, datePreset: propDatePreset, hideFilters }: BackroomInsightsSectionProps = {}) {
  const [internalDatePreset, setInternalDatePreset] = useState<DatePreset>('30d');
  const [sortKey, setSortKey] = useState<SortKey>('totalServices');
  const [sortAsc, setSortAsc] = useState(false);
  const [showHiddenFields, setShowHiddenFields] = useState(false);
  const [internalLocationId, setInternalLocationId] = useState('all');
  const { data: activeLocations = [] } = useActiveLocations();

  const datePreset = propDatePreset ?? internalDatePreset;
  const selectedLocationId = propLocationId ?? internalLocationId;

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
        case 'totalServices': cmp = a.totalServices - b.totalServices; break;
        case 'totalProductCost': cmp = a.totalProductCost - b.totalProductCost; break;
        case 'productPerServiceCost': cmp = a.productPerServiceCost - b.productPerServiceCost; break;
        case 'reweigh': cmp = a.reweighCompliancePct - b.reweighCompliancePct; break;
        case 'wastePerServiceCost': cmp = a.wastePerServiceCost - b.wastePerServiceCost; break;
        case 'productCharges': cmp = a.productCharges - b.productCharges; break;
        case 'sessionsPerDay': cmp = a.sessionsPerDay - b.sessionsPerDay; break;
        case 'duration': cmp = a.avgSessionDurationMinutes - b.avgSessionDurationMinutes; break;
        case 'waste': cmp = a.wastePct - b.wastePct; break;
        case 'variance': cmp = a.variancePct - b.variancePct; break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [staffMetrics, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => { if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(false); } };

  const hiddenFieldCount = 4;

  const handleExportCSV = () => {
    if (!sortedStaff.length) { toast.error('No data to export'); return; }
    const headers = ['Staff', 'Services', 'Product Dispensed ($)', 'Product Dispensed (g)', 'Product/Service ($)', 'Product/Service (g)', '% Reweighed', 'Waste/Service ($)', 'Product Charges ($)', 'Sessions/Day', 'Avg Duration (min)', 'Waste %', 'Variance %'];
    const rows = sortedStaff.map((s) => [
      s.staffName, s.totalServices, s.totalProductCost, s.totalDispensedQty,
      s.productPerServiceCost, s.productPerServiceQty, s.reweighCompliancePct,
      s.wastePerServiceCost, s.productCharges, s.sessionsPerDay,
      s.avgSessionDurationMinutes, s.wastePct, s.variancePct,
    ]);
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
        {!hideFilters && (
          <div className="flex items-center gap-2">
            {activeLocations.length > 1 && (
              <Select value={selectedLocationId} onValueChange={setInternalLocationId}>
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
            <Select value={datePreset} onValueChange={(v) => setInternalDatePreset(v as DatePreset)}>
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
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard icon={DollarSign} label="Product Cost" tooltip="Total wholesale cost of all chemicals dispensed during the selected period." loading={analyticsLoading}>
          <BlurredAmount className={tokens.kpi.value}>{formatCurrency(analytics?.totalProductCost ?? 0)}</BlurredAmount>
        </KPICard>
        <KPICard icon={Beaker} label="Product Dispensed" tooltip="Total quantity (grams) of product dispensed across all mixing sessions." loading={analyticsLoading}>
          <span className={tokens.kpi.value}>{formatNumber(analytics?.totalDispensedQty ?? 0, { maximumFractionDigits: 0 })}g</span>
        </KPICard>
        <KPICard icon={ClipboardCheck} label="Reweighed %" tooltip="Percentage of bowls that were reweighed after application. Higher rates improve waste tracking accuracy." loading={analyticsLoading} accent={getComplianceAccent(analytics?.reweighCompliancePct)}>
          <span className={tokens.kpi.value}>{formatPercent(analytics?.reweighCompliancePct ?? 0, false)}</span>
        </KPICard>
        <KPICard icon={Trash2} label="Waste Rate" tooltip="Percentage of dispensed product recorded as waste. Lower is better — industry target is under 15%." loading={analyticsLoading} accent={getWasteAccent(analytics?.wastePct)}>
          <span className={tokens.kpi.value}>{formatPercent(analytics?.wastePct ?? 0, false)}</span>
        </KPICard>
        <KPICard icon={AlertTriangle} label="Est. Waste Cost" tooltip="Estimated dollar value of wasted product based on wholesale cost and recorded waste quantities." loading={analyticsLoading}>
          <BlurredAmount className={cn(tokens.kpi.value, 'text-destructive')}>{formatCurrency(((analytics?.totalProductCost ?? 0) * (analytics?.wastePct ?? 0)) / 100)}</BlurredAmount>
        </KPICard>
      </div>

      {/* Product Analytics */}
      <BackroomProductAnalyticsCard startDate={start} endDate={end} rangeLabel={rangeLabel} locationId={effectiveLocationId} />

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
                <MetricInfoTooltip description="Per-stylist backroom efficiency metrics including product usage, cost per service, reweigh compliance, and waste analysis." />
              </div>
              <CardDescription className="text-xs">{rangeLabel}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHiddenFields(!showHiddenFields)}
              className="text-xs text-muted-foreground"
            >
              {showHiddenFields ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
              {hiddenFieldCount} Hidden Fields
              {showHiddenFields ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!sortedStaff.length}>
              <Download className="w-4 h-4 mr-1.5" /> Export
            </Button>
          </div>
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
                    <TableHead><SortButton label="Name" field="name" /></TableHead>
                    <TableHead className="text-right"><SortButton label="Services" field="totalServices" /></TableHead>
                    <TableHead className="text-right"><SortButton label="Product Dispensed" field="totalProductCost" /></TableHead>
                    <TableHead className="text-right"><SortButton label="Product / Service" field="productPerServiceCost" /></TableHead>
                    <TableHead className="text-right"><SortButton label="% Reweighed" field="reweigh" /></TableHead>
                    <TableHead className="text-right"><SortButton label="Waste / Service" field="wastePerServiceCost" /></TableHead>
                    <TableHead className="text-right"><SortButton label="Product Charges" field="productCharges" /></TableHead>
                    {showHiddenFields && (
                      <>
                        <TableHead className="text-right"><SortButton label="Sessions/Day" field="sessionsPerDay" /></TableHead>
                        <TableHead className="text-right"><SortButton label="Avg Duration" field="duration" /></TableHead>
                        <TableHead className="text-right"><SortButton label="Waste %" field="waste" /></TableHead>
                        <TableHead className="text-right"><SortButton label="Variance %" field="variance" /></TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStaff.map((s, idx) => (
                    <TableRow key={s.staffUserId}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0', getAvatarColor(idx))}>
                            {s.staffName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-sans text-sm font-medium">{s.staffName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.totalServices}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <BlurredAmount className="tabular-nums text-sm">{formatCurrency(s.totalProductCost)}</BlurredAmount>
                          <span className="text-xs text-muted-foreground tabular-nums">{formatNumber(s.totalDispensedQty, { maximumFractionDigits: 1 })}g</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <BlurredAmount className="tabular-nums text-sm">{formatCurrency(s.productPerServiceCost)}</BlurredAmount>
                          <span className="text-xs text-muted-foreground tabular-nums">{formatNumber(s.productPerServiceQty, { maximumFractionDigits: 1 })}g</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn('tabular-nums', s.reweighCompliancePct < 50 && 'text-destructive', s.reweighCompliancePct >= 80 && 'text-primary')}>
                          {formatPercent(s.reweighCompliancePct, false)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <BlurredAmount className="tabular-nums text-sm">{formatCurrency(s.wastePerServiceCost)}</BlurredAmount>
                      </TableCell>
                      <TableCell className="text-right">
                        <BlurredAmount className="tabular-nums text-sm">{formatCurrency(s.productCharges)}</BlurredAmount>
                      </TableCell>
                      {showHiddenFields && (
                        <>
                          <TableCell className="text-right tabular-nums">{s.sessionsPerDay}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.avgSessionDurationMinutes} min</TableCell>
                          <TableCell className="text-right">
                            <span className={cn('tabular-nums', s.wastePct > 20 && 'text-destructive', s.wastePct <= 10 && 'text-primary')}>
                              {formatPercent(s.wastePct, false)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatPercent(s.variancePct, false)}</TableCell>
                        </>
                      )}
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
      <MetricInfoTooltip description={tooltip} className={tokens.kpi.infoIcon} />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
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
