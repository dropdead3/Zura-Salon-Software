import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from '@/hooks/backroom/useBackroomOrgId';
import { useBackroomInventoryTable, STOCK_STATUS_CONFIG, computeChargePerGram, type BackroomInventoryRow, type StockStatus } from '@/hooks/backroom/useBackroomInventoryTable';
import { postLedgerEntry } from '@/lib/backroom/services/inventory-ledger-service';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { BrowseColumn, type BrowseColumnItem } from '@/components/platform/backroom/BrowseColumn';
import { extractProductLine, groupByProductLine } from '@/lib/supply-line-parser';
import { useSupplyBrandsMeta, type SupplyBrandMeta } from '@/hooks/platform/useSupplyLibraryBrandMeta';
import { Loader2, Search, Package, ArrowRight, ArrowLeft, Library, Check, ChevronLeft, PackagePlus, LayoutGrid, TableIcon, DollarSign, AlertTriangle, Archive, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { SupplyLibraryDialog } from './SupplyLibraryDialog';
import { BackroomBulkPricingDialog } from './BackroomBulkPricingDialog';
import { BackroomBulkReorderDialog } from './BackroomBulkReorderDialog';
import {
  SUPPLY_CATEGORY_LABELS,
  type SupplyLibraryItem,
} from '@/data/professional-supply-library';
import { useSupplyLibraryItems } from '@/hooks/platform/useSupplyLibrary';

/* ====== Constants ====== */
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
  markup_pct: number | null;
  container_size: string | null;
  product_line?: string | null;
}

type CatalogView = 'brands' | 'inventory';

interface Props {
  onNavigate?: (section: string) => void;
}

/* ====== Main Component ====== */
export function BackroomProductCatalogSection({ onNavigate }: Props) {
  const orgId = useBackroomOrgId();
  const queryClient = useQueryClient();

  // UI state
  const [search, setSearch] = useState('');
  const [catalogView, setCatalogView] = useState<CatalogView>('brands');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [bulkPricingOpen, setBulkPricingOpen] = useState(false);
  const [bulkReorderOpen, setBulkReorderOpen] = useState(false);

  // Brand-first navigation
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  // Finder columns (Level 1)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);

  // Inventory view filters
  const [stockFilter, setStockFilter] = useState<'all' | 'reorder' | 'in_stock'>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Data
  const { data: brandsMeta = [] } = useSupplyBrandsMeta();
  const { data: libraryItems = [] } = useSupplyLibraryItems();
  const { data: inventoryRows } = useBackroomInventoryTable();

  const { data: products, isLoading } = useQuery({
    queryKey: ['backroom-product-catalog', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, sku, category, cost_price, is_backroom_tracked, depletion_method, is_billable_to_client, is_overage_eligible, is_forecast_eligible, cost_per_gram, unit_of_measure, markup_pct, container_size, product_line')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('product_type', 'Supplies')
        .order('name');
      if (error) throw error;
      return data as unknown as BackroomProduct[];
    },
    enabled: !!orgId,
  });

  /* ====== Mutations ====== */
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
      queryClient.invalidateQueries({ queryKey: ['backroom-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
    },
    onError: (error) => toast.error('Failed to update: ' + error.message),
  });

  const bulkTrackMutation = useMutation({
    mutationFn: async ({ ids, tracked }: { ids: string[]; tracked: boolean }) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('products')
        .update({ is_backroom_tracked: tracked, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['backroom-product-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
      toast.success(`${vars.tracked ? 'Enabled' : 'Disabled'} tracking for ${vars.ids.length} products`);
    },
    onError: (error) => toast.error('Bulk update failed: ' + error.message),
  });

  /* ====== Derived data ====== */
  const allProducts = products || [];
  const trackedCount = allProducts.filter((p) => p.is_backroom_tracked).length;

  // Brand grouping for card grid
  const brandGroups = useMemo(() => {
    const map = new Map<string, BackroomProduct[]>();
    allProducts.forEach((p) => {
      const b = p.brand || 'Uncategorized';
      if (!map.has(b)) map.set(b, []);
      map.get(b)!.push(p);
    });
    return map;
  }, [allProducts]);

  const brandNames = useMemo(() => [...brandGroups.keys()].sort(), [brandGroups]);

  // Brand meta lookup
  const brandMetaMap = useMemo(() => {
    const map = new Map<string, SupplyBrandMeta>();
    brandsMeta.forEach((bm) => map.set(bm.name.toLowerCase(), bm));
    return map;
  }, [brandsMeta]);

  // A-Z
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const brandsByLetter = useMemo(() => {
    const map = new Map<string, string[]>();
    brandNames.forEach((b) => {
      const letter = b[0]?.toUpperCase();
      if (!letter) return;
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(b);
    });
    return map;
  }, [brandNames]);

  // Filtered brand list for search + letter
  const filteredBrands = useMemo(() => {
    let list = brandNames;
    if (activeLetter) {
      list = list.filter((b) => b[0]?.toUpperCase() === activeLetter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.toLowerCase().includes(q));
    }
    return list;
  }, [brandNames, activeLetter, search]);

  // KPIs
  const kpis = useMemo(() => {
    const rows = inventoryRows || [];
    const inStock = rows.filter((r) => r.quantity_on_hand > 0).length;
    const toReorder = rows.filter((r) => r.status === 'out_of_stock' || r.status === 'urgent_reorder' || r.status === 'replenish').length;
    return { inStock, toReorder, totalTracked: rows.length };
  }, [inventoryRows]);

  // Brand detail data
  const brandProducts = useMemo(() => {
    if (!selectedBrand) return [];
    return brandGroups.get(selectedBrand) || [];
  }, [selectedBrand, brandGroups]);

  // Categories for selected brand
  const brandCategories = useMemo<BrowseColumnItem[]>(() => {
    const catMap = new Map<string, { total: number; tracked: number }>();
    brandProducts.forEach((p) => {
      const cat = p.category || 'uncategorized';
      const cur = catMap.get(cat) || { total: 0, tracked: 0 };
      cur.total++;
      if (p.is_backroom_tracked) cur.tracked++;
      catMap.set(cat, cur);
    });
    return [...catMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cat, stats]) => ({
        key: cat,
        label: (SUPPLY_CATEGORY_LABELS as Record<string, string>)[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
        count: stats.total,
        health: stats.tracked === stats.total ? 'green' as const
          : stats.tracked > 0 ? 'amber' as const
          : 'red' as const,
      }));
  }, [brandProducts]);

  // Product lines for selected category
  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return brandProducts.filter((p) => (p.category || 'uncategorized') === selectedCategory);
  }, [brandProducts, selectedCategory]);

  const productLines = useMemo<BrowseColumnItem[]>(() => {
    const lineMap = new Map<string, { total: number; tracked: number }>();
    categoryProducts.forEach((p) => {
      const line = p.product_line || extractProductLine(p.name);
      const cur = lineMap.get(line) || { total: 0, tracked: 0 };
      cur.total++;
      if (p.is_backroom_tracked) cur.tracked++;
      lineMap.set(line, cur);
    });
    return [...lineMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([line, stats]) => ({
        key: line,
        label: line,
        count: stats.total,
        health: stats.tracked === stats.total ? 'green' as const
          : stats.tracked > 0 ? 'amber' as const
          : 'red' as const,
      }));
  }, [categoryProducts]);

  // Products for selected line
  const lineProducts = useMemo(() => {
    if (!selectedLine) return [];
    return categoryProducts.filter((p) => {
      const line = p.product_line || extractProductLine(p.name);
      return line === selectedLine;
    });
  }, [categoryProducts, selectedLine]);

  // Bulk toggle helpers
  const toggleCategoryTracking = useCallback((enabled: boolean) => {
    const ids = categoryProducts.map((p) => p.id);
    bulkTrackMutation.mutate({ ids, tracked: enabled });
  }, [categoryProducts, bulkTrackMutation]);

  const toggleLineTracking = useCallback((enabled: boolean) => {
    const ids = lineProducts.map((p) => p.id);
    bulkTrackMutation.mutate({ ids, tracked: enabled });
  }, [lineProducts, bulkTrackMutation]);

  // Inventory table
  const filteredInventory = useMemo(() => {
    let rows = inventoryRows || [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.brand?.toLowerCase().includes(q) || r.sku?.toLowerCase().includes(q));
    }
    if (filterCategory !== 'all') {
      rows = rows.filter((r) => r.category === filterCategory);
    }
    if (stockFilter === 'reorder') {
      rows = rows.filter((r) => r.status === 'out_of_stock' || r.status === 'urgent_reorder' || r.status === 'replenish');
    } else if (stockFilter === 'in_stock') {
      rows = rows.filter((r) => r.status === 'in_stock');
    }
    return rows;
  }, [inventoryRows, search, filterCategory, stockFilter]);

  const reorderItems = useMemo(() => {
    return (inventoryRows || []).filter(
      (r) => r.status === 'replenish' || r.status === 'urgent_reorder' || r.status === 'out_of_stock'
    );
  }, [inventoryRows]);

  const bulkProductIds = useMemo(() => {
    return allProducts.filter((p) => p.is_backroom_tracked).map((p) => p.id);
  }, [allProducts]);

  /* ====== Navigation ====== */
  const goBack = () => {
    setSelectedBrand(null);
    setSelectedCategory(null);
    setSelectedLine(null);
  };

  /* ====== Render ====== */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  const hasProducts = allProducts.length > 0;

  return (
    <div className="space-y-4">
      <Infotainer
        id="backroom-products-guide"
        title="Products & Supplies"
        description="Choose which products stylists use at the mixing station. Toggle tracking on, set costs, and pick how each product is measured (weighed, pumped, etc). Do this first — services can't be tracked without products."
        icon={<Package className="h-4 w-4 text-primary" />}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {selectedBrand ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 hover:bg-muted/80 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-primary" />
                </div>
              )}
              <div>
                {selectedBrand ? (
                  <>
                    <div className="flex items-center gap-1.5 text-xs font-sans text-muted-foreground">
                      <button type="button" onClick={goBack} className="hover:text-foreground transition-colors">My Catalog</button>
                      <span>/</span>
                    </div>
                    <CardTitle className={tokens.card.title}>{selectedBrand}</CardTitle>
                  </>
                ) : (
                  <>
                    <CardTitle className={tokens.card.title}>Backroom Product Catalog</CardTitle>
                    <CardDescription>
                      Select a brand to manage tracking, depletion methods, and pricing.
                    </CardDescription>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0 flex-wrap">
              {/* View toggle */}
              {hasProducts && !selectedBrand && (
                <div className="flex items-center rounded-lg border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCatalogView('brands')}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 transition-colors',
                      catalogView === 'brands' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    )}
                    title="Brand view"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogView('inventory')}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 transition-colors',
                      catalogView === 'inventory' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    )}
                    title="Inventory table"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <Badge variant="outline">{trackedCount} tracked</Badge>
              {selectedBrand && (
                <Badge variant="outline">{brandProducts.length} products</Badge>
              )}
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
          {/* ====== BRAND DETAIL (FINDER) ====== */}
          {selectedBrand ? (
            <BrandFinder
              brandProducts={brandProducts}
              brandCategories={brandCategories}
              productLines={productLines}
              lineProducts={lineProducts}
              selectedCategory={selectedCategory}
              selectedLine={selectedLine}
              onSelectCategory={(cat) => { setSelectedCategory(cat); setSelectedLine(null); }}
              onSelectLine={setSelectedLine}
              categoryProducts={categoryProducts}
              onToggleCategoryTracking={toggleCategoryTracking}
              onToggleLineTracking={toggleLineTracking}
              onUpdateProduct={(id, updates) => updateMutation.mutate({ id, updates })}
              onNavigate={onNavigate}
              trackedCount={brandProducts.filter((p) => p.is_backroom_tracked).length}
            />
          ) : catalogView === 'inventory' ? (
            /* ====== INVENTORY TABLE ====== */
            <InventoryView
              kpis={kpis}
              stockFilter={stockFilter}
              setStockFilter={setStockFilter}
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
              search={search}
              setSearch={setSearch}
              filteredInventory={filteredInventory}
              bulkProductIds={bulkProductIds}
              reorderItems={reorderItems}
              orgId={orgId}
              onUpdate={(id, updates) => updateMutation.mutate({ id, updates })}
              onOpenPricing={() => setBulkPricingOpen(true)}
              onOpenReorder={() => setBulkReorderOpen(true)}
            />
          ) : (
            /* ====== BRAND CARD GRID (Level 0) ====== */
            <>
              {/* KPI row */}
              {hasProducts && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border bg-card p-4">
                    <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">Tracked</span>
                    <span className="block text-2xl font-display tracking-tight text-foreground mt-1">{trackedCount}</span>
                  </div>
                  <div className="rounded-xl border bg-card p-4">
                    <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">In Stock</span>
                    <span className="block text-2xl font-display tracking-tight text-foreground mt-1">{kpis.inStock}</span>
                  </div>
                  <div className="rounded-xl border bg-card p-4">
                    <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">To Reorder</span>
                    <span className={cn('block text-2xl font-display tracking-tight text-foreground mt-1', kpis.toReorder > 0 && 'text-amber-400')}>{kpis.toReorder}</span>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search brands..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="font-sans pl-10"
                />
              </div>

              {/* A-Z alphabet bar */}
              <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
                <button
                  type="button"
                  onClick={() => { setActiveLetter(null); setSearch(''); }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-sans font-medium transition-all whitespace-nowrap',
                    !activeLetter
                      ? 'bg-foreground text-background'
                      : 'bg-muted/60 text-foreground/70 hover:bg-muted hover:text-foreground'
                  )}
                >
                  All
                </button>
                {alphabet.map((letter) => {
                  const hasBrands = brandsByLetter.has(letter);
                  const isActive = activeLetter === letter;
                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={!hasBrands}
                      onClick={() => { setActiveLetter(letter); setSearch(''); }}
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

              {/* Brand cards */}
              {!hasProducts ? (
                <div className={cn(tokens.empty.container, 'py-14')}>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border bg-muted/40">
                    <Library className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className={tokens.empty.heading}>Build Your Supply Catalog</h3>
                  <p className={cn(tokens.empty.description, 'max-w-sm mx-auto mt-2')}>
                    Open the Supply Library to add professional brands and products.
                  </p>
                </div>
              ) : filteredBrands.length === 0 ? (
                <div className={tokens.empty.container}>
                  <Package className={tokens.empty.icon} />
                  <h3 className={tokens.empty.heading}>No brands found</h3>
                  <p className={tokens.empty.description}>Try a different letter or search term.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredBrands.map((brandName) => {
                    const brandProds = brandGroups.get(brandName) || [];
                    const tracked = brandProds.filter((p) => p.is_backroom_tracked).length;
                    const meta = brandMetaMap.get(brandName.toLowerCase());
                    const cats = [...new Set(brandProds.map((p) => p.category).filter(Boolean))];

                    return (
                      <button
                        key={brandName}
                        type="button"
                        onClick={() => {
                          setSelectedBrand(brandName);
                          setSelectedCategory(null);
                          setSelectedLine(null);
                          setSearch('');
                        }}
                        className={cn(
                          'group relative flex flex-col rounded-xl border p-4 text-left transition-all duration-200',
                          'border bg-card/50',
                          'hover:border-border hover:bg-card hover:shadow-lg',
                        )}
                      >
                        {/* Logo / Initial */}
                        <div className="flex items-center gap-3 mb-3">
                          {meta?.logo_url ? (
                            <img
                              src={meta.logo_url}
                              alt={brandName}
                              className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-base font-display text-muted-foreground">
                              {brandName[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-sans font-medium text-foreground truncate block">{brandName}</span>
                            <span className="text-[11px] font-sans text-muted-foreground">{brandProds.length} products</span>
                          </div>
                        </div>

                        {/* Status row */}
                        <div className="flex items-center gap-2 mt-auto">
                          {tracked > 0 ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {tracked}/{brandProds.length} tracked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] opacity-60">
                              Not tracked
                            </Badge>
                          )}
                        </div>

                        {/* Category chips */}
                        {cats.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {cats.slice(0, 3).map((cat) => (
                              <span
                                key={cat}
                                className="text-[9px] font-sans px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground capitalize"
                              >
                                {cat}
                              </span>
                            ))}
                            {cats.length > 3 && (
                              <span className="text-[9px] font-sans px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                                +{cats.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Hover arrow */}
                        <ArrowRight className="absolute top-4 right-4 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Next step hint */}
              {onNavigate && trackedCount > 0 && (
                <div className="flex justify-end pt-2 border-t">
                  <Button variant="ghost" size="sm" className="text-xs font-sans" onClick={() => onNavigate('services')}>
                    Next: Service Tracking <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {orgId && (
        <SupplyLibraryDialog
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          orgId={orgId}
          existingProducts={allProducts.map((p) => ({ name: p.name, brand: p.brand }))}
        />
      )}
      {orgId && (
        <BackroomBulkPricingDialog
          open={bulkPricingOpen}
          onOpenChange={setBulkPricingOpen}
          orgId={orgId}
          productIds={catalogView === 'inventory' ? filteredInventory.map((r) => r.id) : bulkProductIds}
          scopeLabel={filterCategory !== 'all' ? filterCategory : 'all tracked products'}
        />
      )}
      {orgId && (
        <BackroomBulkReorderDialog
          open={bulkReorderOpen}
          onOpenChange={setBulkReorderOpen}
          orgId={orgId}
          reorderItems={reorderItems}
        />
      )}
    </div>
  );
}

/* ==========================================================================
   BRAND FINDER — Three-column category → product line → product browser
   ========================================================================== */
function BrandFinder({
  brandProducts,
  brandCategories,
  productLines,
  lineProducts,
  selectedCategory,
  selectedLine,
  onSelectCategory,
  onSelectLine,
  categoryProducts,
  onToggleCategoryTracking,
  onToggleLineTracking,
  onUpdateProduct,
  onNavigate,
  trackedCount,
}: {
  brandProducts: BackroomProduct[];
  brandCategories: BrowseColumnItem[];
  productLines: BrowseColumnItem[];
  lineProducts: BackroomProduct[];
  selectedCategory: string | null;
  selectedLine: string | null;
  onSelectCategory: (cat: string) => void;
  onSelectLine: (line: string) => void;
  categoryProducts: BackroomProduct[];
  onToggleCategoryTracking: (enabled: boolean) => void;
  onToggleLineTracking: (enabled: boolean) => void;
  onUpdateProduct: (id: string, updates: Partial<BackroomProduct>) => void;
  onNavigate?: (section: string) => void;
  trackedCount: number;
}) {
  // Category tracking state
  const categoryAllTracked = categoryProducts.length > 0 && categoryProducts.every((p) => p.is_backroom_tracked);
  const lineAllTracked = lineProducts.length > 0 && lineProducts.every((p) => p.is_backroom_tracked);

  return (
    <div className="space-y-4">
      {/* Finder browser */}
      <div className="rounded-xl border border-[hsl(var(--platform-border)/0.5)] overflow-hidden flex" style={{ minHeight: 420 }}>
        {/* Column 1: Categories */}
        <BrowseColumn
          title="Categories"
          items={brandCategories}
          selectedKey={selectedCategory}
          onSelect={onSelectCategory}
          className="w-[180px] shrink-0"
          searchThreshold={12}
        />

        {/* Column 2: Product Lines */}
        {selectedCategory ? (
          <div className="flex flex-col flex-1 min-w-0 border-r border-[hsl(var(--platform-border)/0.3)]">
            {/* Track All Category header */}
            <div className="sticky top-0 z-10 px-3 pt-3 pb-2 bg-[hsl(var(--platform-bg-card)/0.6)] backdrop-blur-sm border-b border-[hsl(var(--platform-border)/0.2)] flex items-center justify-between">
              <span className="font-display text-[10px] tracking-wider text-[hsl(var(--platform-foreground-muted))] uppercase">
                Product Lines ({productLines.length})
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-sans text-[hsl(var(--platform-foreground-muted))]">Track All</span>
                <Switch
                  checked={categoryAllTracked}
                  onCheckedChange={(v) => onToggleCategoryTracking(v)}
                  className="scale-75"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1.5 space-y-0.5">
                {productLines.length === 0 ? (
                  <p className="px-3 py-4 font-sans text-xs text-[hsl(var(--platform-foreground-muted))] text-center">No product lines</p>
                ) : (
                  productLines.map((item) => {
                    const isActive = item.key === selectedLine;
                    return (
                      <button
                        key={item.key}
                        onClick={() => onSelectLine(item.key)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                          isActive
                            ? 'bg-violet-600/20 border-l-2 border-violet-500 text-[hsl(var(--platform-foreground))]'
                            : 'hover:bg-[hsl(var(--platform-bg-hover)/0.5)] text-[hsl(var(--platform-foreground-muted))] border-l-2 border-transparent',
                        )}
                      >
                        {item.health && (
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                            item.health === 'green' ? 'bg-emerald-500' : item.health === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                          )} />
                        )}
                        <span className="flex-1 font-sans text-xs font-medium truncate">{item.label}</span>
                        <span className={cn('shrink-0 font-sans text-[10px] tabular-nums', isActive ? 'text-violet-400' : 'text-[hsl(var(--platform-foreground-subtle))]')}>
                          {item.count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Select a category</p>
          </div>
        )}

        {/* Column 3: Products */}
        {selectedLine ? (
          <div className="flex flex-col flex-[1.5] min-w-0">
            {/* Track All Line header */}
            <div className="sticky top-0 z-10 px-3 pt-3 pb-2 bg-[hsl(var(--platform-bg-card)/0.6)] backdrop-blur-sm border-b border-[hsl(var(--platform-border)/0.2)] flex items-center justify-between">
              <span className="font-display text-[10px] tracking-wider text-[hsl(var(--platform-foreground-muted))] uppercase">
                {selectedLine} ({lineProducts.length})
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-sans text-[hsl(var(--platform-foreground-muted))]">Track All</span>
                <Switch
                  checked={lineAllTracked}
                  onCheckedChange={(v) => onToggleLineTracking(v)}
                  className="scale-75"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {lineProducts.map((product) => (
                  <FinderProductRow
                    key={product.id}
                    product={product}
                    onUpdate={(updates) => onUpdateProduct(product.id, updates)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : selectedCategory ? (
          <div className="flex-[1.5] flex items-center justify-center">
            <p className="font-sans text-xs text-muted-foreground">Select a product line</p>
          </div>
        ) : null}
      </div>

      {/* Next step */}
      {onNavigate && trackedCount > 0 && (
        <div className="flex justify-end pt-2 border-t border-[hsl(var(--platform-border)/0.4)]">
          <PlatformButton variant="ghost" size="sm" className="text-xs font-sans" onClick={() => onNavigate('services')}>
            Next: Service Tracking <ArrowRight className="w-3 h-3 ml-1" />
          </PlatformButton>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   FINDER PRODUCT ROW — Compact row inside the Finder's third column
   ========================================================================== */
function FinderProductRow({ product, onUpdate }: { product: BackroomProduct; onUpdate: (u: Partial<BackroomProduct>) => void }) {
  const [localCostPerGram, setLocalCostPerGram] = useState(product.cost_per_gram?.toString() || '');
  const [localMarkup, setLocalMarkup] = useState(product.markup_pct?.toString() || '');
  const [localContainer, setLocalContainer] = useState(product.container_size || '');

  const chargePerGram = computeChargePerGram(
    localCostPerGram ? parseFloat(localCostPerGram) : null,
    localMarkup ? parseFloat(localMarkup) : null
  );

  const handleBlurCost = () => {
    const val = localCostPerGram ? parseFloat(localCostPerGram) : null;
    if (val !== product.cost_per_gram) onUpdate({ cost_per_gram: val } as any);
  };
  const handleBlurMarkup = () => {
    const val = localMarkup ? parseFloat(localMarkup) : null;
    if (val !== product.markup_pct) onUpdate({ markup_pct: val } as any);
  };
  const handleBlurContainer = () => {
    if (localContainer !== (product.container_size || '')) onUpdate({ container_size: localContainer || null } as any);
  };

  const inputClass = "h-6 w-16 rounded border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-input))] px-1.5 text-[11px] font-sans text-[hsl(var(--platform-foreground))] focus:outline-none focus:border-[hsl(var(--platform-primary)/0.5)] transition-colors";

  return (
    <div className={cn(
      'rounded-lg border p-3 transition-all',
      product.is_backroom_tracked
        ? 'border-[hsl(var(--platform-border)/0.6)] bg-[hsl(var(--platform-bg-card)/0.5)]'
        : 'border-[hsl(var(--platform-border)/0.3)] bg-transparent opacity-70'
    )}>
      {/* Row 1: Toggle + name + depletion */}
      <div className="flex items-center gap-2">
        <Switch
          checked={product.is_backroom_tracked}
          onCheckedChange={(checked) => onUpdate({ is_backroom_tracked: checked })}
          className="scale-75 shrink-0"
        />
        <span className="flex-1 text-xs font-sans font-medium text-[hsl(var(--platform-foreground))] truncate min-w-0">
          {product.name}
        </span>
        {product.is_backroom_tracked && (
          <Select
            value={product.depletion_method}
            onValueChange={(v) => onUpdate({ depletion_method: v })}
          >
            <PlatformSelectTrigger className="w-[100px] h-6 text-[11px] font-sans">
              <SelectValue />
            </PlatformSelectTrigger>
            <PlatformSelectContent>
              {DEPLETION_METHODS.map((m) => (
                <PlatformSelectItem key={m.value} value={m.value} className="text-[11px]">{m.label}</PlatformSelectItem>
              ))}
            </PlatformSelectContent>
          </Select>
        )}
      </div>

      {/* Row 2: Pricing + switches (only when tracked) */}
      {product.is_backroom_tracked && (
        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-[hsl(var(--platform-border)/0.2)]">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">$/g</span>
            <input
              type="number"
              step="0.0001"
              value={localCostPerGram}
              onChange={(e) => setLocalCostPerGram(e.target.value)}
              onBlur={handleBlurCost}
              placeholder="0.00"
              className={cn(inputClass, 'pl-1 w-14')}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">Size</span>
            <input
              type="text"
              value={localContainer}
              onChange={(e) => setLocalContainer(e.target.value)}
              onBlur={handleBlurContainer}
              placeholder="60g"
              className={cn(inputClass, 'w-12')}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">Markup</span>
            <input
              type="number"
              step="1"
              value={localMarkup}
              onChange={(e) => setLocalMarkup(e.target.value)}
              onBlur={handleBlurMarkup}
              placeholder="0"
              className={cn(inputClass, 'w-12')}
            />
            <span className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">%</span>
          </div>
          {chargePerGram != null && (
            <PlatformBadge variant="secondary" size="sm" className="text-[10px] font-sans">
              ${chargePerGram.toFixed(4)}/g
            </PlatformBadge>
          )}

          <div className="w-px h-3 bg-[hsl(var(--platform-border)/0.3)]" />

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">Billable</span>
            <Switch checked={product.is_billable_to_client} onCheckedChange={(v) => onUpdate({ is_billable_to_client: v })} className="scale-[0.6]" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">Overage</span>
            <Switch checked={product.is_overage_eligible} onCheckedChange={(v) => onUpdate({ is_overage_eligible: v })} className="scale-[0.6]" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   INVENTORY VIEW — Table of tracked products with stock/reorder columns
   ========================================================================== */
function InventoryView({
  kpis,
  stockFilter,
  setStockFilter,
  filterCategory,
  setFilterCategory,
  search,
  setSearch,
  filteredInventory,
  bulkProductIds,
  reorderItems,
  orgId,
  onUpdate,
  onOpenPricing,
  onOpenReorder,
}: {
  kpis: { inStock: number; toReorder: number; totalTracked: number };
  stockFilter: 'all' | 'reorder' | 'in_stock';
  setStockFilter: (v: 'all' | 'reorder' | 'in_stock') => void;
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  filteredInventory: BackroomInventoryRow[];
  bulkProductIds: string[];
  reorderItems: BackroomInventoryRow[];
  orgId: string | null;
  onUpdate: (id: string, updates: Record<string, any>) => void;
  onOpenPricing: () => void;
  onOpenReorder: () => void;
}) {
  return (
    <>
      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setStockFilter(stockFilter === 'in_stock' ? 'all' : 'in_stock')}
          className={cn(
            'rounded-xl border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card))] p-4 text-left transition-all cursor-pointer',
            stockFilter === 'in_stock' ? 'border-[hsl(var(--platform-primary)/0.4)] bg-[hsl(var(--platform-primary)/0.05)]' : 'hover:border-[hsl(var(--platform-border)/0.8)] hover:shadow-sm'
          )}
        >
          <span className="text-[11px] font-display uppercase tracking-wider text-[hsl(var(--platform-foreground-muted))]">Current Stock</span>
          <span className="block text-2xl font-display tracking-tight text-[hsl(var(--platform-foreground))] mt-1">{kpis.inStock}</span>
        </button>
        <button
          type="button"
          onClick={() => setStockFilter(stockFilter === 'reorder' ? 'all' : 'reorder')}
          className={cn(
            'rounded-xl border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card))] p-4 text-left transition-all cursor-pointer',
            stockFilter === 'reorder' ? 'border-amber-500/40 bg-amber-500/5' : 'hover:border-[hsl(var(--platform-border)/0.8)] hover:shadow-sm'
          )}
        >
          <span className="text-[11px] font-display uppercase tracking-wider text-[hsl(var(--platform-foreground-muted))]">To Reorder</span>
          <span className={cn('block text-2xl font-display tracking-tight text-[hsl(var(--platform-foreground))] mt-1', kpis.toReorder > 0 && 'text-amber-400')}>{kpis.toReorder}</span>
        </button>
        <div className="rounded-xl border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card))] p-4">
          <span className="text-[11px] font-display uppercase tracking-wider text-[hsl(var(--platform-foreground-muted))]">Total Tracked</span>
          <span className="block text-2xl font-display tracking-tight text-[hsl(var(--platform-foreground))] mt-1">{kpis.totalTracked}</span>
        </div>
      </div>

      {/* Search + Filters */}
      <PlatformInput
        placeholder="Search inventory..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        icon={<Search className="w-4 h-4" />}
        className="font-sans"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <PlatformSelectTrigger className="w-full sm:w-[180px] font-sans">
            <SelectValue placeholder="Category" />
          </PlatformSelectTrigger>
          <PlatformSelectContent>
            <PlatformSelectItem value="all">All Categories</PlatformSelectItem>
            {CATEGORIES.map((c) => (
              <PlatformSelectItem key={c} value={c} className="capitalize">{c}</PlatformSelectItem>
            ))}
          </PlatformSelectContent>
        </Select>
        {bulkProductIds.length > 0 && orgId && (
          <PlatformButton variant="outline" size="sm" onClick={onOpenPricing} className="font-sans gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Set Pricing
          </PlatformButton>
        )}
        {reorderItems.length > 0 && orgId && (
          <PlatformButton variant="outline" size="sm" onClick={onOpenReorder} className="font-sans gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5" />
            Reorder All
            <PlatformBadge variant="secondary" size="sm" className="ml-1">{reorderItems.length}</PlatformBadge>
          </PlatformButton>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[hsl(var(--platform-border)/0.5)] overflow-hidden">
        <PlatformTable>
          <PlatformTableHeader>
            <PlatformTableRow>
              <PlatformTableHead>Product</PlatformTableHead>
              <PlatformTableHead className="hidden sm:table-cell">Category</PlatformTableHead>
              <PlatformTableHead className="hidden md:table-cell">Container</PlatformTableHead>
              <PlatformTableHead>Stock</PlatformTableHead>
              <PlatformTableHead className="hidden md:table-cell">Min</PlatformTableHead>
              <PlatformTableHead className="hidden md:table-cell">Max</PlatformTableHead>
              <PlatformTableHead className="hidden lg:table-cell">Order Qty</PlatformTableHead>
              <PlatformTableHead>Status</PlatformTableHead>
              <PlatformTableHead className="hidden lg:table-cell">Cost/g</PlatformTableHead>
            </PlatformTableRow>
          </PlatformTableHeader>
          <PlatformTableBody>
            {filteredInventory.length === 0 ? (
              <PlatformTableRow>
                <PlatformTableCell colSpan={9} className="text-center py-8">
                  <div className={tokens.empty.container}>
                    <Package className={tokens.empty.icon} />
                    <h3 className={tokens.empty.heading}>No products found</h3>
                    <p className={tokens.empty.description}>Adjust filters or track products in brand view first.</p>
                  </div>
                </PlatformTableCell>
              </PlatformTableRow>
            ) : (
              filteredInventory.map((row) => (
                <InventoryTableRow
                  key={row.id}
                  row={row}
                  orgId={orgId!}
                  onUpdate={(updates) => onUpdate(row.id, updates)}
                />
              ))
            )}
          </PlatformTableBody>
        </PlatformTable>
      </div>
    </>
  );
}

/* ==========================================================================
   INVENTORY TABLE ROW
   ========================================================================== */
function InventoryTableRow({
  row,
  orgId,
  onUpdate,
}: {
  row: BackroomInventoryRow;
  orgId: string;
  onUpdate: (u: Record<string, any>) => void;
}) {
  const queryClient = useQueryClient();
  const [editingStock, setEditingStock] = useState(false);
  const [stockValue, setStockValue] = useState(row.quantity_on_hand.toString());
  const [editingMin, setEditingMin] = useState(false);
  const [minValue, setMinValue] = useState(row.reorder_level?.toString() || '');
  const [editingMax, setEditingMax] = useState(false);
  const [maxValue, setMaxValue] = useState(row.par_level?.toString() || '');

  const statusConfig = STOCK_STATUS_CONFIG[row.status];

  const handleStockSave = async () => {
    setEditingStock(false);
    const newQty = parseInt(stockValue, 10);
    if (isNaN(newQty) || newQty === row.quantity_on_hand) return;
    const diff = newQty - row.quantity_on_hand;
    try {
      await postLedgerEntry({
        organization_id: orgId,
        product_id: row.id,
        quantity_change: diff,
        quantity_after: newQty,
        event_type: 'count',
        reason: 'Manual stock count from inventory table',
      });
      queryClient.invalidateQueries({ queryKey: ['backroom-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-product-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Stock updated for ${row.name}`);
    } catch (err: any) {
      toast.error('Failed to update stock: ' + err.message);
    }
  };

  const handleMinSave = () => {
    setEditingMin(false);
    const val = minValue ? parseInt(minValue, 10) : null;
    if (val !== row.reorder_level) onUpdate({ reorder_level: val });
  };

  const handleMaxSave = () => {
    setEditingMax(false);
    const val = maxValue ? parseInt(maxValue, 10) : null;
    if (val !== row.par_level) onUpdate({ par_level: val });
  };

  const inlineInputClass = "h-6 w-14 rounded border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-input))] px-1.5 text-xs font-sans text-[hsl(var(--platform-foreground))] focus:outline-none focus:border-[hsl(var(--platform-primary)/0.5)]";

  return (
    <PlatformTableRow>
      <PlatformTableCell>
        <div className="min-w-0">
          <span className="text-sm font-sans font-medium text-[hsl(var(--platform-foreground))] truncate block">{row.name}</span>
          {row.brand && <span className="text-[11px] text-[hsl(var(--platform-foreground-muted))]">{row.brand}</span>}
        </div>
      </PlatformTableCell>
      <PlatformTableCell className="hidden sm:table-cell">
        {row.category && <PlatformBadge variant="outline" size="sm" className="capitalize">{row.category}</PlatformBadge>}
      </PlatformTableCell>
      <PlatformTableCell className="hidden md:table-cell">
        <span className="text-xs font-sans text-[hsl(var(--platform-foreground-muted))]">{row.container_size || '—'}</span>
      </PlatformTableCell>
      <PlatformTableCell>
        {editingStock ? (
          <input
            type="number"
            value={stockValue}
            onChange={(e) => setStockValue(e.target.value)}
            onBlur={handleStockSave}
            onKeyDown={(e) => e.key === 'Enter' && handleStockSave()}
            autoFocus
            className={inlineInputClass}
          />
        ) : (
          <button
            type="button"
            onClick={() => { setEditingStock(true); setStockValue(row.quantity_on_hand.toString()); }}
            className="text-xs font-sans text-[hsl(var(--platform-foreground))] hover:text-[hsl(var(--platform-primary))] transition-colors cursor-pointer tabular-nums"
          >
            {row.quantity_on_hand}
          </button>
        )}
      </PlatformTableCell>
      <PlatformTableCell className="hidden md:table-cell">
        {editingMin ? (
          <input type="number" value={minValue} onChange={(e) => setMinValue(e.target.value)} onBlur={handleMinSave} onKeyDown={(e) => e.key === 'Enter' && handleMinSave()} autoFocus className={inlineInputClass} />
        ) : (
          <button type="button" onClick={() => { setEditingMin(true); setMinValue(row.reorder_level?.toString() || ''); }} className="text-xs font-sans text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] transition-colors cursor-pointer tabular-nums">
            {row.reorder_level ?? '—'}
          </button>
        )}
      </PlatformTableCell>
      <PlatformTableCell className="hidden md:table-cell">
        {editingMax ? (
          <input type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} onBlur={handleMaxSave} onKeyDown={(e) => e.key === 'Enter' && handleMaxSave()} autoFocus className={inlineInputClass} />
        ) : (
          <button type="button" onClick={() => { setEditingMax(true); setMaxValue(row.par_level?.toString() || ''); }} className="text-xs font-sans text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] transition-colors cursor-pointer tabular-nums">
            {row.par_level ?? '—'}
          </button>
        )}
      </PlatformTableCell>
      <PlatformTableCell className="hidden lg:table-cell">
        {row.order_qty > 0 ? (
          <span className="text-xs font-sans font-medium text-amber-400 tabular-nums">{row.order_qty}</span>
        ) : (
          <span className="text-xs text-[hsl(var(--platform-foreground-muted))]">—</span>
        )}
      </PlatformTableCell>
      <PlatformTableCell>
        <PlatformBadge variant="outline" className={cn('text-[10px] border', statusConfig.className)}>
          {statusConfig.label}
        </PlatformBadge>
      </PlatformTableCell>
      <PlatformTableCell className="hidden lg:table-cell">
        <span className="text-xs font-sans text-[hsl(var(--platform-foreground-muted))] tabular-nums">
          {row.cost_per_gram != null ? `$${row.cost_per_gram.toFixed(4)}` : '—'}
        </span>
      </PlatformTableCell>
    </PlatformTableRow>
  );
}
