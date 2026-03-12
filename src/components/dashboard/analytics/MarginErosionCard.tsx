import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { useMarginErosion } from '@/hooks/useMarginErosion';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { AnalyticsFilterBadge, type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';
import { EmptyState } from '@/components/ui/empty-state';

interface MarginErosionCardProps {
  filterContext?: FilterContext;
}

export function MarginErosionCard({ filterContext }: MarginErosionCardProps) {
  const { data, isLoading } = useMarginErosion();
  const { formatCurrencyWhole } = useFormatCurrency();

  if (isLoading || !data || data.items.length === 0) return null;

  const criticalCount = data.items.filter(i => i.severity === 'critical').length;

  return (
    <PinnableCard elementKey="retail_margin_erosion" elementName="Margin Erosion Alerts" category="Analytics Hub - Retail">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <TrendingDown className={tokens.card.icon} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base tracking-wide">MARGIN EROSION ALERTS</CardTitle>
                  <MetricInfoTooltip description="Products where supplier cost increased >5% in 90 days or margin compressed below 30%. Annual impact estimates assume 4x current stock turnover or minimum 12 units/year." />
                </div>
                <CardDescription className="text-xs">
                  {data.totalAffected} product{data.totalAffected !== 1 ? 's' : ''} affected
                  {criticalCount > 0 && <span className="text-red-500 ml-1">· {criticalCount} critical</span>}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {filterContext && <AnalyticsFilterBadge locationId={filterContext.locationId} dateRange={filterContext.dateRange} />}
              <Badge variant="outline" className="text-xs tabular-nums text-red-500 border-red-200 dark:border-red-800">
                <BlurredAmount>{formatCurrencyWhole(data.totalAnnualRisk)}</BlurredAmount> at risk
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Old Cost</TableHead>
                  <TableHead className="text-right">New Cost</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Annual Risk</TableHead>
                  <TableHead className="text-center">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.slice(0, 20).map(item => (
                  <TableRow key={item.productId} className={cn(item.severity === 'critical' && 'bg-red-50/50 dark:bg-red-950/10')}>
                    <TableCell className="font-medium text-sm max-w-[180px] truncate">{item.productName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">{item.supplierName ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      <BlurredAmount>{formatCurrencyWhole(item.oldCost)}</BlurredAmount>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <BlurredAmount>{formatCurrencyWhole(item.newCost)}</BlurredAmount>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        'text-xs tabular-nums font-medium',
                        item.costChangePercent > 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400',
                      )}>
                        {item.costChangePercent > 0 ? '+' : ''}{item.costChangePercent}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.currentMargin !== null ? (
                        <Badge variant="outline" className={cn(
                          'text-[10px] tabular-nums',
                          item.currentMargin >= 50 ? 'text-emerald-600 border-emerald-200 dark:text-emerald-400' :
                          item.currentMargin >= 30 ? 'text-amber-600 border-amber-200 dark:text-amber-400' :
                          'text-red-500 border-red-200 dark:text-red-400',
                        )}>
                          {item.currentMargin}%
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      <BlurredAmount>{formatCurrencyWhole(item.annualImpact)}</BlurredAmount>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn(
                        'text-[10px]',
                        item.severity === 'critical'
                          ? 'text-red-500 border-red-200 dark:border-red-800'
                          : 'text-amber-600 border-amber-200 dark:border-amber-800',
                      )}>
                        {item.severity === 'critical' && <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
                        {item.severity === 'critical' ? 'Critical' : 'Warning'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
