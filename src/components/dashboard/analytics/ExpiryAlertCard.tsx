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
import { Clock, Tag, Percent, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { differenceInDays, parseISO, format } from 'date-fns';

interface ExpiryAlertCardProps {
  products: Product[];
  filterContext?: FilterContext;
}

type ExpiryBucket = 'expired' | 'critical' | 'warning';

interface ExpiryCandidate {
  product: Product;
  bucket: ExpiryBucket;
  daysUntilExpiry: number;
  estimatedLoss: number;
  suggestedDiscount: number;
}

const BUCKET_CONFIG: Record<ExpiryBucket, { label: string; color: string; badgeClass: string }> = {
  expired: {
    label: 'Expired',
    color: 'text-red-500 dark:text-red-400',
    badgeClass: 'text-red-500 border-red-200 dark:border-red-800',
  },
  critical: {
    label: 'Critical',
    color: 'text-orange-600 dark:text-orange-400',
    badgeClass: 'text-orange-500 border-orange-200 dark:border-orange-800',
  },
  warning: {
    label: 'Warning',
    color: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'text-amber-500 border-amber-200 dark:border-amber-800',
  },
};

export function ExpiryAlertCard({ products, filterContext }: ExpiryAlertCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const updateProduct = useUpdateProduct();

  const candidates = useMemo(() => {
    const today = new Date();
    const results: ExpiryCandidate[] = [];

    for (const p of products) {
      if (!p.expires_at) continue;
      if ((p.quantity_on_hand ?? 0) <= 0) continue;

      const expiryDate = parseISO(p.expires_at);
      const daysUntil = differenceInDays(expiryDate, today);
      const alertDays = p.expiry_alert_days ?? 30;

      let bucket: ExpiryBucket | null = null;
      let suggestedDiscount = 0;

      if (daysUntil <= 0) {
        bucket = 'expired';
        suggestedDiscount = 50;
      } else if (daysUntil <= alertDays) {
        bucket = 'critical';
        suggestedDiscount = 25;
      } else if (daysUntil <= alertDays * 2) {
        bucket = 'warning';
        suggestedDiscount = 10;
      }

      if (!bucket) continue;

      results.push({
        product: p,
        bucket,
        daysUntilExpiry: daysUntil,
        estimatedLoss: (p.cost_price ?? 0) * (p.quantity_on_hand ?? 0),
        suggestedDiscount,
      });
    }

    return results.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry).slice(0, 10);
  }, [products]);

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

  const totalAtRisk = candidates.reduce((s, c) => s + c.estimatedLoss, 0);
  const expiredCount = candidates.filter(c => c.bucket === 'expired').length;
  const criticalCount = candidates.filter(c => c.bucket === 'critical').length;

  return (
    <PinnableCard elementKey="retail_expiry_alerts" elementName="Expiry Alerts" category="Analytics Hub - Retail">
      <Card className="border-amber-200/50 dark:border-amber-800/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 flex items-center justify-center rounded-lg">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>EXPIRY ALERTS</CardTitle>
                  <MetricInfoTooltip description="Products approaching or past their expiration date. Discount tiers: 10% (warning), 25% (critical — within alert threshold), 50% (expired). Alert threshold is configurable per product (default 30 days)." />
                </div>
                <CardDescription className="text-xs">
                  {candidates.length} product{candidates.length !== 1 ? 's' : ''}
                  {expiredCount > 0 && <span className="text-red-500"> · {expiredCount} expired</span>}
                  {criticalCount > 0 && <span className="text-orange-500"> · {criticalCount} critical</span>}
                  {' · '}<BlurredAmount>{formatCurrency(totalAtRisk)}</BlurredAmount> at risk
                </CardDescription>
              </div>
            </div>
            {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {candidates.map(({ product, bucket, daysUntilExpiry, suggestedDiscount }) => {
              const config = BUCKET_CONFIG[bucket];
              return (
                <div key={product.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={cn('text-[10px]', config.badgeClass)}>
                        {config.label}
                      </Badge>
                      <span className={cn('text-[10px] tabular-nums', config.color)}>
                        {daysUntilExpiry <= 0
                          ? `Expired ${Math.abs(daysUntilExpiry)}d ago`
                          : `${daysUntilExpiry}d remaining`}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        · {product.quantity_on_hand} units
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        · Exp {format(parseISO(product.expires_at!), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge variant="outline" className={cn('text-[10px]', config.color)}>
                      <Percent className="w-2.5 h-2.5 mr-0.5" />
                      {suggestedDiscount}% off
                    </Badge>
                    <Button
                      size={tokens.button.inline}
                      variant="outline"
                      className="text-xs gap-1"
                      onClick={() => handleMarkClearance(product, suggestedDiscount)}
                    >
                      <Tag className="w-3 h-3" />
                      Clearance
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
