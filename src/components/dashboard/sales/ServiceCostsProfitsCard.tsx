import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, ArrowUpDown, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { AnalyticsFilterBadge, type DateRangeType } from '@/components/dashboard/AnalyticsFilterBadge';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { useServiceCostsProfits, type ServiceCostProfitRow } from '@/hooks/useServiceCostsProfits';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { tokens } from '@/lib/design-tokens';
import { Tabs, FilterTabsList, FilterTabsTrigger } from '@/components/ui/tabs';

interface ServiceCostsProfitsCardProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
  filterContext: any;
  dateRange: string;
  locationName: string;
}

type SortKey = 'locationName' | 'serviceCategory' | 'serviceName' | 'totalServices' | 'costPerService' | 'totalSales' | 'totalCost' | 'profit' | 'profitPct';
type CategorySortKey = 'category' | 'count' | 'totalSales' | 'totalCost' | 'profit' | 'marginPct';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
];

const CARD_HEADER = (
  <>
    <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
      <DollarSign className="w-5 h-5 text-primary" />
    </div>
    <div>
      <div className="flex items-center gap-2">
        <CardTitle className="font-display text-base tracking-wide">SERVICE COSTS & SALES PROFITS</CardTitle>
        <MetricInfoTooltip description="Shows revenue, cost, and profit margin for each service. Set service costs in Settings → Services to see accurate profit data." />
      </div>
      <CardDescription>Profit margins by service</CardDescription>
    </div>
  </>
);

export function ServiceCostsProfitsCard({
  dateFrom, dateTo, locationId, filterContext, dateRange, locationName,
}: ServiceCostsProfitsCardProps) {
  const { data, isLoading } = useServiceCostsProfits(dateFrom, dateTo, locationId);
  const { formatCurrency } = useFormatCurrency();
  const { formatNumber, formatPercent } = useFormatNumber();
  const [view, setView] = useState<'category' | 'service'>('category');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'totalSales', desc: true });
  const [catSort, setCatSort] = useState<{ key: CategorySortKey; desc: boolean }>({ key: 'totalSales', desc: true });
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleSort = (key: SortKey) => {
    setSort(prev => prev.key === key ? { key, desc: !prev.desc } : { key, desc: true });
  };

  const toggleCatSort = (key: CategorySortKey) => {
    setCatSort(prev => prev.key === key ? { key, desc: !prev.desc } : { key, desc: true });
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const sortedRows = useMemo(() => {
    if (!data?.rows) return [];
    return [...data.rows].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return sort.desc ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });
  }, [data, sort]);

  // Group by category
  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, { rows: ServiceCostProfitRow[]; totalSales: number; totalCost: number; profit: number; count: number }>();
    for (const row of sortedRows) {
      const cat = row.serviceCategory;
      const g = groups.get(cat) || { rows: [], totalSales: 0, totalCost: 0, profit: 0, count: 0 };
      g.rows.push(row);
      g.totalSales += row.totalSales;
      g.totalCost += row.totalCost;
      g.profit += row.profit;
      g.count += row.totalServices;
      groups.set(cat, g);
    }
    return [...groups.entries()].sort((a, b) => b[1].totalSales - a[1].totalSales);
  }, [sortedRows]);

  // Category summary rows for the "By Category" view
  const categoryRows = useMemo(() => {
    const rows = groupedByCategory.map(([category, group]) => ({
      category,
      count: group.count,
      totalSales: group.totalSales,
      totalCost: group.totalCost,
      profit: group.profit,
      marginPct: group.totalSales > 0 ? (group.profit / group.totalSales) * 100 : 0,
      serviceCount: group.rows.length,
    }));

    return [...rows].sort((a, b) => {
      const aVal = a[catSort.key];
      const bVal = b[catSort.key];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return catSort.desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return catSort.desc ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });
  }, [groupedByCategory, catSort]);

  const SortHeader = ({ label, sortKey, className }: { label: string; sortKey: SortKey; className?: string }) => (
    <TableHead
      className={cn('cursor-pointer select-none hover:text-foreground transition-colors', className)}
      onClick={() => toggleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn('w-3 h-3', sort.key === sortKey ? 'text-primary' : 'text-muted-foreground/50')} />
      </div>
    </TableHead>
  );

  const CatSortHeader = ({ label, sortKey, className }: { label: string; sortKey: CategorySortKey; className?: string }) => (
    <TableHead
      className={cn('cursor-pointer select-none hover:text-foreground transition-colors', className)}
      onClick={() => toggleCatSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn('w-3 h-3', catSort.key === sortKey ? 'text-primary' : 'text-muted-foreground/50')} />
      </div>
    </TableHead>
  );

  const missingCostCount = data?.rows.filter(r => !r.hasCostDefined).length ?? 0;

  const viewToggle = (
    <Tabs value={view} onValueChange={(v) => setView(v as 'category' | 'service')}>
      <FilterTabsList>
        <FilterTabsTrigger value="category">By Category</FilterTabsTrigger>
        <FilterTabsTrigger value="service">By Service</FilterTabsTrigger>
      </FilterTabsList>
    </Tabs>
  );

  // Loading state
  if (isLoading) {
    return (
      <PinnableCard elementKey="service_costs_profits" elementName="Service Costs & Sales Profits">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {CARD_HEADER}
              </div>
              <AnalyticsFilterBadge locationId={locationId} dateRange={dateRange as DateRangeType} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      </PinnableCard>
    );
  }

  // Empty state
  if (!data?.rows.length) {
    return (
      <PinnableCard elementKey="service_costs_profits" elementName="Service Costs & Sales Profits">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {CARD_HEADER}
              </div>
              <AnalyticsFilterBadge locationId={locationId} dateRange={dateRange as DateRangeType} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={tokens.empty.container}>
              <DollarSign className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No appointment data for this period</h3>
              <p className={tokens.empty.description}>Adjust your date range or location filter</p>
            </div>
          </CardContent>
        </Card>
      </PinnableCard>
    );
  }

  // Build flat row list with category headers for "By Service" view
  let colorIndex = 0;
  const tableRows: JSX.Element[] = [];
  for (const [category, group] of groupedByCategory) {
    const isCollapsed = collapsedCategories.has(category);
    const catMarginPct = group.totalSales > 0 ? ((group.profit / group.totalSales) * 100) : 0;

    // Category header row
    tableRows.push(
      <TableRow
        key={`cat-${category}`}
        className="bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => toggleCategory(category)}
      >
        <TableCell colSpan={2} className="text-sm">
          <div className="flex items-center gap-2">
            {isCollapsed
              ? <ChevronRight className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
            <span className="font-display text-xs tracking-wide uppercase text-muted-foreground">{category}</span>
            <span className="text-xs text-muted-foreground/60">({group.rows.length})</span>
          </div>
        </TableCell>
        <TableCell className="tabular-nums text-xs text-muted-foreground">{formatNumber(group.count)}</TableCell>
        <TableCell />
        <TableCell className="text-xs tabular-nums text-muted-foreground">
          <BlurredAmount>{formatCurrency(group.totalSales)}</BlurredAmount>
        </TableCell>
        <TableCell className="text-xs tabular-nums text-muted-foreground">
          <BlurredAmount>{formatCurrency(group.totalCost)}</BlurredAmount>
        </TableCell>
        <TableCell className="text-xs tabular-nums text-muted-foreground">
          <BlurredAmount>{formatCurrency(group.profit)}</BlurredAmount>
        </TableCell>
        <TableCell className="text-xs tabular-nums text-muted-foreground">
          {formatPercent(catMarginPct)}
        </TableCell>
      </TableRow>
    );

    // Service rows (conditionally rendered)
    if (!isCollapsed) {
      for (const row of group.rows) {
        const barWidth = data.totals.totalSales > 0 ? (row.totalSales / data.totals.totalSales) * 100 : 0;
        const barColor = CHART_COLORS[colorIndex % CHART_COLORS.length];
        colorIndex++;
        const noCost = !row.hasCostDefined;

        tableRows.push(
          <TableRow
            key={`${row.locationId}-${row.serviceCategory}-${row.serviceName}`}
            className={cn(noCost && 'border-l-2 border-l-amber-400/60')}
          >
            <TableCell className="text-sm">{row.locationName}</TableCell>
            <TableCell className="text-sm max-w-[200px] truncate">{row.serviceName}</TableCell>
            <TableCell className="tabular-nums text-sm">{formatNumber(row.totalServices)}</TableCell>
            <TableCell className="tabular-nums text-sm">
              {noCost
                ? <span className="text-xs text-muted-foreground/50 italic">not set</span>
                : <BlurredAmount>{formatCurrency(row.costPerService)}</BlurredAmount>
              }
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden flex-shrink-0">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(barWidth, 1)}%`, backgroundColor: barColor }}
                  />
                </div>
                <span className="text-sm tabular-nums min-w-[5.5rem] text-left">
                  <BlurredAmount>{formatCurrency(row.totalSales)}</BlurredAmount>
                </span>
              </div>
            </TableCell>
            <TableCell className="text-sm tabular-nums">
              <BlurredAmount>{formatCurrency(row.totalCost)}</BlurredAmount>
            </TableCell>
            <TableCell className={cn('text-sm tabular-nums', row.profit >= 0 ? 'text-success-foreground' : 'text-destructive')}>
              <BlurredAmount>{formatCurrency(row.profit)}</BlurredAmount>
            </TableCell>
            <TableCell className={cn('text-sm tabular-nums', noCost ? 'text-muted-foreground/50' : row.profitPct >= 50 ? 'text-success-foreground' : row.profitPct >= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive')}>
              {noCost ? '—' : formatPercent(row.profitPct)}
            </TableCell>
          </TableRow>
        );
      }
    }
  }

  return (
    <PinnableCard elementKey="service_costs_profits" elementName="Service Costs & Sales Profits">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {CARD_HEADER}
            </div>
            <div className="flex items-center gap-2">
              {missingCostCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md">
                  <AlertCircle className="w-3 h-3" />
                  <span>{missingCostCount} missing cost{missingCostCount > 1 ? 's' : ''}</span>
                </div>
              )}
              <AnalyticsFilterBadge locationId={locationId} dateRange={dateRange as DateRangeType} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground font-sans mb-1">Total Revenue</p>
              <p className="font-display text-lg tracking-wide tabular-nums">
                <BlurredAmount>{formatCurrency(data.totals.totalSales)}</BlurredAmount>
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground font-sans mb-1">Total Cost</p>
              <p className="font-display text-lg tracking-wide tabular-nums">
                <BlurredAmount>{formatCurrency(data.totals.totalCost)}</BlurredAmount>
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground font-sans mb-1">Total Profit</p>
              <p className={cn('font-display text-lg tracking-wide tabular-nums', data.totals.profit >= 0 ? 'text-success-foreground' : 'text-destructive')}>
                <BlurredAmount>{formatCurrency(data.totals.profit)}</BlurredAmount>
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground font-sans mb-1">Avg Margin</p>
              <p className={cn('font-display text-lg tracking-wide tabular-nums', data.totals.profitPct >= 50 ? 'text-success-foreground' : data.totals.profitPct >= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive')}>
                {formatPercent(data.totals.profitPct)}
              </p>
            </div>
          </div>

          <div className="mb-4">{viewToggle}</div>

          {/* Table */}
          <div className="overflow-x-auto">
            {view === 'category' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <CatSortHeader label="Category" sortKey="category" />
                    <CatSortHeader label="# Services" sortKey="count" />
                    <CatSortHeader label="Total Sales" sortKey="totalSales" />
                    <CatSortHeader label="Total Cost" sortKey="totalCost" />
                    <CatSortHeader label="Profit" sortKey="profit" />
                    <CatSortHeader label="Margin" sortKey="marginPct" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryRows.map((row, i) => {
                    const shareOfRevenue = data.totals.totalSales > 0 ? (row.totalSales / data.totals.totalSales) * 100 : 0;
                    const barColor = CHART_COLORS[i % CHART_COLORS.length];
                    return (
                      <TableRow key={row.category}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{row.category}</span>
                            <span className="text-xs text-muted-foreground/60">({row.serviceCount} services)</span>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">{formatNumber(row.count)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden flex-shrink-0">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.max(shareOfRevenue, 1)}%`, backgroundColor: barColor }}
                              />
                            </div>
                            <span className="text-sm tabular-nums min-w-[5.5rem] text-left">
                              <BlurredAmount>{formatCurrency(row.totalSales)}</BlurredAmount>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          <BlurredAmount>{formatCurrency(row.totalCost)}</BlurredAmount>
                        </TableCell>
                        <TableCell className={cn('text-sm tabular-nums', row.profit >= 0 ? 'text-success-foreground' : 'text-destructive')}>
                          <BlurredAmount>{formatCurrency(row.profit)}</BlurredAmount>
                        </TableCell>
                        <TableCell className={cn('text-sm tabular-nums', row.marginPct >= 50 ? 'text-success-foreground' : row.marginPct >= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive')}>
                          {formatPercent(row.marginPct)}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Totals row */}
                  <TableRow className="bg-muted/30 border-t-2 border-border">
                    <TableCell className="text-sm font-display uppercase tracking-wide text-muted-foreground">Totals</TableCell>
                    <TableCell className="tabular-nums text-sm">{formatNumber(data.totals.totalServices)}</TableCell>
                    <TableCell className="text-sm tabular-nums">
                      <BlurredAmount>{formatCurrency(data.totals.totalSales)}</BlurredAmount>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      <BlurredAmount>{formatCurrency(data.totals.totalCost)}</BlurredAmount>
                    </TableCell>
                    <TableCell className={cn('text-sm tabular-nums', data.totals.profit >= 0 ? 'text-success-foreground' : 'text-destructive')}>
                      <BlurredAmount>{formatCurrency(data.totals.profit)}</BlurredAmount>
                    </TableCell>
                    <TableCell className={cn('text-sm tabular-nums', data.totals.profitPct >= 50 ? 'text-success-foreground' : data.totals.profitPct >= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive')}>
                      {formatPercent(data.totals.profitPct)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label="Location" sortKey="locationName" />
                    <SortHeader label="Service" sortKey="serviceName" />
                    <SortHeader label="# Services" sortKey="totalServices" />
                    <SortHeader label="Unit Cost" sortKey="costPerService" />
                    <SortHeader label="Total Sales" sortKey="totalSales" />
                    <SortHeader label="Total Cost" sortKey="totalCost" />
                    <SortHeader label="Profit" sortKey="profit" />
                    <SortHeader label="Margin" sortKey="profitPct" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows}

                  {/* Totals row */}
                  <TableRow className="bg-muted/30 border-t-2 border-border">
                    <TableCell colSpan={2} className="text-sm font-display uppercase tracking-wide text-muted-foreground">Totals</TableCell>
                    <TableCell className="tabular-nums text-sm">{formatNumber(data.totals.totalServices)}</TableCell>
                    <TableCell />
                    <TableCell className="text-sm tabular-nums">
                      <BlurredAmount>{formatCurrency(data.totals.totalSales)}</BlurredAmount>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      <BlurredAmount>{formatCurrency(data.totals.totalCost)}</BlurredAmount>
                    </TableCell>
                    <TableCell className={cn('text-sm tabular-nums', data.totals.profit >= 0 ? 'text-success-foreground' : 'text-destructive')}>
                      <BlurredAmount>{formatCurrency(data.totals.profit)}</BlurredAmount>
                    </TableCell>
                    <TableCell className={cn('text-sm tabular-nums', data.totals.profitPct >= 50 ? 'text-success-foreground' : data.totals.profitPct >= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive')}>
                      {formatPercent(data.totals.profitPct)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
