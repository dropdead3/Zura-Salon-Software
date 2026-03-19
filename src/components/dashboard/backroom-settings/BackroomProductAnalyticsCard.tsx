/**
 * BackroomProductAnalyticsCard — Product & Category usage analytics
 * with horizontal bar charts and a sortable product table.
 */

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, ArrowUpDown } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useBackroomProductAnalytics } from '@/hooks/backroom/useBackroomProductAnalytics';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent-foreground) / 0.7)',
  'hsl(var(--muted-foreground) / 0.6)',
  'hsl(var(--primary) / 0.6)',
  'hsl(var(--accent-foreground) / 0.5)',
  'hsl(var(--muted-foreground) / 0.4)',
  'hsl(var(--primary) / 0.4)',
  'hsl(var(--accent-foreground) / 0.35)',
];

function getColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

interface Props {
  startDate: string;
  endDate: string;
  rangeLabel: string;
  locationId?: string;
}

type ProductSortKey = 'name' | 'dispensed' | 'waste' | 'cost' | 'retail' | 'services';

export function BackroomProductAnalyticsCard({ startDate, endDate, rangeLabel, locationId }: Props) {
  const { data, isLoading } = useBackroomProductAnalytics(startDate, endDate, locationId);
  const { formatCurrency } = useFormatCurrency();
  const { formatNumber } = useFormatNumber();
  const [sortKey, setSortKey] = useState<ProductSortKey>('cost');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: ProductSortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortedProducts = useMemo(() => {
    if (!data?.products?.length) return [];
    const arr = [...data.products];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'dispensed': cmp = a.dispensedQty - b.dispensedQty; break;
        case 'waste': cmp = a.wasteQty - b.wasteQty; break;
        case 'cost': cmp = a.wholesaleCost - b.wholesaleCost; break;
        case 'retail': cmp = a.retailPrice - b.retailPrice; break;
        case 'services': cmp = a.serviceCount - b.serviceCount; break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [data?.products, sortKey, sortAsc]);

  const categoryChartData = useMemo(() =>
    (data?.categories ?? []).slice(0, 8).map((c) => ({
      name: truncate(c.name, 18),
      cost: c.wholesaleCost,
    })),
    [data?.categories]
  );

  const productChartData = useMemo(() =>
    (data?.products ?? []).slice(0, 12).map((p) => ({
      name: truncate(p.name, 22),
      cost: p.wholesaleCost,
    })),
    [data?.products]
  );

  const SortButton = ({ label, field }: { label: string; field: ProductSortKey }) => (
    <button className="flex items-center gap-1 group" onClick={() => handleSort(field)}>
      <span>{label}</span>
      <ArrowUpDown className={cn('w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity', sortKey === field && 'opacity-100')} />
    </button>
  );

  const chartTooltipFormatter = (value: number) => formatCurrency(value);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Package className={tokens.card.icon} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className={tokens.card.title}>Product Analytics</CardTitle>
              <MetricInfoTooltip description="Category and product-level usage breakdown based on dispensed quantities, wholesale cost, and waste. Data sourced from mixing session line items." />
            </div>
            <CardDescription className="text-xs">{rangeLabel}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className={tokens.loading.skeleton} />)}
          </div>
        ) : !data?.categories?.length ? (
          <div className={tokens.empty.container}>
            <Package className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No product data</h3>
            <p className={tokens.empty.description}>No dispensing records found for this period.</p>
          </div>
        ) : (
          <>
            {/* Horizontal Bar Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Categories */}
              <div>
                <h3 className={cn(tokens.heading.subsection, 'mb-4')}>Top Categories</h3>
                <div style={{ height: Math.max(categoryChartData.length * 36, 120) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
                      <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                      <Tooltip formatter={chartTooltipFormatter} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="cost" radius={[0, 4, 4, 0]} barSize={20}>
                        {categoryChartData.map((_, i) => (
                          <Cell key={i} fill={getColor(i)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Products */}
              <div>
                <h3 className={cn(tokens.heading.subsection, 'mb-4')}>Top Products</h3>
                <div style={{ height: Math.max(productChartData.length * 36, 120) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productChartData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                      <Tooltip formatter={chartTooltipFormatter} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="cost" radius={[0, 4, 4, 0]} barSize={18}>
                        {productChartData.map((_, i) => (
                          <Cell key={i} fill={getColor(i)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Product Categories Table */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h3 className={tokens.heading.subsection}>Product Categories</h3>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><SortButton label="Name" field="name" /></TableHead>
                      <TableHead className="text-right"><SortButton label="Dispensed (g)" field="dispensed" /></TableHead>
                      <TableHead className="text-right"><SortButton label="Waste (g)" field="waste" /></TableHead>
                      <TableHead className="text-right"><SortButton label="Wholesale Cost" field="cost" /></TableHead>
                      <TableHead className="text-right"><SortButton label="Retail Price" field="retail" /></TableHead>
                      <TableHead className="text-right"><SortButton label="# Services" field="services" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProducts.map((p, i) => (
                      <TableRow key={`${p.name}-${i}`}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium"
                              style={{ backgroundColor: getColor(i), color: 'hsl(var(--card))' }}
                            >
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-sans text-sm font-medium truncate max-w-[200px]">{p.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(p.dispensedQty, { maximumFractionDigits: 1 })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={p.wasteQty > 0 ? 'text-destructive' : ''}>
                            {formatNumber(p.wasteQty, { maximumFractionDigits: 1 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <BlurredAmount>{formatCurrency(p.wholesaleCost)}</BlurredAmount>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <BlurredAmount>{formatCurrency(p.retailPrice)}</BlurredAmount>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.serviceCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
