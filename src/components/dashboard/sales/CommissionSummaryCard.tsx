import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Wallet, Users, Scissors, ShoppingBag } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useResolveCommission } from '@/hooks/useResolveCommission';

interface StylistData {
  user_id: string;
  name: string;
  serviceRevenue: number;
  productRevenue: number;
}

interface CommissionSummaryCardProps {
  stylistData: StylistData[] | undefined;
  /** @deprecated - kept for backward compat, resolver is used internally now */
  calculateCommission?: (serviceRevenue: number, productRevenue: number) => {
    serviceCommission: number;
    productCommission: number;
    totalCommission: number;
    tierName: string;
  };
  isLoading: boolean;
}

export function CommissionSummaryCard({ stylistData, isLoading }: CommissionSummaryCardProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { resolveCommission, isLoading: resolverLoading } = useResolveCommission();

  const totals = useMemo(() => {
    if (!stylistData?.length) return { total: 0, service: 0, product: 0, avg: 0, count: 0 };

    let totalCommission = 0;
    let totalServiceCommission = 0;
    let totalProductCommission = 0;

    stylistData.forEach((s) => {
      const c = resolveCommission(s.user_id, s.serviceRevenue, s.productRevenue);
      totalCommission += c.totalCommission;
      totalServiceCommission += c.serviceCommission;
      totalProductCommission += c.retailCommission;
    });

    return {
      total: totalCommission,
      service: totalServiceCommission,
      product: totalProductCommission,
      avg: stylistData.length > 0 ? totalCommission / stylistData.length : 0,
      count: stylistData.length,
    };
  }, [stylistData, resolveCommission]);

  if (isLoading || resolverLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center h-[140px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: 'Total Commission Liability',
      value: formatCurrencyWhole(Math.round(totals.total)),
      icon: Wallet,
      accent: true,
    },
    {
      label: 'Service Commission',
      value: formatCurrencyWhole(Math.round(totals.service)),
      icon: Scissors,
      accent: false,
    },
    {
      label: 'Product Commission',
      value: formatCurrencyWhole(Math.round(totals.product)),
      icon: ShoppingBag,
      accent: false,
    },
    {
      label: 'Average Per Stylist',
      value: formatCurrencyWhole(Math.round(totals.avg)),
      icon: Users,
      accent: false,
      subtitle: `${totals.count} stylists`,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-base tracking-wide">COMMISSION SUMMARY</CardTitle>
              <MetricInfoTooltip description="Aggregate commission liability across all stylists. Resolves per-stylist using override → level → tier priority." />
            </div>
            <CardDescription className="text-xs">
              Total estimated commission based on individual stylist revenue and resolved rates
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className={
                  m.accent
                    ? 'p-4 rounded-lg bg-gradient-to-br from-primary/10 to-chart-2/10 border border-primary/10'
                    : 'p-4 rounded-lg bg-muted/30'
                }
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">{m.label}</p>
                </div>
                <BlurredAmount className={m.accent ? 'text-2xl font-display' : 'text-lg font-display'}>
                  {m.value}
                </BlurredAmount>
                {m.subtitle && (
                  <p className="text-[11px] text-muted-foreground mt-1">{m.subtitle}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
