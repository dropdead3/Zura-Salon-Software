import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { BulkCatalogImport } from './BulkCatalogImport';
import { tokens } from '@/lib/design-tokens';
import { BrowseColumn, type BrowseColumnItem } from './BrowseColumn';
import { SupplyBulkPricingDialog } from './SupplyBulkPricingDialog';
import { cn } from '@/lib/utils';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { Select, SelectValue, PlatformSelectContent as SelectContent, PlatformSelectItem as SelectItem, PlatformSelectTrigger as SelectTrigger } from '@/components/platform/ui/PlatformSelect';
import { PlatformTable as Table, PlatformTableHeader as TableHeader, PlatformTableBody as TableBody, PlatformTableHead as TableHead, PlatformTableRow as TableRow, PlatformTableCell as TableCell } from '@/components/platform/ui/PlatformTable';
import { Dialog, PlatformDialogContent as DialogContent, DialogHeader, PlatformDialogTitle as DialogTitle, DialogFooter, PlatformDialogDescription as DialogDescription, AlertDialog, PlatformAlertDialogContent, PlatformAlertDialogTitle, PlatformAlertDialogDescription, PlatformAlertDialogCancel, AlertDialogAction, AlertDialogFooter, AlertDialogHeader } from '@/components/platform/ui/PlatformDialog';
import { PlatformLabel as Label } from '@/components/platform/ui/PlatformLabel';
import { PlatformInput as Input } from '@/components/platform/ui/PlatformInput';
import { Loader2, Search, Package, Plus, Database, Pencil, Trash2, AlertTriangle, Upload, Download, ChevronLeft, ChevronRight, ChevronDown, DollarSign, CheckCircle2, X, MessageSquare, ChevronsUpDown, Clock, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSupplyLibraryProducts,
  useSupplyLibraryBrands,
  useSupplyLibraryInitStatus,
  useSeedSupplyLibrary,
  useSyncSupplyLibrary,
  useSupplyLibraryBrandSummaries,
  type SupplyLibraryProduct,
} from '@/hooks/platform/useSupplyLibrary';
import { SUPPLY_CATEGORY_LABELS } from '@/data/professional-supply-library';
import { CSVImportDialog } from './CSVImportDialog';
import { AddBrandWizard } from './AddBrandWizard';
import { useSupplyBrandsMeta, type SupplyBrandMeta } from '@/hooks/platform/useSupplyLibraryBrandMeta';
import { EditBrandDialog } from './EditBrandDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency } from '@/lib/format';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatRelativeTime } from '@/lib/format';
import { useSupplyLibraryRequests, useResolveSupplyRequest } from '@/hooks/platform/useSupplyLibraryRequests';
import { groupByProductLine, extractProductLine } from '@/lib/supply-line-parser';
import { useBackroomOrgId } from '@/hooks/backroom/useBackroomOrgId';
import { sortByShadeLevel, SHADE_SORTED_CATEGORIES } from '@/lib/shadeSort';
import { SwatchPicker } from './SwatchPicker';
import { suggestSwatchColor } from '@/lib/swatchSuggest';

const CATEGORIES = ['color', 'lightener', 'developer', 'toner', 'bond builder', 'treatment', 'additive'];
const DEPLETION_METHODS = ['weighed', 'per_service', 'manual', 'per_pump'];
const UNITS = ['g', 'ml', 'oz'];

interface BrandCardData {
  brand: string;
  productCount: number;
  categorySummary: { category: string; count: number }[];
  isComplete: boolean;
}

export function SupplyLibraryTab() {
  const queryClient = useQueryClient();
  const orgId = useBackroomOrgId() ?? '_';
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [brandSearch, setBrandSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'missing' | 'priced'>('all');
  const [recencyFilter, setRecencyFilter] = useState<'all' | 'recent'>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<SupplyLibraryProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplyLibraryProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [addBrandOpen, setAddBrandOpen] = useState(false);
  const [inlineEditing, setInlineEditing] = useState<{ id: string; field: string; value: string } | null>(null);
  // localStorage-backed collapse state (kept for backward compat)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedSubLines, setCollapsedSubLines] = useState<Set<string>>(new Set());
  const [editBrandOpen, setEditBrandOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [reanalyzeConfirm, setReanalyzeConfirm] = useState<{ category: string; updates: { id: string; hex: string }[] } | null>(null);
  const [reanalyzingCategory, setReanalyzingCategory] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProductLine, setSelectedProductLine] = useState<string | null>(null);
  const [focusedColumn, setFocusedColumn] = useState<0 | 1 | 2>(0);
  const [bulkPricingOpen, setBulkPricingOpen] = useState(false);
  const [bulkPricingProductIds, setBulkPricingProductIds] = useState<string[]>([]);
  const [bulkPricingScopeLabel, setBulkPricingScopeLabel] = useState('');

  // Count how many brands have saved collapse state
  const savedBrandCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('supply-library-categories::')) count++;
    }
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsedCategories, resetConfirmOpen]);

  // Helper to build org+brand scoped localStorage key
  const collapseKey = useCallback((type: 'categories' | 'sublines', brand: string) =>
    `supply-library-${type}::${orgId}::${brand}`, [orgId]);

  // One-time migration: remove legacy global keys
  useEffect(() => {
    if (localStorage.getItem('supply-library-migrated')) return;
    localStorage.removeItem('supply-library-categories');
    localStorage.removeItem('supply-library-sublines');
    localStorage.setItem('supply-library-migrated', '1');
  }, []);

  // Prune localStorage collapse keys if they exceed budget
  const pruneCollapseKeys = useCallback((maxKeys: number) => {
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('supply-library-categories::') || k.startsWith('supply-library-sublines::'))) {
        allKeys.push(k);
      }
    }
    if (allKeys.length <= maxKeys) return;
    const currentSuffix = `${orgId}::${selectedBrand}`;
    allKeys
      .filter((k) => !k.endsWith(currentSuffix))
      .forEach((k) => localStorage.removeItem(k));
  }, [orgId, selectedBrand]);

  // Persist collapse state to org+brand-scoped localStorage keys
  useEffect(() => {
    if (!selectedBrand) return;
    pruneCollapseKeys(500);
    localStorage.setItem(collapseKey('categories', selectedBrand), JSON.stringify([...collapsedCategories]));
  }, [collapsedCategories, selectedBrand, collapseKey, pruneCollapseKeys]);
  useEffect(() => {
    if (!selectedBrand) return;
    pruneCollapseKeys(500);
    localStorage.setItem(collapseKey('sublines', selectedBrand), JSON.stringify([...collapsedSubLines]));
  }, [collapsedSubLines, selectedBrand, collapseKey, pruneCollapseKeys]);

  const { data: initStatus, isLoading: initLoading } = useSupplyLibraryInitStatus();
  const seedMutation = useSeedSupplyLibrary();
  const syncMutation = useSyncSupplyLibrary();

  // Fetch brand summaries (aggregated server-side, no 1000-row limit)
  const { data: brandSummaryRows = [], isLoading: allLoading } = useSupplyLibraryBrandSummaries();
  // Fetch brand-specific products when drilled in
  const { data: brandProducts = [], isLoading: brandLoading } = useSupplyLibraryProducts({
    brand: selectedBrand || undefined,
    search: productSearch || undefined,
  });
  const { data: brands = [] } = useSupplyLibraryBrands();
  const { data: brandsMeta = [] } = useSupplyBrandsMeta();
  const { data: supplyRequests = [] } = useSupplyLibraryRequests();
  const resolveRequest = useResolveSupplyRequest();

  // Build a logo lookup from brand metadata
  const brandLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    brandsMeta.forEach((b) => { if (b.logo_url) map.set(b.name, b.logo_url); });
    return map;
  }, [brandsMeta]);

  // Build brand card data from server-side summaries
  const brandCards = useMemo<BrandCardData[]>(() => {
    const map = new Map<string, { count: number; missingPrice: number; missingSwatch: number; cats: Map<string, number> }>();
    brandSummaryRows.forEach((row) => {
      if (!map.has(row.brand)) map.set(row.brand, { count: 0, missingPrice: 0, missingSwatch: 0, cats: new Map() });
      const entry = map.get(row.brand)!;
      entry.count += row.cnt;
      entry.missingPrice += row.missing_price;
      entry.missingSwatch += row.missing_swatch;
      entry.cats.set(row.category, (entry.cats.get(row.category) || 0) + row.cnt);
    });
    const cards: BrandCardData[] = [];
    map.forEach((val, brand) => {
      cards.push({
        brand,
        productCount: val.count,
        isComplete: val.missingPrice === 0 && val.missingSwatch === 0,
        categorySummary: Array.from(val.cats.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count),
      });
    });
    return cards.sort((a, b) => a.brand.localeCompare(b.brand));
  }, [brandSummaryRows]);

  // Filter brand cards by search + active letter
  const filteredBrands = useMemo(() => {
    let result = brandCards;
    if (brandSearch.trim()) {
      const q = brandSearch.toLowerCase();
      result = result.filter((b) => b.brand.toLowerCase().includes(q));
    }
    if (activeLetter) {
      result = result.filter((b) => b.brand[0]?.toUpperCase() === activeLetter);
    }
    return result;
  }, [brandCards, brandSearch, activeLetter]);

  // Available first letters from all brand cards (unfiltered by letter)
  const availableLetters = useMemo(() => {
    const searchFiltered = brandSearch.trim()
      ? brandCards.filter((b) => b.brand.toLowerCase().includes(brandSearch.toLowerCase()))
      : brandCards;
    return new Set(searchFiltered.map((b) => b.brand[0]?.toUpperCase()).filter(Boolean));
  }, [brandCards, brandSearch]);

  // Group brand products by category for detail view
  const categoryGroups = useMemo(() => {
    let filtered = categoryFilter === 'all' ? brandProducts : brandProducts.filter((p) => p.category === categoryFilter);
    if (pricingFilter === 'missing') filtered = filtered.filter((p) => p.wholesale_price == null);
    else if (pricingFilter === 'priced') filtered = filtered.filter((p) => p.wholesale_price != null);
    if (recencyFilter === 'recent') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      filtered = filtered.filter((p) => p.created_at >= sevenDaysAgo);
    }
    const groups = new Map<string, SupplyLibraryProduct[]>();
    filtered.forEach((p) => {
      if (!groups.has(p.category)) groups.set(p.category, []);
      groups.get(p.category)!.push(p);
    });
    // Sort categories by CATEGORIES order, then alphabetically for unknown
    return Array.from(groups.entries()).sort((a, b) => {
      const ai = CATEGORIES.indexOf(a[0]);
      const bi = CATEGORIES.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [brandProducts, categoryFilter, pricingFilter, recencyFilter]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const toggleSubLine = (key: string) => {
    setCollapsedSubLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  /** Renders a product table with given rows */
  const handleSwatchSave = async (productId: string, hex: string | null) => {
    try {
      const { error } = await supabase
        .from('supply_library_products')
        .update({ swatch_color: hex } as any)
        .eq('id', productId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
    } catch (err: any) {
      toast.error('Swatch update failed: ' + err.message);
    }
  };

  const renderProductTable = (products: SupplyLibraryProduct[], category?: string) => {
    const sorted = category && SHADE_SORTED_CATEGORIES.has(category)
      ? sortByShadeLevel(products)
      : products;
    const showSwatch = !!category && SHADE_SORTED_CATEGORIES.has(category);
    return (
      <div className="rounded-lg border border-[hsl(var(--platform-border)/0.4)]">
        <Table>
          <TableHeader>
            <TableRow className="border-[hsl(var(--platform-border)/0.3)]">
              {showSwatch && <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] w-[40px]" />}
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Name</TableHead>
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Category</TableHead>
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Depletion</TableHead>
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Unit</TableHead>
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Wholesale</TableHead>
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Markup</TableHead>
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Retail</TableHead>
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Sizes</TableHead>
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => renderProductRow(p, showSwatch))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // ─── Handlers (unchanged) ──────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('supply_library_products')
        .update({ is_active: false })
        .eq('id', deleteTarget.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-brands'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-init-status'] });
      toast.success(`Removed "${deleteTarget.name}"`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error('Failed to remove: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInlineSave = async () => {
    if (!inlineEditing) return;
    try {
      const { error } = await supabase
        .from('supply_library_products')
        .update({ [inlineEditing.field]: inlineEditing.value })
        .eq('id', inlineEditing.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
      toast.success('Updated');
    } catch (err: any) {
      toast.error('Update failed: ' + err.message);
    }
    setInlineEditing(null);
  };

  const handleExportCSV = () => {
    const products = brandProducts;
    const headers = ['brand', 'name', 'category', 'default_depletion', 'default_unit', 'size_options'];
    const rows = products.map((p) => [
      p.brand, p.name, p.category, p.default_depletion, p.default_unit,
      (p.size_options || []).join(';'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supply-library-${selectedBrand || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${products.length} products`);
  };

  // ─── Init screen ───────────────────────────────
  if (!initLoading && initStatus && !initStatus.isInitialized) {
    return (
      <PlatformCard variant="glass">
        <PlatformCardContent className="p-12 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Database className="w-7 h-7 text-violet-400" />
          </div>
          <h3 className="font-display text-lg tracking-wide text-[hsl(var(--platform-foreground))]">Initialize Supply Library</h3>
          <p className="text-slate-400 font-sans text-sm max-w-md mx-auto">
            The supply library database is empty. Import the built-in library of 2,000+ professional products to get started.
          </p>
          <PlatformButton onClick={() => seedMutation.mutate()} loading={seedMutation.isPending}>
            <Database className="w-4 h-4" /> Import Built-in Library
          </PlatformButton>
        </PlatformCardContent>
      </PlatformCard>
    );
  }

  // ─── Inline price save ───
  const handleInlinePriceSave = async (productId: string) => {
    if (!inlineEditing || inlineEditing.field !== 'wholesale_price') return;
    const numVal = parseFloat(inlineEditing.value);
    if (isNaN(numVal) || numVal < 0) {
      toast.error('Invalid price');
      setInlineEditing(null);
      return;
    }
    try {
      const { error } = await supabase
        .from('supply_library_products')
        .update({ wholesale_price: numVal, price_updated_at: new Date().toISOString() } as any)
        .eq('id', productId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
      toast.success('Price updated');
    } catch (err: any) {
      toast.error('Price update failed: ' + err.message);
    }
    setInlineEditing(null);
  };

  // ─── Product row renderer (shared between views) ───
  const renderProductRow = (p: SupplyLibraryProduct, showSwatch = false) => (
    <TableRow key={p.id} className="border-[hsl(var(--platform-border)/0.3)]">
      {showSwatch && (
        <TableCell className="w-[40px] pr-0">
          <SwatchPicker
            value={(p as any).swatch_color ?? null}
            suggestedValue={!(p as any).swatch_color ? suggestSwatchColor(p.name) : undefined}
            onChange={(hex) => handleSwatchSave(p.id, hex)}
          />
        </TableCell>
      )}
      <TableCell className="font-sans text-sm font-medium text-[hsl(var(--platform-foreground))]">{p.name}</TableCell>
      <TableCell>
        {inlineEditing?.id === p.id && inlineEditing.field === 'category' ? (
          <Select
            value={inlineEditing.value}
            onValueChange={(v) => {
              supabase.from('supply_library_products').update({ category: v }).eq('id', p.id).then(() => {
                queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
              });
              setInlineEditing(null);
            }}
          >
            <SelectTrigger className="h-7 w-28 font-sans text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{SUPPLY_CATEGORY_LABELS[c] || c}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <PlatformBadge
            variant="default"
            size="sm"
            className="cursor-pointer"
            onDoubleClick={() => setInlineEditing({ id: p.id, field: 'category', value: p.category })}
          >
            {SUPPLY_CATEGORY_LABELS[p.category] || p.category}
          </PlatformBadge>
        )}
      </TableCell>
      <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
        {inlineEditing?.id === p.id && inlineEditing.field === 'default_depletion' ? (
          <Select
            value={inlineEditing.value}
            onValueChange={(v) => {
              supabase.from('supply_library_products').update({ default_depletion: v }).eq('id', p.id).then(() => {
                queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
              });
              setInlineEditing(null);
            }}
          >
            <SelectTrigger className="h-7 w-24 font-sans text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEPLETION_METHODS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <span
            className="cursor-pointer hover:text-violet-400 transition-colors"
            onDoubleClick={() => setInlineEditing({ id: p.id, field: 'default_depletion', value: p.default_depletion })}
          >
            {p.default_depletion}
          </span>
        )}
      </TableCell>
      <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
        {inlineEditing?.id === p.id && inlineEditing.field === 'default_unit' ? (
          <Select
            value={inlineEditing.value}
            onValueChange={(v) => {
              supabase.from('supply_library_products').update({ default_unit: v }).eq('id', p.id).then(() => {
                queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
              });
              setInlineEditing(null);
            }}
          >
            <SelectTrigger className="h-7 w-16 font-sans text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <span
            className="cursor-pointer hover:text-violet-400 transition-colors"
            onDoubleClick={() => setInlineEditing({ id: p.id, field: 'default_unit', value: p.default_unit })}
          >
            {p.default_unit}
          </span>
        )}
      </TableCell>
      {/* Wholesale Price column */}
      <TableCell className="font-sans text-xs">
        {inlineEditing?.id === p.id && inlineEditing.field === 'wholesale_price' ? (
          <input
            type="number"
            step="0.01"
            min="0"
            autoFocus
            className="h-7 w-20 rounded-md border border-[hsl(var(--platform-border))] bg-transparent px-2 font-sans text-xs text-[hsl(var(--platform-foreground))] focus:outline-none focus:border-violet-500"
            value={inlineEditing.value}
            onChange={(e) => setInlineEditing({ ...inlineEditing, value: e.target.value })}
            onBlur={() => handleInlinePriceSave(p.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleInlinePriceSave(p.id); if (e.key === 'Escape') setInlineEditing(null); }}
          />
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'cursor-pointer transition-colors',
                    p.wholesale_price != null
                      ? 'text-[hsl(var(--platform-foreground))] hover:text-violet-400'
                      : 'text-[hsl(var(--platform-foreground-muted))] hover:text-violet-400'
                  )}
                  onDoubleClick={() => setInlineEditing({
                    id: p.id,
                    field: 'wholesale_price',
                    value: p.wholesale_price != null ? String(p.wholesale_price) : '',
                  })}
                >
                  {p.wholesale_price != null ? formatCurrency(p.wholesale_price, { currency: p.currency || 'USD' }) : '—'}
                </span>
              </TooltipTrigger>
              {p.price_updated_at && (
                <TooltipContent>
                  <span className="font-sans text-xs">Updated {formatRelativeTime(p.price_updated_at)}</span>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
      {/* Markup % column */}
      <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
        {p.default_markup_pct != null && p.default_markup_pct > 0
          ? `${p.default_markup_pct}%`
          : '—'}
      </TableCell>
      {/* Computed Retail column */}
      <TableCell className="font-sans text-xs">
        {p.wholesale_price != null && p.default_markup_pct != null && p.default_markup_pct > 0 ? (
          <span className="text-[hsl(var(--platform-foreground))]">
            {formatCurrency(p.wholesale_price * (1 + p.default_markup_pct / 100), { currency: p.currency || 'USD' })}
          </span>
        ) : (
          <span className="text-[hsl(var(--platform-foreground-muted))]">—</span>
        )}
      </TableCell>
      <TableCell className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
        {p.size_options?.join(', ') || '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <PlatformButton variant="ghost" size="icon-sm" onClick={() => { setEditProduct(p); setAddOpen(true); }}>
            <Pencil className="w-3.5 h-3.5" />
          </PlatformButton>
          <PlatformButton
            variant="ghost"
            size="icon-sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => setDeleteTarget(p)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </PlatformButton>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-4">
      {/* ─── User Requests Panel ─── */}
      {supplyRequests.length > 0 && (
        <Collapsible defaultOpen>
          <PlatformCard variant="glass">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="font-display text-sm tracking-wide text-[hsl(var(--platform-foreground))]">
                    User Requests
                  </span>
                  <PlatformBadge variant="warning" size="sm">
                    {supplyRequests.length}
                  </PlatformBadge>
                </div>
                <ChevronDown className="w-4 h-4 text-[hsl(var(--platform-foreground-muted))] transition-transform [[data-state=open]_&]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-4 space-y-2">
                {supplyRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-start justify-between gap-4 rounded-lg border border-[hsl(var(--platform-border)/0.4)] bg-[hsl(var(--platform-bg-hover)/0.3)] p-3"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-sans text-sm font-medium text-[hsl(var(--platform-foreground))] truncate">
                        {req.title}
                      </p>
                      {req.description && (
                        <p className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] line-clamp-2">
                          {req.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-[hsl(var(--platform-foreground-muted))]">
                        {req.submitter_name && <span className="font-sans">{req.submitter_name}</span>}
                        {req.org_name && (
                          <>
                            <span>·</span>
                            <span className="font-sans">{req.org_name}</span>
                          </>
                        )}
                        <span>·</span>
                        <span className="font-sans">{formatRelativeTime(req.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <PlatformButton
                              variant="ghost"
                              size="icon-sm"
                              className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              disabled={resolveRequest.isPending}
                              onClick={() => resolveRequest.mutate({ id: req.id, status: 'completed' })}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </PlatformButton>
                          </TooltipTrigger>
                          <TooltipContent><span className="font-sans text-xs">Mark Complete</span></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <PlatformButton
                              variant="ghost"
                              size="icon-sm"
                              className="text-[hsl(var(--platform-foreground-muted))] hover:text-red-400 hover:bg-red-500/10"
                              disabled={resolveRequest.isPending}
                              onClick={() => resolveRequest.mutate({ id: req.id, status: 'dismissed' })}
                            >
                              <X className="w-4 h-4" />
                            </PlatformButton>
                          </TooltipTrigger>
                          <TooltipContent><span className="font-sans text-xs">Dismiss</span></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </PlatformCard>
        </Collapsible>
      )}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {selectedBrand ? (
                <PlatformButton
                  variant="ghost"
                  size="icon-sm"
                   onClick={() => { setSelectedBrand(null); setProductSearch(''); setCategoryFilter('all'); setPricingFilter('all'); setCollapsedCategories(new Set()); setCollapsedSubLines(new Set()); setSelectedCategory(null); setSelectedProductLine(null); setFocusedColumn(0); }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </PlatformButton>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
                  <Package className="w-5 h-5 text-violet-400" />
                </div>
              )}
              <div>
                {selectedBrand ? (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedBrand(null); setProductSearch(''); setCategoryFilter('all'); setPricingFilter('all'); setCollapsedCategories(new Set()); setCollapsedSubLines(new Set()); setSelectedCategory(null); setSelectedProductLine(null); setFocusedColumn(0); }}
                        className="font-sans text-sm text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] transition-colors"
                      >
                        Supply Library
                      </button>
                      <span className="text-[hsl(var(--platform-foreground-muted))]">/</span>
                      <PlatformCardTitle>{selectedBrand}</PlatformCardTitle>
                      <button
                        onClick={() => setEditBrandOpen(true)}
                        className="ml-1 p-1 rounded-md text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-bg-hover))] transition-colors"
                        title="Edit brand"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  
                  </>
                ) : (
                  <>
                    <PlatformCardTitle>Supply Library</PlatformCardTitle>
                    <PlatformCardDescription>
                      {initStatus?.count ?? 0} products across {brands.length} brands
                    </PlatformCardDescription>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedBrand && (
                <span className="font-sans text-sm text-[hsl(var(--platform-foreground-muted))]">
                  {brandProducts.length} products
                </span>
              )}
              {initStatus?.isInitialized && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PlatformButton variant="outline" size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                      <RefreshCw className={cn('w-3.5 h-3.5 mr-1', syncMutation.isPending && 'animate-spin')} /> Sync Library
                    </PlatformButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Fetches the latest product data from Phorest and updates your library.</TooltipContent>
                </Tooltip>
              )}
              <PlatformButton variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-3.5 h-3.5 mr-1" /> Export
              </PlatformButton>
              <PlatformButton variant="outline" size="sm" onClick={() => setCsvOpen(true)}>
                <Upload className="w-3.5 h-3.5 mr-1" /> Import CSV
              </PlatformButton>
              <PlatformButton size="sm" onClick={() => { setEditProduct(null); setAddOpen(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
              </PlatformButton>
              {!selectedBrand && (
                <>
                  <PlatformButton size="sm" variant="outline" onClick={() => setAddBrandOpen(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Brand
                  </PlatformButton>
                  <PlatformButton size="sm" variant="outline" onClick={() => setBulkImportOpen(true)}>
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Build Full Catalog
                  </PlatformButton>
                </>
              )}
            </div>
          </div>
        </PlatformCardHeader>

        <PlatformCardContent className="space-y-4">
          {/* ─── Level 1: Brand Card Grid ─── */}
          {!selectedBrand && (
            <>
              <div className="max-w-sm">
                <PlatformInput
                  icon={<Search className="w-4 h-4" />}
                  placeholder="Search brands..."
                  value={brandSearch}
                  onChange={(e) => { setBrandSearch(e.target.value); setActiveLetter(null); }}
                />
              </div>

              {/* ─── A-Z Alphabet Selector ─── */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setActiveLetter(null)}
                  className={cn(
                    'h-8 px-2.5 rounded-lg font-sans text-xs transition-colors',
                    !activeLetter
                      ? 'bg-violet-600 text-white'
                      : 'text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-bg-hover))] hover:text-[hsl(var(--platform-foreground))]'
                  )}
                >
                  All
                </button>
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => {
                  const hasBrands = availableLetters.has(letter);
                  const isActive = activeLetter === letter;
                  return (
                    <button
                      key={letter}
                      onClick={() => hasBrands && setActiveLetter(isActive ? null : letter)}
                      className={cn(
                        'h-8 w-8 rounded-lg font-sans text-xs transition-colors',
                        isActive
                          ? 'bg-violet-600 text-white'
                          : hasBrands
                            ? 'text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-bg-hover))]'
                            : 'text-[hsl(var(--platform-foreground-muted))] opacity-40 cursor-default'
                      )}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>

              {allLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className={tokens.loading.spinner} />
                </div>
              ) : filteredBrands.length === 0 ? (
                <div className={tokens.empty.container}>
                  <Package className={tokens.empty.icon} />
                  <h3 className={tokens.empty.heading}>No brands found</h3>
                  <p className={tokens.empty.description}>Try adjusting your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredBrands.map((b) => (
                    <PlatformCard
                      key={b.brand}
                      variant="interactive"
                      size="md"
                      className="cursor-pointer pt-9 pb-8 px-4 flex flex-col items-center text-center relative min-h-[160px]"
                      onClick={() => { setSelectedBrand(b.brand); setProductSearch(''); setCategoryFilter('all'); try { const cats = localStorage.getItem(collapseKey('categories', b.brand)); setCollapsedCategories(cats ? new Set(JSON.parse(cats)) : new Set()); const subs = localStorage.getItem(collapseKey('sublines', b.brand)); setCollapsedSubLines(subs ? new Set(JSON.parse(subs)) : new Set()); } catch { setCollapsedCategories(new Set()); setCollapsedSubLines(new Set()); } }}
                    >
                      {/* Top-left: product count */}
                      <PlatformBadge variant="primary" size="sm" className="absolute top-2 left-2">
                        {b.productCount} products
                      </PlatformBadge>

                      {/* Top-right: missing data */}
                      {!b.isComplete && (
                        <PlatformBadge variant="warning" size="sm" className="absolute top-2 right-2">
                          Missing Data
                        </PlatformBadge>
                      )}

                      {/* Center: logo + brand name */}
                      <div className="flex-1 flex flex-col items-center justify-center gap-2">
                        {brandLogoMap.has(b.brand) && (
                          <img src={brandLogoMap.get(b.brand)!} alt={b.brand} className="w-10 h-10 rounded-lg object-contain bg-white/5 p-0.5" />
                        )}
                        <span className="font-display text-sm tracking-wide text-[hsl(var(--platform-foreground))]">
                          {b.brand}
                        </span>
                      </div>

                      {/* Bottom center: category summary */}
                      <p className="absolute bottom-2 left-0 right-0 text-center font-sans text-[10px] text-[hsl(var(--platform-foreground-muted))] leading-tight px-2">
                        {b.categorySummary.slice(0, 3).map((cs) =>
                          `${cs.count} ${SUPPLY_CATEGORY_LABELS[cs.category] || cs.category}`
                        ).join(' · ')}
                        {b.categorySummary.length > 3 && ` +${b.categorySummary.length - 3}`}
                      </p>
                    </PlatformCard>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── Level 2: Brand Detail — Column Browser ─── */}
          {selectedBrand && (
            <>
              {/* Filter bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 max-w-sm">
                  <PlatformInput
                    icon={<Search className="w-4 h-4" />}
                    placeholder={`Search ${selectedBrand} products...`}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
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
                <PlatformButton
                  variant={recencyFilter === 'recent' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setRecencyFilter((prev) => prev === 'all' ? 'recent' : 'all')}
                  className={recencyFilter === 'recent' ? 'ring-1 ring-violet-500/50' : ''}
                >
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Recently Added
                </PlatformButton>
              </div>

              {brandLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className={tokens.loading.spinner} />
                </div>
              ) : categoryGroups.length === 0 ? (
                <div className={tokens.empty.container}>
                  <Package className={tokens.empty.icon} />
                  <h3 className={tokens.empty.heading}>No products found</h3>
                  <p className={tokens.empty.description}>Try adjusting your filters</p>
                </div>
              ) : (
                <ColumnBrowser
                  categoryGroups={categoryGroups}
                  selectedCategory={selectedCategory}
                  selectedProductLine={selectedProductLine}
                  focusedColumn={focusedColumn}
                  onSelectCategory={(cat) => {
                    setSelectedCategory(cat);
                    setSelectedProductLine(null);
                    setFocusedColumn(1);
                  }}
                  onSelectProductLine={(line) => {
                    setSelectedProductLine(line);
                    setFocusedColumn(2);
                  }}
                  onFocusColumn={setFocusedColumn}
                  onClearCategory={() => {
                    setSelectedCategory(null);
                    setSelectedProductLine(null);
                    setFocusedColumn(0);
                  }}
                  onClearProductLine={() => {
                    setSelectedProductLine(null);
                    setFocusedColumn(1);
                  }}
                  onSetPricing={(ids, label) => {
                    setBulkPricingProductIds(ids);
                    setBulkPricingScopeLabel(label);
                    setBulkPricingOpen(true);
                  }}
                  renderProductTable={renderProductTable}
                  reanalyzingCategory={reanalyzingCategory}
                  onAutoAssignSwatches={async (products, category) => {
                    const unassigned = products.filter((p) => !(p as any).swatch_color);
                    const updates = unassigned
                      .map((p) => ({ id: p.id, hex: suggestSwatchColor(p.name) }))
                      .filter((u) => u.hex !== null);
                    if (!updates.length) { toast.info('No suggestions available'); return; }
                    let saved = 0;
                    for (const u of updates) {
                      const { error } = await supabase
                        .from('supply_library_products')
                        .update({ swatch_color: u.hex } as any)
                        .eq('id', u.id);
                      if (!error) saved++;
                    }
                    queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
                    toast.success(`Auto-assigned ${saved} swatches`);
                  }}
                  onReanalyzeSwatches={(products, category) => {
                    const updates = products
                      .map((p) => ({ id: p.id, hex: suggestSwatchColor(p.name) }))
                      .filter((u): u is { id: string; hex: string } => u.hex !== null);
                    if (!updates.length) { toast.info('No suggestions available'); return; }
                    setReanalyzeConfirm({ category: SUPPLY_CATEGORY_LABELS[category] || category, updates });
                  }}
                />
              )}

              {/* Reanalyze confirmation dialog */}
              <AlertDialog open={!!reanalyzeConfirm} onOpenChange={(open) => { if (!open) setReanalyzeConfirm(null); }}>
                <PlatformAlertDialogContent>
                  <AlertDialogHeader>
                    <PlatformAlertDialogTitle>Re-analyze Swatches</PlatformAlertDialogTitle>
                    <PlatformAlertDialogDescription>
                      Re-analyze {reanalyzeConfirm?.updates.length ?? 0} swatches in {reanalyzeConfirm?.category}? This overwrites existing assignments.
                    </PlatformAlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <PlatformAlertDialogCancel>Cancel</PlatformAlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        if (!reanalyzeConfirm) return;
                        const categoryName = reanalyzeConfirm.category;
                        setReanalyzingCategory(categoryName);
                        setReanalyzeConfirm(null);
                        let saved = 0;
                        try {
                          for (const u of reanalyzeConfirm.updates) {
                            const { error } = await supabase
                              .from('supply_library_products')
                              .update({ swatch_color: u.hex } as any)
                              .eq('id', u.id);
                            if (!error) saved++;
                          }
                          queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
                          toast.success(`Re-analyzed ${saved} swatches`);
                        } finally {
                          setReanalyzingCategory(null);
                        }
                      }}
                    >
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </PlatformAlertDialogContent>
              </AlertDialog>
            </>
          )}
        </PlatformCardContent>
      </PlatformCard>

      {/* CSV Import Dialog */}
      <CSVImportDialog open={csvOpen} onOpenChange={setCsvOpen} />

      {/* Add Brand Wizard */}
      <AddBrandWizard open={addBrandOpen} onOpenChange={setAddBrandOpen} />

      {/* Bulk AI Catalog Import */}
      <BulkCatalogImport
        existingBrands={brandCards.map(b => b.brand)}
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
      />

      {/* Edit Brand Dialog */}
      {selectedBrand && (
        <EditBrandDialog
          open={editBrandOpen}
          onOpenChange={setEditBrandOpen}
          brandId={brandsMeta.find((b) => b.name === selectedBrand)?.id ?? null}
          brandName={selectedBrand}
          brandLogoUrl={brandLogoMap.get(selectedBrand) ?? null}
          onBrandRenamed={(newName) => setSelectedBrand(newName)}
        />
      )}

      {/* Add/Edit Dialog */}
      <AddEditDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        product={editProduct}
        brands={brands}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-sans text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" /> Remove Product
            </DialogTitle>
            <DialogDescription className="font-sans text-sm">
              This will soft-delete "{deleteTarget?.name}" from the supply library. Organizations that already added it will keep their copy.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <PlatformButton variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</PlatformButton>
            <PlatformButton variant="destructive" onClick={handleDelete} loading={isDeleting}>
              Remove
            </PlatformButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Pricing Dialog */}
      <SupplyBulkPricingDialog
        open={bulkPricingOpen}
        onOpenChange={setBulkPricingOpen}
        productIds={bulkPricingProductIds}
        scopeLabel={bulkPricingScopeLabel}
      />
    </div>
  );
}

// ─── Add / Edit Dialog ────────────────────────────────────────
function AddEditDialog({
  open,
  onOpenChange,
  product,
  brands,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: SupplyLibraryProduct | null;
  brands: string[];
}) {
  const queryClient = useQueryClient();
  const isEdit = !!product;
  const [saving, setSaving] = useState(false);
  const [brand, setBrand] = useState(product?.brand || '');
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || 'color');
  const [depletion, setDepletion] = useState(product?.default_depletion || 'weighed');
  const [unit, setUnit] = useState(product?.default_unit || 'g');
  const [sizes, setSizes] = useState(product?.size_options?.join(', ') || '');
  const [wholesalePrice, setWholesalePrice] = useState(product?.wholesale_price != null ? String(product.wholesale_price) : '');
  const [markupPct, setMarkupPct] = useState(product?.default_markup_pct != null ? String(product.default_markup_pct) : '');
  const [retailPrice, setRetailPrice] = useState(() => {
    const wp = product?.wholesale_price;
    const mp = product?.default_markup_pct;
    if (wp != null && mp != null) return String(Math.round(wp * (1 + mp / 100) * 100) / 100);
    return '';
  });
  const [lastEdited, setLastEdited] = useState<'markup' | 'retail' | null>(null);

  const handleWholesaleChange = (val: string) => {
    setWholesalePrice(val);
    const wp = parseFloat(val);
    if (!isNaN(wp) && wp > 0) {
      const mp = parseFloat(markupPct);
      if (!isNaN(mp)) setRetailPrice(String(Math.round(wp * (1 + mp / 100) * 100) / 100));
    }
  };

  const handleMarkupChange = (val: string) => {
    setMarkupPct(val);
    setLastEdited('markup');
    const wp = parseFloat(wholesalePrice);
    const mp = parseFloat(val);
    if (!isNaN(wp) && wp > 0 && !isNaN(mp)) {
      setRetailPrice(String(Math.round(wp * (1 + mp / 100) * 100) / 100));
    }
  };

  const handleRetailChange = (val: string) => {
    setRetailPrice(val);
    setLastEdited('retail');
    const wp = parseFloat(wholesalePrice);
    const rp = parseFloat(val);
    if (!isNaN(wp) && wp > 0 && !isNaN(rp) && rp >= 0) {
      setMarkupPct(String(Math.round(((rp / wp) - 1) * 10000) / 100));
    }
  };

  const resetForm = () => {
    setBrand(product?.brand || '');
    setName(product?.name || '');
    setCategory(product?.category || 'color');
    setDepletion(product?.default_depletion || 'weighed');
    setUnit(product?.default_unit || 'g');
    setSizes(product?.size_options?.join(', ') || '');
    setWholesalePrice(product?.wholesale_price != null ? String(product.wholesale_price) : '');
    setMarkupPct(product?.default_markup_pct != null ? String(product.default_markup_pct) : '');
    const wp = product?.wholesale_price;
    const mp = product?.default_markup_pct;
    setRetailPrice(wp != null && mp != null ? String(Math.round(wp * (1 + mp / 100) * 100) / 100) : '');
    setLastEdited(null);
  };

  const handleSave = async () => {
    if (!brand.trim() || !name.trim()) return;
    setSaving(true);
    try {
      const sizeArr = sizes.split(',').map((s) => s.trim()).filter(Boolean);
      const wpVal = wholesalePrice.trim() ? parseFloat(wholesalePrice) : null;
      const mpVal = markupPct.trim() ? parseFloat(markupPct) : null;
      const rrVal = wpVal != null && mpVal != null ? Math.round(wpVal * (1 + mpVal / 100) * 100) / 100 : null;
      const payload: any = {
        brand: brand.trim(),
        name: name.trim(),
        category,
        default_depletion: depletion,
        default_unit: unit,
        size_options: sizeArr,
        wholesale_price: wpVal,
        default_markup_pct: mpVal,
        recommended_retail: rrVal,
        ...(wpVal != null ? { price_updated_at: new Date().toISOString() } : {}),
      };

      if (isEdit && product) {
        const { error } = await supabase.from('supply_library_products').update(payload).eq('id', product.id);
        if (error) throw error;
        toast.success('Product updated');
      } else {
        // Check for duplicate before inserting (case-insensitive)
        const { data: dupes } = await supabase
          .from('supply_library_products')
          .select('id')
          .eq('is_active', true)
          .ilike('brand', payload.brand)
          .ilike('name', payload.name)
          .limit(1);

        if (dupes && dupes.length > 0) {
          toast.error('A product with this brand and name already exists');
          setSaving(false);
          return;
        }

        const { error } = await supabase.from('supply_library_products').insert({ ...payload, is_active: true });
        if (error) throw error;
        toast.success('Product added to supply library');
      }

      queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-brands'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-init-status'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sans text-base">
            {isEdit ? 'Edit Product' : 'Add Product'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-sans text-xs">Brand</Label>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Schwarzkopf" className="font-sans" list="brand-suggestions" />
            <datalist id="brand-suggestions">
              {brands.map((b) => <option key={b} value={b} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label className="font-sans text-xs">Product Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Igora Royal 6-0" className="font-sans" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="font-sans text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="font-sans text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{SUPPLY_CATEGORY_LABELS[c] || c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-sans text-xs">Depletion</Label>
              <Select value={depletion} onValueChange={setDepletion}>
                <SelectTrigger className="font-sans text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPLETION_METHODS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-sans text-xs">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="font-sans text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="font-sans text-xs">Size Options (comma-separated)</Label>
            <Input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="e.g. 60ml, 120ml" className="font-sans" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="font-sans text-xs">Wholesale Price</Label>
              <Input type="number" step="0.01" autoCapitalize="off" value={wholesalePrice} onChange={(e) => handleWholesaleChange(e.target.value)} placeholder="0.00" className="font-sans" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-sans text-xs">Markup %</Label>
              <Input type="number" step="1" autoCapitalize="off" value={markupPct} onChange={(e) => handleMarkupChange(e.target.value)} placeholder="0" className="font-sans" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-sans text-xs">Retail Price</Label>
              <Input type="number" step="0.01" autoCapitalize="off" value={retailPrice} onChange={(e) => handleRetailChange(e.target.value)} placeholder="0.00" className="font-sans" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <PlatformButton variant="outline" onClick={() => onOpenChange(false)}>Cancel</PlatformButton>
          <PlatformButton onClick={handleSave} loading={saving} disabled={!brand.trim() || !name.trim()}>
            {isEdit ? 'Save Changes' : 'Add Product'}
          </PlatformButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Column Browser Component ─────────────────────────────────
function ColumnBrowser({
  categoryGroups,
  selectedCategory,
  selectedProductLine,
  focusedColumn,
  onSelectCategory,
  onSelectProductLine,
  onFocusColumn,
  onClearCategory,
  onClearProductLine,
  onSetPricing,
  renderProductTable,
  reanalyzingCategory,
  onAutoAssignSwatches,
  onReanalyzeSwatches,
}: {
  categoryGroups: [string, SupplyLibraryProduct[]][];
  selectedCategory: string | null;
  selectedProductLine: string | null;
  focusedColumn: 0 | 1 | 2;
  onSelectCategory: (cat: string) => void;
  onSelectProductLine: (line: string) => void;
  onFocusColumn: (col: 0 | 1 | 2) => void;
  onClearCategory: () => void;
  onClearProductLine: () => void;
  onSetPricing: (ids: string[], label: string) => void;
  renderProductTable: (products: SupplyLibraryProduct[], category?: string) => JSX.Element;
  reanalyzingCategory: string | null;
  onAutoAssignSwatches: (products: SupplyLibraryProduct[], category: string) => void;
  onReanalyzeSwatches: (products: SupplyLibraryProduct[], category: string) => void;
}) {
  // Compute health for each category
  const categoryItems = useMemo<BrowseColumnItem[]>(() => {
    return categoryGroups.map(([cat, products]) => {
      const missing = products.filter(
        (p) => p.wholesale_price == null || (SHADE_SORTED_CATEGORIES.has(cat) && !(p as any).swatch_color),
      ).length;
      const ratio = products.length > 0 ? missing / products.length : 0;
      const health: 'green' | 'amber' | 'red' = ratio === 0 ? 'green' : ratio < 0.5 ? 'amber' : 'red';
      return {
        key: cat,
        label: SUPPLY_CATEGORY_LABELS[cat] || cat,
        count: products.length,
        health,
      };
    });
  }, [categoryGroups]);

  // Product lines within selected category
  const selectedCategoryProducts = useMemo(
    () => categoryGroups.find(([cat]) => cat === selectedCategory)?.[1] ?? [],
    [categoryGroups, selectedCategory],
  );

  const { shouldGroup, groups: productLineGroups } = useMemo(
    () => groupByProductLine(selectedCategoryProducts, 0),
    [selectedCategoryProducts],
  );

  const productLineItems = useMemo<BrowseColumnItem[]>(() => {
    if (!shouldGroup && selectedCategoryProducts.length > 0) {
      // Single group for all products
      return [{ key: '__all__', label: 'All Products', count: selectedCategoryProducts.length }];
    }
    return productLineGroups.map(([line, products]) => {
      const missing = products.filter((p) => p.wholesale_price == null).length;
      const ratio = products.length > 0 ? missing / products.length : 0;
      const health: 'green' | 'amber' | 'red' = ratio === 0 ? 'green' : ratio < 0.5 ? 'amber' : 'red';
      return { key: line, label: line, count: products.length, health };
    });
  }, [shouldGroup, productLineGroups, selectedCategoryProducts]);

  // Products to display in Column 3
  const displayProducts = useMemo(() => {
    if (!selectedCategory) return [];
    if (!selectedProductLine) return selectedCategoryProducts;
    if (selectedProductLine === '__all__') return selectedCategoryProducts;
    const group = productLineGroups.find(([line]) => line === selectedProductLine);
    return group ? group[1] : [];
  }, [selectedCategory, selectedProductLine, selectedCategoryProducts, productLineGroups]);

  // Stats
  const totalProducts = categoryGroups.reduce((sum, [, p]) => sum + p.length, 0);
  const scopeProducts = selectedCategory ? (selectedProductLine ? displayProducts : selectedCategoryProducts) : [];
  const missingPriceCount = scopeProducts.filter((p) => p.wholesale_price == null).length;
  const missingSwatchCount = scopeProducts.filter(
    (p) => selectedCategory && SHADE_SORTED_CATEGORIES.has(selectedCategory) && !(p as any).swatch_color,
  ).length;

  const scopeLabel = selectedProductLine && selectedProductLine !== '__all__'
    ? `${SUPPLY_CATEGORY_LABELS[selectedCategory!] || selectedCategory} › ${selectedProductLine}`
    : selectedCategory
      ? SUPPLY_CATEGORY_LABELS[selectedCategory] || selectedCategory
      : 'All';

  return (
    <div className="space-y-3">
      {/* Health legend — shared above browser */}
      {categoryItems.some((i) => i.health) && (
        <div className="flex items-center gap-4 px-1">
          <span className="font-sans text-[10px] text-[hsl(var(--platform-foreground-muted))]">Data health:</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-sans text-[10px] text-[hsl(var(--platform-foreground-subtle))]">Complete</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="font-sans text-[10px] text-[hsl(var(--platform-foreground-subtle))]">Some missing</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="font-sans text-[10px] text-[hsl(var(--platform-foreground-subtle))]">Most missing</span>
          </div>
        </div>
      )}

      {/* Three-column browser */}
      <div className="rounded-xl border border-[hsl(var(--platform-border)/0.4)] overflow-hidden flex min-h-[400px] max-h-[600px]">
        {/* Column 1: Categories */}
        <BrowseColumn
          title="Categories"
          items={categoryItems}
          selectedKey={selectedCategory}
          onSelect={onSelectCategory}
          focusActive={focusedColumn === 0}
          onKeyNav={(dir) => {
            if (dir === 'right' && selectedCategory) onFocusColumn(1);
            if (dir === 'escape') onClearCategory();
          }}
          className="w-[200px] shrink-0"
        />

        {/* Column 2: Product Lines */}
        {selectedCategory && (
          <BrowseColumn
            title="Product Lines"
            items={productLineItems}
            selectedKey={selectedProductLine}
            onSelect={onSelectProductLine}
            focusActive={focusedColumn === 1}
            onKeyNav={(dir) => {
              if (dir === 'right' && selectedProductLine) onFocusColumn(2);
              if (dir === 'left') onClearCategory();
              if (dir === 'escape') onClearProductLine();
            }}
            className="w-[220px] shrink-0"
          />
        )}

        {/* Column 3: Product Table */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {!selectedCategory ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Package className="w-8 h-8 mx-auto text-[hsl(var(--platform-foreground-subtle))]" />
                <p className="font-sans text-sm text-[hsl(var(--platform-foreground-muted))]">
                  Select a category to browse products
                </p>
              </div>
            </div>
          ) : displayProducts.length === 0 && selectedProductLine ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-sans text-sm text-[hsl(var(--platform-foreground-muted))]">
                Select a product line
              </p>
            </div>
          ) : (
            <>
              {/* Column 3 header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--platform-border)/0.3)] bg-[hsl(var(--platform-bg-card)/0.3)]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-display text-[10px] tracking-wider text-[hsl(var(--platform-foreground-muted))] uppercase truncate">
                    {scopeLabel}
                  </span>
                  <PlatformBadge variant="default" size="sm">{displayProducts.length}</PlatformBadge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {selectedCategory && SHADE_SORTED_CATEGORIES.has(selectedCategory) && displayProducts.some((p) => !(p as any).swatch_color) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PlatformButton
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => onAutoAssignSwatches(displayProducts, selectedCategory)}
                        >
                          Auto-assign swatches
                        </PlatformButton>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Automatically assigns swatch colors to products based on their shade name and level.</TooltipContent>
                    </Tooltip>
                  )}
                  {selectedCategory && SHADE_SORTED_CATEGORIES.has(selectedCategory) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PlatformButton
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-amber-400 hover:text-amber-300"
                          disabled={reanalyzingCategory === (SUPPLY_CATEGORY_LABELS[selectedCategory] || selectedCategory)}
                          onClick={() => onReanalyzeSwatches(displayProducts, selectedCategory)}
                        >
                          <RefreshCw className={cn('w-3 h-3 mr-0.5', reanalyzingCategory === (SUPPLY_CATEGORY_LABELS[selectedCategory] || selectedCategory) && 'animate-spin')} />
                          Re-analyze
                        </PlatformButton>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Re-runs the swatch color analysis for all products in this category. Overwrites existing assignments.</TooltipContent>
                    </Tooltip>
                  )}
                  <PlatformButton
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => onSetPricing(displayProducts.map((p) => p.id), scopeLabel)}
                  >
                    <DollarSign className="w-3 h-3 mr-0.5" />
                    Set Pricing
                  </PlatformButton>
                </div>
              </div>
              {/* Table */}
              <div className="flex-1 overflow-auto">
                {renderProductTable(
                  displayProducts.length > 0 ? displayProducts : selectedCategoryProducts,
                  selectedCategory || undefined,
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-1 font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">
        <span>{totalProducts} total products</span>
        {selectedCategory && (
          <>
            <span className="text-[hsl(var(--platform-border))]">·</span>
            <span>{scopeProducts.length} in scope</span>
            {missingPriceCount > 0 && (
              <>
                <span className="text-[hsl(var(--platform-border))]">·</span>
                <span className="text-amber-400">{missingPriceCount} missing price</span>
              </>
            )}
            {missingSwatchCount > 0 && (
              <>
                <span className="text-[hsl(var(--platform-border))]">·</span>
                <span className="text-amber-400">{missingSwatchCount} missing swatch</span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
