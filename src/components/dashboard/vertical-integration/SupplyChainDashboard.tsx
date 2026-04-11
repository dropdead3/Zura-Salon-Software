import { useSupplierPreferences, useProductServicePerformance } from '@/hooks/useVerticalIntegration';
import { ReplenishmentQueue } from './ReplenishmentQueue';
import { BrandMarginComparison } from './BrandMarginComparison';
import { ProductRecommendationCard } from './ProductRecommendationCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, Star } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { PREFERRED_SUPPLIER_LABEL } from '@/config/vertical-integration/integration-config';
import {
  rankProducts,
  compareBrandMargins,
  type ProductPerformanceInput,
} from '@/lib/vertical-integration/product-recommendation-engine';
import { useMemo } from 'react';

interface SupplyChainDashboardProps {
  organizationId: string | undefined;
}

export function SupplyChainDashboard({ organizationId }: SupplyChainDashboardProps) {
  const { data: suppliers, isLoading: suppliersLoading } =
    useSupplierPreferences(organizationId);
  const { data: perfData, isLoading: perfLoading } =
    useProductServicePerformance(organizationId);

  const preferredSupplier = suppliers?.find((s) => s.is_preferred);

  // Build recommendation + comparison data from performance snapshots
  const { recommendations, comparisons } = useMemo(() => {
    if (!perfData || perfData.length === 0)
      return { recommendations: [], comparisons: [] };

    // Group by service_name
    const byService = perfData.reduce(
      (acc, p) => {
        const key = p.service_name;
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
      },
      {} as Record<string, typeof perfData>
    );

    const recs: { serviceName: string; items: ReturnType<typeof rankProducts> }[] = [];
    const comps: ReturnType<typeof compareBrandMargins>[] = [];

    for (const [serviceName, items] of Object.entries(byService)) {
      const inputs: ProductPerformanceInput[] = items.map((item) => ({
        productId: item.product_id,
        productName: item.product_id, // Will resolve to name once joined
        supplierName: '', // Would be joined from products table
        isPreferredSupplier: false,
        totalUses: item.total_uses,
        avgQuantityPerUse: Number(item.avg_quantity_per_use),
        avgServiceRevenue: Number(item.avg_service_revenue),
        avgProductCost: Number(item.avg_product_cost),
        quantityStddev: 0,
      }));

      recs.push({ serviceName, items: rankProducts(inputs) });
      comps.push(compareBrandMargins(inputs, serviceName));
    }

    return { recommendations: recs, comparisons: comps };
  }, [perfData]);

  const isLoading = suppliersLoading || perfLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preferred supplier status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>Preferred Supplier</CardTitle>
                <CardDescription>
                  Primary supply chain partner for automated replenishment
                </CardDescription>
              </div>
            </div>
            {preferredSupplier ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <Star className="w-3 h-3 mr-1" />
                {preferredSupplier.supplier_name}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not configured
              </Badge>
            )}
          </div>
        </CardHeader>
        {suppliers && suppliers.length > 0 && (
          <CardContent>
            <div className="space-y-2">
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    s.is_preferred ? 'bg-primary/5 border border-primary/20' : 'bg-muted/40'
                  )}
                >
                  <div>
                    <span className={cn(tokens.body.default, 'font-medium')}>
                      {s.supplier_name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.auto_replenish_enabled && (
                        <Badge variant="outline" className="text-[10px]">
                          AUTO-REPLENISH
                        </Badge>
                      )}
                      <span className={tokens.label.default}>
                        Priority {s.priority_rank}
                      </span>
                    </div>
                  </div>
                  {s.is_preferred && (
                    <Star className="w-4 h-4 text-primary fill-primary" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Replenishment queue */}
      <ReplenishmentQueue organizationId={organizationId} />

      {/* Brand margin comparison */}
      <BrandMarginComparison comparisons={comparisons} />

      {/* Product recommendations by service */}
      {recommendations.map((rec) => (
        <ProductRecommendationCard
          key={rec.serviceName}
          serviceName={rec.serviceName}
          recommendations={rec.items}
        />
      ))}
    </div>
  );
}
