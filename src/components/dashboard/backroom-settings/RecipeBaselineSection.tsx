import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useServiceRecipeBaselines, useUpsertRecipeBaseline, useDeleteRecipeBaseline } from '@/hooks/inventory/useServiceRecipeBaselines';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, BarChart3, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { cn } from '@/lib/utils';

interface Props {
  onNavigate?: (section: string) => void;
}

export function RecipeBaselineSection({ onNavigate }: Props) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const { data: services, isLoading } = useQuery({
    queryKey: ['backroom-tracked-services', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, category')
        .eq('organization_id', orgId!)
        .eq('is_backroom_tracked', true)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string; category: string | null }[];
    },
    enabled: !!orgId,
  });

  const { data: allBaselines } = useServiceRecipeBaselines();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  const baselinesByService = new Map<string, number>();
  (allBaselines || []).forEach((b) => {
    baselinesByService.set(b.service_id, (baselinesByService.get(b.service_id) || 0) + 1);
  });

  return (
    <div className="space-y-4">
      <Infotainer
        id="backroom-recipes-guide"
        title="Recipe Baselines"
        description="Set the expected product quantities per service — e.g. 'A full highlight uses ~30g lightener + 60ml developer.' Powers Smart Mix Assist suggestions and flags when a stylist uses significantly more or less than expected."
        icon={<BarChart3 className="h-4 w-4 text-primary" />}
      />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>Recipe Baselines</CardTitle>
                <MetricInfoTooltip description="The expected amount of each product for a standard application. Zura flags deviations beyond the variance threshold." />
              </div>
              <CardDescription>
                Define expected product usage per service. Powers Smart Mix Assist and variance detection.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(services || []).length === 0 ? (
            <div className={tokens.empty.container}>
              <BarChart3 className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No tracked services</h3>
              <p className={tokens.empty.description}>Products → Services → then Baselines. Enable backroom tracking on services first.</p>
              {onNavigate && (
                <Button variant="outline" size="sm" className="mt-2" onClick={() => onNavigate('services')}>
                  Go to Service Tracking
                </Button>
              )}
            </div>
          ) : (
            <>
              {(services || []).map((service) => {
                const count = baselinesByService.get(service.id) || 0;
                return (
                  <button
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    className="flex items-center gap-3 rounded-lg border border-border/60 p-3 w-full text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sans font-medium text-foreground truncate">{service.name}</p>
                      {service.category && <span className="text-xs text-muted-foreground">{service.category}</span>}
                    </div>
                    <Badge variant={count > 0 ? 'default' : 'outline'} className="text-xs shrink-0">
                      {count} baseline{count !== 1 ? 's' : ''}
                    </Badge>
                  </button>
                );
              })}

              {/* Next step hint */}
              {onNavigate && (
                <div className="flex justify-end pt-2 border-t border-border/40">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => onNavigate('allowances')}>
                    Next: Allowances & Billing <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedServiceId && (
        <RecipeBaselineDialog
          serviceId={selectedServiceId}
          serviceName={services?.find((s) => s.id === selectedServiceId)?.name || ''}
          orgId={orgId!}
          onClose={() => setSelectedServiceId(null)}
        />
      )}
    </div>
  );
}

function RecipeBaselineDialog({ serviceId, serviceName, orgId, onClose }: {
  serviceId: string;
  serviceName: string;
  orgId: string;
  onClose: () => void;
}) {
  const { data: baselines, isLoading } = useServiceRecipeBaselines(serviceId);
  const upsertBaseline = useUpsertRecipeBaseline();
  const deleteBaseline = useDeleteRecipeBaseline();
  const [newProductId, setNewProductId] = useState<string>('');
  const [newQty, setNewQty] = useState<string>('');
  const [newUnit, setNewUnit] = useState<string>('g');

  const { data: products } = useQuery({
    queryKey: ['backroom-products-for-baseline', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('is_backroom_tracked', true)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const handleAdd = () => {
    if (!newProductId || !newQty) return;
    upsertBaseline.mutate({
      organization_id: orgId,
      service_id: serviceId,
      product_id: newProductId,
      expected_quantity: parseFloat(newQty),
      unit: newUnit,
    });
    setNewProductId('');
    setNewQty('');
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={tokens.card.title}>{serviceName} — Baselines</DialogTitle>
          <DialogDescription className={tokens.body.muted}>
            Expected product usage for this service type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            <>
              {(baselines || []).map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-sans font-medium text-foreground truncate">
                      {products?.find((p) => p.id === b.product_id)?.name || 'Unknown'}
                    </p>
                    <span className="text-xs text-muted-foreground">{b.expected_quantity}{b.unit}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteBaseline.mutate(b.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <Select value={newProductId} onValueChange={setNewProductId}>
                  <SelectTrigger className="flex-1 text-sm font-sans">
                    <SelectValue placeholder="Product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(products || []).map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-sm">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Qty"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-20 text-sm font-sans"
                  autoCapitalize="none"
                />
                <Select value={newUnit} onValueChange={setNewUnit}>
                  <SelectTrigger className="w-16 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['g', 'ml', 'oz', 'sheets', 'pairs', 'pumps', 'scoops'].map((u) => (
                      <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAdd} disabled={!newProductId || !newQty}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
