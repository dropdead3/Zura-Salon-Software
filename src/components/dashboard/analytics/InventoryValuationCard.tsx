import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Warehouse, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/hooks/useProducts';
import type { MovementTier } from '@/lib/productMovementRating';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface InventoryValuationCardProps {
  products: Product[];
  movementRatings?: Map<string, { tier: MovementTier }>;
  filterContext?: FilterContext;
}

export function InventoryValuationCard({ products, movementRatings, filterContext }: InventoryValuationCardProps) {
  const { formatCurrency } = useFormatCurrency();

  const metrics = useMemo(() => {
    let totalCost = 0;
    let totalRetail = 0;
    let atRiskCost = 0;
    let atRiskRetail = 0;
    let healthyCost = 0;

    for (const p of products) {
      const qty = p.quantity_on_hand ?? 0;
      if (qty <= 0) continue;
      const cost = (p.cost_price ?? 0) * qty;
      const retail = (p.retail_price ?? 0) * qty;
      totalCost += cost;
      totalRetail += retail;

      const nameLower = p.name.toLowerCase().trim();
      const rating = movementRatings?.get(nameLower);
      if (rating && ['slow_mover', 'stagnant', 'dead_weight'].includes(rating.tier)) {
        atRiskCost += cost;
        atRiskRetail += retail;
      } else {
        healthyCost += cost;
      }
    }

    return {
      totalCost,
      totalRetail,
      potentialMargin: totalRetail - totalCost,
      marginPct: totalRetail > 0 ? ((totalRetail - totalCost) / totalRetail) * 100 : 0,
      atRiskCost,
      atRiskRetail,
      healthyCost,
      atRiskPct: totalCost > 0 ? (atRiskCost / totalCost) * 100 : 0,
    };
  }, [products, movementRatings]);

  const pieData = [
    { name: 'Healthy', value: metrics.healthyCost, color: 'hsl(var(--primary))' },
    { name: 'At Risk', value: metrics.atRiskCost, color: 'hsl(25, 95%, 53%)' },
  ].filter(d => d.value > 0);

  return (
    <PinnableCard elementKey="retail_inventory_valuation" elementName="Inventory Valuation" category="Analytics Hub - Retail">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Warehouse className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>INVENTORY VALUATION</CardTitle>
                  <MetricInfoTooltip description="Total inventory value at cost and retail, with potential margin and capital-at-risk from slow/stagnant/dead weight products." />
                </div>
                <CardDescription className="text-xs">
                  {products.filter(p => (p.quantity_on_hand ?? 0) > 0).length} products in stock
                </CardDescription>
              </div>
            </div>
            {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">At Cost</p>
              <p className="text-lg font-display tabular-nums"><BlurredAmount>{formatCurrency(metrics.totalCost)}</BlurredAmount></p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">At Retail</p>
              <p className="text-lg font-display tabular-nums"><BlurredAmount>{formatCurrency(metrics.totalRetail)}</BlurredAmount></p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">Potential Margin</p>
              </div>
              <p className="text-lg font-display tabular-nums text-emerald-600 dark:text-emerald-400">
                <BlurredAmount>{formatCurrency(metrics.potentialMargin)}</BlurredAmount>
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums">{metrics.marginPct.toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-orange-500" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">Capital at Risk</p>
              </div>
              <p className={cn('text-lg font-display tabular-nums', metrics.atRiskPct > 30 ? 'text-red-500' : 'text-orange-500')}>
                <BlurredAmount>{formatCurrency(metrics.atRiskCost)}</BlurredAmount>
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums">{metrics.atRiskPct.toFixed(1)}% of inventory</p>
            </div>
          </div>

          {pieData.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="w-20 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={22} outerRadius={36} paddingAngle={0} stroke="hsl(var(--border) / 0.4)" strokeWidth={1}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-medium tabular-nums"><BlurredAmount>{formatCurrency(d.value)}</BlurredAmount></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
