import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, ShoppingCart } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { forecastStockout, type StockoutForecast } from '@/lib/stockoutForecast';
import type { Product } from '@/hooks/useProducts';
import type { ProductVelocityEntry } from '@/hooks/useProductVelocity';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ReplenishmentTimelineCardProps {
  products: Product[];
  velocityMap: Map<string, ProductVelocityEntry>;
  filterContext?: FilterContext;
  /** Callback to trigger PO creation for a product */
  onCreatePO?: (product: Product) => void;
}

interface ForecastRow {
  product: Product;
  forecast: StockoutForecast;
  velocity: number;
}

const MAX_BAR_DAYS = 60;

export function ReplenishmentTimelineCard({ products, velocityMap, filterContext, onCreatePO }: ReplenishmentTimelineCardProps) {
  const navigate = useNavigate();
  const rows = useMemo(() => {
    if (!products || !velocityMap) return [];
    const result: ForecastRow[] = [];
    for (const p of products) {
      if ((p.quantity_on_hand ?? 0) <= 0) continue;
      const entry = velocityMap.get(p.name.toLowerCase().trim());
      const velocity = entry?.weightedVelocity ?? entry?.velocity ?? 0;
      if (velocity <= 0) continue; // only show products that sell
      const forecast = forecastStockout(p.quantity_on_hand ?? 0, velocity);
      result.push({ product: p, forecast, velocity });
    }
    result.sort((a, b) => a.forecast.daysUntilStockout - b.forecast.daysUntilStockout);
    return result.slice(0, 20);
  }, [products, velocityMap]);

  if (rows.length === 0) return null;

  const criticalCount = rows.filter(r => r.forecast.urgency === 'critical').length;
  const warningCount = rows.filter(r => r.forecast.urgency === 'warning').length;

  return (
    <PinnableCard elementKey="retail_replenishment_timeline" elementName="Replenishment Timeline" category="Analytics Hub - Retail">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">REPLENISHMENT TIMELINE</CardTitle>
                  <MetricInfoTooltip description="Projected stock-out dates based on weighted sales velocity. Products are sorted by urgency — those running out soonest appear first. Red = stockout within 7 days, amber = within 14 days. Click the cart icon to create a purchase order." />
                </div>
                <CardDescription className="text-xs">
                  {criticalCount > 0 && <span className="text-red-500">{criticalCount} critical</span>}
                  {criticalCount > 0 && warningCount > 0 && ', '}
                  {warningCount > 0 && <span className="text-amber-600 dark:text-amber-400">{warningCount} warning</span>}
                  {criticalCount === 0 && warningCount === 0 && 'All products have adequate runway'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
              {criticalCount > 0 && (
                <Button
                  variant="outline"
                  size={tokens.button.inline}
                  className="gap-1.5 text-xs"
                  onClick={() => navigate('/dashboard/admin/settings?category=retail-products&tab=inventory')}
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Reorder
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2.5 pr-3">
              {rows.map(row => {
                const days = row.forecast.daysUntilStockout;
                const barPct = Math.min(100, (days / MAX_BAR_DAYS) * 100);
                const colorClass = row.forecast.urgency === 'critical'
                  ? '[&>div]:bg-red-500'
                  : row.forecast.urgency === 'warning'
                  ? '[&>div]:bg-amber-500'
                  : '[&>div]:bg-emerald-500';
                const isCritical = row.forecast.urgency === 'critical';

                return (
                  <div key={row.product.id} className="flex items-center gap-3">
                    <div className="w-40 min-w-0 shrink-0">
                      <p className="text-sm font-medium truncate">{row.product.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {row.product.quantity_on_hand} units · {row.velocity.toFixed(2)}/day
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Progress value={barPct} className={cn('h-2.5 rounded-full', colorClass)} />
                    </div>
                    <div className="w-24 shrink-0 text-right">
                      <Badge variant="outline" className={cn('text-[10px] tabular-nums',
                        row.forecast.urgency === 'critical' ? 'text-red-500 border-red-200 dark:text-red-400 dark:border-red-800' :
                        row.forecast.urgency === 'warning' ? 'text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800' :
                        'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800'
                      )}>
                        {days}d
                      </Badge>
                      {row.forecast.stockoutDate && (
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {format(row.forecast.stockoutDate, 'MMM d')}
                        </p>
                      )}
                    </div>
                    {isCritical && onCreatePO && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 shrink-0"
                        onClick={() => onCreatePO(row.product)}
                        title="Create purchase order"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
