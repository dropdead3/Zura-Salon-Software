/**
 * ProductCostTrendSection — Top products with rising costs, each with a sparkline.
 */
import { useState } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { TrendSparkline } from '@/components/dashboard/TrendSparkline';
import { useProductCostTrend, type ProductCostTrendItem } from '@/hooks/backroom/useProductCostTrend';
import { ProductCostDrilldownDialog } from './ProductCostDrilldownDialog';

export function ProductCostTrendSection() {
  const { data: trends, isLoading } = useProductCostTrend();
  const [selectedProduct, setSelectedProduct] = useState<ProductCostTrendItem | null>(null);

  // Only show products with cost increases
  const risingCosts = (trends ?? []).filter((t) => t.changePercent > 0).slice(0, 8);

  if (!isLoading && risingCosts.length === 0) return null;

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={tokens.card.iconBox}>
              <TrendingUp className={tokens.card.icon} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>Price Trends</CardTitle>
                <MetricInfoTooltip
                  title="Price Trends"
                  description="Products with rising supplier costs over the last 90 days. Sparklines show cost trajectory."
                />
              </div>
              <CardDescription className={tokens.body.muted}>
                90-day cost trajectory
              </CardDescription>
            </div>
          </div>
          {risingCosts.length > 0 && (
            <Badge variant="secondary" className="font-sans text-xs">
              {risingCosts.length} rising
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className={tokens.loading.skeleton} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {risingCosts.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
                onClick={() => setSelectedProduct(item)}
              >
                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(tokens.body.emphasis, 'truncate')}>
                    {item.productName}
                  </p>
                  {item.supplierName && (
                    <p className={cn(tokens.body.muted, 'text-xs truncate')}>
                      {item.supplierName}
                    </p>
                  )}
                </div>

                {/* Sparkline */}
                <TrendSparkline
                  data={item.costHistory}
                  width={72}
                  height={24}
                />

                {/* Cost + change */}
                <div className="text-right shrink-0 w-24">
                  <p className={tokens.body.emphasis}>
                    <BlurredAmount>
                      ${item.currentCost.toFixed(2)}
                    </BlurredAmount>
                  </p>
                  <p
                    className={cn(
                      'text-xs font-sans',
                      item.changePercent > 10
                        ? 'text-destructive'
                        : 'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    +{item.changePercent}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

      <ProductCostDrilldownDialog
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        product={selectedProduct}
      />
    </>
  );
}
