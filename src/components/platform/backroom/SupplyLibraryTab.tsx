import { useState, useMemo, useCallback, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
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
import { Loader2, Search, Package, Plus, Database, Pencil, Trash2, AlertTriangle, Upload, Download, ChevronLeft, ChevronRight, ChevronDown, DollarSign, CheckCircle2, X, MessageSquare, ChevronsUpDown, Clock, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSupplyLibraryProducts,
  useSupplyLibraryBrands,
  useSupplyLibraryInitStatus,
  useSeedSupplyLibrary,
  useSyncSupplyLibrary,
  type SupplyLibraryProduct,
} from '@/hooks/platform/useSupplyLibrary';
import { SUPPLY_CATEGORY_LABELS, getBrandCoverage } from '@/data/professional-supply-library';
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
  // localStorage-backed collapse state
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedSubLines, setCollapsedSubLines] = useState<Set<string>>(new Set());
  const [editBrandOpen, setEditBrandOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

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

  // Fetch all products (no brand filter) for building brand cards
  const { data: allProducts = [], isLoading: allLoading } = useSupplyLibraryProducts();
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

  // Build brand card data from allProducts
  const brandCards = useMemo<BrandCardData[]>(() => {
    const map = new Map<string, { count: number; cats: Map<string, number> }>();
    allProducts.forEach((p) => {
      if (!map.has(p.brand)) map.set(p.brand, { count: 0, cats: new Map() });
      const entry = map.get(p.brand)!;
      entry.count++;
      entry.cats.set(p.category, (entry.cats.get(p.category) || 0) + 1);
    });
    const cards: BrandCardData[] = [];
    map.forEach((val, brand) => {
      cards.push({
        brand,
        productCount: val.count,
        categorySummary: Array.from(val.cats.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count),
      });
    });
    return cards.sort((a, b) => a.brand.localeCompare(b.brand));
  }, [allProducts]);

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
              <TableHead className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))]">Price</TableHead>
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
    const products = selectedBrand ? brandProducts : allProducts;
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
                   onClick={() => { setSelectedBrand(null); setProductSearch(''); setCategoryFilter('all'); setPricingFilter('all'); setCollapsedCategories(new Set()); setCollapsedSubLines(new Set()); }}
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
                        onClick={() => { setSelectedBrand(null); setProductSearch(''); setCategoryFilter('all'); setPricingFilter('all'); setCollapsedCategories(new Set()); setCollapsedSubLines(new Set()); }}
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
                    <PlatformCardDescription>
                      {brandProducts.length} products
                    </PlatformCardDescription>
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
              {initStatus?.isInitialized && (
                <PlatformButton variant="outline" size="sm" onClick={() => syncMutation.mutate()} loading={syncMutation.isPending}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Sync Library
                </PlatformButton>
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
                <PlatformButton size="sm" variant="outline" onClick={() => setAddBrandOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Brand
                </PlatformButton>
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
                      className="cursor-pointer p-4 flex flex-col items-center text-center gap-2"
                      onClick={() => { setSelectedBrand(b.brand); setProductSearch(''); setCategoryFilter('all'); try { const cats = localStorage.getItem(collapseKey('categories', b.brand)); setCollapsedCategories(cats ? new Set(JSON.parse(cats)) : new Set()); const subs = localStorage.getItem(collapseKey('sublines', b.brand)); setCollapsedSubLines(subs ? new Set(JSON.parse(subs)) : new Set()); } catch { setCollapsedCategories(new Set()); setCollapsedSubLines(new Set()); } }}
                    >
                      {brandLogoMap.has(b.brand) ? (
                        <img src={brandLogoMap.get(b.brand)!} alt={b.brand} className="w-10 h-10 rounded-lg object-contain bg-white/5 p-0.5" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-violet-400" />
                        </div>
                      )}
                      <span className="font-display text-sm tracking-wide text-[hsl(var(--platform-foreground))]">
                        {b.brand}
                      </span>
                      <PlatformBadge variant="primary" size="sm">
                        {b.productCount} products
                      </PlatformBadge>
                      <PlatformBadge
                        variant={getBrandCoverage(b.brand) === 'complete' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {getBrandCoverage(b.brand) === 'complete' ? 'Complete' : 'Partial'}
                      </PlatformBadge>
                      <p className="font-sans text-[10px] text-[hsl(var(--platform-foreground-muted))] leading-tight">
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

          {/* ─── Level 2: Brand Detail — Products by Category ─── */}
          {selectedBrand && (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 max-w-sm">
                  <PlatformInput
                    icon={<Search className="w-4 h-4" />}
                    placeholder={`Search ${selectedBrand} products...`}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px] font-sans">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((c) => {
                      const count = brandProducts.filter((p) => p.category === c).length;
                      if (count === 0) return null;
                      return (
                        <SelectItem key={c} value={c}>
                          {SUPPLY_CATEGORY_LABELS[c] || c} ({count})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                 </Select>
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
                {/* Collapse All / Expand All toggle */}
                <PlatformButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allCatKeys = categoryGroups.map(([cat]) => cat);
                    const allSubKeys: string[] = [];
                    categoryGroups.forEach(([cat, products]) => {
                      const { shouldGroup, groups } = groupByProductLine(products);
                      if (shouldGroup) {
                        groups.forEach(([lineName]) => allSubKeys.push(`${cat}::${lineName}`));
                      }
                    });
                    const totalSections = allCatKeys.length + allSubKeys.length;
                    const collapsedCount = allCatKeys.filter(k => collapsedCategories.has(k)).length + allSubKeys.filter(k => collapsedSubLines.has(k)).length;
                    const shouldCollapse = collapsedCount < totalSections / 2;
                    if (shouldCollapse) {
                      setCollapsedCategories(new Set(allCatKeys));
                      setCollapsedSubLines(new Set(allSubKeys));
                    } else {
                      setCollapsedCategories(new Set());
                      setCollapsedSubLines(new Set());
                    }
                  }}
                >
                  <ChevronsUpDown className="w-3.5 h-3.5 mr-1" />
                  {(() => {
                    const allCatKeys = categoryGroups.map(([cat]) => cat);
                    const collapsedCount = allCatKeys.filter(k => collapsedCategories.has(k)).length;
                    return collapsedCount >= allCatKeys.length / 2 ? 'Expand All' : 'Collapse All';
                  })()}
                </PlatformButton>
                {/* Reset All Collapse State */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                    <PlatformButton
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setResetConfirmOpen(true)}
                        className="relative"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {savedBrandCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-violet-500/80 text-[10px] font-sans text-white flex items-center justify-center">
                            {savedBrandCount}
                          </span>
                        )}
                      </PlatformButton>
                    </TooltipTrigger>
                    <TooltipContent>Reset all collapse state</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
                  <PlatformAlertDialogContent>
                    <AlertDialogHeader>
                      <PlatformAlertDialogTitle>Reset collapse state?</PlatformAlertDialogTitle>
                      <PlatformAlertDialogDescription>
                        This will clear saved collapse/expand preferences for all brands. This action cannot be undone.
                      </PlatformAlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <PlatformAlertDialogCancel>Cancel</PlatformAlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          const keysToRemove: string[] = [];
                          for (let i = 0; i < localStorage.length; i++) {
                            const k = localStorage.key(i);
                            if (k && (k.startsWith('supply-library-categories::') || k.startsWith('supply-library-sublines::'))) {
                              keysToRemove.push(k);
                            }
                          }
                          keysToRemove.forEach((k) => localStorage.removeItem(k));
                          localStorage.setItem('supply-library-last-reset', new Date().toISOString());
                          setCollapsedCategories(new Set());
                          setCollapsedSubLines(new Set());
                          toast.success('Collapse state reset for all brands');
                        }}
                      >
                        Reset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </PlatformAlertDialogContent>
                </AlertDialog>
                {/* Recently Added filter */}
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
                <div className="space-y-3">
                  {categoryGroups.map(([category, products]) => {
                    const isOpen = !collapsedCategories.has(category);
                    return (
                      <Collapsible key={category} open={isOpen} onOpenChange={() => toggleCategory(category)}>
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-[hsl(var(--platform-bg-hover)/0.5)] hover:bg-[hsl(var(--platform-bg-hover))] transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="font-display text-xs tracking-wide text-[hsl(var(--platform-foreground))]">
                                {SUPPLY_CATEGORY_LABELS[category] || category}
                              </span>
                              <PlatformBadge variant="default" size="sm">{products.length}</PlatformBadge>
                            </div>
                            <ChevronDown className={cn(
                              'w-4 h-4 text-[hsl(var(--platform-foreground-muted))] transition-transform duration-200',
                              isOpen && 'rotate-180'
                            )} />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {(() => {
                            const { shouldGroup, groups } = groupByProductLine(products);
                            if (!shouldGroup) {
                              return <div className="mt-1.5">{renderProductTable(products, category)}</div>;
                            }
                            return (
                              <div className="mt-1.5 space-y-1.5 pl-3">
                                {groups.map(([lineName, lineProducts]) => {
                                  const subKey = `${category}::${lineName}`;
                                  const isSubOpen = !collapsedSubLines.has(subKey);
                                  return (
                                    <Collapsible key={subKey} open={isSubOpen} onOpenChange={() => toggleSubLine(subKey)}>
                                      <CollapsibleTrigger asChild>
                                        <button className="flex items-center justify-between w-full px-3 py-1.5 rounded-md bg-[hsl(var(--platform-bg-hover)/0.3)] hover:bg-[hsl(var(--platform-bg-hover)/0.5)] transition-colors">
                                          <div className="flex items-center gap-2">
                                            <span className="font-sans text-xs font-medium text-[hsl(var(--platform-foreground-muted))]">
                                              {lineName}
                                            </span>
                                            <PlatformBadge variant="default" size="sm">{lineProducts.length}</PlatformBadge>
                                          </div>
                                          <ChevronDown className={cn(
                                            'w-3 h-3 text-[hsl(var(--platform-foreground-muted))] transition-transform duration-200',
                                            isSubOpen && 'rotate-180'
                                          )} />
                                        </button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="mt-1">{renderProductTable(lineProducts, category)}</div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </PlatformCardContent>
      </PlatformCard>

      {/* CSV Import Dialog */}
      <CSVImportDialog open={csvOpen} onOpenChange={setCsvOpen} />

      {/* Add Brand Wizard */}
      <AddBrandWizard open={addBrandOpen} onOpenChange={setAddBrandOpen} />

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
  const [recommendedRetail, setRecommendedRetail] = useState(product?.recommended_retail != null ? String(product.recommended_retail) : '');

  const resetForm = () => {
    setBrand(product?.brand || '');
    setName(product?.name || '');
    setCategory(product?.category || 'color');
    setDepletion(product?.default_depletion || 'weighed');
    setUnit(product?.default_unit || 'g');
    setSizes(product?.size_options?.join(', ') || '');
    setWholesalePrice(product?.wholesale_price != null ? String(product.wholesale_price) : '');
    setRecommendedRetail(product?.recommended_retail != null ? String(product.recommended_retail) : '');
  };

  const handleSave = async () => {
    if (!brand.trim() || !name.trim()) return;
    setSaving(true);
    try {
      const sizeArr = sizes.split(',').map((s) => s.trim()).filter(Boolean);
      const wpVal = wholesalePrice.trim() ? parseFloat(wholesalePrice) : null;
      const rrVal = recommendedRetail.trim() ? parseFloat(recommendedRetail) : null;
      const payload: any = {
        brand: brand.trim(),
        name: name.trim(),
        category,
        default_depletion: depletion,
        default_unit: unit,
        size_options: sizeArr,
        wholesale_price: wpVal,
        recommended_retail: rrVal,
        ...(wpVal != null ? { price_updated_at: new Date().toISOString() } : {}),
      };

      if (isEdit && product) {
        const { error } = await supabase.from('supply_library_products').update(payload).eq('id', product.id);
        if (error) throw error;
        toast.success('Product updated');
      } else {
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-sans text-xs">Wholesale Price</Label>
              <Input type="number" autoCapitalize="off" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} placeholder="0.00" className="font-sans" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-sans text-xs">Recommended Retail</Label>
              <Input type="number" autoCapitalize="off" value={recommendedRetail} onChange={(e) => setRecommendedRetail(e.target.value)} placeholder="0.00" className="font-sans" />
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
