import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { Megaphone, AlertTriangle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProducts } from '@/hooks/useProducts';
import { useProductVelocity } from '@/hooks/useProductVelocity';
import { getMovementRating, computePercentiles, type MovementTier } from '@/lib/productMovementRating';
import { MovementBadge } from '@/components/ui/MovementBadge';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const PUSH_TIERS: MovementTier[] = ['slow_mover', 'stagnant'];
const MAX_ITEMS = 8;

export function StylistPushList() {
  const { data: products } = useProducts({ pageSize: 500 });
  const { data: velocityMap } = useProductVelocity();
  const { formatCurrency } = useFormatCurrency();

  const pushProducts = useMemo(() => {
    if (!products || !velocityMap) return [];

    const allVelocities = products.map(p => {
      const entry = velocityMap.get(p.name.toLowerCase().trim());
      return entry?.velocity ?? 0;
    });
    const percentiles = computePercentiles(allVelocities);

    const items: {
      product: typeof products[0];
      rating: ReturnType<typeof getMovementRating>;
      capitalAtRisk: number;
      daysSinceLastSale: number | null;
    }[] = [];

    for (const p of products) {
      const hasStock = (p.quantity_on_hand ?? 0) > 0;
      if (!hasStock) continue;

      const entry = velocityMap.get(p.name.toLowerCase().trim());
      const velocity = entry?.velocity ?? 0;
      const rating = getMovementRating({
        velocity,
        totalUnitsSold: entry?.totalUnitsSold ?? 0,
        daysSinceLastSale: entry?.daysSinceLastSale ?? null,
        hasStock,
        velocityPercentile: percentiles.get(velocity) ?? 0,
      });

      if (!PUSH_TIERS.includes(rating.tier)) continue;

      const capitalAtRisk = (p.cost_price ?? p.retail_price ?? 0) * (p.quantity_on_hand ?? 0);
      items.push({
        product: p,
        rating,
        capitalAtRisk,
        daysSinceLastSale: entry?.daysSinceLastSale ?? null,
      });
    }

    // Sort by capital at risk (highest first)
    items.sort((a, b) => b.capitalAtRisk - a.capitalAtRisk);
    return items.slice(0, MAX_ITEMS);
  }, [products, velocityMap]);

  if (pushProducts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className={tokens.card.title}>PUSH LIST</CardTitle>
              <MetricInfoTooltip description="Products that need a push — slow-moving inventory with stock on hand. Recommend these to clients during appointments to keep inventory healthy and free up capital." />
            </div>
            <CardDescription className="text-xs">
              {pushProducts.length} product{pushProducts.length !== 1 ? 's' : ''} to actively recommend today
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {pushProducts.map(({ product, rating, capitalAtRisk, daysSinceLastSale }) => (
            <div
              key={product.id}
              className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{product.name}</span>
                  <MovementBadge rating={rating} compact />
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  {product.brand && <span>{product.brand}</span>}
                  {product.brand && <span className="text-muted-foreground/40">·</span>}
                  <span>{product.quantity_on_hand} in stock</span>
                  {daysSinceLastSale != null && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span>Last sold {daysSinceLastSale}d ago</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-medium tabular-nums">
                  <BlurredAmount>{formatCurrency(product.retail_price ?? 0)}</BlurredAmount>
                </div>
                {capitalAtRisk > 50 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 justify-end text-[10px] text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <BlurredAmount>{formatCurrency(capitalAtRisk)}</BlurredAmount> at risk
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs max-w-[200px]">
                      Capital tied up in non-moving stock (cost × quantity on hand)
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
