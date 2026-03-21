/**
 * ReorderAnalyticsTab — Reorder history analytics with KPIs, budget forecasting, charts, and tables.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Loader2, BarChart3, DollarSign, ShoppingCart, Clock, TrendingUp,
  AlertTriangle, Pencil, Check, X, Target,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line, ReferenceLine, ComposedChart,
} from 'recharts';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useReorderAnalytics, useProcurementBudget } from '@/hooks/backroom/useReorderAnalytics';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

function KpiCard({ icon: Icon, label, value, subtitle }: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card className="relative">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className={tokens.kpi.label}>{label}</p>
            <p className={tokens.kpi.value}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={tokens.card.iconBox}>
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Budget Settings Inline Editor ── */
function BudgetSettingsEditor({
  currentBudget,
  currentThreshold,
  onSave,
  isUpdating,
}: {
  currentBudget: number;
  currentThreshold: number;
  onSave: (budget: number, threshold: number) => void;
  isUpdating: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [budgetVal, setBudgetVal] = useState(currentBudget.toString());
  const [thresholdVal, setThresholdVal] = useState(currentThreshold.toString());
  const { formatCurrency } = useFormatCurrency();

  const handleSave = () => {
    const b = parseFloat(budgetVal);
    const t = parseInt(thresholdVal, 10);
    if (isNaN(b) || b < 0 || isNaN(t) || t < 1 || t > 100) return;
    onSave(b, t);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Budget: <span className="text-foreground font-sans">{currentBudget > 0 ? formatCurrency(currentBudget) : 'Not set'}</span>
          {currentBudget > 0 && (
            <span className="ml-2">· Alert at {currentThreshold}%</span>
          )}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => {
            setBudgetVal(currentBudget.toString());
            setThresholdVal(currentThreshold.toString());
            setEditing(true);
          }}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Monthly budget</span>
        <Input
          type="number"
          value={budgetVal}
          onChange={e => setBudgetVal(e.target.value)}
          className="w-28 h-8 text-sm rounded-lg"
          autoCapitalize="off"
          min={0}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Alert %</span>
        <Input
          type="number"
          value={thresholdVal}
          onChange={e => setThresholdVal(e.target.value)}
          className="w-16 h-8 text-sm rounded-lg"
          autoCapitalize="off"
          min={1}
          max={100}
        />
      </div>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSave} disabled={isUpdating}>
        <Check className="w-4 h-4 text-success" />
      </Button>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing(false)}>
        <X className="w-4 h-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

export function ReorderAnalyticsTab() {
  const { data, isLoading } = useReorderAnalytics();
  const { budget, isLoading: budgetLoading, upsertBudget, isUpdating } = useProcurementBudget();
  const { formatCurrency } = useFormatCurrency();

  const monthlyBudget = budget?.monthly_budget ?? 0;
  const alertThreshold = budget?.alert_threshold_pct ?? 80;

  // Budget vs actual
  const budgetUsagePct = monthlyBudget > 0 && data ? Math.round((data.currentMonthSpend / monthlyBudget) * 100) : 0;
  const budgetColor = budgetUsagePct >= 100 ? 'destructive' : budgetUsagePct >= alertThreshold ? 'warning' : 'success';

  // Forecast chart data: historical + projected with budget line
  const forecastChartData = useMemo(() => {
    if (!data) return [];
    const historical = data.monthlyTotals.map(m => ({
      month: m.month,
      actual: m.spend,
      projected: undefined as number | undefined,
      budget: monthlyBudget > 0 ? monthlyBudget : undefined,
    }));
    const projections = data.projected3Months.map(p => ({
      month: p.month,
      actual: undefined as number | undefined,
      projected: p.projected,
      budget: monthlyBudget > 0 ? monthlyBudget : undefined,
    }));
    return [...historical, ...projections];
  }, [data, monthlyBudget]);

  // Alert: does projected spend exceed budget?
  const projectionExceedsBudget = monthlyBudget > 0 && data && data.projectedNextMonth > monthlyBudget;
  const overrunPct = monthlyBudget > 0 && data
    ? Math.round(((data.projectedNextMonth - monthlyBudget) / monthlyBudget) * 100)
    : 0;

  // Prepare stacked bar chart data
  const chartData = useMemo(() => {
    if (!data) return [];
    const months = new Map<string, Record<string, number>>();
    for (const entry of data.monthlySpendBySupplier) {
      const existing = months.get(entry.month) || {};
      existing[entry.supplier] = entry.spend;
      months.set(entry.month, existing);
    }
    return [...months.entries()].map(([month, suppliers]) => ({ month, ...suppliers }));
  }, [data]);

  const supplierNames = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.monthlySpendBySupplier.map(e => e.supplier))];
  }, [data]);

  const CHART_COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--accent-foreground))',
    'hsl(var(--warning))',
    'hsl(var(--success))',
    'hsl(var(--destructive))',
    'hsl(210 40% 60%)',
    'hsl(280 40% 60%)',
    'hsl(30 60% 55%)',
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  if (!data) {
    return (
      <div className={tokens.empty.container}>
        <BarChart3 className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No analytics data</h3>
        <p className={tokens.empty.description}>Create purchase orders to start tracking reorder patterns.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Alert Banner */}
      {projectionExceedsBudget && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-foreground">
              Projected spend of <span className="font-sans">{formatCurrency(data.projectedNextMonth)}</span> exceeds
              your <span className="font-sans">{formatCurrency(monthlyBudget)}</span> monthly budget
              by <span className="font-sans">{overrunPct}%</span>.
            </p>
            <p className="text-xs text-muted-foreground mt-1">Based on a weighted average of the last 3 months.</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={ShoppingCart} label="Total POs" value={data.totalPOs.toLocaleString()} subtitle="Last 6 months" />
        <KpiCard icon={DollarSign} label="Total Spend" value={formatCurrency(data.totalSpend)} subtitle="Last 6 months" />
        <KpiCard icon={TrendingUp} label="Avg Order Value" value={formatCurrency(data.avgOrderValue)} />
        <KpiCard icon={Clock} label="Avg Lead Time" value={data.avgLeadTimeDays != null ? `${data.avgLeadTimeDays} days` : '—'} subtitle="Sent to received" />
      </div>

      {/* Budget vs Actual + Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Budget vs Actual</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Current month procurement spend against target</CardDescription>
            </div>
          </div>
          <BudgetSettingsEditor
            currentBudget={monthlyBudget}
            currentThreshold={alertThreshold}
            onSave={(b, t) => upsertBudget({ monthly_budget: b, alert_threshold_pct: t })}
            isUpdating={isUpdating}
          />
        </CardHeader>
        <CardContent>
          {monthlyBudget > 0 ? (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-display tracking-wide tabular-nums">{formatCurrency(data.currentMonthSpend)}</p>
                  <p className="text-xs text-muted-foreground">of {formatCurrency(monthlyBudget)} budget</p>
                </div>
                <span className={cn(
                  'text-sm tabular-nums',
                  budgetColor === 'destructive' && 'text-destructive',
                  budgetColor === 'warning' && 'text-warning',
                  budgetColor === 'success' && 'text-success',
                )}>
                  {budgetUsagePct}%
                </span>
              </div>
              <Progress
                value={Math.min(budgetUsagePct, 100)}
                className="h-2.5"
                indicatorClassName={cn(
                  budgetColor === 'destructive' && 'bg-destructive',
                  budgetColor === 'warning' && 'bg-warning',
                  budgetColor === 'success' && 'bg-success',
                )}
              />
              {data.trendPct !== 0 && (
                <p className="text-xs text-muted-foreground">
                  {data.trendPct > 0 ? '↑' : '↓'} {Math.abs(data.trendPct)}% vs previous month
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">Set a monthly budget to track spend against your target.</p>
          )}
        </CardContent>
      </Card>

      {/* Forecast Chart */}
      {forecastChartData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>Spend Forecast</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Historical spend with 3-month projection</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={forecastChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    `$${value.toFixed(2)}`,
                    name === 'actual' ? 'Actual' : name === 'projected' ? 'Projected' : 'Budget',
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="actual" fill="hsl(var(--primary))" name="Actual" radius={[4, 4, 0, 0]} />
                <Line
                  dataKey="projected"
                  stroke="hsl(var(--primary) / 0.5)"
                  strokeDasharray="6 3"
                  strokeWidth={2}
                  name="Projected"
                  dot={{ r: 4, fill: 'hsl(var(--primary) / 0.5)' }}
                  connectNulls={false}
                />
                {monthlyBudget > 0 && (
                  <ReferenceLine
                    y={monthlyBudget}
                    stroke="hsl(var(--destructive) / 0.6)"
                    strokeDasharray="8 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'Budget',
                      position: 'insideTopRight',
                      fill: 'hsl(var(--destructive))',
                      fontSize: 11,
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly Spend by Supplier Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>Monthly Spend by Supplier</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Last 6 months of purchasing activity</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {supplierNames.slice(0, 8).map((name, i) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="spend"
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    radius={i === supplierNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Reordered Products */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <div className={tokens.card.iconBox}>
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Top Reordered Products</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">By total spend</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Orders</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Units</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Spend</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Avg/Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topProducts.slice(0, 10).map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className="text-sm max-w-[180px] truncate">{p.productName}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{p.orderCount}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{p.totalUnits}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{formatCurrency(p.totalSpend)}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{formatCurrency(p.avgUnitCost)}</TableCell>
                  </TableRow>
                ))}
                {data.topProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">No product data yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Supplier Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <div className={tokens.card.iconBox}>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Supplier Performance</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Lead time and reliability</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Supplier</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>POs</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Lead Time</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>On-Time</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.supplierPerformance.map((s) => (
                  <TableRow key={s.supplierName}>
                    <TableCell className="text-sm max-w-[180px] truncate">{s.supplierName}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{s.poCount}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {s.avgLeadTimeDays != null ? `${s.avgLeadTimeDays}d` : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {s.onTimePct > 0 ? (
                        <span className={cn(s.onTimePct >= 80 ? 'text-success' : s.onTimePct >= 50 ? 'text-warning' : 'text-destructive')}>
                          {s.onTimePct}%
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{formatCurrency(s.totalSpend)}</TableCell>
                  </TableRow>
                ))}
                {data.supplierPerformance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">No supplier data yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
