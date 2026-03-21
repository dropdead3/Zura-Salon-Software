import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCorrelationAnalysis, getCorrelationColor, getCorrelationLabel } from '@/hooks/useCorrelationAnalysis';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

interface CorrelationMatrixProps {
  locationId?: string;
  days?: number;
}

const METRIC_LABELS: Record<string, string> = {
  total_revenue: 'Total Revenue',
  service_revenue: 'Service Revenue',
  product_revenue: 'Product Revenue',
  total_transactions: 'Transactions',
};

export function CorrelationMatrix({ locationId, days = 90 }: CorrelationMatrixProps) {
  const { data, isLoading } = useCorrelationAnalysis(locationId, days);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const metrics = Object.keys(data?.matrix || {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Metric Correlations
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Shows how metrics move together. Values close to 1 mean they increase together,
                  close to -1 means one increases when the other decreases.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <span className="text-xs text-muted-foreground">Last {days} days</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-xs text-muted-foreground font-normal text-left pb-3 pr-2" />
                {metrics.map(m => (
                  <th key={m} className="text-xs text-muted-foreground font-normal pb-3 px-1 text-center">
                    <div className="w-16 truncate" title={METRIC_LABELS[m]}>
                      {METRIC_LABELS[m]?.split(' ')[0]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map(rowMetric => (
                <tr key={rowMetric}>
                  <td className="text-xs text-muted-foreground pr-3 py-1 whitespace-nowrap">
                    {METRIC_LABELS[rowMetric]}
                  </td>
                  {metrics.map(colMetric => {
                    const coefficient = data?.matrix[rowMetric]?.[colMetric] || 0;
                    const isDiagonal = rowMetric === colMetric;
                    
                    return (
                      <td key={colMetric} className="px-1 py-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'w-16 h-10 rounded-md flex items-center justify-center cursor-default',
                                'transition-transform hover:scale-105',
                                isDiagonal ? 'bg-muted' : getCorrelationColor(coefficient)
                              )}
                            >
                              <span className={cn(
                                'text-xs font-medium',
                                isDiagonal ? 'text-muted-foreground' : 'text-white'
                              )}>
                                {isDiagonal ? '—' : coefficient.toFixed(2)}
                              </span>
                            </div>
                          </TooltipTrigger>
                          {!isDiagonal && (
                            <TooltipContent>
                              <div className="text-xs">
                                <p className="font-medium">
                                  {METRIC_LABELS[rowMetric]} vs {METRIC_LABELS[colMetric]}
                                </p>
                                <p>Correlation: {coefficient.toFixed(3)}</p>
                                <p className="text-muted-foreground">
                                  {Math.abs(coefficient) >= 0.7 ? 'Strong' : 
                                   Math.abs(coefficient) >= 0.4 ? 'Moderate' : 
                                   Math.abs(coefficient) >= 0.2 ? 'Weak' : 'No'} correlation
                                </p>
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top correlations list */}
        {data?.pairs && data.pairs.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-xs font-medium text-muted-foreground mb-3">Strongest Correlations</h4>
            <div className="space-y-2">
              {data.pairs.slice(0, 3).map((pair, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{getCorrelationLabel(pair)}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-medium',
                      pair.coefficient >= 0 ? 'text-chart-2' : 'text-destructive'
                    )}>
                      {pair.coefficient >= 0 ? '+' : ''}{pair.coefficient.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      ({pair.strength})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
