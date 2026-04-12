import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useQuickStats } from '@/hooks/useQuickStats';

interface KpiTile {
  label: string;
  value: string;
  blurred?: boolean;
  trend?: 'up' | 'down' | 'flat';
}

export function OperatorPerformanceStrip() {
  const { thisWeekRevenue, rebookingRate, isLoading } = useQuickStats();
  const { formatCurrencyWhole } = useFormatCurrency();

  const tiles = useMemo<KpiTile[]>(() => [
    {
      label: 'Revenue',
      value: formatCurrencyWhole(thisWeekRevenue),
      blurred: true,
      trend: thisWeekRevenue > 0 ? 'up' : 'flat',
    },
    {
      label: 'Rebooking',
      value: `${rebookingRate.toFixed(0)}%`,
      trend: rebookingRate >= 60 ? 'up' : rebookingRate >= 40 ? 'flat' : 'down',
    },
  ], [thisWeekRevenue, rebookingRate, formatCurrencyWhole]);

  if (isLoading) return null;

  const TrendIcon = ({ trend }: { trend?: string }) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-emerald-500" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-destructive" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <Card key={tile.label} className="p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className={tokens.label.tiny}>{tile.label.toUpperCase()}</p>
              <p className="font-display text-lg font-medium tabular-nums mt-1">
                {tile.blurred ? (
                  <BlurredAmount>{tile.value}</BlurredAmount>
                ) : (
                  tile.value
                )}
              </p>
            </div>
            <TrendIcon trend={tile.trend} />
          </div>
        </Card>
      ))}
    </div>
  );
}
