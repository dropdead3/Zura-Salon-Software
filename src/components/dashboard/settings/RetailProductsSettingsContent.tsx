import { useState, useMemo, useRef } from 'react';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import {
  Search, Plus, BarChart3, Package, Edit2, AlertTriangle, Minus,
  Loader2, Check, X, MapPin, CheckCircle2, Info, ExternalLink, ImagePlus, Gift,
  FileText, Trash2, Copy, Download, ChevronUp, ChevronDown, ChevronsUpDown, ShoppingCart, Tag, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useProducts, useCreateProduct, useUpdateProduct, useProductBrandsList, type Product } from '@/hooks/useProducts';
import { useProductBrands, useProductCategorySummaries } from '@/hooks/useProductBrands';
import { useProductCategories } from '@/hooks/useProducts';
import { isExtensionProduct, isMerchProduct } from '@/utils/serviceCategorization';
import { useBulkUpdateProducts, useBulkToggleProducts, useBulkUpdateProductTypeByCategory } from '@/hooks/useBulkUpdateProducts';
import { useCreateProductCategory, useDeleteProductCategory } from '@/hooks/useProductCategoryManagement';
import { CategoryFormDialog } from '@/components/dashboard/settings/CategoryFormDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useActiveLocations } from '@/hooks/useLocations';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useWebsiteRetailSettings } from '@/hooks/useWebsiteSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import { optimizeImage } from '@/lib/image-utils';
import { GiftCardsHub } from '@/components/dashboard/settings/GiftCardsHub';
import { ProductWizard } from '@/components/dashboard/settings/ProductWizard';
import { useProductDrafts, useDeleteProductDraft, type ProductDraft } from '@/hooks/useProductDrafts';
import { DataImportWizard } from '@/components/admin/DataImportWizard';
import { ImportHistoryCard } from '@/components/admin/ImportHistoryCard';
import { useImportJobs } from '@/hooks/useImportJobs';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Upload, History } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProductSuppliers, type ProductSupplier } from '@/hooks/useProductSuppliers';
import { ReorderDialog } from '@/components/dashboard/settings/inventory/ReorderDialog';
import { SupplierDialog } from '@/components/dashboard/settings/inventory/SupplierDialog';
import { PurchaseOrdersPanel } from '@/components/dashboard/settings/inventory/PurchaseOrdersPanel';
import { BatchReorderDialog } from '@/components/dashboard/settings/inventory/BatchReorderDialog';
import { AlertSettingsCard } from '@/components/dashboard/settings/inventory/AlertSettingsCard';
import { StockMovementHistory } from '@/components/dashboard/settings/inventory/StockMovementHistory';
import { Checkbox } from '@/components/ui/checkbox';
import { useLogStockMovement } from '@/hooks/useStockMovements';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { useProductVelocity } from '@/hooks/useProductVelocity';
import { getMovementRating, computePercentiles, MOVEMENT_TIERS, type MovementTier } from '@/lib/productMovementRating';
import { MovementBadge } from '@/components/ui/MovementBadge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ClearancePanel } from '@/components/dashboard/settings/inventory/ClearancePanel';
import { StockTransferDialog } from '@/components/dashboard/settings/inventory/StockTransferDialog';
import { StocktakeDialog } from '@/components/dashboard/settings/inventory/StocktakeDialog';
// Helper to classify product type — prefer DB column, fall back to regex
function getProductType(product: Product): string {
  if (product.product_type && product.product_type !== 'Products') return product.product_type;
  if (product.product_type === 'Products') return 'Products';
  // Fallback for legacy rows without product_type
  if (isExtensionProduct(product.name)) return 'Extensions';
  if (isMerchProduct(product.name)) return 'Merch';
  return 'Products';
}

const PRODUCT_TYPES = ['Products', 'Extensions', 'Merch'] as const;
const PAGE_SIZE = 50;

type SortField = 'name' | 'brand' | 'category' | 'retail_price' | 'quantity_on_hand';
type SortDir = 'asc' | 'desc';

function exportProductsCsv(products: Product[]) {
  const headers = ['Name', 'Brand', 'Category', 'Type', 'SKU', 'Barcode', 'Retail Price', 'Cost Price', 'Stock', 'Reorder Level', 'Available Online'];
  const rows = products.map(p => [
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${(p.brand || '').replace(/"/g, '""')}"`,
    `"${(p.category || '').replace(/"/g, '""')}"`,
    `"${(p.product_type || getProductType(p)).replace(/"/g, '""')}"`,
    `"${(p.sku || '').replace(/"/g, '""')}"`,
    `"${(p.barcode || '').replace(/"/g, '""')}"`,
    p.retail_price ?? '',
    p.cost_price ?? '',
    p.quantity_on_hand ?? '',
    p.reorder_level ?? '',
    p.available_online ? 'Yes' : 'No',
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `products_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
function ProductsTab() {
  const { formatCurrency } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const [search, setSearch] = useState('');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { data: importJobs } = useImportJobs({ organizationId: effectiveOrganization?.id });
  const productImportJobs = useMemo(() => (importJobs || []).filter(j => j.entity_type === 'products'), [importJobs]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [movementFilter, setMovementFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const { data: products, isLoading, totalCount } = useProducts({
    search,
    category: categoryFilter,
    brand: brandFilter,
    productType: typeFilter !== 'all' ? typeFilter : undefined,
    locationId: locationFilter !== 'all' ? locationFilter : undefined,
    lowStockOnly,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: categories } = useProductCategories();
  const { data: brands } = useProductBrandsList();
  const { data: locations } = useActiveLocations();
  const { data: velocityMap } = useProductVelocity(locationFilter !== 'all' ? locationFilter : undefined);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const bulkToggle = useBulkToggleProducts();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardDraftId, setWizardDraftId] = useState<string | undefined>();
  const [wizardInitialDraft, setWizardInitialDraft] = useState<{ form_data: Record<string, any>; current_step: number } | undefined>();
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockValue, setStockValue] = useState('');
  const { data: drafts } = useProductDrafts();
  const deleteDraft = useDeleteProductDraft();
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkBrand, setBulkBrand] = useState('');
  const [bulkType, setBulkType] = useState('');

  const sortedProducts = useMemo(() => {
    const arr = [...(products || [])];
    arr.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return arr;
  }, [products, sortField, sortDir]);

  // Compute movement ratings + velocity changes for all products
  const { productRatings, velocityChanges } = useMemo(() => {
    if (!velocityMap || !products) return { productRatings: new Map<string, ReturnType<typeof getMovementRating>>(), velocityChanges: new Map<string, number | null>() };
    const allVelocities = products.map(p => {
      const entry = velocityMap.get(p.name.toLowerCase().trim());
      return entry?.velocity ?? 0;
    });
    const percentiles = computePercentiles(allVelocities);
    const ratings = new Map<string, ReturnType<typeof getMovementRating>>();
    const changes = new Map<string, number | null>();
    for (const p of products) {
      const entry = velocityMap.get(p.name.toLowerCase().trim());
      const velocity = entry?.velocity ?? 0;
      const pctRaw = percentiles.get(velocity);
      const rating = getMovementRating({
        velocity,
        totalUnitsSold: entry?.totalUnitsSold ?? 0,
        daysSinceLastSale: entry?.daysSinceLastSale ?? null,
        hasStock: (p.quantity_on_hand ?? 0) > 0,
        velocityPercentile: pctRaw ?? 0,
      });
      ratings.set(p.id, rating);
      changes.set(p.id, entry?.velocityChange ?? null);
    }
    return { productRatings: ratings, velocityChanges: changes };
  }, [products, velocityMap]);

  // Apply movement filter
  const filteredProducts = useMemo(() => {
    if (movementFilter === 'all') return sortedProducts;
    return sortedProducts.filter(p => {
      const rating = productRatings.get(p.id);
      return rating?.tier === movementFilter;
    });
  }, [sortedProducts, movementFilter, productRatings]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-muted-foreground/50" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === (filteredProducts?.length || 0)) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts?.map(p => p.id)));
    }
  };

  const handleDuplicate = (p: Product) => {
    createProduct.mutate({
      name: `${p.name} (Copy)`,
      brand: p.brand,
      category: p.category,
      product_type: p.product_type,
      description: p.description,
      retail_price: p.retail_price,
      cost_price: p.cost_price,
      quantity_on_hand: p.quantity_on_hand,
      reorder_level: p.reorder_level,
      organization_id: p.organization_id,
      location_id: p.location_id,
      image_url: p.image_url,
      available_online: p.available_online,
    });
  };

  const handleBulkDuplicate = () => {
    const selected = filteredProducts.filter(p => selectedIds.has(p.id));
    selected.forEach(p => handleDuplicate(p));
    setSelectedIds(new Set());
  };

  const handleBulkCategoryAssign = (cat: string) => {
    const ids = Array.from(selectedIds);
    ids.forEach(id => updateProduct.mutate({ id, updates: { category: cat } }));
    setSelectedIds(new Set());
    setBulkCategory('');
  };

  const handleBulkBrandAssign = (brand: string) => {
    const ids = Array.from(selectedIds);
    ids.forEach(id => updateProduct.mutate({ id, updates: { brand } }));
    setSelectedIds(new Set());
    setBulkBrand('');
  };

  const handleBulkTypeAssign = (type: string) => {
    const ids = Array.from(selectedIds);
    ids.forEach(id => updateProduct.mutate({ id, updates: { product_type: type } }));
    setSelectedIds(new Set());
    setBulkType('');
  };

  const showLocationFilter = locations && locations.length > 1;

  return (
    <div className="space-y-4">
      {/* Row 1: Count + Action Buttons */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {totalCount > PAGE_SIZE
            ? `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)} of ${totalCount} products`
            : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`
          }
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size={tokens.button.card} onClick={() => exportProductsCsv(filteredProducts)} className="gap-1.5">
            <Upload className="w-4 h-4" /> Export
          </Button>
          <Button variant="outline" size={tokens.button.card} onClick={() => setShowImportWizard(true)} className="gap-1.5">
            <Download className="w-4 h-4" /> Import
          </Button>
          {productImportJobs.length > 0 && (
            <Button variant="ghost" size={tokens.button.card} onClick={() => setShowHistory(!showHistory)} className="gap-1.5 text-muted-foreground">
              <History className="w-4 h-4" /> History
            </Button>
          )}
          <Button size={tokens.button.card} onClick={() => { setWizardDraftId(undefined); setWizardInitialDraft(undefined); setShowWizard(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>
      </div>

      {showHistory && productImportJobs.length > 0 && (
        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <CollapsibleContent className="space-y-3">
            <h4 className={cn(tokens.label.default, 'text-muted-foreground')}>Recent Product Imports</h4>
            {productImportJobs.map((job) => (
              <ImportHistoryCard key={job.id} job={job} showRollback={true} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Row 2: Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search products, SKU, barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {showLocationFilter && (
          <Select value={locationFilter} onValueChange={(v) => { setLocationFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px] h-9">
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={movementFilter} onValueChange={(v) => { setMovementFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Movement" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Movement</SelectItem>
            {MOVEMENT_TIERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch checked={lowStockOnly} onCheckedChange={(v) => { setLowStockOnly(v); setPage(0); }} id="low-stock" />
          <Label htmlFor="low-stock" className="text-sm cursor-pointer">Low Stock</Label>
        </div>
        {drafts && drafts.length > 0 && (
          <div className="flex items-center gap-1">
            {drafts.map((d) => (
              <Button
                key={d.id}
                variant="outline"
                size={tokens.button.card}
                className="gap-1.5 text-muted-foreground"
                onClick={() => {
                  setWizardDraftId(d.id);
                  setWizardInitialDraft({ form_data: d.form_data, current_step: d.current_step });
                  setShowWizard(true);
                }}
              >
                <FileText className="w-3.5 h-3.5" />
                Draft{drafts.length > 1 ? '' : ''}: {(d.form_data as any)?.name || 'Untitled'}
              </Button>
            ))}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border flex-wrap">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size={tokens.button.inline} variant="outline" onClick={() => bulkToggle.mutate({ ids: Array.from(selectedIds), isActive: false })}>
            Deactivate
          </Button>
          <Button size={tokens.button.inline} variant="outline" onClick={handleBulkDuplicate}>
            <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate
          </Button>
          <Button
            size={tokens.button.inline}
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              const ids = Array.from(selectedIds);
              ids.forEach(id => updateProduct.mutate({
                id,
                updates: {
                  clearance_status: 'marked',
                  clearance_marked_at: new Date().toISOString(),
                } as any,
              }));
              setSelectedIds(new Set());
              sonnerToast.success(`${ids.length} product(s) marked for clearance`);
            }}
          >
            <Tag className="w-3.5 h-3.5" /> Mark for Clearance
          </Button>
          <Select value={bulkCategory} onValueChange={handleBulkCategoryAssign}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Set Category" /></SelectTrigger>
            <SelectContent>
              {categories?.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={bulkBrand} onValueChange={handleBulkBrandAssign}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Set Brand" /></SelectTrigger>
            <SelectContent>
              {brands?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={bulkType} onValueChange={handleBulkTypeAssign}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Set Type" /></SelectTrigger>
            <SelectContent>
              {PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size={tokens.button.inline} variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" checked={selectedIds.size === (filteredProducts?.length || 0) && (filteredProducts?.length || 0) > 0} onChange={toggleAll} className="rounded border-border" />
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                    Product <SortIcon field="name" />
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleSort('brand')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                    Brand <SortIcon field="brand" />
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleSort('category')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                    Category <SortIcon field="category" />
                  </button>
                </TableHead>
                <TableHead className="w-28">Movement</TableHead>
                <TableHead className="text-right">
                  <button type="button" onClick={() => toggleSort('retail_price')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
                    Price <SortIcon field="retail_price" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <div className="inline-flex items-center gap-1.5 ml-auto">
                    <button type="button" onClick={() => toggleSort('quantity_on_hand')} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                      Inventory <SortIcon field="quantity_on_hand" />
                    </button>
                    <MetricInfoTooltip description="Current stock on hand. Products are flagged as low stock when quantity reaches or falls below the minimum stock level you set." />
                  </div>
                </TableHead>
                <TableHead className="w-24">Expiry</TableHead>
                <TableHead className="text-center w-16">Online</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredProducts?.length ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
              ) : filteredProducts.map(p => {
                const isLow = p.reorder_level != null && p.quantity_on_hand != null && p.quantity_on_hand <= p.reorder_level;
                const productType = getProductType(p);
                return (
                  <TableRow key={p.id} className={cn(isLow && 'bg-amber-50/50 dark:bg-amber-950/10')}>
                    <TableCell className="py-3"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded border-border" /></TableCell>
                    {/* Product: Avatar + Name / SKU · Type */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0">
                          {p.image_url && <AvatarImage src={p.image_url} alt={p.name} className="object-cover" />}
                          <AvatarFallback className="text-[10px] font-medium bg-muted">{getInitials(p.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{p.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {p.sku && <span className="text-xs text-muted-foreground font-mono">{p.sku}</span>}
                            {p.sku && <span className="text-muted-foreground/40 text-xs">·</span>}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{productType}</Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground">{p.brand || '—'}</TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground">{p.category || '—'}</TableCell>
                    {/* Movement */}
                    <TableCell className="py-3">
                      {productRatings.has(p.id) ? (
                        <div className="flex items-center gap-1">
                          <MovementBadge rating={productRatings.get(p.id)!} compact velocityChange={velocityChanges.get(p.id)} />
                          {/* Markdown warning for dead_weight/stagnant with high capital at risk */}
                          {(() => {
                            const rating = productRatings.get(p.id);
                            if (!rating || !['dead_weight', 'stagnant'].includes(rating.tier)) return null;
                            const capitalAtRisk = (p.cost_price ?? 0) * (p.quantity_on_hand ?? 0);
                            if (capitalAtRisk <= 50) return null;
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="w-3 h-3 text-red-500 dark:text-red-400 shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[220px]">
                                  Consider markdown — <BlurredAmount>{formatCurrency(capitalAtRisk)}</BlurredAmount> tied up in non-moving stock
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {/* Price: Retail / Cost stacked */}
                    <TableCell className="py-3 text-right">
                      <div className="tabular-nums text-sm"><BlurredAmount>{p.retail_price != null ? formatCurrency(p.retail_price) : '—'}</BlurredAmount></div>
                      <div className="tabular-nums text-xs text-muted-foreground mt-0.5"><BlurredAmount>{p.cost_price != null ? formatCurrency(p.cost_price) : '—'}</BlurredAmount></div>
                    </TableCell>
                    {/* Inventory: Stock / Reorder stacked */}
                    <TableCell className="py-3 text-right">
                      <div>
                        {editingStockId === p.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={stockValue}
                              onChange={(e) => setStockValue(e.target.value)}
                              onBlur={() => {
                                const parsed = parseInt(stockValue);
                                if (!isNaN(parsed) && parsed !== p.quantity_on_hand) {
                                  updateProduct.mutate({ id: p.id, updates: { quantity_on_hand: parsed } });
                                }
                                setEditingStockId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                if (e.key === 'Escape') setEditingStockId(null);
                              }}
                              autoFocus
                              onFocus={(e) => e.target.select()}
                              className={cn(
                                'w-14 h-6 text-right text-sm tabular-nums rounded-md px-1.5 bg-muted border border-border/60 outline-none',
                                'focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors',
                                '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                              )}
                            />
                            {isLow && <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={cn(
                              'inline-flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer rounded transition-colors tabular-nums text-sm',
                              'hover:text-primary',
                              isLow ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-foreground'
                            )}
                            onClick={() => {
                              setEditingStockId(p.id);
                              setStockValue(String(p.quantity_on_hand ?? 0));
                            }}
                            title="Click to edit stock"
                          >
                            {p.quantity_on_hand ?? '—'}
                            {isLow && <AlertTriangle className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                        {p.reorder_level != null ? `Min. stock: ${p.reorder_level}` : '—'}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {(() => {
                        if (!p.expires_at) return <span className="text-xs text-muted-foreground">—</span>;
                        const today = new Date();
                        const expiryDate = new Date(p.expires_at);
                        const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const alertDays = p.expiry_alert_days ?? 30;
                        let badgeClass = '';
                        let label = '';
                        if (daysUntil <= 0) {
                          badgeClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
                          label = daysUntil === 0 ? 'Today' : `${Math.abs(daysUntil)}d ago`;
                        } else if (daysUntil <= alertDays) {
                          badgeClass = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
                          label = `${daysUntil}d`;
                        } else if (daysUntil <= alertDays * 2) {
                          badgeClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
                          label = `${daysUntil}d`;
                        } else {
                          return <span className="text-xs text-muted-foreground tabular-nums">{p.expires_at}</span>;
                        }
                        return (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className={cn('text-[10px] tabular-nums', badgeClass)}>
                                {label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Expires: {p.expires_at}</p>
                              <p className="text-xs">{daysUntil <= 0 ? 'Expired' : `${daysUntil} days remaining`}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <Switch
                        checked={!!p.available_online}
                        onCheckedChange={() => updateProduct.mutate({ id: p.id, updates: { available_online: !p.available_online } })}
                        className="scale-75"
                      />
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleDuplicate(p)} title="Duplicate">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditProduct(p)} title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size={tokens.button.inline} disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size={tokens.button.inline} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {editProduct && (
        <ProductFormDialog
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSave={(data) => {
            updateProduct.mutate({ id: editProduct.id, updates: data });
            setEditProduct(null);
          }}
        />
      )}

      <ProductWizard open={showWizard} onOpenChange={setShowWizard} draftId={wizardDraftId} initialDraft={wizardInitialDraft} />
      <DataImportWizard
        open={showImportWizard}
        onOpenChange={setShowImportWizard}
        sourceType="csv"
        dataType="products"
        organizationId={effectiveOrganization?.id}
      />
    </div>
  );
}

function ProductFormDialog({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: (data: Partial<Product>) => void }) {
  const { data: locations } = useActiveLocations();
  const { data: existingCategories } = useProductCategories();
  const { data: existingBrands } = useProductBrandsList();
  const [customBrand, setCustomBrand] = useState(false);
  const [customCategory, setCustomCategory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropPreviewFile, setCropPreviewFile] = useState<File | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: product?.name || '',
    brand: product?.brand || '',
    category: product?.category || '',
    product_type: product?.product_type || 'Products',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    retail_price: product?.retail_price?.toString() || '',
    cost_price: product?.cost_price?.toString() || '',
    quantity_on_hand: product?.quantity_on_hand?.toString() || '',
    reorder_level: product?.reorder_level?.toString() || '',
    par_level: (product as any)?.par_level?.toString() || '',
    description: product?.description || '',
    location_id: product?.location_id || '',
    image_url: product?.image_url || '',
    expires_at: product?.expires_at || '',
    expiry_alert_days: product?.expiry_alert_days?.toString() || '30',
  });

  const clearCropPreview = () => {
    if (cropPreviewUrl) URL.revokeObjectURL(cropPreviewUrl);
    setCropPreviewFile(null);
    setCropPreviewUrl(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      sonnerToast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      sonnerToast.error('Image must be under 10 MB');
      return;
    }

    clearCropPreview();
    const url = URL.createObjectURL(file);
    setCropPreviewFile(file);
    setCropPreviewUrl(url);
  };

  const handleConfirmUpload = async () => {
    if (!cropPreviewFile) return;
    setUploading(true);
    try {
      const { blob } = await optimizeImage(cropPreviewFile, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.82,
        format: 'webp',
        cropToSquare: true,
      });
      const path = `${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/webp', upsert: true });
      if (error) {
        sonnerToast.error('Failed to upload image');
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      setForm(f => ({ ...f, image_url: publicUrl }));
    } catch (err) {
      console.error('Image optimization error:', err);
      sonnerToast.error('Failed to process image');
    } finally {
      setUploading(false);
      clearCropPreview();
    }
  };

  const handleSubmit = () => {
    onSave({
      name: form.name,
      brand: form.brand || null,
      category: form.category || null,
      product_type: form.product_type || 'Products',
      sku: form.sku || null,
      barcode: form.barcode || null,
      retail_price: form.retail_price ? parseFloat(form.retail_price) : null,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      quantity_on_hand: form.quantity_on_hand ? parseInt(form.quantity_on_hand) : null,
      reorder_level: form.reorder_level ? parseInt(form.reorder_level) : null,
      par_level: form.par_level ? parseInt(form.par_level) : null,
      description: form.description || null,
      location_id: form.location_id || null,
      image_url: form.image_url || null,
      expires_at: form.expires_at || null,
      expiry_alert_days: form.expiry_alert_days ? parseInt(form.expiry_alert_days) : 30,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Image upload */}
          <div>
            <Label className="text-xs">Product Image</Label>
            <div className="mt-1.5">
              {form.image_url ? (
                <div className="relative group w-full aspect-square rounded-lg overflow-hidden border border-border bg-muted/30">
                  <img src={form.image_url} alt="Product" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="secondary" size={tokens.button.inline} onClick={() => fileInputRef.current?.click()}>Replace</Button>
                    <Button variant="secondary" size={tokens.button.inline} onClick={() => setForm(f => ({ ...f, image_url: '' }))}>Remove</Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-square rounded-lg border-2 border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center gap-1.5 hover:border-primary/40 transition-colors"
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImagePlus className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload image</span>
                    </>
                  )}
                </button>
              )}

              {/* Crop preview overlay */}
              {cropPreviewUrl && (
                <div className="w-full space-y-2">
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border bg-muted/30">
                    <img src={cropPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    {/* Square crop boundary mask */}
                    <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px hsl(var(--primary) / 0.6)' }} />
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-sans">
                      Center-crop preview
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size={tokens.button.inline}
                      onClick={handleConfirmUpload}
                      disabled={uploading}
                      className="flex-1"
                    >
                      {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                      Upload
                    </Button>
                    <Button
                      type="button"
                      size={tokens.button.inline}
                      variant="outline"
                      onClick={clearCropPreview}
                      disabled={uploading}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </div>
          </div>
          <div><Label className="text-xs">Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={form.product_type} onValueChange={v => setForm(f => ({ ...f, product_type: v }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Brand</Label>
              {customBrand ? (
                <div className="flex gap-1.5 mt-1">
                  <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="New brand" className="h-9" autoFocus />
                  <Button type="button" variant="ghost" size="icon" className="w-9 h-9 shrink-0" onClick={() => { setCustomBrand(false); setForm(f => ({ ...f, brand: '' })); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Select value={form.brand || '__none__'} onValueChange={v => {
                  if (v === '__other__') { setCustomBrand(true); setForm(f => ({ ...f, brand: '' })); }
                  else if (v === '__none__') setForm(f => ({ ...f, brand: '' }));
                  else setForm(f => ({ ...f, brand: v }));
                }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {existingBrands?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    <SelectItem value="__other__">Other…</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              {customCategory ? (
                <div className="flex gap-1.5 mt-1">
                  <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="New category" className="h-9" autoFocus />
                  <Button type="button" variant="ghost" size="icon" className="w-9 h-9 shrink-0" onClick={() => { setCustomCategory(false); setForm(f => ({ ...f, category: '' })); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Select value={form.category || '__none__'} onValueChange={v => {
                  if (v === '__other__') { setCustomCategory(true); setForm(f => ({ ...f, category: '' })); }
                  else if (v === '__none__') setForm(f => ({ ...f, category: '' }));
                  else setForm(f => ({ ...f, category: v }));
                }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {existingCategories?.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value="__other__">Other…</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">SKU</Label><Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
            <div><Label className="text-xs">Barcode</Label><Input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Retail Price</Label><Input type="number" step="0.01" value={form.retail_price} onChange={e => setForm(f => ({ ...f, retail_price: e.target.value }))} /></div>
            <div><Label className="text-xs">Cost Price</Label><Input type="number" step="0.01" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Stock Qty</Label><Input type="number" value={form.quantity_on_hand} onChange={e => setForm(f => ({ ...f, quantity_on_hand: e.target.value }))} /></div>
            <div><Label className="text-xs">Min. Stock Level</Label><Input type="number" value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))} /><p className="text-[11px] text-muted-foreground mt-1">Alert when stock falls to this number</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Par Level (Target)</Label><Input type="number" value={form.par_level} onChange={e => setForm(f => ({ ...f, par_level: e.target.value }))} /><p className="text-[11px] text-muted-foreground mt-1">Desired stock level for auto-reorder</p></div>
            <div><Label className="text-xs">Expiration Date</Label><Input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} /><p className="text-[11px] text-muted-foreground mt-1">Optional — for perishable products</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Expiry Alert (days)</Label><Input type="number" value={form.expiry_alert_days} onChange={e => setForm(f => ({ ...f, expiry_alert_days: e.target.value }))} /><p className="text-[11px] text-muted-foreground mt-1">Days before expiry to start alerting</p></div>
            <div />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief product description" />
          </div>
          {locations && locations.length > 1 && (
            <div>
              <Label className="text-xs">Location</Label>
              <Select value={form.location_id || 'all'} onValueChange={v => setForm(f => ({ ...f, location_id: v === 'all' ? '' : v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All locations" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim() || uploading}>{product ? 'Save Changes' : 'Add Product'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Brands Tab ───
function BrandsTab() {
  const { formatCurrency } = useFormatCurrency();
  const { data: brands, isLoading } = useProductBrands();
  const bulkUpdate = useBulkUpdateProducts();
  const [renamingBrand, setRenamingBrand] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const startRename = (brand: string) => {
    setRenamingBrand(brand);
    setNewName(brand);
  };

  const confirmRename = () => {
    if (renamingBrand && newName.trim() && newName !== renamingBrand) {
      bulkUpdate.mutate({ field: 'brand', oldValue: renamingBrand, newValue: newName.trim() });
    }
    setRenamingBrand(null);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="overflow-x-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Brand</TableHead>
            <TableHead className="text-right">Products</TableHead>
            <TableHead className="text-right">Total Stock</TableHead>
            <TableHead className="text-right">Inventory Value</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {!brands?.length ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No brands found</TableCell></TableRow>
          ) : brands.map(b => (
            <TableRow key={b.brand}>
              <TableCell>
                {renamingBrand === b.brand ? (
                  <div className="flex items-center gap-2">
                    <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-8 w-48" autoFocus onKeyDown={e => e.key === 'Enter' && confirmRename()} />
                    <Button size="icon" variant="ghost" className="w-7 h-7" onClick={confirmRename}><Check className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setRenamingBrand(null)}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                ) : (
                  <span className="font-medium text-sm">{b.brand}</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{b.productCount}</TableCell>
              <TableCell className="text-right tabular-nums">{b.totalStock}</TableCell>
              <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrency(b.totalInventoryValue)}</BlurredAmount></TableCell>
              <TableCell>
                {renamingBrand !== b.brand && b.brand !== 'Uncategorized' && (
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => startRename(b.brand)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Categories Tab ───
function CategoriesTab() {
  const { formatCurrency } = useFormatCurrency();
  const { data: categories, isLoading } = useProductCategorySummaries();
  const { data: allCategoryNames } = useProductCategories();
  const bulkUpdateType = useBulkUpdateProductTypeByCategory();
  const bulkUpdate = useBulkUpdateProducts();
  const createCategory = useCreateProductCategory();
  const deleteCategory = useDeleteProductCategory();
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingCat, setDeletingCat] = useState<string | null>(null);

  const startRename = (cat: string) => { setRenamingCat(cat); setNewName(cat); };
  const confirmRename = () => {
    if (renamingCat && newName.trim() && newName !== renamingCat) {
      bulkUpdate.mutate({ field: 'category', oldValue: renamingCat, newValue: newName.trim() });
    }
    setRenamingCat(null);
  };

  const handleCreateCategory = (name: string) => {
    createCategory.mutate(name, { onSuccess: () => setShowCreateDialog(false) });
  };

  const handleDeleteCategory = () => {
    if (deletingCat) {
      deleteCategory.mutate(deletingCat, { onSuccess: () => setDeletingCat(null) });
    }
  };

  // Merge: show summaries for categories with products + empty categories from the table
  const mergedCategories = useMemo(() => {
    const summaryMap = new Map((categories || []).map(c => [c.category, c]));
    // Add empty categories from the dedicated table that don't appear in summaries
    (allCategoryNames || []).forEach(name => {
      if (!summaryMap.has(name)) {
        summaryMap.set(name, { category: name, productCount: 0, totalInventoryValue: 0, totalStock: 0, typeCounts: {} });
      }
    });
    return Array.from(summaryMap.values()).sort((a, b) => {
      if (a.category === 'Uncategorized') return 1;
      if (b.category === 'Uncategorized') return -1;
      return b.productCount - a.productCount;
    });
  }, [categories, allCategoryNames]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Category
        </Button>
      </div>
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead className="text-right">Total Stock</TableHead>
              <TableHead className="text-right">Inventory Value</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!mergedCategories.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No categories found</TableCell></TableRow>
            ) : mergedCategories.map(c => {
              const typeEntries = Object.entries(c.typeCounts || {}).sort((a, b) => b[1] - a[1]);
              const isSingleType = typeEntries.length === 1;
              const isUncategorized = c.category === 'Uncategorized';
              return (
                <TableRow key={c.category}>
                  <TableCell>
                    {renamingCat === c.category ? (
                      <div className="flex items-center gap-2">
                        <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-8 w-48" autoFocus onKeyDown={e => e.key === 'Enter' && confirmRename()} />
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={confirmRename}><Check className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setRenamingCat(null)}><X className="w-3.5 h-3.5" /></Button>
                      </div>
                    ) : (
                      <span className={cn("font-medium text-sm", isUncategorized && "text-muted-foreground italic")}>{c.category}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isUncategorized || c.productCount === 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {typeEntries.length > 0 ? typeEntries.map(([type]) => (
                          <Badge key={type} variant="secondary" className="text-[10px] px-2 py-0.5">{type}</Badge>
                        )) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    ) : (
                      <Select
                        value={isSingleType ? typeEntries[0][0] : undefined}
                        onValueChange={(val) => bulkUpdateType.mutate({ category: c.category, newType: val })}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs rounded-md px-2">
                          <SelectValue placeholder={isSingleType ? typeEntries[0][0] : 'Mixed'} />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.productCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.totalStock}</TableCell>
                  <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrency(c.totalInventoryValue)}</BlurredAmount></TableCell>
                  <TableCell>
                    {!isUncategorized && renamingCat !== c.category && (
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => startRename(c.category)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => setDeletingCat(c.category)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CategoryFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateCategory}
        isPending={createCategory.isPending}
        mode="create"
        existingCategories={allCategoryNames || []}
      />

      <AlertDialog open={!!deletingCat} onOpenChange={open => !open && setDeletingCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              All products in "{deletingCat}" will be moved to Uncategorized. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteCategory.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Inventory by Location Tab ───
function InventoryByLocationTab() {
  const { formatCurrency } = useFormatCurrency();
  const { data: locations } = useActiveLocations();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const { data: products, isLoading } = useProducts({ locationId: selectedLocationId !== 'all' ? selectedLocationId : undefined });
  const updateProduct = useUpdateProduct();
  const { data: allSuppliers } = useProductSuppliers();
  const [inventoryView, setInventoryView] = useState<'stock' | 'orders'>('stock');
  const [selectedInvIds, setSelectedInvIds] = useState<Set<string>>(new Set());
  const [showBatchReorder, setShowBatchReorder] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showStocktake, setShowStocktake] = useState(false);
  const logMovement = useLogStockMovement();

  // Dialog state
  const [reorderProduct, setReorderProduct] = useState<Product | null>(null);
  const [supplierProduct, setSupplierProduct] = useState<{ id: string; name: string } | null>(null);

  // Build supplier lookup
  const supplierMap = useMemo(() => {
    const map = new Map<string, ProductSupplier>();
    for (const s of allSuppliers || []) {
      map.set(s.product_id, s);
    }
    return map;
  }, [allSuppliers]);

  const lowStockProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => p.reorder_level != null && p.quantity_on_hand != null && p.quantity_on_hand <= p.reorder_level);
  }, [products]);

  // Inventory value summary
  const summary = useMemo(() => {
    if (!products) return { totalUnits: 0, costValue: 0, retailValue: 0, lowStockCount: 0 };
    let totalUnits = 0, costValue = 0, retailValue = 0, lowStockCount = 0;
    for (const p of products) {
      const qty = p.quantity_on_hand || 0;
      totalUnits += qty;
      costValue += (p.cost_price || 0) * qty;
      retailValue += (p.retail_price || 0) * qty;
      if (p.reorder_level != null && p.quantity_on_hand != null && p.quantity_on_hand <= p.reorder_level) lowStockCount++;
    }
    return { totalUnits, costValue, retailValue, lowStockCount };
  }, [products]);

  const adjustStock = (product: Product, delta: number) => {
    const oldQty = product.quantity_on_hand || 0;
    const newQty = Math.max(0, oldQty + delta);
    updateProduct.mutate({ id: product.id, updates: { quantity_on_hand: newQty } });
    if (orgId) {
      logMovement.mutate({
        organization_id: orgId,
        product_id: product.id,
        quantity_change: newQty - oldQty,
        quantity_after: newQty,
        reason: 'manual_adjust',
      });
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Location selector + view toggle + export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {locations && locations.length > 1 && (
            <>
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedLocationId !== 'all' && (
                <span className="text-xs text-muted-foreground">{products?.length ?? 0} product(s)</span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size={tokens.button.inline}
            className="gap-1.5"
            onClick={() => setShowStocktake(true)}
          >
            <ClipboardCheck className="w-3.5 h-3.5" /> Stocktake
          </Button>
          {locations && locations.length > 1 && (
            <Button
              variant="outline"
              size={tokens.button.inline}
              className="gap-1.5"
              onClick={() => setShowTransferDialog(true)}
            >
              <ArrowRight className="w-3.5 h-3.5" /> Transfer Stock
            </Button>
          )}
          {orgId && (
            <Button
              variant="outline"
              size={tokens.button.inline}
              className="gap-1.5"
              onClick={async () => {
                try {
                  const { exportStockMovementsCsv } = await import('@/lib/exportStockMovementsCsv');
                  await exportStockMovementsCsv(orgId);
                  sonnerToast.success('Stock movements exported');
                } catch {
                  sonnerToast.error('Failed to export');
                }
              }}
            >
              <Download className="w-3.5 h-3.5" /> Export Movements
            </Button>
          )}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <Button
              variant={inventoryView === 'stock' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-3 text-xs gap-1.5"
              onClick={() => setInventoryView('stock')}
            >
              <Package className="w-3.5 h-3.5" /> Stock
            </Button>
            <Button
              variant={inventoryView === 'orders' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-3 text-xs gap-1.5"
              onClick={() => setInventoryView('orders')}
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Purchase Orders
            </Button>
          </div>
        </div>
      </div>

      {inventoryView === 'orders' ? (
        <PurchaseOrdersPanel />
      ) : (
        <>
          {/* Alert Settings Card */}
          <AlertSettingsCard />

          {/* Inventory Value Summary */}
          {products && products.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground">Total Units</div>
                <div className="text-lg font-medium tabular-nums mt-0.5">
                  <AnimatedBlurredAmount value={summary.totalUnits} />
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground">Cost Value</div>
                <div className="text-lg font-medium tabular-nums mt-0.5">
                  <AnimatedBlurredAmount value={summary.costValue} currency="USD" />
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground">Retail Value</div>
                <div className="text-lg font-medium tabular-nums mt-0.5">
                  <AnimatedBlurredAmount value={summary.retailValue} currency="USD" />
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground">Low Stock</div>
                <div className={cn('text-lg font-medium tabular-nums mt-0.5', summary.lowStockCount > 0 && 'text-amber-600 dark:text-amber-400')}>
                  {summary.lowStockCount}
                </div>
              </div>
            </div>
          )}

          {lowStockProducts.length > 0 && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">{lowStockProducts.length} product(s) at or below minimum stock level</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size={tokens.button.inline}
                    className="gap-1"
                    onClick={() => {
                      setSelectedInvIds(new Set(lowStockProducts.map(p => p.id)));
                    }}
                  >
                    Select All Low Stock
                  </Button>
                  <Button
                    size={tokens.button.inline}
                    className="gap-1"
                    disabled={selectedInvIds.size === 0}
                    onClick={() => setShowBatchReorder(true)}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Batch Reorder ({selectedInvIds.size})
                  </Button>
                </div>
              </div>
            </div>
          )}
          {selectedInvIds.size > 0 && lowStockProducts.length === 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
              <span className="text-sm font-medium">{selectedInvIds.size} selected</span>
              <Button
                size={tokens.button.inline}
                className="gap-1"
                onClick={() => setShowBatchReorder(true)}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Batch Reorder
              </Button>
            </div>
          )}
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={products?.length ? selectedInvIds.size === products.length : false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedInvIds(new Set(products?.map(p => p.id)));
                        } else {
                          setSelectedInvIds(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Min. Stock</TableHead>
                  <TableHead className="text-right">Lead Time</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-center w-32">Adjust</TableHead>
                  <TableHead className="w-8" />
                  <TableHead className="text-center w-24">Reorder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!products?.length ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No products{selectedLocationId !== 'all' ? ' at this location' : ''}</TableCell></TableRow>
                ) : products.map(p => {
                  const isLow = p.reorder_level != null && p.quantity_on_hand != null && p.quantity_on_hand <= p.reorder_level;
                  const supplier = supplierMap.get(p.id);
                  return (
                      <TableRow key={p.id} className={cn(isLow && 'bg-amber-50/50 dark:bg-amber-950/10')}>
                      <TableCell>
                        <Checkbox
                          checked={selectedInvIds.has(p.id)}
                          onCheckedChange={(checked) => {
                            setSelectedInvIds(prev => {
                              const next = new Set(prev);
                              if (checked) next.add(p.id); else next.delete(p.id);
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 shrink-0">
                            {p.image_url && <AvatarImage src={p.image_url} alt={p.name} className="object-cover" />}
                            <AvatarFallback className="text-[10px] font-medium bg-muted">{getInitials(p.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.brand || '—'}</TableCell>
                      <TableCell>
                        {supplier ? (
                          <button
                            className="text-sm text-primary hover:underline cursor-pointer"
                            onClick={() => setSupplierProduct({ id: p.id, name: p.name })}
                          >
                            {supplier.supplier_name}
                          </button>
                        ) : (
                          <button
                            className="text-xs text-muted-foreground hover:text-primary cursor-pointer"
                            onClick={() => setSupplierProduct({ id: p.id, name: p.name })}
                          >
                            + Add
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{p.quantity_on_hand ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{p.reorder_level ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {supplier?.avg_delivery_days ? (
                          <span className="text-xs tabular-nums text-muted-foreground" title={`Based on ${supplier.delivery_count} delivery${supplier.delivery_count !== 1 ? 'ies' : ''}`}>
                            {Math.round(supplier.avg_delivery_days as number)}d
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isLow ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 text-[10px]">Low</Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:text-emerald-400 text-[10px]">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => adjustStock(p, -1)} disabled={!p.quantity_on_hand}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm tabular-nums">{p.quantity_on_hand ?? 0}</span>
                          <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => adjustStock(p, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StockMovementHistory productId={p.id} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant={isLow ? 'default' : 'outline'}
                          size={tokens.button.inline}
                          className="gap-1"
                          onClick={() => setReorderProduct(p)}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          {isLow ? 'Reorder' : 'Order'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Reorder Dialog */}
      {reorderProduct && orgId && (
        <ReorderDialog
          open={!!reorderProduct}
          onOpenChange={open => !open && setReorderProduct(null)}
          product={reorderProduct}
          organizationId={orgId}
          onOpenSupplier={() => {
            setSupplierProduct({ id: reorderProduct.id, name: reorderProduct.name });
          }}
        />
      )}

      {/* Supplier Dialog */}
      {supplierProduct && orgId && (
        <SupplierDialog
          open={!!supplierProduct}
          onOpenChange={open => !open && setSupplierProduct(null)}
          productId={supplierProduct.id}
          productName={supplierProduct.name}
          organizationId={orgId}
        />
      )}

      {/* Batch Reorder Dialog */}
      {showBatchReorder && orgId && (
        <BatchReorderDialog
          open={showBatchReorder}
          onOpenChange={(open) => { if (!open) { setShowBatchReorder(false); setSelectedInvIds(new Set()); } }}
          products={(products || []).filter(p => selectedInvIds.has(p.id))}
          supplierMap={supplierMap}
          organizationId={orgId}
        />
      )}

      {/* Stock Transfer Dialog */}
      <StockTransferDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
      />
    </div>
  );
}

// ─── Main Export ───
export function RetailProductsSettingsContent() {
  const navigate = useNavigate();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: retailSettings, isLoading: retailLoading } = useWebsiteRetailSettings();
  const { data: allProducts } = useProducts({});
  const onlineCount = allProducts?.filter(p => p.available_online).length ?? 0;
  const totalCount = allProducts?.length ?? 0;
  const storeEnabled = retailSettings?.enabled === true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button variant="outline" size={tokens.button.card} className="gap-1.5" onClick={() => navigate('/dashboard/admin/analytics?tab=sales&subtab=retail')}>
          <BarChart3 className="w-4 h-4" /> View Retail Analytics
        </Button>
      </div>

      {/* Online Store Status Banner */}
      {!retailLoading && (
        storeEnabled ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Online Store is active
              </span>
              <span className="text-sm text-emerald-600/80 dark:text-emerald-400/70">
                — {onlineCount} of {totalCount} products visible online
              </span>
            </div>
            <Button variant="ghost" size={tokens.button.inline} className="gap-1.5 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 shrink-0" onClick={() => navigate('/dashboard/admin/website-hub')}>
              Manage Store Settings <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                Online Store is not active. Clients cannot browse or purchase products online.
              </span>
            </div>
            <Button variant="ghost" size={tokens.button.inline} className="gap-1.5 text-amber-700 dark:text-amber-300 hover:text-amber-800 shrink-0" onClick={() => navigate('/dashboard/admin/website-hub')}>
              Activate Online Store <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        )
      )}

      <Tabs defaultValue="products" className="w-full">
        <TabsList>
          <TabsTrigger value="products" className="gap-1.5"><Package className="w-3.5 h-3.5" /> Products</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5"><MapPin className="w-3.5 h-3.5" /> Inventory</TabsTrigger>
          <TabsTrigger value="clearance" className="gap-1.5"><Tag className="w-3.5 h-3.5" /> Clearance</TabsTrigger>
          <TabsTrigger value="gift-cards" className="gap-1.5"><Gift className="w-3.5 h-3.5" /> Gift Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <ProductsTab />
        </TabsContent>

        <TabsContent value="brands" className="mt-4">
          <BrandsTab />
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <InventoryByLocationTab />
        </TabsContent>

        <TabsContent value="clearance" className="mt-4">
          {effectiveOrganization?.id ? (
            <ClearancePanel organizationId={effectiveOrganization.id} />
          ) : null}
        </TabsContent>

        <TabsContent value="gift-cards" className="mt-4">
          <GiftCardsHub />
        </TabsContent>
      </Tabs>
    </div>
  );
}
