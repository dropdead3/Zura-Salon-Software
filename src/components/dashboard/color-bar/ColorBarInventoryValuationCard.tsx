/**
 * ColorBarInventoryValuationCard — Total professional product inventory value
 * at cost and retail, grouped by brand.
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PackageOpen, Download } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { reportVisibilitySuppression } from '@/lib/dev/visibility-contract-bus';

interface BrandValuation {
  brand: string;
  itemCount: number;
  totalUnits: number;
  costValue: number;
  retailValue: number;
}

export function ColorBarInventoryValuationCard({ locationId }: { locationId?: string }) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { formatCurrency } = useFormatCurrency();

  const { data, isLoading } = useQuery({
    queryKey: ['color-bar-inventory-valuation', orgId, locationId],
    queryFn: async (): Promise<BrandValuation[]> => {
      // Fetch professional products with inventory projections
      const { data: products } = await (supabase
        .from('products' as any)
        .select('id, name, brand, cost_price, retail_price, is_professional')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('is_professional', true) as any);

      if (!products?.length) return [];

      const productIds = (products as any[]).map((p) => p.id);

      let projQuery = supabase
        .from('inventory_projections')
        .select('product_id, on_hand')
        .eq('organization_id', orgId!)
        .in('product_id', productIds);

      if (locationId && locationId !== 'all') {
        projQuery = projQuery.eq('location_id', locationId);
      }

      const { data: projections } = await projQuery;

      const projMap = new Map<string, number>();
      for (const p of (projections as any[]) ?? []) {
        projMap.set(p.product_id, (projMap.get(p.product_id) ?? 0) + (p.on_hand ?? 0));
      }

      // Group by brand
      const brandMap = new Map<string, BrandValuation>();
      for (const prod of (products as any[])) {
        const onHand = projMap.get(prod.id) ?? 0;
        if (onHand <= 0) continue;

        const brand = prod.brand || 'Unbranded';
        const existing = brandMap.get(brand) ?? { brand, itemCount: 0, totalUnits: 0, costValue: 0, retailValue: 0 };
        existing.itemCount++;
        existing.totalUnits += onHand;
        existing.costValue += onHand * (prod.cost_price ?? 0);
        existing.retailValue += onHand * (prod.retail_price ?? 0);
        brandMap.set(brand, existing);
      }

      return Array.from(brandMap.values()).sort((a, b) => b.costValue - a.costValue);
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });

  const totals = useMemo(() => {
    if (!data?.length) return null;
    return {
      items: data.reduce((s, b) => s + b.itemCount, 0),
      units: data.reduce((s, b) => s + b.totalUnits, 0),
      cost: data.reduce((s, b) => s + b.costValue, 0),
      retail: data.reduce((s, b) => s + b.retailValue, 0),
    };
  }, [data]);

  const handleExport = useCallback(() => {
    if (!data?.length) return;
    const esc = (v: string | number) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = ['Brand', 'SKUs', 'Units', 'Cost Value', 'Retail Value', 'Implied Margin %'];
    const rows = data.map((b) => [
      esc(b.brand),
      b.itemCount,
      b.totalUnits,
      b.costValue.toFixed(2),
      b.retailValue.toFixed(2),
      b.retailValue > 0 ? (((b.retailValue - b.costValue) / b.retailValue) * 100).toFixed(1) + '%' : '0%',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map(String).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'color-bar-inventory-valuation.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  // Visibility Contract: no professional inventory with on-hand value to surface.
  if (isLoading || !data?.length) {
    const reason = isLoading ? 'loading' : 'no-data';
    reportVisibilitySuppression('color-bar-inventory-valuation', reason, {
      brandCount: data?.length ?? 0,
    });
    return null;
  }

  return (
    <Card className={cn(tokens.card.wrapper)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <PackageOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>Inventory Valuation</CardTitle>
                <MetricInfoTooltip description="Total professional product inventory value at cost and retail price, grouped by brand." />
              </div>
              <CardDescription className="text-xs">
                {totals?.items ?? 0} SKUs · {totals?.units ?? 0} units on hand
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded-lg bg-muted/30 border border-border/40">
          <div className="text-center">
            <p className="text-[10px] font-display text-muted-foreground uppercase tracking-wide">At Cost</p>
            <p className="font-display text-lg tabular-nums"><BlurredAmount>{formatCurrency(totals?.cost ?? 0)}</BlurredAmount></p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-display text-muted-foreground uppercase tracking-wide">At Retail</p>
            <p className="font-display text-lg tabular-nums"><BlurredAmount>{formatCurrency(totals?.retail ?? 0)}</BlurredAmount></p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-display text-muted-foreground uppercase tracking-wide">Margin</p>
            <p className="font-display text-lg tabular-nums">
              {totals && totals.retail > 0 ? (((totals.retail - totals.cost) / totals.retail) * 100).toFixed(1) : '0'}%
            </p>
          </div>
        </div>

        {/* Brand rows */}
        <div className="space-y-1">
          {data.map((b) => (
            <div key={b.brand} className="flex items-center gap-3 py-1.5 text-xs font-sans">
              <span className="flex-1 truncate text-foreground">{b.brand}</span>
              <span className="text-muted-foreground tabular-nums">{b.totalUnits} units</span>
              <span className="tabular-nums w-20 text-right"><BlurredAmount>{formatCurrency(b.costValue)}</BlurredAmount></span>
              <span className="tabular-nums w-20 text-right text-muted-foreground"><BlurredAmount>{formatCurrency(b.retailValue)}</BlurredAmount></span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
