import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2 } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { useProductCoPurchase, type CoPurchasePair } from '@/hooks/useProductCoPurchase';
import type { MovementRating } from '@/lib/productMovementRating';
import { cn } from '@/lib/utils';

interface BundleSuggestionsCardProps {
  locationId?: string;
  filterContext?: FilterContext;
  /** Movement ratings map (lowercase name -> rating) for highlighting bundle opportunities */
  movementRatings?: Map<string, MovementRating>;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

export function BundleSuggestionsCard({ locationId, filterContext, movementRatings }: BundleSuggestionsCardProps) {
  const { data, isLoading } = useProductCoPurchase(locationId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.pairs.length === 0) return null;

  // Identify strategic bundles: one slow/stagnant + one best_seller/popular
  const strategicPairs = data.pairs.filter(p => {
    if (!movementRatings) return false;
    const ratingA = movementRatings.get(p.productA);
    const ratingB = movementRatings.get(p.productB);
    if (!ratingA || !ratingB) return false;
    const aStrong = ['best_seller', 'popular'].includes(ratingA.tier);
    const bStrong = ['best_seller', 'popular'].includes(ratingB.tier);
    const aWeak = ['slow_mover', 'stagnant', 'dead_weight'].includes(ratingA.tier);
    const bWeak = ['slow_mover', 'stagnant', 'dead_weight'].includes(ratingB.tier);
    return (aStrong && bWeak) || (bStrong && aWeak);
  });

  return (
    <PinnableCard elementKey="retail_bundle_suggestions" elementName="Bundle Suggestions" category="Analytics Hub - Retail">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">BUNDLE SUGGESTIONS</CardTitle>
                  <MetricInfoTooltip description="Products frequently purchased together in the same transaction over the last 90 days. Strategic bundles pair a best seller with a slow mover to boost movement." />
                </div>
                <CardDescription className="text-xs">
                  {data.pairs.length} co-purchase pair{data.pairs.length !== 1 ? 's' : ''} detected
                  {strategicPairs.length > 0 && <span className="text-primary"> · {strategicPairs.length} strategic bundle{strategicPairs.length !== 1 ? 's' : ''}</span>}
                </CardDescription>
              </div>
            </div>
            {filterContext && (
              <div className="flex items-center gap-2">
                <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {strategicPairs.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Strategic bundle opportunities</p>
              <p>These pairs combine a best-selling product with a slower-moving one — consider promotional bundling to boost slow mover sales.</p>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product A</TableHead>
                  <TableHead>Product B</TableHead>
                  <TableHead className="text-right">Co-Purchases</TableHead>
                  <TableHead className="text-right">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pairs.slice(0, 15).map((pair, idx) => {
                  const isStrategic = strategicPairs.includes(pair);
                  return (
                    <TableRow key={idx} className={cn(isStrategic && 'bg-primary/[0.02]')}>
                      <TableCell className="font-medium text-sm">{titleCase(pair.productA)}</TableCell>
                      <TableCell className="font-medium text-sm">{titleCase(pair.productB)}</TableCell>
                      <TableCell className="text-right tabular-nums">{pair.count}</TableCell>
                      <TableCell className="text-right">
                        {isStrategic ? (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/5">Strategic</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Organic</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
