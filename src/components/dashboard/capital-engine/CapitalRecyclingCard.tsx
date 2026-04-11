import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/format';
import type { CapitalRecyclingMetrics } from '@/lib/capital-engine/ownership-engine';

interface CapitalRecyclingCardProps {
  metrics: CapitalRecyclingMetrics;
}

export function CapitalRecyclingCard({ metrics }: CapitalRecyclingCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className={tokens.card.title}>Capital Recycling</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground font-sans">Deployed</p>
            <p className="font-display text-xl tracking-wide">
              {formatCurrency(metrics.totalDeployed, { compact: true, noCents: true })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-sans">Returned</p>
            <p className="font-display text-xl tracking-wide">
              {formatCurrency(metrics.totalReturned, { compact: true, noCents: true })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-sans">ROI Multiple</p>
            <p className="font-display text-xl tracking-wide">{metrics.netROIMultiple}x</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-sans">Reinvested</p>
            <p className="font-display text-xl tracking-wide">
              {formatCurrency(metrics.totalReinvested, { compact: true, noCents: true })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
