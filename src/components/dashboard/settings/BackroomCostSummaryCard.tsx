import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { tokens } from '@/lib/design-tokens';
import { Beaker, Loader2 } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBackroomLocationEntitlements } from '@/hooks/backroom/useBackroomLocationEntitlements';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/hooks/useBillingCalculations';

const TIER_PRICES: Record<string, number> = {
  starter: 39,
  professional: 79,
  unlimited: 129,
};

const SCALE_LICENSE_MONTHLY = 10;

const TIER_BADGE_STYLES: Record<string, string> = {
  starter: 'border-blue-500/50 text-blue-600 bg-blue-500/10',
  professional: 'border-violet-500/50 text-violet-600 bg-violet-500/10',
  unlimited: 'border-amber-500/50 text-amber-600 bg-amber-500/10',
};

export function BackroomCostSummaryCard() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { entitlements, isLoading: entLoading } = useBackroomLocationEntitlements(orgId);

  // Fetch location names
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
  const totalTierCost = activeEntitlements.reduce((s, e) => s + (TIER_PRICES[e.plan_tier] || 0), 0);
  const totalScaleCost = totalScales * SCALE_LICENSE_MONTHLY;
  const grandTotal = totalTierCost + totalScaleCost;

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
    return null; // Don't show if no Backroom subscriptions
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
        {/* Per-location breakdown */}
        <div className="space-y-2">
          {activeEntitlements.map((ent) => {
            const locName = locationMap.get(ent.location_id) || 'Unknown Location';
            const tierCost = TIER_PRICES[ent.plan_tier] || 0;
            const scaleCost = (ent.scale_count || 0) * SCALE_LICENSE_MONTHLY;
            return (
              <div
                key={ent.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40"
              >
                <div className="flex items-center gap-2">
                  <span className="font-sans text-sm text-foreground">{locName}</span>
                  <Badge variant="outline" className={TIER_BADGE_STYLES[ent.plan_tier] || ''}>
                    {ent.plan_tier}
                  </Badge>
                  {ent.scale_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      · {ent.scale_count} scale{ent.scale_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span className="font-sans text-sm text-foreground">
                  {formatCurrency(tierCost + scaleCost)}/mo
                </span>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="flex justify-between font-display text-sm tracking-wide">
          <span>Backroom Total</span>
          <span className="text-foreground">{formatCurrency(grandTotal)}/mo</span>
        </div>
      </CardContent>
    </Card>
  );
}
