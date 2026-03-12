/**
 * IncomeForecastCard — Stylist-facing weekly earnings forecast.
 * Shows booked revenue, estimated earnings, and appointment count.
 */

import { DollarSign, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useStylistIncomeForecast } from '@/hooks/useStylistIncomeForecast';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';

interface IncomeForecastCardProps {
  className?: string;
}

export function IncomeForecastCard({ className }: IncomeForecastCardProps) {
  const { data, isLoading } = useStylistIncomeForecast();
  const { formatCurrency } = useFormatCurrency();

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-6 flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const commissionPct = data.commissionRate != null
    ? `${Math.round(data.commissionRate * 100)}%`
    : null;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={tokens.card.iconBox}>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className={tokens.card.title}>Week Forecast</CardTitle>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>This Week</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary KPI */}
        <div className="space-y-1">
          <span className={tokens.kpi.label}>Booked Revenue</span>
          <p className={tokens.kpi.value}>
            <BlurredAmount>{formatCurrency(data.bookedRevenue)}</BlurredAmount>
          </p>
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/60 p-3 space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Est. Earnings
            </span>
            <p className="text-sm font-medium">
              {data.estimatedEarnings != null ? (
                <BlurredAmount>{formatCurrency(data.estimatedEarnings)}</BlurredAmount>
              ) : (
                <span className="text-muted-foreground italic text-xs">Not configured</span>
              )}
            </p>
            {commissionPct && (
              <span className="text-[10px] text-muted-foreground">at {commissionPct}</span>
            )}
          </div>

          <div className="rounded-lg border border-border/60 p-3 space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Appointments
            </span>
            <p className="text-sm font-medium">{data.appointmentCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
