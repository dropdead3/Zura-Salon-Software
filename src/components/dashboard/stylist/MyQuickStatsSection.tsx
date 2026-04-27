/**
 * MyQuickStatsSection — self-scoped weekly KPI strip for stylists.
 *
 * Stylist Privacy Contract enforcement: every value is scoped to the
 * effective user via useStylistIncomeForecast (queries v_all_appointments
 * filtered by stylist_user_id). No org-wide aggregates are ever rendered.
 */

import { Card } from '@/components/ui/card';
import { Calendar, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { useStylistIncomeForecast } from '@/hooks/useStylistIncomeForecast';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';

export function MyQuickStatsSection() {
  const { data, isLoading } = useStylistIncomeForecast();
  const { formatCurrencyWhole } = useFormatCurrency();

  const items = [
    {
      icon: Calendar,
      label: 'Appointments this week',
      value: isLoading ? '—' : String(data?.appointmentCount ?? 0),
      isCurrency: false,
    },
    {
      icon: DollarSign,
      label: 'Booked revenue',
      value: isLoading
        ? '—'
        : formatCurrencyWhole(data?.bookedRevenue ?? 0),
      isCurrency: true,
    },
    {
      icon: Wallet,
      label: 'Estimated earnings',
      value: isLoading
        ? '—'
        : data?.estimatedEarnings != null
          ? formatCurrencyWhole(data.estimatedEarnings)
          : '—',
      isCurrency: true,
      hint: data?.commissionRate == null
        ? 'Commission rate not set'
        : `${Math.round((data.commissionRate ?? 0) * 100)}% commission`,
    },
    {
      icon: TrendingUp,
      label: 'This week',
      value: data?.weekStart
        ? new Date(data.weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : '—',
      isCurrency: false,
    },
  ];

  return (
    <div>
      <p className="text-[10px] font-display tracking-wide text-muted-foreground mb-2 uppercase">
        My Week · Personal Forecast
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <Card
            key={item.label}
            className="relative overflow-hidden p-4 rounded-xl backdrop-blur-sm transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted shadow-inner flex items-center justify-center rounded-xl">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-display tabular-nums truncate">
                  {item.isCurrency ? <BlurredAmount>{item.value}</BlurredAmount> : item.value}
                </p>
                <p className="text-xs text-muted-foreground font-sans truncate">
                  {item.label}
                </p>
                {item.hint && (
                  <p className="text-[10px] text-muted-foreground/70 font-sans mt-0.5 truncate">
                    {item.hint}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
