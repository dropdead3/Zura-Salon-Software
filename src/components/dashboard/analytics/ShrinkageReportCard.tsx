import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useShrinkageSummary } from '@/hooks/useStockCounts';
import { ShieldAlert, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { EmptyState } from '@/components/ui/empty-state';

interface ShrinkageReportCardProps {
  filterContext?: FilterContext;
}

export function ShrinkageReportCard({ filterContext }: ShrinkageReportCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const locationId = filterContext?.locationId;
  const { data: summaries, isLoading } = useShrinkageSummary(locationId);
  const [showAll, setShowAll] = useState(false);

  const displayed = useMemo(() => {
    if (!summaries) return [];
    return showAll ? summaries : summaries.slice(0, 8);
  }, [summaries, showAll]);

  const totalShrinkageCost = useMemo(() => {
    return (summaries || []).reduce((s, item) => s + item.shrinkageCost, 0);
  }, [summaries]);

  const totalShrinkageUnits = useMemo(() => {
    return (summaries || []).reduce((s, item) => s + item.shrinkageUnits, 0);
  }, [summaries]);

  if (isLoading) return null;
  if (!summaries || summaries.length === 0) return null;

  return (
    <PinnableCard elementKey="retail_shrinkage_report" elementName="Shrinkage Report" category="Analytics Hub - Retail">
      <Card className="border-red-200/50 dark:border-red-800/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 flex items-center justify-center rounded-lg">
                <ShieldAlert className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>SHRINKAGE REPORT</CardTitle>
                  <MetricInfoTooltip description="Shrinkage is the difference between expected inventory (based on system records) and actual physical counts. Negative variance indicates potential loss from theft, damage, miscount, or admin errors." />
                </div>
                <CardDescription className="text-xs">
                  {summaries.length} product{summaries.length !== 1 ? 's' : ''} with variance
                  {' · '}{totalShrinkageUnits} units
                  {' · '}<BlurredAmount>{formatCurrency(totalShrinkageCost)}</BlurredAmount> estimated loss
                </CardDescription>
              </div>
            </div>
            {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {displayed.map(item => {
              const shrinkagePct = item.expectedQty > 0
                ? Math.round((item.shrinkageUnits / item.expectedQty) * 100)
                : 0;
              const isSevere = shrinkagePct >= 10;

              return (
                <div key={item.productId} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.category && (
                        <span className="text-[10px] text-muted-foreground">{item.category}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        Expected: {item.expectedQty} → Counted: {item.countedQty}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        · {format(parseISO(item.lastCountedAt), 'MMM d')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge variant="outline" className={cn(
                      'text-[10px] tabular-nums gap-1',
                      isSevere
                        ? 'text-red-500 border-red-200 dark:border-red-800'
                        : 'text-amber-600 border-amber-200 dark:border-amber-800'
                    )}>
                      {isSevere ? <AlertTriangle className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {item.variance} ({shrinkagePct}%)
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      <BlurredAmount>{formatCurrency(item.shrinkageCost)}</BlurredAmount>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {(summaries?.length ?? 0) > 8 && (
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show less' : `View all ${summaries?.length} products`}
            </button>
          )}
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
