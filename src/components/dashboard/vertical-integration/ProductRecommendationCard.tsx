import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, ArrowUpRight } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { ProductRecommendation } from '@/lib/vertical-integration/product-recommendation-engine';

interface ProductRecommendationCardProps {
  serviceName: string;
  recommendations: ProductRecommendation[];
}

export function ProductRecommendationCard({
  serviceName,
  recommendations,
}: ProductRecommendationCardProps) {
  if (recommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Star className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Product Recommendations</CardTitle>
            <CardDescription>{serviceName}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recommendations.slice(0, 5).map((rec, i) => (
            <div
              key={rec.productId}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                i === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/40'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-xs tracking-wide text-muted-foreground w-5">
                  {i + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(tokens.body.base, 'font-medium')}>
                      {rec.productName}
                    </span>
                    {rec.isPreferred && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-primary/10 text-primary border-primary/20"
                      >
                        PREFERRED
                      </Badge>
                    )}
                  </div>
                  <p className={tokens.label.muted}>
                    {rec.supplierName} · {rec.marginPct}% margin
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {rec.marginDeltaVsCurrent !== 0 && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-xs font-medium',
                      rec.marginDeltaVsCurrent > 0 ? 'text-emerald-500' : 'text-red-500'
                    )}
                  >
                    <ArrowUpRight
                      className={cn(
                        'w-3 h-3',
                        rec.marginDeltaVsCurrent < 0 && 'rotate-90'
                      )}
                    />
                    {rec.marginDeltaVsCurrent > 0 ? '+' : ''}
                    {rec.marginDeltaVsCurrent}pp
                  </span>
                )}
                <span className="font-display text-sm tracking-wide text-foreground">
                  {rec.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
