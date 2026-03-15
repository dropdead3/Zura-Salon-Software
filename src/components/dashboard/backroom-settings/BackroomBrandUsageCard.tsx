/**
 * BackroomBrandUsageCard — Donut chart for brand share + manufacturer table.
 */

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Package } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBackroomBrandUsage, type BrandUsageRow } from '@/hooks/backroom/useBackroomBrandUsage';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';

const BRAND_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent-foreground) / 0.7)',
  'hsl(var(--muted-foreground) / 0.5)',
  'hsl(var(--primary) / 0.6)',
  'hsl(var(--muted-foreground) / 0.3)',
  'hsl(var(--accent-foreground) / 0.4)',
  'hsl(var(--primary) / 0.35)',
  'hsl(var(--muted-foreground) / 0.2)',
];

interface Props {
  startDate: string;
  endDate: string;
  rangeLabel: string;
}

export function BackroomBrandUsageCard({ startDate, endDate, rangeLabel }: Props) {
  const { data: brands, isLoading } = useBackroomBrandUsage(startDate, endDate);
  const { formatCurrency } = useFormatCurrency();
  const { formatNumber, formatPercent } = useFormatNumber();

  const totalDispensed = useMemo(
    () => (brands ?? []).reduce((sum, b) => sum + b.dispensedQty, 0),
    [brands]
  );

  const chartData = useMemo(
    () =>
      (brands ?? []).map((b) => ({
        name: b.brand,
        value: b.dispensedQty,
        pct: totalDispensed > 0 ? Math.round((b.dispensedQty / totalDispensed) * 1000) / 10 : 0,
      })),
    [brands, totalDispensed]
  );

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Package className={tokens.card.icon} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className={tokens.card.title}>Product Usage by Brand</CardTitle>
              <MetricInfoTooltip description="Brand-level breakdown of dispensed product. Shows each manufacturer's share of total chemical usage by weight." />
            </div>
            <CardDescription className="text-xs">{rangeLabel}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className={tokens.loading.skeleton} />
            ))}
          </div>
        ) : !chartData.length ? (
          <div className={tokens.empty.container}>
            <Package className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No brand data</h3>
            <p className={tokens.empty.description}>No product usage recorded for this period.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Donut chart */}
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={0}
                    stroke="hsl(var(--border) / 0.4)"
                    strokeWidth={1}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-lg bg-popover border border-border px-3 py-2 text-xs shadow-md">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground">{formatNumber(item.value)}g · {item.pct}%</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {chartData.slice(0, 6).map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: BRAND_COLORS[i % BRAND_COLORS.length] }}
                    />
                    <span className="text-muted-foreground truncate max-w-[100px]">{d.name}</span>
                    <span className="tabular-nums font-medium">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand table */}
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={tokens.table.columnHeader}>Brand</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Dispensed</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Cost</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Waste</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Services</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(brands ?? []).map((b) => (
                    <TableRow key={b.brand}>
                      <TableCell className="font-sans text-sm font-medium">{b.brand}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{formatNumber(b.dispensedQty)}g</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        <BlurredAmount>{formatCurrency(b.dispensedCost)}</BlurredAmount>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{formatNumber(b.wasteQty)}g</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{b.serviceCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
