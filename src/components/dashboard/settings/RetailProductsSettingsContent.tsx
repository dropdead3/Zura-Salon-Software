import { useState, useMemo, useRef } from 'react';
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
  Loader2, Check, X, MapPin, CheckCircle2, Info, ExternalLink, ImagePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useProducts, useCreateProduct, useUpdateProduct, useProductBrandsList, type Product } from '@/hooks/useProducts';
import { useProductBrands, useProductCategorySummaries } from '@/hooks/useProductBrands';
import { useProductCategories } from '@/hooks/useProducts';
import { isExtensionProduct, isGiftCardProduct, isMerchProduct } from '@/utils/serviceCategorization';
import { useBulkUpdateProducts, useBulkToggleProducts } from '@/hooks/useBulkUpdateProducts';
import { useActiveLocations } from '@/hooks/useLocations';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useWebsiteRetailSettings } from '@/hooks/useWebsiteSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import { optimizeImage } from '@/lib/image-utils';
// Helper to classify product type — prefer DB column, fall back to regex
function getProductType(product: Product): string {
  if (product.product_type && product.product_type !== 'Products') return product.product_type;
  if (product.product_type === 'Products') return 'Products';
  // Fallback for legacy rows without product_type
  if (isExtensionProduct(product.name)) return 'Extensions';
  if (isGiftCardProduct(product.name)) return 'Gift Cards';
  if (isMerchProduct(product.name)) return 'Merch';
  return 'Products';
}

const PRODUCT_TYPES = ['Products', 'Extensions', 'Gift Cards', 'Merch'] as const;

// ─── Products Tab ───
function ProductsTab() {
  const { formatCurrency } = useFormatCurrency();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { data: products, isLoading } = useProducts({
    search,
    category: categoryFilter,
    brand: brandFilter,
    productType: typeFilter !== 'all' ? typeFilter : undefined,
    locationId: locationFilter !== 'all' ? locationFilter : undefined,
    lowStockOnly,
  });
  const { data: categories } = useProductCategories();
  const { data: brands } = useProductBrandsList();
  const { data: locations } = useActiveLocations();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const bulkToggle = useBulkToggleProducts();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockValue, setStockValue] = useState('');

  // Client-side type filtering
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (typeFilter === 'all') return products;
    return products.filter(p => getProductType(p.name) === typeFilter);
  }, [products, typeFilter]);

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

  const showLocationFilter = locations && locations.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search products, SKU, barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {showLocationFilter && (
          <Select value={locationFilter} onValueChange={setLocationFilter}>
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
        <div className="flex items-center gap-2">
          <Switch checked={lowStockOnly} onCheckedChange={setLowStockOnly} id="low-stock" />
          <Label htmlFor="low-stock" className="text-sm cursor-pointer">Low Stock</Label>
        </div>
        <Button size={tokens.button.card} onClick={() => setShowAddDialog(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Product count */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}</span>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size={tokens.button.inline} variant="outline" onClick={() => bulkToggle.mutate({ ids: Array.from(selectedIds), isActive: false })}>
            Deactivate
          </Button>
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
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Retail</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Reorder</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredProducts?.length ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
              ) : filteredProducts.map(p => {
                const isLow = p.reorder_level != null && p.quantity_on_hand != null && p.quantity_on_hand <= p.reorder_level;
                const productType = getProductType(p.name);
                return (
                  <TableRow key={p.id} className={cn(isLow && 'bg-amber-50/50 dark:bg-amber-950/10')}>
                    <TableCell><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded border-border" /></TableCell>
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.brand || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.category || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{productType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{p.sku || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm"><BlurredAmount>{p.retail_price != null ? formatCurrency(p.retail_price) : '—'}</BlurredAmount></TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground"><BlurredAmount>{p.cost_price != null ? formatCurrency(p.cost_price) : '—'}</BlurredAmount></TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
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
                            'inline-flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer rounded transition-colors',
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
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{p.reorder_level ?? '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditProduct(p)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {(showAddDialog || editProduct) && (
        <ProductFormDialog
          product={editProduct}
          onClose={() => { setShowAddDialog(false); setEditProduct(null); }}
          onSave={(data) => {
            if (editProduct) {
              updateProduct.mutate({ id: editProduct.id, updates: data });
            } else {
              createProduct.mutate(data);
            }
            setShowAddDialog(false);
            setEditProduct(null);
          }}
        />
      )}
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
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    retail_price: product?.retail_price?.toString() || '',
    cost_price: product?.cost_price?.toString() || '',
    quantity_on_hand: product?.quantity_on_hand?.toString() || '',
    reorder_level: product?.reorder_level?.toString() || '',
    description: product?.description || '',
    location_id: product?.location_id || '',
    image_url: product?.image_url || '',
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
      sku: form.sku || null,
      barcode: form.barcode || null,
      retail_price: form.retail_price ? parseFloat(form.retail_price) : null,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      quantity_on_hand: form.quantity_on_hand ? parseInt(form.quantity_on_hand) : null,
      reorder_level: form.reorder_level ? parseInt(form.reorder_level) : null,
      description: form.description || null,
      location_id: form.location_id || null,
      image_url: form.image_url || null,
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
            <div><Label className="text-xs">Reorder Level</Label><Input type="number" value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))} /></div>
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
  const bulkUpdate = useBulkUpdateProducts();
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const startRename = (cat: string) => { setRenamingCat(cat); setNewName(cat); };
  const confirmRename = () => {
    if (renamingCat && newName.trim() && newName !== renamingCat) {
      bulkUpdate.mutate({ field: 'category', oldValue: renamingCat, newValue: newName.trim() });
    }
    setRenamingCat(null);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="overflow-x-auto border rounded-lg">
      <Table>
         <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Products</TableHead>
            <TableHead className="text-right">Total Stock</TableHead>
            <TableHead className="text-right">Inventory Value</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {!categories?.length ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No categories found</TableCell></TableRow>
          ) : categories.map(c => {
            const typeEntries = Object.entries(c.typeCounts || {}).sort((a, b) => b[1] - a[1]);
            const isSingleType = typeEntries.length === 1;
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
                  <span className="font-medium text-sm">{c.category}</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {typeEntries.map(([type, count]) => (
                    <Badge key={type} variant="secondary" className="text-[10px] px-2 py-0.5">
                      {isSingleType ? type : `${type} (${count})`}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{c.productCount}</TableCell>
              <TableCell className="text-right tabular-nums">{c.totalStock}</TableCell>
              <TableCell className="text-right tabular-nums"><BlurredAmount>{formatCurrency(c.totalInventoryValue)}</BlurredAmount></TableCell>
              <TableCell>
                {renamingCat !== c.category && c.category !== 'Uncategorized' && (
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => startRename(c.category)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );})}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Inventory by Location Tab ───
function InventoryByLocationTab() {
  const { formatCurrency } = useFormatCurrency();
  const { data: locations } = useActiveLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const { data: products, isLoading } = useProducts({ locationId: selectedLocationId !== 'all' ? selectedLocationId : undefined });
  const updateProduct = useUpdateProduct();

  const lowStockProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => p.reorder_level != null && p.quantity_on_hand != null && p.quantity_on_hand <= p.reorder_level);
  }, [products]);

  const adjustStock = (product: Product, delta: number) => {
    const newQty = Math.max(0, (product.quantity_on_hand || 0) + delta);
    updateProduct.mutate({ id: product.id, updates: { quantity_on_hand: newQty } });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Location selector */}
      {locations && locations.length > 1 && (
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Select location" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedLocationId !== 'all' && (
            <span className="text-xs text-muted-foreground">{products?.length ?? 0} product(s) at this location</span>
          )}
        </div>
      )}

      {lowStockProducts.length > 0 && (
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">{lowStockProducts.length} product(s) below reorder level</span>
          </div>
        </div>
      )}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Retail Price</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Reorder Level</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="text-center w-32">Adjust</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!products?.length ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No products{selectedLocationId !== 'all' ? ' at this location' : ''}</TableCell></TableRow>
            ) : products.map(p => {
              const isLow = p.reorder_level != null && p.quantity_on_hand != null && p.quantity_on_hand <= p.reorder_level;
              return (
                <TableRow key={p.id} className={cn(isLow && 'bg-amber-50/50 dark:bg-amber-950/10')}>
                  <TableCell className="font-medium text-sm">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.brand || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.category || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    <BlurredAmount>{p.retail_price != null ? formatCurrency(p.retail_price) : '—'}</BlurredAmount>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{p.quantity_on_hand ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{p.reorder_level ?? '—'}</TableCell>
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Main Export ───
export function RetailProductsSettingsContent() {
  const navigate = useNavigate();
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
      </Tabs>
    </div>
  );
}
