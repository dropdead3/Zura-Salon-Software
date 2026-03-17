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
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Loader2, Search, Package, ArrowRight, Library, Check, ChevronLeft, PackagePlus, LayoutGrid, TableIcon, DollarSign, AlertTriangle, Archive, ShoppingCart } from 'lucide-react';
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
}

type CatalogView = 'cards' | 'table';
type StockFilter = 'all' | 'reorder' | 'in_stock';

interface Props {
  onNavigate?: (section: string) => void;
}

/** Build a selection key — includes size when present */
function sizedKey(brand: string, name: string, size?: string) {
  const b = brand.toLowerCase(), n = name.toLowerCase();
  return size ? `${b}::${n}::${size.toLowerCase()}` : `${b}::${n}`;
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
  const [catalogView, setCatalogView] = useState<CatalogView>('cards');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [bulkPricingOpen, setBulkPricingOpen] = useState(false);
  const [bulkReorderOpen, setBulkReorderOpen] = useState(false);

  // Brand browsing state
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  // Fetch supply library from DB (falls back to static data)
  const { data: libraryItems = [] } = useSupplyLibraryItems();
  const brands = useMemo(() => [...new Set(libraryItems.map((i) => i.brand))].sort(), [libraryItems]);
  const getProductsByBrand = useCallback((brand: string) => libraryItems.filter((i) => i.brand === brand), [libraryItems]);
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
        .select('id, name, brand, sku, category, cost_price, is_backroom_tracked, depletion_method, is_billable_to_client, is_overage_eligible, is_forecast_eligible, cost_per_gram, unit_of_measure, markup_pct, container_size')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('product_type', 'Supplies')
        .order('name');

      if (error) throw error;
      return data as unknown as BackroomProduct[];
    },
    enabled: !!orgId,
  });

  // Inventory table data (only fetched when in table view)
  const { data: inventoryRows } = useBackroomInventoryTable();

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

  // KPI computations from inventory data
  const kpis = useMemo(() => {
    const rows = inventoryRows || [];
    const inStock = rows.filter((r) => r.quantity_on_hand > 0).length;
    const toReorder = rows.filter((r) => r.status === 'out_of_stock' || r.status === 'urgent_reorder' || r.status === 'replenish').length;
    return { inStock, toReorder, totalTracked: rows.length };
  }, [inventoryRows]);

  // Filtered inventory rows for table view
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

  // Bulk pricing product IDs
  const bulkProductIds = useMemo(() => {
    return filtered.filter((p) => p.is_backroom_tracked).map((p) => p.id);
  }, [filtered]);

  // Items needing reorder (for bulk reorder button)
  const reorderItems = useMemo(() => {
    return (inventoryRows || []).filter(
      (r) => r.status === 'replenish' || r.status === 'urgent_reorder' || r.status === 'out_of_stock'
    );
  }, [inventoryRows]);

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

      libraryItems.forEach((item) => {
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

      const insertedNames = itemsToInsert.map(i => i.name);
      toast.success(`Added ${insertedNames.length} ${brand} products to your catalog`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            const { error: undoError } = await supabase
              .from('products')
              .delete()
              .eq('organization_id', orgId)
              .eq('brand', brand)
              .in('name', insertedNames);
            if (!undoError) {
              queryClient.invalidateQueries({ queryKey: ['backroom-product-catalog'] });
              queryClient.invalidateQueries({ queryKey: ['backroom-setup-health'] });
              queryClient.invalidateQueries({ queryKey: ['products'] });
              toast.success(`Removed ${insertedNames.length} ${brand} products`);
            }
          },
        },
        duration: 8000,
      });
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
            <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0 flex-wrap">
              {/* View toggle */}
              {hasProducts && activeBrand === null && (
                <div className="flex items-center rounded-lg border border-border/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCatalogView('cards')}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 transition-colors',
                      catalogView === 'cards' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    )}
                    title="Card view"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogView('table')}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 transition-colors',
                      catalogView === 'table' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    )}
                    title="Table view"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
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

          {/* Show table view or card view */}
          {catalogView === 'table' && activeBrand === null ? (
            /* ====== INVENTORY TABLE VIEW ====== */
            <>
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setStockFilter(stockFilter === 'in_stock' ? 'all' : 'in_stock')}
                  className={cn(
                    tokens.kpi.tile,
                    'text-left transition-all cursor-pointer',
                    stockFilter === 'in_stock' ? 'border-primary/40 bg-primary/5' : 'hover:border-border/80 hover:shadow-sm'
                  )}
                >
                  <span className={tokens.kpi.label}>Current Stock</span>
                  <span className={tokens.kpi.value}>{kpis.inStock}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter(stockFilter === 'reorder' ? 'all' : 'reorder')}
                  className={cn(
                    tokens.kpi.tile,
                    'text-left transition-all cursor-pointer',
                    stockFilter === 'reorder' ? 'border-warning/40 bg-warning/5' : 'hover:border-border/80 hover:shadow-sm'
                  )}
                >
                  <span className={tokens.kpi.label}>To Reorder</span>
                  <span className={cn(tokens.kpi.value, kpis.toReorder > 0 && 'text-warning')}>{kpis.toReorder}</span>
                </button>
                <div className={tokens.kpi.tile}>
                  <span className={tokens.kpi.label}>Total Tracked</span>
                  <span className={tokens.kpi.value}>{kpis.totalTracked}</span>
                </div>
              </div>

              {/* Category filter + Bulk Pricing button */}
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
                {bulkProductIds.length > 0 && orgId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkPricingOpen(true)}
                    className="font-sans gap-1.5"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Set Pricing
                  </Button>
                )}
                {reorderItems.length > 0 && orgId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkReorderOpen(true)}
                    className="font-sans gap-1.5"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Reorder All
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{reorderItems.length}</Badge>
                  </Button>
                )}
              </div>

              {/* Inventory Table */}
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'hidden sm:table-cell')}>Category</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'hidden md:table-cell')}>Container</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Stock</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'hidden md:table-cell')}>Min</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'hidden md:table-cell')}>Max</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Order Qty</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Cost/g</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <div className={tokens.empty.container}>
                            <Package className={tokens.empty.icon} />
                            <h3 className={tokens.empty.heading}>No products found</h3>
                            <p className={tokens.empty.description}>Adjust filters or track products in card view first.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInventory.map((row) => (
                        <InventoryTableRow
                          key={row.id}
                          row={row}
                          orgId={orgId!}
                          onUpdate={(updates) => updateMutation.mutate({ id: row.id, updates })}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            /* ====== CARD / BRAND VIEW ====== */
            <>
              {/* Alphabet selector bar */}
              <div className="flex flex-wrap items-center gap-0.5 sm:gap-1.5">
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
                      {/* Category & tracked filters + bulk pricing */}
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
                        {bulkProductIds.length > 0 && orgId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBulkPricingOpen(true)}
                            className="font-sans gap-1.5"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Set Pricing
                          </Button>
                        )}
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-sans text-sm font-medium text-foreground truncate min-w-0">{activeBrand}</h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
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
            </>
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

      {/* Bulk Pricing Dialog */}
      {orgId && (
        <BackroomBulkPricingDialog
          open={bulkPricingOpen}
          onOpenChange={setBulkPricingOpen}
          orgId={orgId}
          productIds={catalogView === 'table' ? filteredInventory.map((r) => r.id) : bulkProductIds}
          scopeLabel={filterCategory !== 'all' ? filterCategory : 'all tracked products'}
        />
      )}

      {/* Bulk Reorder Dialog */}
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

/* ====== Tracked Product Row (My Catalog — Card View) ====== */
function ProductRow({ product, onUpdate }: { product: BackroomProduct; onUpdate: (u: Partial<BackroomProduct>) => void }) {
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

  return (
    <div className={cn(
      'flex flex-col rounded-lg border p-4 transition-all duration-200 ease-out',
      product.is_backroom_tracked
        ? 'border-border bg-card hover:border-border/80 hover:shadow-sm'
        : 'border-border/40 bg-muted/20'
    )}>
      {/* Row 1: Toggle + Info + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Zone 1: Toggle + Product Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1 shrink-0">
            <Switch
              checked={product.is_backroom_tracked}
              onCheckedChange={(checked) => onUpdate({ is_backroom_tracked: checked })}
            />
            <MetricInfoTooltip description="When on, this product appears in the mixing dashboard and its usage is recorded per appointment." />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-sans font-medium text-foreground truncate">{product.name}</span>
              {product.brand && <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{product.brand}</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {product.brand && <span className="text-xs text-muted-foreground sm:hidden">{product.brand}</span>}
              {product.category && <Badge variant="outline" className="text-[10px] capitalize">{product.category}</Badge>}
              {product.sku && <span className="text-[10px] text-muted-foreground">{product.sku}</span>}
              {!product.cost_price && !product.cost_per_gram && product.is_backroom_tracked && (
                <span className="flex items-center gap-0.5">
                  <Badge variant="destructive" className="text-[10px]">No cost</Badge>
                  <MetricInfoTooltip description="This product has no unit cost set. Add a cost so Zura can calculate margins and overage charges." />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Zone 2: Controls */}
        {product.is_backroom_tracked && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-muted/30 backdrop-blur-sm rounded-lg px-3 py-2.5 shrink-0 sm:ml-auto w-full sm:w-auto">
            <div className="flex items-center gap-1">
              <MetricInfoTooltip description="How this product is measured when used. 'Weighed' uses a scale; 'Per Pump' counts pumps dispensed." />
              <Select
                value={product.depletion_method}
                onValueChange={(v) => onUpdate({ depletion_method: v })}
              >
                <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs font-sans">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPLETION_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-px h-4 bg-border/40 hidden sm:block" />

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <label className="text-[11px] text-muted-foreground">Billable</label>
                <MetricInfoTooltip description="When on, overage usage of this product can be charged to the client." />
                <Switch
                  checked={product.is_billable_to_client}
                  onCheckedChange={(v) => onUpdate({ is_billable_to_client: v })}
                  className="scale-75"
                />
              </div>

              <div className="flex items-center gap-1">
                <label className="text-[11px] text-muted-foreground">Overage</label>
                <MetricInfoTooltip description="When on, usage beyond the service allowance triggers an overage charge." />
                <Switch
                  checked={product.is_overage_eligible}
                  onCheckedChange={(v) => onUpdate({ is_overage_eligible: v })}
                  className="scale-75"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Pricing Zone (only when tracked) */}
      {product.is_backroom_tracked && (
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-muted-foreground whitespace-nowrap">Cost/g</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <input
                type="number"
                step="0.0001"
                value={localCostPerGram}
                onChange={(e) => setLocalCostPerGram(e.target.value)}
                onBlur={handleBlurCost}
                placeholder="0.00"
                className="h-7 w-20 rounded-md border border-input bg-background pl-5 pr-2 text-xs font-sans focus:outline-none focus:border-foreground/30 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-muted-foreground whitespace-nowrap">Container</label>
            <input
              type="text"
              value={localContainer}
              onChange={(e) => setLocalContainer(e.target.value)}
              onBlur={handleBlurContainer}
              placeholder="60ml"
              className="h-7 w-16 rounded-md border border-input bg-background px-2 text-xs font-sans focus:outline-none focus:border-foreground/30 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-muted-foreground whitespace-nowrap">Markup</label>
            <div className="relative">
              <input
                type="number"
                step="1"
                value={localMarkup}
                onChange={(e) => setLocalMarkup(e.target.value)}
                onBlur={handleBlurMarkup}
                placeholder="0"
                className="h-7 w-14 rounded-md border border-input bg-background pl-2 pr-5 text-xs font-sans focus:outline-none focus:border-foreground/30 transition-colors"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {chargePerGram != null && (
            <Badge variant="secondary" className="text-[10px] font-sans">
              Charge/g ${chargePerGram.toFixed(4)}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/* ====== Inventory Table Row ====== */
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

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <span className="text-sm font-sans font-medium text-foreground truncate block">{row.name}</span>
          {row.brand && <span className="text-[11px] text-muted-foreground">{row.brand}</span>}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {row.category && <Badge variant="outline" className="text-[10px] capitalize">{row.category}</Badge>}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-xs font-sans text-muted-foreground">{row.container_size || '—'}</span>
      </TableCell>
      <TableCell>
        {editingStock ? (
          <input
            type="number"
            value={stockValue}
            onChange={(e) => setStockValue(e.target.value)}
            onBlur={handleStockSave}
            onKeyDown={(e) => e.key === 'Enter' && handleStockSave()}
            autoFocus
            className="h-6 w-14 rounded border border-input bg-background px-1.5 text-xs font-sans focus:outline-none focus:border-foreground/30"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setEditingStock(true); setStockValue(row.quantity_on_hand.toString()); }}
            className="text-xs font-sans text-foreground hover:text-primary transition-colors cursor-pointer tabular-nums"
          >
            {row.quantity_on_hand}
          </button>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {editingMin ? (
          <input
            type="number"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            onBlur={handleMinSave}
            onKeyDown={(e) => e.key === 'Enter' && handleMinSave()}
            autoFocus
            className="h-6 w-14 rounded border border-input bg-background px-1.5 text-xs font-sans focus:outline-none focus:border-foreground/30"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setEditingMin(true); setMinValue(row.reorder_level?.toString() || ''); }}
            className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors cursor-pointer tabular-nums"
          >
            {row.reorder_level ?? '—'}
          </button>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {editingMax ? (
          <input
            type="number"
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
            onBlur={handleMaxSave}
            onKeyDown={(e) => e.key === 'Enter' && handleMaxSave()}
            autoFocus
            className="h-6 w-14 rounded border border-input bg-background px-1.5 text-xs font-sans focus:outline-none focus:border-foreground/30"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setEditingMax(true); setMaxValue(row.par_level?.toString() || ''); }}
            className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors cursor-pointer tabular-nums"
          >
            {row.par_level ?? '—'}
          </button>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {row.order_qty > 0 ? (
          <span className="text-xs font-sans font-medium text-warning tabular-nums">{row.order_qty}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-[10px] border', statusConfig.className)}>
          {statusConfig.label}
        </Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <span className="text-xs font-sans text-muted-foreground tabular-nums">
          {row.cost_per_gram != null ? `$${row.cost_per_gram.toFixed(4)}` : '—'}
        </span>
      </TableCell>
    </TableRow>
  );
}
