/**
 * ReorderAnalyticsTab — Reorder history analytics with KPIs, charts, and tables.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, BarChart3, DollarSign, ShoppingCart, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useReorderAnalytics } from '@/hooks/backroom/useReorderAnalytics';
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

export function ReorderAnalyticsTab() {
  const { data, isLoading } = useReorderAnalytics();
  const { formatCurrency } = useFormatCurrency();

  // Prepare chart data — pivot monthly spend by supplier into recharts format
  const chartData = useMemo(() => {
    if (!data) return [];
    const months = new Map<string, Record<string, number>>();
    const allSuppliers = new Set<string>();
    
    for (const entry of data.monthlySpendBySupplier) {
      allSuppliers.add(entry.supplier);
      const existing = months.get(entry.month) || {};
      existing[entry.supplier] = entry.spend;
      months.set(entry.month, existing);
    }
    
    return [...months.entries()].map(([month, suppliers]) => ({
      month,
      ...suppliers,
    }));
  }, [data]);

  const supplierNames = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.monthlySpendBySupplier.map(e => e.supplier))];
  }, [data]);

  // Color palette for chart bars
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
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={ShoppingCart}
          label="Total POs"
          value={data.totalPOs.toLocaleString()}
          subtitle="Last 6 months"
        />
        <KpiCard
          icon={DollarSign}
          label="Total Spend"
          value={formatCurrency(data.totalSpend)}
          subtitle="Last 6 months"
        />
        <KpiCard
          icon={TrendingUp}
          label="Avg Order Value"
          value={formatCurrency(data.avgOrderValue)}
        />
        <KpiCard
          icon={Clock}
          label="Avg Lead Time"
          value={data.avgLeadTimeDays != null ? `${data.avgLeadTimeDays} days` : '—'}
          subtitle="Sent to received"
        />
      </div>

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
