import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calculator } from 'lucide-react';
import { useResolveCommission } from '@/hooks/useResolveCommission';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface CommissionCalculatorProps {
  serviceRevenue: number;
  productRevenue: number;
  stylistName?: string;
  stylistUserId?: string;
  showTierEditor?: boolean;
}

export function CommissionCalculator({ 
  serviceRevenue, 
  productRevenue, 
  stylistName,
  stylistUserId,
}: CommissionCalculatorProps) {
  const { resolveCommission, isLoading: resolverLoading } = useResolveCommission();
  const { data: levels, isLoading: levelsLoading } = useStylistLevels();
  const { formatCurrencyWhole } = useFormatCurrency();

  const resolved = stylistUserId 
    ? resolveCommission(stylistUserId, serviceRevenue, productRevenue)
    : null;

  const commission = resolved 
    ? {
        serviceCommission: resolved.serviceCommission,
        productCommission: resolved.retailCommission,
        totalCommission: resolved.totalCommission,
        tierName: resolved.sourceName,
      }
    : (() => {
        if (!levels || levels.length === 0) return { serviceCommission: 0, productCommission: 0, totalCommission: 0, tierName: '' };
        const midLevel = levels[Math.floor(levels.length / 2)];
        const svcRate = midLevel.service_commission_rate ?? 0;
        const retailRate = midLevel.retail_commission_rate ?? 0;
        return {
          serviceCommission: serviceRevenue * svcRate,
          productCommission: productRevenue * retailRate,
          totalCommission: serviceRevenue * svcRate + productRevenue * retailRate,
          tierName: midLevel.label,
        };
      })();

  const isLoading = levelsLoading || resolverLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="font-display text-base tracking-wide">COMMISSION CALCULATOR</CardTitle>
            <CardDescription className="text-xs">
              {stylistName ? `Estimated earnings for ${stylistName}` : 'Estimated earnings based on assigned level'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="text-center p-5 bg-gradient-to-br from-primary/10 to-chart-2/10 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Estimated Commission</p>
          <BlurredAmount className="text-3xl font-display">
            {formatCurrencyWhole(Math.round(commission.totalCommission))}
          </BlurredAmount>
          <Badge variant="outline" className="mt-2">{commission.tierName}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-[11px] text-muted-foreground">Service Commission</p>
            <BlurredAmount className="text-lg font-display">
              {formatCurrencyWhole(Math.round(commission.serviceCommission))}
            </BlurredAmount>
            <BlurredAmount className="text-[11px] text-muted-foreground">
              from {formatCurrencyWhole(serviceRevenue)} in services
            </BlurredAmount>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-[11px] text-muted-foreground">Product Commission</p>
            <BlurredAmount className="text-lg font-display">
              {formatCurrencyWhole(Math.round(commission.productCommission))}
            </BlurredAmount>
            <BlurredAmount className="text-[11px] text-muted-foreground">
              from {formatCurrencyWhole(productRevenue)} in products
            </BlurredAmount>
          </div>
        </div>

        {resolved?.source === 'override' && (
          <div className="p-3 bg-chart-4/5 border border-chart-4/20 rounded-lg text-center">
            <p className="text-sm text-chart-4 font-medium">Custom override rate active</p>
          </div>
        )}

        {resolved?.source === 'level' && (
          <div className="p-3 bg-chart-2/5 border border-chart-2/20 rounded-lg text-center">
            <p className="text-sm text-chart-2 font-medium">Rate set by stylist level</p>
          </div>
        )}

        {resolved?.source === 'unassigned' && (
          <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-center">
            <p className="text-sm text-destructive font-medium">No level assigned — commission is 0%</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
