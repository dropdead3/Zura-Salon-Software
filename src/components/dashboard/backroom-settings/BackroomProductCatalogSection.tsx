import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

const DEPLETION_METHODS = [
  { value: 'weighed', label: 'Weighed' },
  { value: 'per_pump', label: 'Per Pump' },
  { value: 'per_scoop', label: 'Per Scoop' },
  { value: 'per_sheet', label: 'Per Sheet' },
  { value: 'per_pair', label: 'Per Pair' },
  { value: 'per_service', label: 'Per Service' },
  { value: 'manual', label: 'Manual' },
];

const CATEGORIES = [
  'color', 'lightener', 'developer', 'toner', 'bond builder', 'treatment',
  'additive', 'backbar', 'foil', 'gloves', 'sanitation', 'misc consumables',
];

interface BackroomProduct {
  id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  category: string | null;
  cost_price: number | null;
  is_backroom_tracked: boolean;
  depletion_method: string;
  is_billable_to_client: boolean;
  is_overage_eligible: boolean;
  is_forecast_eligible: boolean;
  cost_per_gram: number | null;
  unit_of_measure: string;
}

export function BackroomProductCatalogSection() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showTrackedOnly, setShowTrackedOnly] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ['backroom-product-catalog', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, sku, category, cost_price, is_backroom_tracked, depletion_method, is_billable_to_client, is_overage_eligible, is_forecast_eligible, cost_per_gram, unit_of_measure')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as unknown as BackroomProduct[];
    },
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BackroomProduct> }) => {
      const { error } = await supabase
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-product-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  const filtered = (products || []).filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (showTrackedOnly && !p.is_backroom_tracked) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Infotainer
        id="backroom-products-guide"
        title="Products & Supplies"
        description="Choose which products stylists use at the mixing station. Toggle tracking on, set costs, and pick how each product is measured (weighed, pumped, etc). Do this first — services can't be tracked without products."
        icon={<Package className="h-4 w-4 text-primary" />}
      />
      <Card className={tokens.card.wrapper}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Package className={tokens.card.icon} />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>Backroom Product Catalog</CardTitle>
                <CardDescription className={tokens.body.muted}>
                  Toggle products for backroom tracking and configure depletion methods.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {(products || []).filter((p) => p.is_backroom_tracked).length} tracked
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 font-sans"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px] font-sans">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showTrackedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowTrackedOnly(!showTrackedOnly)}
              className="font-sans"
            >
              Tracked Only
            </Button>
          </div>

          {/* Product rows */}
          <div className="space-y-1">
          {filtered.length === 0 ? (
              <div className={tokens.empty.container}>
                <Package className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>No products found</h3>
                <p className={tokens.empty.description}>
                  {showTrackedOnly
                    ? 'No tracked products yet. Start by toggling on your most-used color products below.'
                    : 'No products match your filters.'}
                </p>
              </div>
            ) : (
              filtered.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onUpdate={(updates) => updateMutation.mutate({ id: product.id, updates })}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductRow({ product, onUpdate }: { product: BackroomProduct; onUpdate: (u: Partial<BackroomProduct>) => void }) {
  return (
    <div className={cn(
      'flex items-center gap-4 rounded-lg border p-3 transition-colors',
      product.is_backroom_tracked ? 'border-border bg-card' : 'border-border/40 bg-muted/20'
    )}>
      {/* Toggle */}
      <Switch
        checked={product.is_backroom_tracked}
        onCheckedChange={(checked) => onUpdate({ is_backroom_tracked: checked })}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-sans font-medium text-foreground truncate">{product.name}</span>
          {product.brand && <span className="text-xs text-muted-foreground">{product.brand}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {product.category && <Badge variant="outline" className="text-[10px] capitalize">{product.category}</Badge>}
          {product.sku && <span className="text-[10px] text-muted-foreground">{product.sku}</span>}
          {!product.cost_price && product.is_backroom_tracked && (
            <Badge variant="destructive" className="text-[10px]">No cost</Badge>
          )}
        </div>
      </div>

      {/* Depletion method */}
      {product.is_backroom_tracked && (
        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={product.depletion_method}
            onValueChange={(v) => onUpdate({ depletion_method: v })}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs font-sans">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPLETION_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <label className="text-[10px] text-muted-foreground">Billable</label>
            <Switch
              checked={product.is_billable_to_client}
              onCheckedChange={(v) => onUpdate({ is_billable_to_client: v })}
              className="scale-75"
            />
          </div>

          <div className="flex items-center gap-1">
            <label className="text-[10px] text-muted-foreground">Overage</label>
            <Switch
              checked={product.is_overage_eligible}
              onCheckedChange={(v) => onUpdate({ is_overage_eligible: v })}
              className="scale-75"
            />
          </div>
        </div>
      )}
    </div>
  );
}
