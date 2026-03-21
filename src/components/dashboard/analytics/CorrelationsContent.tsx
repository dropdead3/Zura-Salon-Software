import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Lightbulb, RefreshCw, Info } from 'lucide-react';
import { useCorrelationAnalysis, type CorrelationPair } from '@/hooks/useCorrelationAnalysis';
import { CorrelationMatrix } from '@/components/dashboard/analytics/charts/CorrelationMatrix';
import { ScatterPlotCard } from '@/components/dashboard/analytics/charts/ScatterPlotCard';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import type { FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';

interface CorrelationsContentProps {
  locationId?: string;
  filterContext?: FilterContext;
  dateRange?: string;
  locationName?: string;
}

const INSIGHT_TEMPLATES = {
  strong_positive: (a: string, b: string) => 
    `Strong link: When ${a} increases, ${b} tends to rise as well. Consider leveraging ${a} to boost ${b}.`,
  moderate_positive: (a: string, b: string) => 
    `Moderate connection: ${a} and ${b} show some alignment. Changes in one may influence the other.`,
  strong_negative: (a: string, b: string) => 
    `Inverse pattern: Higher ${a} corresponds with lower ${b}. This tradeoff may be worth investigating.`,
  moderate_negative: (a: string, b: string) => 
    `Mild inverse: ${a} and ${b} show some opposing behavior. Monitor both for balance.`,
  weak: (a: string, b: string) => 
    `No significant link between ${a} and ${b}. They appear to operate independently.`,
};

const METRIC_LABELS: Record<string, string> = {
  total_revenue: 'Total Revenue',
  service_revenue: 'Service Revenue',
  product_revenue: 'Product Revenue',
  total_transactions: 'Transactions',
};

function getInsight(pair: CorrelationPair): string {
  const { strength, direction, metricA, metricB } = pair;
  const labelA = METRIC_LABELS[metricA] || metricA;
  const labelB = METRIC_LABELS[metricB] || metricB;
  
  if (strength === 'strong' && direction === 'positive') {
    return INSIGHT_TEMPLATES.strong_positive(labelA, labelB);
  }
  if (strength === 'moderate' && direction === 'positive') {
    return INSIGHT_TEMPLATES.moderate_positive(labelA, labelB);
  }
  if (strength === 'strong' && direction === 'negative') {
    return INSIGHT_TEMPLATES.strong_negative(labelA, labelB);
  }
  if (strength === 'moderate' && direction === 'negative') {
    return INSIGHT_TEMPLATES.moderate_negative(labelA, labelB);
  }
  return INSIGHT_TEMPLATES.weak(labelA, labelB);
}

export function CorrelationsContent({ locationId, filterContext, dateRange, locationName }: CorrelationsContentProps) {
  const [selectedPair, setSelectedPair] = useState<CorrelationPair | null>(null);
  const { data, isLoading, refetch } = useCorrelationAnalysis(locationId);

  // Resolve dateRange/locationName from filterContext if not provided directly
  const resolvedDateRange = dateRange || filterContext?.dateRange;
  const resolvedLocationName = locationName;

  // Get top insights (strong correlations)
  const topInsights = data?.pairs
    ?.filter(c => c.strength === 'strong' || c.strength === 'moderate')
    .slice(0, 5) || [];

  const handleCellClick = (pair: CorrelationPair) => {
    setSelectedPair(pair);
  };

  return (
    <div className="space-y-6">
      {/* Insights Panel */}
      <PinnableCard 
        elementKey="correlation_insights" 
        elementName="Correlation Insights" 
        category="Analytics Hub - Sales"
        dateRange={resolvedDateRange}
        locationName={resolvedLocationName}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Key Insights
                </CardTitle>
                <CardDescription>
                  Automatically detected relationships between your metrics
                </CardDescription>
              </div>
              <Button variant="outline" size={tokens.button.card} onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : topInsights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Not enough data to detect significant correlations yet.</p>
                <p className="text-sm">Check back once you have more sales history.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topInsights.map((pair, index) => {
                  const labelA = METRIC_LABELS[pair.metricA] || pair.metricA;
                  const labelB = METRIC_LABELS[pair.metricB] || pair.metricB;
                  
                  return (
                    <div 
                      key={`${pair.metricA}-${pair.metricB}`}
                      className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleCellClick(pair)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {pair.direction === 'positive' ? (
                            <TrendingUp className="w-5 h-5 text-chart-2" />
                          ) : pair.direction === 'negative' ? (
                            <TrendingDown className="w-5 h-5 text-destructive" />
                          ) : (
                            <Minus className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{labelA}</span>
                            <span className="text-muted-foreground">↔</span>
                            <span className="font-medium text-sm">{labelB}</span>
                            <Badge variant={pair.strength === 'strong' ? 'default' : 'secondary'} className="ml-auto">
                              {pair.coefficient > 0 ? '+' : ''}{(pair.coefficient * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getInsight(pair)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </PinnableCard>

      {/* Correlation Matrix */}
      <PinnableCard 
        elementKey="correlation_matrix" 
        elementName="Correlation Matrix" 
        category="Analytics Hub - Sales"
        dateRange={resolvedDateRange}
        locationName={resolvedLocationName}
      >
        <CorrelationMatrix locationId={locationId} />
      </PinnableCard>

      {/* Scatter Plot Detail */}
      {selectedPair && (
        <PinnableCard 
          elementKey="correlation_scatter" 
          elementName="Scatter Analysis" 
          category="Analytics Hub - Sales"
          dateRange={resolvedDateRange}
          locationName={resolvedLocationName}
        >
          <ScatterPlotCard 
            pair={selectedPair}
            locationId={locationId}
            onClose={() => setSelectedPair(null)}
          />
        </PinnableCard>
      )}
    </div>
  );
}
