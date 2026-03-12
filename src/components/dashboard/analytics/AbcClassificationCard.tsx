import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { AbcResult, AbcClass } from '@/hooks/useAbcClassification';

const CLASS_CONFIG: Record<AbcClass, { color: string; bgColor: string; borderColor: string; chartColor: string; label: string; description: string }> = {
  A: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    chartColor: 'hsl(var(--chart-1))',
    label: 'Class A',
    description: 'Top revenue drivers — 80% of revenue',
  },
  B: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-200 dark:border-blue-800',
    chartColor: 'hsl(var(--chart-2))',
    label: 'Class B',
    description: 'Moderate contributors — next 15% of revenue',
  },
  C: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
    chartColor: 'hsl(var(--chart-4))',
    label: 'Class C',
    description: 'Long tail — bottom 5% of revenue',
  },
};

interface AbcClassificationCardProps {
  abcResult: AbcResult;
  filterContext?: FilterContext;
}

export function AbcClassificationCard({ abcResult, filterContext }: AbcClassificationCardProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const [expanded, setExpanded] = useState(false);
  const [activeClass, setActiveClass] = useState<AbcClass | null>(null);

  const chartData = abcResult.summary.map(s => ({
    name: `Class ${s.class}`,
    value: s.revenue,
    fill: CLASS_CONFIG[s.class].chartColor,
  }));

  const displayProducts = activeClass
    ? abcResult.products.filter(p => p.abcClass === activeClass)
    : abcResult.products;

  return (
    <PinnableCard elementKey="retail_abc_classification" elementName="ABC Classification" category="Analytics Hub - Retail">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Layers className={tokens.card.icon} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>ABC CLASSIFICATION</CardTitle>
                  <MetricInfoTooltip description="Products classified by cumulative revenue contribution. A = top 80% of revenue (cycle count weekly), B = next 15% (monthly), C = bottom 5% (quarterly). Drives reorder priority and stocktake frequency." />
                </div>
                <CardDescription className="text-xs">
                  {abcResult.products.length} product{abcResult.products.length !== 1 ? 's' : ''} classified
                </CardDescription>
              </div>
            </div>
            {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary row + pie chart */}
          <div className="flex items-start gap-6">
            {/* Pie */}
            <div className="w-28 h-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={50}
                    paddingAngle={0}
                    stroke="hsl(var(--border) / 0.4)"
                    strokeWidth={1}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatCurrencyWhole(value), 'Revenue']}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary tiles */}
            <div className="flex-1 grid grid-cols-3 gap-3">
              {abcResult.summary.map(s => {
                const cfg = CLASS_CONFIG[s.class];
                const isActive = activeClass === s.class;
                return (
                  <button
                    key={s.class}
                    onClick={() => setActiveClass(isActive ? null : s.class)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-all',
                      isActive ? cn(cfg.borderColor, cfg.bgColor) : 'border-border/60 hover:border-border',
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant="outline" className={cn('text-[10px]', cfg.color, cfg.borderColor, cfg.bgColor)}>
                        {s.class}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{s.count} product{s.count !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm font-medium tabular-nums"><BlurredAmount>{formatCurrencyWhole(s.revenue)}</BlurredAmount></p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">{s.revenuePercent}% of revenue</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product table */}
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? 'Hide' : 'Show'} product breakdown
              {activeClass && <span className="ml-1">(Class {activeClass})</span>}
            </button>

            {expanded && (
              <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cumulative %</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Cycle Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayProducts.slice(0, 50).map((p, i) => {
                      const cfg = CLASS_CONFIG[p.abcClass];
                      return (
                        <TableRow key={p.name}>
                          <TableCell className="text-muted-foreground tabular-nums text-xs">{i + 1}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px]', cfg.color, cfg.borderColor, cfg.bgColor)}>
                              {p.abcClass}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium max-w-[200px] truncate">{p.name}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            <BlurredAmount>{formatCurrencyWhole(p.revenue)}</BlurredAmount>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={p.cumulativePercent} className="w-12 h-1.5" />
                              <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">{p.cumulativePercent}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {p.quantityOnHand != null ? p.quantityOnHand : '—'}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              'text-xs',
                              p.cycleCountFrequency === 'Weekly' ? 'text-emerald-600 dark:text-emerald-400' :
                              p.cycleCountFrequency === 'Monthly' ? 'text-blue-600 dark:text-blue-400' :
                              'text-muted-foreground',
                            )}>
                              {p.cycleCountFrequency}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
