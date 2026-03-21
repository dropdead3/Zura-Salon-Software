import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { tokens } from '@/lib/design-tokens';
import { Beaker, Loader2 } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBackroomLocationEntitlements } from '@/hooks/backroom/useBackroomLocationEntitlements';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/hooks/useBillingCalculations';
import { BACKROOM_BASE_PRICE, SCALE_LICENSE_MONTHLY } from '@/hooks/backroom/useLocationStylistCounts';

export function BackroomCostSummaryCard() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { entitlements, isLoading: entLoading } = useBackroomLocationEntitlements(orgId);

  const { data: locations } = useQuery({
    queryKey: ['locations-names', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const locationMap = useMemo(() => {
    const m = new Map<string, string>();
    (locations || []).forEach(l => m.set(l.id, l.name));
    return m;
  }, [locations]);

  const activeEntitlements = entitlements.filter(e => e.status === 'active');
  const totalScales = activeEntitlements.reduce((s, e) => s + (e.scale_count || 0), 0);
  const totalBaseCost = activeEntitlements.length * BACKROOM_BASE_PRICE;
  const totalScaleCost = totalScales * SCALE_LICENSE_MONTHLY;
  const grandTotal = totalBaseCost + totalScaleCost;

  if (entLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className={tokens.loading.spinner} />
        </CardContent>
      </Card>
    );
  }

  if (activeEntitlements.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Beaker className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Backroom Add-Ons</CardTitle>
            <CardDescription>Per-location chemical tracking subscriptions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {activeEntitlements.map((ent) => {
            const locName = locationMap.get(ent.location_id) || 'Unknown Location';
            const scaleCost = (ent.scale_count || 0) * SCALE_LICENSE_MONTHLY;
            return (
              <div
                key={ent.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40"
              >
                <div className="flex items-center gap-2">
                  <span className="font-sans text-sm text-foreground">{locName}</span>
                  {ent.scale_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      · {ent.scale_count} scale{ent.scale_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span className="font-sans text-sm text-foreground">
                  {formatCurrency(BACKROOM_BASE_PRICE + scaleCost)}/mo
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground font-sans">
          + $0.50 per color service appointment (usage-based)
        </p>

        <Separator />

        <div className="flex justify-between font-display text-sm tracking-wide">
          <span>Backroom Base Total</span>
          <span className="text-foreground">{formatCurrency(grandTotal)}/mo</span>
        </div>
      </CardContent>
    </Card>
  );
}
