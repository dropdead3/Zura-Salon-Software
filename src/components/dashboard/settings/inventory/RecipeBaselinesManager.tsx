/**
 * RecipeBaselinesManager — Settings UI for managing expected product usage per service.
 * Located in /dashboard/settings/inventory/
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, FlaskConical } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  useServiceRecipeBaselines,
  useUpsertRecipeBaseline,
  useDeleteRecipeBaseline,
  type ServiceRecipeBaseline,
} from '@/hooks/inventory/useServiceRecipeBaselines';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ServiceOption {
  id: string;
  name: string;
  category: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  brand: string | null;
}

export function RecipeBaselinesManager() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [newProductId, setNewProductId] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newUnit, setNewUnit] = useState('g');

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ['services-list', orgId],
    queryFn: async (): Promise<ServiceOption[]> => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, category')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      return data as unknown as ServiceOption[];
    },
    enabled: !!orgId,
  });

  // Fetch products for dropdown
  const { data: products = [] } = useQuery({
    queryKey: ['products-list', orgId],
    queryFn: async (): Promise<ProductOption[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      return data as unknown as ProductOption[];
    },
    enabled: !!orgId,
  });

  // Fetch baselines for selected service
  const { data: baselines = [], isLoading: loadingBaselines } = useServiceRecipeBaselines(selectedServiceId);
  const upsertBaseline = useUpsertRecipeBaseline();
  const deleteBaseline = useDeleteRecipeBaseline();

  const handleAddBaseline = () => {
    if (!orgId || !selectedServiceId || !newProductId || !newQuantity) return;
    upsertBaseline.mutate({
      organization_id: orgId,
      service_id: selectedServiceId,
      product_id: newProductId,
      bowl_id: crypto.randomUUID(),
      expected_quantity: parseFloat(newQuantity),
      unit: newUnit,
    }, {
      onSuccess: () => {
        setNewProductId('');
        setNewQuantity('');
      },
    });
  };

  // Get product names for display
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Aggregate baseline count per service
  const { data: allBaselines = [] } = useServiceRecipeBaselines();
  const serviceBaselineCount = new Map<string, number>();
  for (const b of allBaselines) {
    serviceBaselineCount.set(b.service_id, (serviceBaselineCount.get(b.service_id) ?? 0) + 1);
  }

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <FlaskConical className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Formula Baselines</CardTitle>
            <CardDescription className="font-sans text-sm">
              Define expected product usage per service for variance tracking
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Service selector */}
        <Select
          value={selectedServiceId ?? ''}
          onValueChange={(v) => setSelectedServiceId(v || null)}
        >
          <SelectTrigger className="font-sans">
            <SelectValue placeholder="Select a service..." />
          </SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id} className="font-sans">
                <div className="flex items-center gap-2">
                  <span>{s.name}</span>
                  {serviceBaselineCount.get(s.id) ? (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      {serviceBaselineCount.get(s.id)} product{(serviceBaselineCount.get(s.id) ?? 0) > 1 ? 's' : ''}
                    </Badge>
                  ) : null}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedServiceId && (
          <>
            {/* Existing baselines */}
            {loadingBaselines ? (
              <DashboardLoader size="sm" className="py-4" />
            ) : baselines.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No baselines defined for this service yet
              </div>
            ) : (
              <div className="space-y-2">
                {baselines.map((b) => {
                  const product = productMap.get(b.product_id);
                  return (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="font-sans text-sm truncate">
                          {product?.name ?? b.product_id}
                        </div>
                        {product?.brand && (
                          <div className="font-sans text-[10px] text-muted-foreground">{product.brand}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-sans text-sm tabular-nums">
                          {b.expected_quantity}{b.unit}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => deleteBaseline.mutate(b.id)}
                          disabled={deleteBaseline.isPending}
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new baseline */}
            <div className="flex items-end gap-2 pt-2 border-t border-border">
              <div className="flex-1">
                <Select value={newProductId} onValueChange={setNewProductId}>
                  <SelectTrigger className="font-sans text-sm h-9">
                    <SelectValue placeholder="Product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter((p) => !baselines.some((b) => b.product_id === p.id))
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id} className="font-sans text-sm">
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="number"
                placeholder="Qty"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="w-20 h-9 font-sans text-sm tabular-nums"
              />
              <Select value={newUnit} onValueChange={setNewUnit}>
                <SelectTrigger className="w-16 h-9 font-sans text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="oz">oz</SelectItem>
                  <SelectItem value="units">units</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-9 font-sans"
                onClick={handleAddBaseline}
                disabled={!newProductId || !newQuantity || upsertBaseline.isPending}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
