import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useColorBarOrgId } from '@/hooks/color-bar/useColorBarOrgId';
import { useColorBarInventoryTable, STOCK_STATUS_CONFIG, computeChargePerGram, type ColorBarInventoryRow, type StockStatus } from '@/hooks/color-bar/useColorBarInventoryTable';
import { useLocationProductSettingsMap, useUpsertLocationProductSetting, useBulkUpsertLocationProductSettings, useSyncCatalogToAllLocations } from '@/hooks/color-bar/useLocationProductSettings';
import { useLocations } from '@/hooks/useLocations';
import { postLedgerEntry } from '@/lib/color-bar/services/inventory-ledger-service';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { OrgBrowseColumn as BrowseColumn, type BrowseColumnItem } from '@/components/dashboard/color-bar-settings/OrgBrowseColumn';
import { extractProductLine, groupByProductLine } from '@/lib/supply-line-parser';
import { useSupplyBrandsMeta, type SupplyBrandMeta } from '@/hooks/platform/useSupplyLibraryBrandMeta';
import { sortByShadeLevel, SHADE_SORTED_CATEGORIES } from '@/lib/shadeSort';
import { Loader2, Search, Package, ArrowRight, ArrowLeft, Library, Check, ChevronLeft, PackagePlus, LayoutGrid, TableIcon, DollarSign, AlertTriangle, Archive, ShoppingCart, RefreshCw, MapPin, Building2, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { toast } from 'sonner';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { SupplyLibraryDialog } from './SupplyLibraryDialog';
import { ColorBarBulkPricingDialog } from './ColorBarBulkPricingDialog';
import { ColorBarBulkReorderDialog } from './ColorBarBulkReorderDialog';
import { useLogPlatformAction } from '@/hooks/usePlatformAuditLog';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { ArchiveRestore, Clock } from 'lucide-react';
import {
  SUPPLY_CATEGORY_LABELS,
  type SupplyLibraryItem,
} from '@/data/professional-supply-library';
import { useSupplyLibraryItemsByBrand } from '@/hooks/platform/useSupplyLibrary';
import { InventoryReconciliationBanner } from '@/components/dashboard/color-bar/InventoryReconciliationBanner';

/* ====== Inline Edit Cell ====== */
function InlineEditCell({
  value,
  prefix,
  suffix,
  placeholder = '—',
  onSave,
}: {
  value: number | null;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  onSave: (v: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(value != null ? String(value) : '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    setEditing(false);
    const num = parseFloat(draft);
    const newVal = isNaN(num) ? null : num;
    if (newVal !== value) onSave(newVal);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="any"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        autoFocus
        className="w-16 h-6 px-1 text-xs font-sans bg-muted border border-border rounded text-foreground outline-none focus:border-primary/50"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="text-left hover:bg-muted/50 rounded px-1 -mx-1 transition-colors cursor-text"
    >
      {value != null ? (
        <span className="text-foreground">{prefix}{typeof value === 'number' ? value.toFixed(suffix === '%' ? 0 : 2) : value}{suffix}</span>
      ) : (
        <span className="text-muted-foreground">{placeholder}</span>
      )}
    </button>
  );
}


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

interface ColorBarProduct {
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
  swatch_color?: string | null;
}

type CatalogView = 'brands' | 'inventory';

interface Props {
  onNavigate?: (section: string) => void;
}

/* ====== Main Component ====== */
export function ColorBarProductCatalogSection({ onNavigate }: Props) {
  const orgId = useColorBarOrgId();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logAction = useLogPlatformAction();

  // Location state — defaults to first location
  const { data: locations = [] } = useLocations();
  const activeLocations = useMemo(() => locations.filter((l) => l.is_active), [locations]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);
  // Auto-select first location when locations load
  const effectiveLocationId = selectedLocationId || activeLocations[0]?.id;

  // Per-location product settings
  const { settingsMap: locationSettings } = useLocationProductSettingsMap(effectiveLocationId);
  const upsertSetting = useUpsertLocationProductSetting();
  const bulkUpsertSettings = useBulkUpsertLocationProductSettings();
  const syncCatalogMutation = useSyncCatalogToAllLocations();

  // UI state
  const [search, setSearch] = useState('');
  const [catalogView, setCatalogView] = useState<CatalogView>('brands');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [bulkPricingOpen, setBulkPricingOpen] = useState(false);
  const [bulkReorderOpen, setBulkReorderOpen] = useState(false);
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [syncScope, setSyncScope] = useState<'brand' | 'all'>('brand');
  const [syncToAllOpen, setSyncToAllOpen] = useState(false);
  const [syncIncludeLevels, setSyncIncludeLevels] = useState(true);
  const [removeBrandOpen, setRemoveBrandOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [restoreBrandOpen, setRestoreBrandOpen] = useState<string | null>(null);

  // Brand-first navigation
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  // Finder columns (Level 1)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);

  // Brand detail filters
  const [productSearch, setProductSearch] = useState('');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'missing' | 'priced'>('all');

  // Inventory view filters
  const [stockFilter, setStockFilter] = useState<'all' | 'reorder' | 'in_stock'>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Data — deferred fetching for performance
  const { data: brandsMeta = [] } = useSupplyBrandsMeta();
  const { data: libraryItems = [] } = useSupplyLibraryItemsByBrand(selectedBrand);
  const { data: inventoryRows } = useColorBarInventoryTable({ enabled: catalogView === 'inventory', locationId: effectiveLocationId });

  const { data: products, isLoading } = useQuery({
    queryKey: ['color-bar-product-catalog', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, sku, category, cost_price, is_backroom_tracked, depletion_method, is_billable_to_client, is_overage_eligible, is_forecast_eligible, cost_per_gram, unit_of_measure, markup_pct, container_size, swatch_color')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('product_type', 'Supplies')
        .order('name');
      if (error) throw error;
      return data as unknown as ColorBarProduct[];
    },
    enabled: !!orgId,
  });

  /* ====== Mutations ====== */
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ColorBarProduct> }) => {
      const { error } = await supabase
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['color-bar-product-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-setup-health'] });
    },
    onError: (error) => toast.error('Failed to update: ' + error.message),
  });

  const bulkTrackMutation = useMutation({
    mutationFn: async ({ ids, tracked }: { ids: string[]; tracked: boolean }) => {
      if (ids.length === 0 || !effectiveLocationId) return;
      // Use location_product_settings
      const rows = ids.map((productId) => ({
        organization_id: orgId!,
        location_id: effectiveLocationId,
        product_id: productId,
        is_tracked: tracked,
      }));
      const { error } = await supabase
        .from('location_product_settings')
        .upsert(rows as any[], { onConflict: 'location_id,product_id' });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['color-bar-product-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-setup-health'] });
      queryClient.invalidateQueries({ queryKey: ['location-product-settings'] });
      toast.success(`${vars.tracked ? 'Enabled' : 'Disabled'} tracking for ${vars.ids.length} products`);
    },
    onError: (error) => toast.error('Bulk update failed: ' + error.message),
  });

  /* Sync from Library — pulls missing pricing/swatch data from supply_library_products */
  const syncFromLibraryMutation = useMutation({
    mutationFn: async (brand: string) => {
      const { data: libraryData, error: libErr } = await supabase
        .from('supply_library_products')
        .select('name, wholesale_price, default_markup_pct, swatch_color, size_options, color_type')
        .eq('is_active', true)
        .ilike('brand', brand);
      if (libErr) throw libErr;
      if (!libraryData?.length) throw new Error('No library data found for this brand');

      // Get org products for this brand that need filling
      const { data: orgProducts, error: orgErr } = await supabase
        .from('products')
        .select('id, name, cost_price, markup_pct, swatch_color, container_size, color_type')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('product_type', 'Supplies')
        .ilike('brand', brand);
      if (orgErr) throw orgErr;

      let updated = 0;
      let skipped = 0;
      const total = (orgProducts || []).length;
      for (const op of orgProducts || []) {
        const match = libraryData.find((lp: any) =>
          op.name.toLowerCase().startsWith(lp.name.toLowerCase())
        );
        if (!match) continue;
        const updates: Record<string, any> = {};
        if (op.cost_price == null && match.wholesale_price != null) updates.cost_price = match.wholesale_price;
        if (op.markup_pct == null && match.default_markup_pct != null) updates.markup_pct = match.default_markup_pct;
        if (op.swatch_color == null && match.swatch_color != null) updates.swatch_color = match.swatch_color;
        if (op.container_size == null && (match as any).size_options?.[0] != null) updates.container_size = (match as any).size_options[0];
        if (op.color_type == null && match.color_type != null) updates.color_type = match.color_type;
        if (Object.keys(updates).length === 0) { skipped++; continue; }
        updates.updated_at = new Date().toISOString();
        await supabase.from('products').update(updates).eq('id', op.id);
        updated++;
      }
      return { updated, skipped, total };
    },
    onSuccess: ({ updated, skipped, total }) => {
      queryClient.invalidateQueries({ queryKey: ['color-bar-product-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-inventory-table'] });
      if (updated > 0) {
        toast.success(`Synced ${updated} of ${total} products from Zura Library. ${skipped} already up to date.`);
      } else {
        toast.success(`All ${total} products already up to date — nothing to sync.`);
      }
    },
    onError: (error) => toast.error('Sync failed: ' + error.message),
  });

  /* Sync All Brands — batch sync for entire catalog */
  const syncAllBrandsMutation = useMutation({
    mutationFn: async () => {
      const { data: libraryData, error: libErr } = await supabase
        .from('supply_library_products')
        .select('name, brand, wholesale_price, default_markup_pct, swatch_color, size_options, color_type')
        .eq('is_active', true);
      if (libErr) throw libErr;

      const { data: orgProducts, error: orgErr } = await supabase
        .from('products')
        .select('id, name, brand, cost_price, markup_pct, swatch_color, container_size, color_type')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('product_type', 'Supplies');
      if (orgErr) throw orgErr;

      let updated = 0;
      let skipped = 0;
      const total = (orgProducts || []).length;
      for (const op of orgProducts || []) {
        const match = (libraryData || []).find((lp: any) =>
          lp.brand?.toLowerCase() === op.brand?.toLowerCase() &&
          op.name.toLowerCase().startsWith(lp.name.toLowerCase())
        );
        if (!match) continue;
        const updates: Record<string, any> = {};
        if (op.cost_price == null && match.wholesale_price != null) updates.cost_price = match.wholesale_price;
        if (op.markup_pct == null && match.default_markup_pct != null) updates.markup_pct = match.default_markup_pct;
        if (op.swatch_color == null && match.swatch_color != null) updates.swatch_color = match.swatch_color;
        if (op.container_size == null && (match as any).size_options?.[0] != null) updates.container_size = (match as any).size_options[0];
        if (op.color_type == null && match.color_type != null) updates.color_type = match.color_type;
        if (Object.keys(updates).length === 0) { skipped++; continue; }
        updates.updated_at = new Date().toISOString();
        await supabase.from('products').update(updates).eq('id', op.id);
        updated++;
      }
      return { updated, skipped, total };
    },
    onSuccess: ({ updated, skipped, total }) => {
      queryClient.invalidateQueries({ queryKey: ['color-bar-product-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-inventory-table'] });
      if (updated > 0) {
        toast.success(`Synced ${updated} of ${total} products from Zura Library. ${skipped} already up to date.`);
      } else {
        toast.success(`All ${total} products already up to date — nothing to sync.`);
      }
    },
    onError: (error) => toast.error('Sync failed: ' + error.message),
  });

  /* Remove Brand — deactivates all products + removes tracking */
  const removeBrandMutation = useMutation({
    mutationFn: async (brand: string) => {
      // 1. Get all product IDs for this brand
      const { data: brandProducts, error: fetchErr } = await supabase
        .from('products')
        .select('id')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('product_type', 'Supplies')
        .ilike('brand', brand);
      if (fetchErr) throw fetchErr;
      const ids = (brandProducts || []).map((p: any) => p.id);
      if (ids.length === 0) throw new Error('No active products found for this brand');

      // 2. Remove location tracking for these products
      const BATCH = 500;
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        const { error: delErr } = await supabase
          .from('location_product_settings')
          .delete()
          .eq('organization_id', orgId!)
          .in('product_id', batch);
        if (delErr) throw delErr;
      }

      // 3. Soft-delete the products with deactivation metadata
      const now = new Date().toISOString();
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        const { error: upErr } = await supabase
          .from('products')
          .update({ is_active: false, updated_at: now, deactivated_at: now, deactivated_by: user?.id ?? null } as any)
          .in('id', batch);
        if (upErr) throw upErr;
      }

      return { count: ids.length, brand };
    },
    onSuccess: ({ count, brand }) => {
      setSelectedBrand(null);
      setSelectedCategory(null);
      setSelectedLine(null);
      queryClient.invalidateQueries({ queryKey: ['color-bar-product-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['location-product-settings'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-setup-health'] });
      queryClient.invalidateQueries({ queryKey: ['product-brands'] });
      queryClient.invalidateQueries({ queryKey: ['archived-brands'] });
      // Audit log
      logAction.mutate({
        organizationId: orgId ?? undefined,
        action: 'brand_removed',
        entityType: 'brand',
        entityId: brand,
        details: { product_count: count, location_count: activeLocations.length },
      });
      toast.success(`Removed ${brand} — ${count} products deactivated`, {
        description: 'You can restore this brand within 24 hours from the Archived view.',
        duration: 8000,
      });
    },
    onError: (error) => toast.error('Failed to remove brand: ' + error.message),
  });

  /* Archived brands query */
  const { data: archivedBrands = [] } = useQuery({
    queryKey: ['archived-brands', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('brand, deactivated_at')
        .eq('organization_id', orgId!)
        .eq('is_active', false)
        .eq('product_type', 'Supplies')
        .not('brand', 'is', null);
      if (error) throw error;
      const map = new Map<string, { count: number; deactivatedAt: string | null }>();
      (data || []).forEach((p: any) => {
        const b = p.brand as string;
        const existing = map.get(b);
        if (!existing) {
          map.set(b, { count: 1, deactivatedAt: p.deactivated_at });
        } else {
          existing.count++;
          // Use earliest deactivated_at
          if (p.deactivated_at && (!existing.deactivatedAt || p.deactivated_at < existing.deactivatedAt)) {
            existing.deactivatedAt = p.deactivated_at;
          }
        }
      });
      return [...map.entries()].map(([brand, info]) => ({
        brand,
        count: info.count,
        deactivatedAt: info.deactivatedAt,
        withinGracePeriod: info.deactivatedAt ? differenceInHours(new Date(), new Date(info.deactivatedAt)) < 24 : false,
      }));
    },
    enabled: !!orgId,
  });

  /* Restore Brand mutation */
  const restoreBrandMutation = useMutation({
    mutationFn: async (brand: string) => {
      const { data: archivedProducts, error: fetchErr } = await supabase
        .from('products')
        .select('id')
        .eq('organization_id', orgId!)
        .eq('is_active', false)
        .eq('product_type', 'Supplies')
        .ilike('brand', brand);
      if (fetchErr) throw fetchErr;
      const ids = (archivedProducts || []).map((p: any) => p.id);
      if (ids.length === 0) throw new Error('No archived products found for this brand');

      const BATCH = 500;
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        const { error } = await supabase
          .from('products')
          .update({ is_active: true, deactivated_at: null, deactivated_by: null, updated_at: new Date().toISOString() } as any)
          .in('id', batch);
        if (error) throw error;
      }
      return { count: ids.length, brand };
    },
    onSuccess: ({ count, brand }) => {
      setRestoreBrandOpen(null);
      queryClient.invalidateQueries({ queryKey: ['color-bar-product-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['archived-brands'] });
      queryClient.invalidateQueries({ queryKey: ['product-brands'] });
      logAction.mutate({
        organizationId: orgId ?? undefined,
        action: 'brand_restored',
        entityType: 'brand',
        entityId: brand,
        details: { product_count: count },
      });
      toast.success(`Restored ${brand} — ${count} products reactivated`, {
        description: 'Products are back in your catalog. Re-track them at each location.',
        duration: 6000,
      });
    },
    onError: (error) => toast.error('Failed to restore brand: ' + error.message),
  });


  const allProducts = products || [];
  // Helper: is a product tracked at the current location?
  const isTrackedAtLocation = useCallback((productId: string) => {
    return locationSettings.get(productId)?.is_tracked ?? false;
  }, [locationSettings]);
  const trackedCount = allProducts.filter((p) => isTrackedAtLocation(p.id)).length;

  // Brand grouping for card grid
  const brandGroups = useMemo(() => {
    const map = new Map<string, ColorBarProduct[]>();
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
    let prods = brandGroups.get(selectedBrand) || [];
    // Apply product search filter
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      prods = prods.filter((p) => p.name.toLowerCase().includes(q));
    }
    // Apply pricing filter
    if (pricingFilter === 'missing') prods = prods.filter((p) => p.cost_price == null);
    else if (pricingFilter === 'priced') prods = prods.filter((p) => p.cost_price != null);
    return prods;
  }, [selectedBrand, brandGroups, productSearch, pricingFilter]);

  // Unfiltered brand products for counts
  const brandProductsAll = useMemo(() => {
    if (!selectedBrand) return [];
    return brandGroups.get(selectedBrand) || [];
  }, [selectedBrand, brandGroups]);

  // Categories for selected brand (computed from filtered products)
  const brandCategories = useMemo<BrowseColumnItem[]>(() => {
    const catMap = new Map<string, { total: number; tracked: number; missingPrice: number }>();
    brandProducts.forEach((p) => {
      const cat = p.category || 'uncategorized';
      const cur = catMap.get(cat) || { total: 0, tracked: 0, missingPrice: 0 };
      cur.total++;
      if (isTrackedAtLocation(p.id)) cur.tracked++;
      if (p.cost_price == null) cur.missingPrice++;
      catMap.set(cat, cur);
    });
    return [...catMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cat, stats]) => {
        const ratio = stats.total > 0 ? stats.missingPrice / stats.total : 0;
        return {
          key: cat,
          label: (SUPPLY_CATEGORY_LABELS as Record<string, string>)[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
          count: stats.total,
          health: ratio === 0 ? 'green' as const : ratio < 0.5 ? 'amber' as const : 'red' as const,
        };
      });
  }, [brandProducts, isTrackedAtLocation]);

  // Product lines for selected category
  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return brandProducts.filter((p) => (p.category || 'uncategorized') === selectedCategory);
  }, [brandProducts, selectedCategory]);

  const { shouldGroup, groups: productLineGroupsRaw } = useMemo(
    () => groupByProductLine(categoryProducts as any, 0),
    [categoryProducts],
  );

  const productLines = useMemo<BrowseColumnItem[]>(() => {
    if (!shouldGroup && categoryProducts.length > 0) {
      return [{ key: '__all__', label: 'All Products', count: categoryProducts.length }];
    }
    return productLineGroupsRaw.map(([line, prods]: [string, any[]]) => {
      const missingCount = prods.filter((p: any) => p.cost_price == null).length;
      const ratio = prods.length > 0 ? missingCount / prods.length : 0;
      return {
        key: line,
        label: line,
        count: prods.length,
        health: ratio === 0 ? 'green' as const : ratio < 0.5 ? 'amber' as const : 'red' as const,
      };
    });
  }, [shouldGroup, productLineGroupsRaw, categoryProducts]);

  // Products for selected line
  const lineProducts = useMemo(() => {
    if (!selectedLine) return categoryProducts;
    if (selectedLine === '__all__') return categoryProducts;
    return categoryProducts.filter((p) => {
      const line = p.product_line || extractProductLine(p.name);
      return line === selectedLine;
    });
  }, [categoryProducts, selectedLine]);

  // Display products for Col 3 — shade sorted when applicable, enriched with library fallbacks
  const displayProducts = useMemo(() => {
    if (!selectedCategory) return [];
    let prods = selectedLine ? lineProducts : [];
    if (prods.length === 0) return prods;

    // Enrich with library ghost values for display
    const enriched = prods.map((p) => {
      if (p.cost_price != null && p.swatch_color != null && p.markup_pct != null) return p;
      const match = libraryItems.find((li) =>
        p.name.toLowerCase().startsWith(li.name.toLowerCase())
      );
      if (!match) return p;
      return {
        ...p,
        _ghostCost: p.cost_price == null ? match.wholesalePrice ?? null : null,
        _ghostMarkup: p.markup_pct == null ? match.defaultMarkupPct ?? null : null,
        _ghostSwatch: p.swatch_color == null ? match.swatchColor ?? null : null,
      } as ColorBarProduct & { _ghostCost?: number | null; _ghostMarkup?: number | null; _ghostSwatch?: string | null };
    });

    if (SHADE_SORTED_CATEGORIES.has(selectedCategory)) {
      return sortByShadeLevel(enriched);
    }
    return enriched;
  }, [selectedCategory, selectedLine, lineProducts, libraryItems]);

  // Bulk toggle helpers
  const toggleCategoryTracking = useCallback((enabled: boolean) => {
    const ids = categoryProducts.map((p) => p.id);
    bulkTrackMutation.mutate({ ids, tracked: enabled });
  }, [categoryProducts, bulkTrackMutation]);

  const toggleLineTracking = useCallback((enabled: boolean) => {
    const ids = lineProducts.map((p) => p.id);
    bulkTrackMutation.mutate({ ids, tracked: enabled });
  }, [lineProducts, bulkTrackMutation]);

  // Stats for column browser
  const totalBrandProducts = brandProductsAll.length;
  const scopeProducts = selectedCategory ? (selectedLine ? displayProducts : categoryProducts) : [];
  const missingPriceCount = scopeProducts.filter((p) => p.cost_price == null).length;

  const scopeLabel = selectedLine && selectedLine !== '__all__'
    ? `${(SUPPLY_CATEGORY_LABELS as Record<string, string>)[selectedCategory!] || selectedCategory} › ${selectedLine}`
    : selectedCategory
      ? (SUPPLY_CATEGORY_LABELS as Record<string, string>)[selectedCategory] || selectedCategory
      : 'All';

  // Category + line tracking states
  const categoryAllTracked = categoryProducts.length > 0 && categoryProducts.every((p) => isTrackedAtLocation(p.id));
  const lineAllTracked = lineProducts.length > 0 && lineProducts.every((p) => isTrackedAtLocation(p.id));

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
    return allProducts.filter((p) => isTrackedAtLocation(p.id)).map((p) => p.id);
  }, [allProducts, isTrackedAtLocation]);

  /* ====== Navigation ====== */
  const goBack = () => {
    setSelectedBrand(null);
    setSelectedCategory(null);
    setSelectedLine(null);
    setProductSearch('');
    setPricingFilter('all');
  };

  /* ====== Render ====== */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <DashboardLoader size="lg" />
      </div>
    );
  }

  const hasProducts = allProducts.length > 0;

  // Compute swatch visibility for current category
  const showSwatch = !!selectedCategory && SHADE_SORTED_CATEGORIES.has(selectedCategory);

  return (
    <div className="space-y-4">
      <PageExplainer pageId="color-bar-products" />

      <InventoryReconciliationBanner locationId={effectiveLocationId} />

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
                    <CardTitle className={tokens.card.title}>Color Bar Product Catalog</CardTitle>
                    <CardDescription>
                      {effectiveLocationId
                        ? `Managing catalog for ${activeLocations.find(l => l.id === effectiveLocationId)?.name ?? 'selected location'}`
                        : 'Select a location to manage tracking, depletion methods, and pricing.'}
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
                <Badge variant="outline">{brandProductsAll.length} products</Badge>
              )}
               {selectedBrand && (
                 <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSyncScope('brand'); setSyncConfirmOpen(true); }}
                    disabled={syncFromLibraryMutation.isPending}
                    className="font-sans gap-1.5"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', syncFromLibraryMutation.isPending && 'animate-spin')} />
                    Sync from Zura Library
                  </Button>
                )}
               {selectedBrand && (
                 <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveBrandOpen(true)}
                    disabled={removeBrandMutation.isPending}
                    className="font-sans gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Brand
                  </Button>
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

              {/* Location toggle + Sync to All — right side */}
              {activeLocations.length > 1 && (
                <div className="flex items-center gap-2 ml-auto">
                  {trackedCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSyncIncludeLevels(true); setSyncToAllOpen(true); }}
                      disabled={syncCatalogMutation.isPending}
                      className="font-sans gap-1.5 rounded-full"
                    >
                      <Building2 className={cn('w-3.5 h-3.5', syncCatalogMutation.isPending && 'animate-spin')} />
                      Sync to All Locations
                    </Button>
                  )}
                  <Select value={effectiveLocationId} onValueChange={setSelectedLocationId}>
                    <SelectTrigger className="w-fit rounded-full gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      {activeLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ====== BRAND DETAIL (FINDER) ====== */}
          {selectedBrand ? (
            <div className="space-y-3">
              {/* Filter bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 max-w-sm relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${selectedBrand} products...`}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="font-sans pl-10"
                  />
                </div>
                <Select value={pricingFilter} onValueChange={(v) => setPricingFilter(v as 'all' | 'missing' | 'priced')}>
                  <SelectTrigger className="w-[160px] font-sans">
                    <SelectValue placeholder="All Pricing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pricing</SelectItem>
                    <SelectItem value="missing">Missing Price</SelectItem>
                    <SelectItem value="priced">Priced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Health legend */}
              {brandCategories.some((i) => i.health) && (
                <div className="flex items-center gap-4 px-1">
                  <span className="font-sans text-[10px] text-muted-foreground">Data health:</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-sans text-[10px] text-muted-foreground/60">Complete</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="font-sans text-[10px] text-muted-foreground/60">Some missing</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="font-sans text-[10px] text-muted-foreground/60">Most missing</span>
                  </div>
                </div>
              )}

              {/* Three-column browser */}
              <div className="rounded-xl border border-border/40 overflow-hidden flex min-h-[400px] max-h-[600px]">
                {/* Column 1: Categories */}
                <BrowseColumn
                  title="Categories"
                  items={brandCategories}
                  selectedKey={selectedCategory}
                  onSelect={(cat) => { setSelectedCategory(cat); setSelectedLine(null); }}
                  className="w-[180px] shrink-0"
                  searchThreshold={12}
                />

                {/* Column 2: Product Lines */}
                {selectedCategory ? (
                  <div className="flex flex-col w-[200px] shrink-0 border-r border-border/30 bg-card/30">
                    {/* Track All Category header */}
                    <div className="sticky top-0 z-10 px-3 pt-3 pb-2 bg-card/60 backdrop-blur-sm border-b border-border/20">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-[10px] tracking-wider text-muted-foreground uppercase">
                          Product Lines ({productLines.length})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-sans text-muted-foreground">Track All</span>
                          <Switch
                            checked={categoryAllTracked}
                            onCheckedChange={(v) => toggleCategoryTracking(v)}
                            className="scale-75"
                          />
                        </div>
                      </div>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-1.5 space-y-0.5">
                        {productLines.length === 0 ? (
                          <p className="px-3 py-4 font-sans text-xs text-muted-foreground text-center">No product lines</p>
                        ) : (
                          productLines.map((item) => {
                            const isActive = item.key === selectedLine;
                            return (
                              <button
                                key={item.key}
                                onClick={() => setSelectedLine(item.key)}
                                className={cn(
                                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                                  isActive
                                    ? 'bg-primary/20 border-l-2 border-primary text-foreground'
                                    : 'hover:bg-muted/50 text-muted-foreground border-l-2 border-transparent',
                                )}
                              >
                                {item.health && (
                                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                                    item.health === 'green' ? 'bg-emerald-500' : item.health === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                                  )} />
                                )}
                                <span className="flex-1 font-sans text-xs font-medium truncate">{item.label}</span>
                                <span className={cn('shrink-0 font-sans text-[10px] tabular-nums', isActive ? 'text-primary' : 'text-muted-foreground/60')}>
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
                  <div className="w-[200px] shrink-0 flex items-center justify-center border-r border-border/30">
                    <p className="font-sans text-xs text-muted-foreground">Select a category</p>
                  </div>
                )}

                {/* Column 3: Product Table */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                  {!selectedCategory ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Package className="w-8 h-8 mx-auto text-muted-foreground/40" />
                        <p className="font-sans text-sm text-muted-foreground">
                          Select a category to browse products
                        </p>
                      </div>
                    </div>
                  ) : !selectedLine ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="font-sans text-sm text-muted-foreground">
                        Select a product line
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Column 3 header */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-card/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-display text-[10px] tracking-wider text-muted-foreground uppercase truncate">
                            {scopeLabel}
                          </span>
                          <Badge variant="outline" className="text-[10px]">{displayProducts.length}</Badge>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-sans text-muted-foreground">Track All</span>
                          <Switch
                            checked={lineAllTracked}
                            onCheckedChange={(v) => toggleLineTracking(v)}
                            className="scale-75"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] font-sans ml-2"
                            onClick={() => setBulkPricingOpen(true)}
                          >
                            <DollarSign className="w-3 h-3 mr-0.5" />
                            Set Pricing
                          </Button>
                        </div>
                      </div>
                      {/* Product Table */}
                      <div className="flex-1 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8 font-sans text-xs">Track</TableHead>
                              {showSwatch && <TableHead className="w-[40px] font-sans text-xs" />}
                              <TableHead className="font-sans text-xs">Name</TableHead>
                              <TableHead className="font-sans text-xs">Wholesale</TableHead>
                              <TableHead className="font-sans text-xs hidden md:table-cell">Markup</TableHead>
                              <TableHead className="font-sans text-xs hidden md:table-cell">Retail</TableHead>
                              <TableHead className="font-sans text-xs hidden lg:table-cell">Sizes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayProducts.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={showSwatch ? 7 : 6} className="text-center py-8">
                                  <p className="font-sans text-xs text-muted-foreground">No products in this selection</p>
                                </TableCell>
                              </TableRow>
                            ) : (
                              displayProducts.map((p) => {
                                const ghost = p as any;
                                const effectiveCost = p.cost_price ?? ghost._ghostCost ?? null;
                                const effectiveMarkup = p.markup_pct ?? ghost._ghostMarkup ?? null;
                                const effectiveSwatch = p.swatch_color ?? ghost._ghostSwatch ?? null;
                                const isGhostCost = p.cost_price == null && ghost._ghostCost != null;
                                const isGhostMarkup = p.markup_pct == null && ghost._ghostMarkup != null;
                                const isGhostSwatch = p.swatch_color == null && ghost._ghostSwatch != null;
                                const retail = effectiveCost != null && effectiveMarkup != null && effectiveMarkup > 0
                                  ? effectiveCost * (1 + effectiveMarkup / 100)
                                  : null;
                                const isGhostRetail = isGhostCost || isGhostMarkup;
                                return (
                                  <TableRow key={p.id} className={cn(!isTrackedAtLocation(p.id) && 'opacity-50')}>
                                    <TableCell className="w-8 pr-0">
                                      <Switch
                                        checked={isTrackedAtLocation(p.id)}
                                        onCheckedChange={(checked) => {
                                          if (effectiveLocationId) {
                                            upsertSetting.mutate({ locationId: effectiveLocationId, productId: p.id, is_tracked: checked });
                                          }
                                        }}
                                        className="scale-[0.6]"
                                      />
                                    </TableCell>
                                    {showSwatch && (
                                      <TableCell className="w-[40px] pr-0">
                                        {effectiveSwatch ? (
                                          <div
                                            className="w-5 h-5 rounded-full border border-border/40"
                                            style={{ backgroundColor: effectiveSwatch }}
                                          />
                                        ) : (
                                          <div className="w-5 h-5 rounded-full border border-dashed border-border/40" />
                                        )}
                                      </TableCell>
                                    )}
                                    <TableCell className="font-sans text-sm font-medium text-foreground">
                                      {p.name.replace(/\s*[—–-]\s*\d+\.?\d*\s*(g|ml|oz|L|l)\s*$/i, '')}
                                    </TableCell>
                                    <TableCell className="font-sans text-xs">
                                      {isGhostCost ? (
                                        <span className="text-muted-foreground/50 italic" title="From library">
                                          ${effectiveCost?.toFixed(2)}
                                        </span>
                                      ) : (
                                        <InlineEditCell
                                          value={p.cost_price}
                                          prefix="$"
                                          placeholder="—"
                                          onSave={(v) => updateMutation.mutate({ id: p.id, updates: { cost_price: v } })}
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell font-sans text-xs">
                                      {isGhostMarkup ? (
                                        <span className="text-muted-foreground/50 italic" title="From library">
                                          {effectiveMarkup}%
                                        </span>
                                      ) : (
                                        <InlineEditCell
                                          value={p.markup_pct}
                                          suffix="%"
                                          placeholder="—"
                                          onSave={(v) => updateMutation.mutate({ id: p.id, updates: { markup_pct: v } })}
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell font-sans text-xs">
                                      {retail != null ? (
                                        <span className={cn('text-foreground', isGhostRetail && 'text-muted-foreground/50 italic')}>
                                          ${retail.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell font-sans text-xs text-muted-foreground">
                                      {p.container_size || '—'}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Stats bar */}
              <div className="flex items-center gap-4 px-1 font-sans text-xs text-muted-foreground">
                <span>{totalBrandProducts} total products</span>
                {selectedCategory && (
                  <>
                    <span className="text-border">·</span>
                    <span>{scopeProducts.length} in scope</span>
                    {missingPriceCount > 0 && (
                      <>
                        <span className="text-border">·</span>
                        <span className="text-amber-400">{missingPriceCount} missing price</span>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Next step */}
              {onNavigate && brandProductsAll.filter((p) => isTrackedAtLocation(p.id)).length > 0 && (
                <div className="flex justify-end pt-2 border-t">
                  <Button variant="ghost" size="sm" className="text-xs font-sans" onClick={() => onNavigate('services')}>
                    Next: Service Tracking <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
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
                  <div className="rounded-xl border-border/20 border bg-card-inner p-4">
                    <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">Tracked</span>
                    <span className="block text-2xl font-display tracking-tight text-foreground mt-1">{trackedCount}</span>
                  </div>
                  <div className="rounded-xl border-border/20 border bg-card-inner p-4">
                    <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">In Stock</span>
                    <span className="block text-2xl font-display tracking-tight text-foreground mt-1">{kpis.inStock}</span>
                  </div>
                  <div className="rounded-xl border-border/20 border bg-card-inner p-4">
                    <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">To Reorder</span>
                    <span className={cn('block text-2xl font-display tracking-tight text-foreground mt-1', kpis.toReorder > 0 && 'text-amber-400')}>{kpis.toReorder}</span>
                  </div>
                </div>
              )}

              {/* Search + Archived toggle */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={showArchived ? "Search archived brands..." : "Search brands..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="font-sans pl-10"
                  />
                </div>
                {archivedBrands.length > 0 && (
                  <Button
                    variant={showArchived ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => { setShowArchived(!showArchived); setSearch(''); setActiveLetter(null); }}
                    className="font-sans gap-1.5 shrink-0"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Archived
                    <Badge variant={showArchived ? 'secondary' : 'outline'} className="ml-0.5 text-[10px]">
                      {archivedBrands.length}
                    </Badge>
                  </Button>
                )}
              </div>

              {/* A-Z alphabet bar */}
              {!showArchived && <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
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
              </div>}

              {/* Brand cards or Archived view */}
              {showArchived ? (
                /* ====== ARCHIVED BRANDS VIEW ====== */
                archivedBrands.length === 0 ? (
                  <div className={tokens.empty.container}>
                    <Archive className={tokens.empty.icon} />
                    <h3 className={tokens.empty.heading}>No archived brands</h3>
                    <p className={tokens.empty.description}>Brands you remove will appear here for restoration.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {archivedBrands
                      .filter((ab) => !search.trim() || ab.brand.toLowerCase().includes(search.toLowerCase()))
                      .map((ab) => {
                        const meta = brandMetaMap.get(ab.brand.toLowerCase());
                        return (
                          <div
                            key={ab.brand}
                            className={cn(
                              'group relative flex flex-col items-center justify-center gap-2 rounded-xl border pt-9 pb-8 px-4 text-center min-h-[160px]',
                              'border-border/30 bg-muted/20 opacity-75',
                            )}
                          >
                            {/* Grace period badge */}
                            {ab.withinGracePeriod && ab.deactivatedAt && (
                              <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] gap-1 bg-amber-500/15 text-amber-400 border-amber-500/20">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(ab.deactivatedAt), { addSuffix: false })} left
                              </Badge>
                            )}
                            {!ab.withinGracePeriod && (
                              <Badge variant="outline" className="absolute top-2 left-2 text-[10px] text-muted-foreground">
                                Archived
                              </Badge>
                            )}

                            {/* Product count */}
                            <Badge variant="outline" className="absolute top-2 right-2 text-[10px]">
                              {ab.count} products
                            </Badge>

                            {/* Logo + Name */}
                            {meta?.logo_url && (
                              <img
                                src={meta.logo_url}
                                alt={ab.brand}
                                className="w-12 h-12 rounded-lg object-contain bg-white/10 p-0.5 grayscale"
                              />
                            )}
                            <span className="text-sm font-display tracking-wide text-muted-foreground text-center">{ab.brand}</span>

                            {/* Restore button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRestoreBrandOpen(ab.brand)}
                              disabled={restoreBrandMutation.isPending}
                              className="font-sans gap-1.5 mt-1"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                              Restore
                            </Button>

                            {/* Time since removal */}
                            {ab.deactivatedAt && (
                              <span className="text-[10px] font-sans text-muted-foreground/60">
                                Removed {formatDistanceToNow(new Date(ab.deactivatedAt), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        );
                      })}
                </div>
                )
              ) : !hasProducts ? (
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
                <>
                <p className="text-sm font-sans text-muted-foreground mb-3 text-center">
                  Brands Carried In {activeLocations.find(l => l.id === effectiveLocationId)?.name ?? 'Your Location'}'s Color Bar
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredBrands.map((brandName) => {
                    const brandProds = brandGroups.get(brandName) || [];
                    const tracked = brandProds.filter((p) => isTrackedAtLocation(p.id)).length;
                    const meta = brandMetaMap.get(brandName.toLowerCase());
                    const missingPrice = brandProds.filter((p) => p.cost_price == null).length;
                    const isComplete = missingPrice === 0;

                    return (
                      <button
                        key={brandName}
                        type="button"
                        onClick={() => {
                          setSelectedBrand(brandName);
                          setSelectedCategory(null);
                          setSelectedLine(null);
                          setSearch('');
                          setProductSearch('');
                          setPricingFilter('all');
                        }}
                        className={cn(
                          'group relative flex flex-col items-center justify-center gap-2 rounded-xl border pt-9 pb-8 px-4 text-center transition-all duration-200 min-h-[160px]',
                          'border-border/50 bg-muted/40',
                          'hover:border-border/60 hover:bg-card-inner hover:scale-[1.02] hover:shadow-sm',
                        )}
                      >
                        {!isComplete && (
                          <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                            Missing Data
                          </Badge>
                        )}
                        <Badge variant="outline" className="absolute top-2 right-2 text-[10px]">
                          {tracked} of {brandProds.length} products
                        </Badge>
                        {meta?.logo_url && (
                          <img
                            src={meta.logo_url}
                            alt={brandName}
                            className="w-12 h-12 rounded-lg object-contain bg-white/10 p-0.5"
                          />
                        )}
                        <span className="text-sm font-display tracking-wide text-foreground text-center">{brandName}</span>
                      </button>
                    );
                  })}
                </div>
                </>
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
        <ColorBarBulkPricingDialog
          open={bulkPricingOpen}
          onOpenChange={setBulkPricingOpen}
          orgId={orgId}
          productIds={
            selectedBrand
              ? displayProducts.map((p) => p.id)
              : catalogView === 'inventory'
                ? filteredInventory.map((r) => r.id)
                : bulkProductIds
          }
          scopeLabel={
            selectedBrand
              ? scopeLabel
              : filterCategory !== 'all' ? filterCategory : 'all tracked products'
          }
        />
      )}
      {orgId && (
        <ColorBarBulkReorderDialog
          open={bulkReorderOpen}
          onOpenChange={setBulkReorderOpen}
          orgId={orgId}
          reorderItems={reorderItems}
        />
      )}
      {/* Sync from Zura Library confirmation dialog */}
      <AlertDialog open={syncConfirmOpen} onOpenChange={setSyncConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync from Zura Library</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will update {syncScope === 'brand' && selectedBrand ? `all <strong class="text-foreground font-medium">${selectedBrand}</strong>` : 'all'} products missing pricing, markup, swatch, or size data with values from the Zura Library.
                </p>
                <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">What gets updated:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Wholesale cost price</li>
                    <li>Default markup percentage</li>
                    <li>Swatch color</li>
                    <li>Container size</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  Any overrides you've already made will be preserved.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (syncScope === 'brand' && selectedBrand) {
                  syncFromLibraryMutation.mutate(selectedBrand);
                } else {
                  syncAllBrandsMutation.mutate();
                }
              }}
            >
              Yes, sync now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sync catalog to all locations confirmation dialog */}
      <AlertDialog open={syncToAllOpen} onOpenChange={setSyncToAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={tokens.card.title}>Sync Catalog to All Locations</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will replicate the tracked product catalog from{' '}
                  <strong className="text-foreground font-medium">
                    {activeLocations.find(l => l.id === effectiveLocationId)?.name ?? 'this location'}
                  </strong>{' '}
                  to {activeLocations.length - 1} other location{activeLocations.length - 1 > 1 ? 's' : ''}.
                </p>
                <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">What will be synced:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><strong className="text-foreground">{trackedCount}</strong> tracked products</li>
                    <li>Tracking status (enabled)</li>
                    {syncIncludeLevels && <li>Par levels & reorder levels</li>}
                  </ul>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="sync-include-levels"
                    checked={syncIncludeLevels}
                    onCheckedChange={(checked) => setSyncIncludeLevels(!!checked)}
                  />
                  <label htmlFor="sync-include-levels" className="text-sm font-sans text-foreground cursor-pointer">
                    Include par levels & reorder levels
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Existing tracking settings at other locations will be overwritten. Untracked products at those locations will not be affected.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!effectiveLocationId) return;
                const targetIds = activeLocations
                  .filter(l => l.id !== effectiveLocationId)
                  .map(l => l.id);
                syncCatalogMutation.mutate({
                  sourceLocationId: effectiveLocationId,
                  targetLocationIds: targetIds,
                  includeLevels: syncIncludeLevels,
                });
              }}
            >
              Yes, sync to all locations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Brand confirmation dialog */}
      <AlertDialog open={removeBrandOpen} onOpenChange={setRemoveBrandOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={tokens.card.title}>Remove Brand from Catalog</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to remove{' '}
                  <strong className="text-foreground font-medium">{selectedBrand}</strong>{' '}
                  from your catalog entirely.
                </p>
                <div className="rounded-lg border bg-destructive/5 border-destructive/20 p-3 text-sm space-y-1.5">
                  <p className="font-medium text-foreground">This will:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    <li>Deactivate <strong className="text-foreground">{brandProductsAll.length}</strong> products</li>
                    <li>Remove tracking from <strong className="text-foreground">{activeLocations.length}</strong> location{activeLocations.length !== 1 ? 's' : ''}</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  Stock movement history will be preserved. You can restore this brand within <strong className="text-foreground">24 hours</strong> from the Archived view, or re-add later from the Supply Library.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedBrand) removeBrandMutation.mutate(selectedBrand);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Remove {selectedBrand}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Brand confirmation dialog */}
      <AlertDialog open={!!restoreBrandOpen} onOpenChange={(open) => { if (!open) setRestoreBrandOpen(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={tokens.card.title}>Restore Brand to Catalog</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Restore{' '}
                  <strong className="text-foreground font-medium">{restoreBrandOpen}</strong>{' '}
                  back to your active catalog.
                </p>
                <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1.5">
                  <p className="font-medium text-foreground">What will happen:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    <li>Products will be reactivated in your catalog</li>
                    <li>You'll need to <strong className="text-foreground">re-track products at each location</strong> manually</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  Location tracking settings were removed during deactivation and will not be automatically restored.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restoreBrandOpen) restoreBrandMutation.mutate(restoreBrandOpen);
              }}
            >
              <ArchiveRestore className="w-4 h-4 mr-1.5" />
              Restore {restoreBrandOpen}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  filteredInventory: ColorBarInventoryRow[];
  bulkProductIds: string[];
  reorderItems: ColorBarInventoryRow[];
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
            'rounded-xl border-border/20 border bg-card-inner p-4 text-left transition-all cursor-pointer',
            stockFilter === 'in_stock' ? 'border-primary/40 bg-primary/5' : 'hover:border-border/40 hover:shadow-sm'
          )}
        >
          <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">Current Stock</span>
          <span className="block text-2xl font-display tracking-tight text-foreground mt-1">{kpis.inStock}</span>
        </button>
        <button
          type="button"
          onClick={() => setStockFilter(stockFilter === 'reorder' ? 'all' : 'reorder')}
          className={cn(
            'rounded-xl border-border/20 border bg-card-inner p-4 text-left transition-all cursor-pointer',
            stockFilter === 'reorder' ? 'border-amber-500/40 bg-amber-500/5' : 'hover:border-border/40 hover:shadow-sm'
          )}
        >
          <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">To Reorder</span>
          <span className={cn('block text-2xl font-display tracking-tight text-foreground mt-1', kpis.toReorder > 0 && 'text-amber-400')}>{kpis.toReorder}</span>
        </button>
        <div className="rounded-xl border-border/20 border bg-card-inner p-4">
          <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">Total Tracked</span>
          <span className="block text-2xl font-display tracking-tight text-foreground mt-1">{kpis.totalTracked}</span>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search inventory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="font-sans pl-10"
        />
      </div>
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
          <Button variant="outline" size="sm" onClick={onOpenPricing} className="font-sans gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Set Pricing
          </Button>
        )}
        {reorderItems.length > 0 && orgId && (
          <Button variant="outline" size="sm" onClick={onOpenReorder} className="font-sans gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5" />
            Reorder All
            <Badge variant="secondary" className="ml-1">{reorderItems.length}</Badge>
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="hidden md:table-cell">Container</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="hidden md:table-cell">Min</TableHead>
              <TableHead className="hidden md:table-cell">Max</TableHead>
              <TableHead className="hidden lg:table-cell">Order Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Cost/g</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className={tokens.empty.container}>
                    <Package className={tokens.empty.icon} />
                    <h3 className={tokens.empty.heading}>No products found</h3>
                    <p className={tokens.empty.description}>Adjust filters or track products in brand view first.</p>
                  </div>
                </TableCell>
              </TableRow>
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
          </TableBody>
        </Table>
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
  row: ColorBarInventoryRow;
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
      queryClient.invalidateQueries({ queryKey: ['color-bar-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['color-bar-product-catalog'] });
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

  const inlineInputClass = "h-6 w-14 rounded border px-1.5 text-xs font-sans text-foreground bg-background focus:outline-none focus:border-primary/50";

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <span className="text-sm font-sans font-medium text-foreground truncate block">{row.name}</span>
          {row.brand && <span className="text-[11px] text-muted-foreground">{row.brand}</span>}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {row.category && <Badge variant="outline" className="capitalize">{row.category}</Badge>}
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
            className={inlineInputClass}
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
          <input type="number" value={minValue} onChange={(e) => setMinValue(e.target.value)} onBlur={handleMinSave} onKeyDown={(e) => e.key === 'Enter' && handleMinSave()} autoFocus className={inlineInputClass} />
        ) : (
          <button type="button" onClick={() => { setEditingMin(true); setMinValue(row.reorder_level?.toString() || ''); }} className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors cursor-pointer tabular-nums">
            {row.reorder_level ?? '—'}
          </button>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {editingMax ? (
          <input type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} onBlur={handleMaxSave} onKeyDown={(e) => e.key === 'Enter' && handleMaxSave()} autoFocus className={inlineInputClass} />
        ) : (
          <button type="button" onClick={() => { setEditingMax(true); setMaxValue(row.par_level?.toString() || ''); }} className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors cursor-pointer tabular-nums">
            {row.par_level ?? '—'}
          </button>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {row.order_qty > 0 ? (
          <span className="text-xs font-sans font-medium text-amber-400 tabular-nums">{row.order_qty}</span>
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
