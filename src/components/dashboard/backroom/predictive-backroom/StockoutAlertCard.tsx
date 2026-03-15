/**
 * StockoutAlertCard — Compact alert for high/critical risk products.
 */

import { AlertTriangle } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { QuickReorderButton } from '@/components/dashboard/backroom/supply-intelligence/QuickReorderButton';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStockoutAlerts } from '@/hooks/backroom/usePredictiveBackroom';
import type { ProductDemandForecast } from '@/lib/backroom/services/predictive-backroom-service';

interface StockoutAlertCardProps {
  locationId?: string | null;
}

export function StockoutAlertCard({ locationId }: StockoutAlertCardProps) {
  const { data: alerts, isLoading } = useStockoutAlerts(locationId);

  if (isLoading || !alerts?.length) return null;

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span className={cn(tokens.heading.subsection, 'text-destructive')}>
            Stockout Risk Detected
          </span>
          <Badge variant="destructive" className="font-sans text-xs ml-auto">
            {alerts.length} product{alerts.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertItem key={alert.product_id} alert={alert} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertItem({ alert }: { alert: ProductDemandForecast }) {
  const isCritical = alert.stockout_risk === 'critical';

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <span className={tokens.body.emphasis}>{alert.product_name}</span>
        {alert.brand && (
          <span className={cn(tokens.body.muted, 'ml-1 text-xs')}>({alert.brand})</span>
        )}
        <p className={tokens.body.muted}>
          On hand: {alert.current_on_hand} {alert.unit} · After 7d: {alert.remaining_after_7d} {alert.unit}
        </p>
      </div>
      {alert.recommended_order_qty > 0 && (
        <div className="flex items-center gap-1 text-xs shrink-0 ml-3">
          <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={cn(
            tokens.body.emphasis,
            isCritical ? 'text-destructive' : 'text-orange-600 dark:text-orange-400',
          )}>
            Order {alert.recommended_order_qty} {alert.unit}
          </span>
        </div>
      )}
    </div>
  );
}
