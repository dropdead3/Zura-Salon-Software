/**
 * ChemicalCostTrendCard — Sparkline showing chemical cost per service over time.
 * Alerts on cost spikes.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useChemicalCostTrend } from '@/hooks/color-bar/useChemicalCostTrend';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';
import { reportVisibilitySuppression } from '@/lib/dev/visibility-contract-bus';

interface ChemicalCostTrendCardProps {
  days?: number;
}

const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
} as const;

export function ChemicalCostTrendCard({ days = 28 }: ChemicalCostTrendCardProps) {
  const { data: trend, isLoading } = useChemicalCostTrend(days);

  // Visibility Contract: needs ≥3 points to render a meaningful trend.
  if (isLoading || !trend || trend.points.length < 3) {
    const reason = isLoading ? 'loading' : !trend ? 'no-data' : 'insufficient-points';
    reportVisibilitySuppression('chemical-cost-trend', reason, {
      pointCount: trend?.points.length ?? 0,
      threshold: 3,
      windowDays: days,
    });
    return null;
  }

  const TrendIcon = TREND_ICONS[trend.trendDirection];

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={tokens.card.iconBox}>
              <TrendingUp className={tokens.card.icon} />
            </div>
            <CardTitle className={tokens.card.title}>
              Chemical Cost Trend
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {trend.hasCostSpike && (
              <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Cost Spike
              </Badge>
            )}
            <div className="flex items-center gap-1">
              <TrendIcon className={`w-3.5 h-3.5 ${
                trend.trendDirection === 'up' ? 'text-destructive' :
                trend.trendDirection === 'down' ? 'text-success' :
                'text-muted-foreground'
              }`} />
              <span className="font-display text-sm tabular-nums">
                <BlurredAmount>${trend.currentAvg.toFixed(2)}</BlurredAmount>
              </span>
              <span className="font-sans text-[10px] text-muted-foreground">/svc</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        <div className="h-[60px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend.points}>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Line
                type="monotone"
                dataKey="avgCostPerService"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between mt-2 font-sans text-[10px] text-muted-foreground">
          <span>{days}-day rolling avg: <BlurredAmount>${trend.rollingAvg.toFixed(2)}</BlurredAmount></span>
          {trend.spikeRatio > 1 && (
            <span className={trend.hasCostSpike ? 'text-destructive' : ''}>
              {((trend.spikeRatio - 1) * 100).toFixed(0)}% above avg
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
