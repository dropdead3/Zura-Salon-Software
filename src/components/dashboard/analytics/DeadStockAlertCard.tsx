import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useUpdateProduct, type Product } from '@/hooks/useProducts';
import { Skull, Tag, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { MovementTier, MovementRating } from '@/lib/productMovementRating';
import type { ProductVelocityEntry } from '@/hooks/useProductVelocity';

interface DeadStockAlertCardProps {
  products: Product[];
  movementRatings?: Map<string, MovementRating>;
  velocityMap?: Map<string, ProductVelocityEntry>;
  filterContext?: FilterContext;
}

const DISCOUNT_TIERS = [
  { label: '10% off', pct: 10, minDays: 0, color: 'text-amber-600 dark:text-amber-400' },
  { label: '25% off', pct: 25, minDays: 60, color: 'text-orange-600 dark:text-orange-400' },
  { label: '50% off', pct: 50, minDays: 120, color: 'text-red-500 dark:text-red-400' },
];

function getSuggestedDiscount(daysSinceLastSale: number | null): typeof DISCOUNT_TIERS[0] {
  const days = daysSinceLastSale ?? 999;
  if (days >= 120) return DISCOUNT_TIERS[2];
  if (days >= 60) return DISCOUNT_TIERS[1];
  return DISCOUNT_TIERS[0];
}

export function DeadStockAlertCard({ products, movementRatings, filterContext }: DeadStockAlertCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const updateProduct = useUpdateProduct();

  const candidates = useMemo(() => {
    if (!movementRatings) return [];
    return products
      .filter(p => {
        const nameLower = p.name.toLowerCase().trim();
        const rating = movementRatings.get(nameLower);
        if (!rating) return false;
        // Only dead_weight and stagnant with stock, not already in clearance
        return ['dead_weight', 'stagnant'].includes(rating.tier) &&
          (p.quantity_on_hand ?? 0) > 0 &&
          !(p as any).clearance_status;
      })
      .map(p => {
        const nameLower = p.name.toLowerCase().trim();
        const rating = movementRatings.get(nameLower)!;
        const daysSince = (rating as any).daysSinceLastSale ?? null;
        return { product: p, tier: rating.tier, daysSinceLastSale: daysSince, discount: getSuggestedDiscount(daysSince) };
      })
      .sort((a, b) => (b.daysSinceLastSale ?? 999) - (a.daysSinceLastSale ?? 999))
      .slice(0, 8);
  }, [products, movementRatings]);

  const handleMarkClearance = (product: Product, discountPct: number) => {
    const originalPrice = product.retail_price ?? 0;
    const newPrice = originalPrice * (1 - discountPct / 100);
    updateProduct.mutate({
      id: product.id,
      updates: {
        clearance_status: 'discounted',
        clearance_discount_pct: discountPct,
        clearance_marked_at: new Date().toISOString(),
        original_retail_price: originalPrice,
        retail_price: Math.round(newPrice * 100) / 100,
      } as any,
    }, {
      onSuccess: () => toast.success(`${product.name} marked for clearance at ${discountPct}% off`),
    });
  };

  if (candidates.length === 0) return null;

  const totalAtRisk = candidates.reduce((s, c) => s + ((c.product.cost_price ?? 0) * (c.product.quantity_on_hand ?? 0)), 0);

  return (
    <PinnableCard elementKey="retail_dead_stock_alerts" elementName="Dead Stock Alerts" category="Analytics Hub - Retail">
      <Card className="border-orange-200/50 dark:border-orange-800/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/10 flex items-center justify-center rounded-lg">
                <Skull className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>CLEARANCE SUGGESTIONS</CardTitle>
                  <MetricInfoTooltip description="Products classified as Dead Weight or Stagnant that haven't been marked for clearance yet. Discount tiers are suggested based on days since last sale: 10% (<60d), 25% (60-120d), 50% (120d+)." />
                </div>
                <CardDescription className="text-xs">
                  {candidates.length} product{candidates.length !== 1 ? 's' : ''} · <BlurredAmount>{formatCurrency(totalAtRisk)}</BlurredAmount> at risk
                </CardDescription>
              </div>
            </div>
            {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {candidates.map(({ product, tier, daysSinceLastSale, discount }) => (
              <div key={product.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={cn('text-[10px]', tier === 'dead_weight' ? 'text-red-500 border-red-200 dark:border-red-800' : 'text-orange-500 border-orange-200 dark:border-orange-800')}>
                      {tier === 'dead_weight' ? 'Dead Weight' : 'Stagnant'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {daysSinceLastSale != null ? `${daysSinceLastSale}d idle` : 'Never sold'}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      · {product.quantity_on_hand} units
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Badge variant="outline" className={cn('text-[10px]', discount.color)}>
                    <Percent className="w-2.5 h-2.5 mr-0.5" />
                    {discount.label}
                  </Badge>
                  <Button
                    size={tokens.button.inline}
                    variant="outline"
                    className="text-xs gap-1"
                    onClick={() => handleMarkClearance(product, discount.pct)}
                  >
                    <Tag className="w-3 h-3" />
                    Clearance
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
