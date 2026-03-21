/**
 * PredictiveBackroomSummary — Compact overview card for owner dashboard.
 */

import { Beaker, AlertTriangle, Calendar, ShoppingCart } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useForecastSummary } from '@/hooks/backroom/usePredictiveBackroom';

interface PredictiveBackroomSummaryProps {
  locationId?: string | null;
}

export function PredictiveBackroomSummary({ locationId }: PredictiveBackroomSummaryProps) {
  const { data: summary, isLoading } = useForecastSummary(locationId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Beaker className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Predictive Backroom</CardTitle>
              <CardDescription>Loading forecast…</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const hasRisk = summary.products_at_risk > 0;

  return (
    <Card className={hasRisk ? 'border-destructive/20' : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Beaker className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Predictive Backroom</CardTitle>
              <CardDescription>Chemical demand forecast</CardDescription>
            </div>
          </div>
          {hasRisk && (
            <Badge variant="destructive" className="font-sans text-xs">
              {summary.products_at_risk} at risk
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={tokens.label.tiny}>Tomorrow</span>
            </div>
            <p className={tokens.stat.large}>{summary.total_services_1d}</p>
            <p className={tokens.body.muted}>services</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={tokens.label.tiny}>Next 7 Days</span>
            </div>
            <p className={tokens.stat.large}>{summary.total_services_7d}</p>
            <p className={tokens.body.muted}>services</p>
          </div>
        </div>

        {summary.urgent_reorders.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
              <span className={cn(tokens.label.tiny, 'text-destructive')}>Urgent Reorders</span>
            </div>
            {summary.urgent_reorders.map((item) => (
              <div key={item.product_id} className="flex items-center justify-between text-sm">
                <span className={tokens.body.emphasis}>{item.product_name}</span>
                <div className="flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3 text-muted-foreground" />
                  <span className={tokens.body.muted}>
                    {item.recommended_order_qty} {item.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {summary.unmapped_services_count > 0 && (
          <p className={cn(tokens.body.muted, 'mt-3 text-xs')}>
            {summary.unmapped_services_count} service{summary.unmapped_services_count !== 1 ? 's' : ''} without formula data
          </p>
        )}
      </CardContent>
    </Card>
  );
}
