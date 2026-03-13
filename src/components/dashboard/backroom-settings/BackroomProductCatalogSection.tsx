import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from '@/hooks/backroom/useBackroomOrgId';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Package, ArrowRight, Library, Check, ChevronLeft, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { SupplyLibraryDialog } from './SupplyLibraryDialog';
import {
  SUPPLY_LIBRARY,
  getSupplyBrands,
  getProductsByBrand,
  SUPPLY_CATEGORY_LABELS,
  type SupplyLibraryItem,
} from '@/data/professional-supply-library';

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

interface Props {
  onNavigate?: (section: string) => void;
}

/** Build a selection key — includes size when present */
function sizedKey(brand: string, name: string, size?: string) {
  return size ? `${brand}::${name}::${size}` : `${brand}::${name}`;
}

/** Build the product name with optional size suffix */
function sizedName(name: string, size?: string) {
  return size ? `${name} — ${size}` : name;
}

export function BackroomProductCatalogSection({ onNavigate }: Props) {
  const orgId = useBackroomOrgId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showTrackedOnly, setShowTrackedOnly] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Brand browsing state
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null); // null = "My Catalog"
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  const brands = useMemo(() => getSupplyBrands(), []);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const brandsByLetter = useMemo(() => {
    const map = new Map<string, string[]>();
    brands.forEach((b) => {
      const letter = b[0]?.toUpperCase();
      if (!letter) return;
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(b);
    });
    return map;
  }, [brands]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['backroom-product-catalog', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, sku, category, cost_price, is_backroom_tracked, depletion_method, is_billable_to_client, is_overage_eligible, is_forecast_eligible, cost_per_gram, unit_of_measure')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('product_type', 'Supplies')
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
      toast.success('Product updated', {
        action: onNavigate ? {
          label: 'Next: Services →',
          onClick: () => onNavigate('services'),
        } : undefined,
      });
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  // Existing products set for "already added" detection
  const existingKeys = useMemo(() => {
    const s = new Set<string>();
    (products || []).forEach((p) => {
      if (p.brand && p.name) {
        s.add(`${p.brand}::${p.name}`);
      }
    });
    return s;
  }, [products]);

  const isExisting = (brand: string, name: string, size?: string) => {
    return existingKeys.has(sizedKey(brand, name, size))
      || existingKeys.has(`${brand}::${sizedName(name, size)}`);
  };

  // My Catalog filtering
  const filtered = (products || []).filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (showTrackedOnly && !p.is_backroom_tracked) return false;
    return true;
  });

  // Brand products filtering
  const brandProducts = useMemo(() => {
    if (!activeBrand) return [];
    const items = getProductsByBrand(activeBrand);
    if (!search) return items;
    const q = search.toLowerCase();
    if (activeBrand.toLowerCase().includes(q)) return items;
    return items.filter((p) => p.name.toLowerCase().includes(q));
  }, [activeBrand, search]);

  const trackedCount = (products || []).filter((p) => p.is_backroom_tracked).length;
  const hasProducts = (products || []).length > 0;

  /** Get all selectable keys for an item */
  const getItemKeys = (item: SupplyLibraryItem): { key: string; size?: string }[] => {
    if (item.sizeOptions && item.sizeOptions.length > 0) {
      return item.sizeOptions.map((size) => ({ key: sizedKey(item.brand, item.name, size), size }));
    }
    return [{ key: sizedKey(item.brand, item.name) }];
  };

  const toggleSize = (item: SupplyLibraryItem, size?: string) => {
    const key = sizedKey(item.brand, item.name, size);
    if (isExisting(item.brand, item.name, size)) return;
    const next = new Set(selectedItems);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedItems(next);
  };

  const toggleAllBrand = () => {
    if (!activeBrand) return;
    const allKeys: string[] = [];
    brandProducts.forEach((p) => {
      getItemKeys(p).forEach(({ key, size }) => {
        if (!isExisting(p.brand, p.name, size)) allKeys.push(key);
      });
    });
    const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedItems.has(k));
    const next = new Set(selectedItems);
    allKeys.forEach((k) => {
      if (allSelected) next.delete(k);
      else next.add(k);
    });
    setSelectedItems(next);
  };

  const handleAddFromBrand = async () => {
    if (selectedItems.size === 0 || !orgId) return;
    setIsAdding(true);

    try {
      const itemsToInsert: Array<{
        name: string;
        brand: string;
        category: string;
        product_type: string;
        is_backroom_tracked: boolean;
        depletion_method: string;
        unit_of_measure: string;
        organization_id: string;
        is_active: boolean;
      }> = [];

      SUPPLY_LIBRARY.forEach((item) => {
        getItemKeys(item).forEach(({ key, size }) => {
          if (!selectedItems.has(key)) return;
          itemsToInsert.push({
            name: sizedName(item.name, size),
            brand: item.brand,
            category: item.category,
            product_type: 'Supplies',
            is_backroom_tracked: true,
            depletion_method: item.defaultDepletion,
            unit_of_measure: item.defaultUnit,
            organization_id: orgId,
            is_active: true,
          });
        });
      });

      if (itemsToInsert.length === 0) return;

      const { error } = await supabase.from('products').insert(itemsToInsert);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['backroom-product-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast.success(`Added ${itemsToInsert.length} products to your catalog`);
      setSelectedItems(new Set());
    } catch (err: any) {
      toast.error('Failed to add products: ' + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  // Check if all items for a brand are fully in catalog
  const brandFullyAdded = (brand: string) => {
    const items = getProductsByBrand(brand);
    return items.every((p) =>
      getItemKeys(p).every(({ size }) => isExisting(p.brand, p.name, size))
    );
  };

  // Count items in catalog from a given brand
  const brandCatalogCount = (brand: string) => {
    return (products || []).filter((p) => p.brand === brand).length;
  };

  // Add entire brand in one click
  const [addingBrand, setAddingBrand] = useState<string | null>(null);

  const handleAddEntireBrand = async (brand: string) => {
    if (!orgId) return;
    setAddingBrand(brand);
    try {
      const items = getProductsByBrand(brand);
      const itemsToInsert: Array<{
        name: string; brand: string; category: string; product_type: string;
        is_backroom_tracked: boolean; depletion_method: string; unit_of_measure: string;
        organization_id: string; is_active: boolean;
      }> = [];

      items.forEach((item) => {
        getItemKeys(item).forEach(({ size }) => {
          if (isExisting(item.brand, item.name, size)) return;
          itemsToInsert.push({
            name: sizedName(item.name, size),
            brand: item.brand,
            category: item.category,
            product_type: 'Supplies',
            is_backroom_tracked: true,
            depletion_method: item.defaultDepletion,
            unit_of_measure: item.defaultUnit,
            organization_id: orgId,
            is_active: true,
          });
        });
      });

      if (itemsToInsert.length === 0) {
        toast.info(`All ${brand} products are already in your catalog`);
        return;
      }

      const { error } = await supabase.from('products').insert(itemsToInsert);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['backroom-product-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast.success(`Added ${itemsToInsert.length} ${brand} products to your catalog`);
      setSelectedItems(new Set());
    } catch (err: any) {
      toast.error('Failed to add products: ' + err.message);
    } finally {
      setAddingBrand(null);
    }
  };

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
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
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
            <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {trackedCount} tracked
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLibraryOpen(true)}
                className="font-sans gap-1.5"
              >
                <Library className="w-4 h-4" />
                Supply Library
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={activeBrand ? `Search ${activeBrand} products...` : 'Search products...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 font-sans"
            />
          </div>

          {/* Alphabet selector bar */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {/* My Catalog chip */}
            <button
              type="button"
              onClick={() => { setActiveLetter(null); setActiveBrand(null); setSelectedItems(new Set()); }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-sans font-medium transition-all whitespace-nowrap',
                activeLetter === null && activeBrand === null
                  ? 'bg-foreground text-background'
                  : 'bg-muted/60 text-foreground/70 hover:bg-muted hover:text-foreground'
              )}
            >
              <Package className="w-3 h-3" />
              My Catalog
              {hasProducts && (
                <span className={cn(
                  'ml-0.5 text-[10px]',
                  activeLetter === null && activeBrand === null ? 'text-background/70' : 'text-muted-foreground'
                )}>
                  {(products || []).length}
                </span>
              )}
            </button>

            <div className="w-px h-5 bg-border/40" />

            {/* A–Z letters */}
            {alphabet.map((letter) => {
              const hasBrands = brandsByLetter.has(letter);
              const isActive = activeLetter === letter;

              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!hasBrands}
                  onClick={() => {
                    setActiveLetter(letter);
                    setActiveBrand(null);
                    setSelectedItems(new Set());
                    setSearch('');
                  }}
                  className={cn(
                    'w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-md text-[10px] sm:text-xs font-sans font-medium transition-all',
                    isActive
                      ? 'bg-foreground text-background'
                      : hasBrands
                      ? 'text-foreground/70 hover:bg-muted hover:text-foreground'
                      : 'text-muted-foreground/30 cursor-default'
                  )}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          {/* Brand sub-row for selected letter */}
          {activeLetter && !activeBrand && (
            <div className="flex flex-wrap items-center gap-2">
              {(brandsByLetter.get(activeLetter) || []).map((brand) => {
                const allAdded = brandFullyAdded(brand);
                const inCatalog = brandCatalogCount(brand);
                const isBrandAdding = addingBrand === brand;

                return (
                  <div key={brand} className="inline-flex items-center gap-0 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBrand(brand);
                        setSelectedItems(new Set());
                        setSearch('');
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium transition-all whitespace-nowrap',
                        allAdded ? 'rounded-full' : 'rounded-l-full',
                        allAdded
                          ? 'bg-muted/40 text-muted-foreground'
                          : 'bg-muted/60 text-foreground/70 hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {brand}
                      {allAdded && <Check className="w-3 h-3" />}
                      {!allAdded && inCatalog > 0 && (
                        <span className="text-[10px] text-muted-foreground">{inCatalog}</span>
                      )}
                    </button>
                    {!allAdded && (
                      <button
                        type="button"
                        disabled={isBrandAdding}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddEntireBrand(brand);
                        }}
                        title={`Add all ${brand} products`}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-r-full bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all border-l border-border/30"
                      >
                        {isBrandAdding ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <PackagePlus className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Breadcrumb when brand is active */}
          {activeBrand && (
            <div className="flex items-center gap-1.5 text-xs font-sans text-muted-foreground">
              <button
                type="button"
                onClick={() => { setActiveBrand(null); setSelectedItems(new Set()); }}
                className="hover:text-foreground transition-colors"
              >
                {activeLetter || '←'}
              </button>
              <span>/</span>
              <span className="text-foreground font-medium">{activeBrand}</span>
            </div>
          )}

          {/* Dual view */}
          {activeBrand === null ? (
            /* ====== MY CATALOG VIEW ====== */
            <>
              {!hasProducts ? (
                <div className={cn(tokens.empty.container, 'py-14')}>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                    <Library className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className={tokens.empty.heading}>Build Your Supply Catalog</h3>
                  <p className={cn(tokens.empty.description, 'max-w-sm mx-auto mt-2')}>
                    Select a brand above to browse professional products, or open the full Supply Library.
                  </p>
                </div>
              ) : (
                <>
                  {/* Category & tracked filters */}
                   <div className="flex flex-wrap items-center gap-3">
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-full sm:w-[180px] font-sans">
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
                  <div className="space-y-2">
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

                  {/* Next step hint */}
                  {onNavigate && trackedCount > 0 && (
                    <div className="flex justify-end pt-2 border-t border-border/40">
                      <Button variant="ghost" size="sm" className="text-xs font-sans text-muted-foreground" onClick={() => onNavigate('services')}>
                        Next: Service Tracking <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            /* ====== BRAND BROWSING VIEW ====== */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-sans text-sm font-medium text-foreground">{activeBrand}</h3>
                <div className="flex items-center gap-1.5">
                  {activeBrand && !brandFullyAdded(activeBrand) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddEntireBrand(activeBrand)}
                      disabled={addingBrand === activeBrand}
                      className="text-xs font-sans h-7 gap-1"
                    >
                      {addingBrand === activeBrand ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <PackagePlus className="w-3 h-3" />
                      )}
                      Add Entire Brand
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllBrand}
                    className="text-xs font-sans h-7"
                  >
                    {(() => {
                      const allKeys: string[] = [];
                      brandProducts.forEach((p) => {
                        getItemKeys(p).forEach(({ key, size }) => {
                          if (!isExisting(p.brand, p.name, size)) allKeys.push(key);
                        });
                      });
                      return allKeys.length > 0 && allKeys.every((k) => selectedItems.has(k))
                        ? 'Deselect All'
                        : 'Select All';
                    })()}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {brandProducts.length === 0 ? (
                  <div className={tokens.empty.container}>
                    <Package className={tokens.empty.icon} />
                    <h3 className={tokens.empty.heading}>No products found</h3>
                    <p className={tokens.empty.description}>Try a different search term.</p>
                  </div>
                ) : (
                  brandProducts.map((item) => (
                    <BrandProductRow
                      key={`${item.brand}::${item.name}`}
                      item={item}
                      isExisting={isExisting}
                      selectedItems={selectedItems}
                      getItemKeys={getItemKeys}
                      toggleSize={toggleSize}
                    />
                  ))
                )}
              </div>

              {/* Sticky add footer */}
              {selectedItems.size > 0 && (
                <div className="sticky bottom-0 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-2 bg-card/95 backdrop-blur-sm rounded-lg border border-border/60 px-4 py-3 shadow-[0_-4px_12px_-4px_hsl(var(--foreground)/0.06)]">
                  <span className="text-sm font-sans text-muted-foreground text-center sm:text-left">
                    {selectedItems.size} product{selectedItems.size === 1 ? '' : 's'} selected
                  </span>
                  <Button
                    onClick={handleAddFromBrand}
                    disabled={isAdding}
                    className="font-sans w-full sm:w-auto"
                    size="sm"
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        Adding...
                      </>
                    ) : (
                      `Add ${selectedItems.size} Product${selectedItems.size === 1 ? '' : 's'}`
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supply Library Dialog */}
      {orgId && (
        <SupplyLibraryDialog
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          orgId={orgId}
          existingProducts={(products || []).map((p) => ({ name: p.name, brand: p.brand }))}
        />
      )}
    </div>
  );
}

/* ====== Brand Product Row (inline browsing) ====== */
function BrandProductRow({
  item,
  isExisting,
  selectedItems,
  getItemKeys,
  toggleSize,
}: {
  item: SupplyLibraryItem;
  isExisting: (brand: string, name: string, size?: string) => boolean;
  selectedItems: Set<string>;
  getItemKeys: (item: SupplyLibraryItem) => { key: string; size?: string }[];
  toggleSize: (item: SupplyLibraryItem, size?: string) => void;
}) {
  const hasSizes = item.sizeOptions && item.sizeOptions.length > 0;
  const itemKeys = getItemKeys(item);
  const allExisting = itemKeys.every(({ size }) => isExisting(item.brand, item.name, size));
  const anySelected = itemKeys.some(({ key }) => selectedItems.has(key));

  return (
    <div
      className={cn(
        'rounded-lg border p-3 sm:p-4 transition-colors',
        allExisting
          ? 'border-border/30 bg-muted/20 opacity-60'
          : anySelected
          ? 'border-primary/40 bg-primary/5'
          : 'border-border/40 hover:border-border hover:bg-muted/30'
      )}
    >
      <div className="flex items-start gap-3">
        {/* If no sizes, single checkbox */}
        {!hasSizes && (
          <Checkbox
            checked={allExisting || selectedItems.has(sizedKey(item.brand, item.name))}
            disabled={allExisting}
            onCheckedChange={() => toggleSize(item)}
            className="shrink-0 mt-0.5"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-sans text-foreground">{item.name}</span>
            {allExisting && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                <Check className="w-3 h-3 mr-0.5" /> Added
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-[10px] capitalize">
              {SUPPLY_CATEGORY_LABELS[item.category] || item.category}
            </Badge>
            <span className="text-[10px] text-muted-foreground capitalize">
              {item.defaultDepletion === 'per_pump' ? 'Per Pump' : item.defaultDepletion} · {item.defaultUnit}
            </span>
          </div>

          {/* Size chips */}
          {hasSizes && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {item.sizeOptions!.map((size) => {
                const key = sizedKey(item.brand, item.name, size);
                const sizeExisting = isExisting(item.brand, item.name, size);
                const sizeSelected = selectedItems.has(key);

                return (
                  <button
                    key={size}
                    type="button"
                    disabled={sizeExisting}
                    onClick={() => toggleSize(item, size)}
                    className={cn(
                      'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-sans transition-colors border',
                      sizeExisting
                        ? 'border-border/30 bg-muted/30 text-muted-foreground cursor-default'
                        : sizeSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 hover:border-border text-foreground/70 hover:text-foreground'
                    )}
                  >
                    {(sizeExisting || sizeSelected) && (
                      <Check className="w-3 h-3" />
                    )}
                    {size}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ====== Tracked Product Row (My Catalog) ====== */
function ProductRow({ product, onUpdate }: { product: BackroomProduct; onUpdate: (u: Partial<BackroomProduct>) => void }) {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 rounded-lg border p-3 sm:p-4 transition-colors',
      product.is_backroom_tracked ? 'border-border bg-card' : 'border-border/40 bg-muted/20'
    )}>
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <Switch
            checked={product.is_backroom_tracked}
            onCheckedChange={(checked) => onUpdate({ is_backroom_tracked: checked })}
          />
          <MetricInfoTooltip description="When on, this product appears in the mixing dashboard and its usage is recorded per appointment." />
        </div>

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
              <span className="flex items-center gap-0.5">
                <Badge variant="destructive" className="text-[10px]">No cost</Badge>
                <MetricInfoTooltip description="This product has no unit cost set. Add a cost so Zura can calculate margins and overage charges." />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Depletion method */}
      {product.is_backroom_tracked && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-muted/30 rounded-lg px-3 py-2 sm:shrink-0">
          <div className="flex items-center gap-1">
            <MetricInfoTooltip description="How this product is measured when used. 'Weighed' uses a scale; 'Per Pump' counts pumps dispensed." />
            <Select
              value={product.depletion_method}
              onValueChange={(v) => onUpdate({ depletion_method: v })}
            >
              <SelectTrigger className="w-[110px] sm:w-[120px] h-8 text-xs font-sans">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPLETION_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-px h-5 bg-border/40 hidden sm:block" />

          <div className="flex items-center gap-1">
            <label className="text-[10px] text-muted-foreground">Billable</label>
            <MetricInfoTooltip description="When on, overage usage of this product can be charged to the client." />
            <Switch
              checked={product.is_billable_to_client}
              onCheckedChange={(v) => onUpdate({ is_billable_to_client: v })}
              className="scale-75"
            />
          </div>

          <div className="flex items-center gap-1">
            <label className="text-[10px] text-muted-foreground">Overage</label>
            <MetricInfoTooltip description="When on, usage beyond the service allowance triggers an overage charge." />
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
