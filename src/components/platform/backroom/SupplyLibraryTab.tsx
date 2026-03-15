import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Package, Plus, Database, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSupplyLibraryProducts,
  useSupplyLibraryBrands,
  useSupplyLibraryInitStatus,
  useSeedSupplyLibrary,
  type SupplyLibraryProduct,
} from '@/hooks/platform/useSupplyLibrary';
import { SUPPLY_CATEGORY_LABELS } from '@/data/professional-supply-library';

const CATEGORIES = ['color', 'lightener', 'developer', 'toner', 'bond builder', 'treatment', 'additive'];
const DEPLETION_METHODS = ['weighed', 'per_service', 'manual', 'per_pump'];
const UNITS = ['g', 'ml', 'oz'];

export function SupplyLibraryTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<SupplyLibraryProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplyLibraryProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: initStatus, isLoading: initLoading } = useSupplyLibraryInitStatus();
  const seedMutation = useSeedSupplyLibrary();

  const { data: products = [], isLoading } = useSupplyLibraryProducts({
    brand: brandFilter !== 'all' ? brandFilter : undefined,
    search: search || undefined,
  });
  const { data: brands = [] } = useSupplyLibraryBrands();

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

  // Show initialization panel if DB is empty
  if (!initLoading && initStatus && !initStatus.isInitialized) {
    return (
      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Database className="w-7 h-7 text-primary" />
          </div>
          <h3 className={cn(tokens.heading.section)}>Initialize Supply Library</h3>
          <p className="text-muted-foreground font-sans text-sm max-w-md mx-auto">
            The supply library database is empty. Import the built-in library of 2,000+ professional products to get started.
          </p>
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="font-sans"
          >
            {seedMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
            ) : (
              <><Database className="w-4 h-4" /> Import Built-in Library</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Package className={tokens.card.icon} />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>Supply Library</CardTitle>
                <CardDescription className="font-sans text-sm">
                  {initStatus?.count ?? 0} products across {brands.length} brands
                </CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={() => { setEditProduct(null); setAddOpen(true); }} className="font-sans gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 font-sans"
              />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[200px] font-sans">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className={tokens.loading.spinner} />
            </div>
          ) : products.length === 0 ? (
            <div className={tokens.empty.container}>
              <Package className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No products found</h3>
              <p className={tokens.empty.description}>Try adjusting your filters</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={tokens.table.columnHeader}>Brand</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Name</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Category</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Depletion</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Unit</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Sizes</TableHead>
                    <TableHead className={cn(tokens.table.columnHeader, 'w-[80px]')}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.slice(0, 100).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-sans text-sm">{p.brand}</TableCell>
                      <TableCell className="font-sans text-sm font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-sans text-xs">
                          {SUPPLY_CATEGORY_LABELS[p.category] || p.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-sans text-xs text-muted-foreground">{p.default_depletion}</TableCell>
                      <TableCell className="font-sans text-xs text-muted-foreground">{p.default_unit}</TableCell>
                      <TableCell className="font-sans text-xs text-muted-foreground">
                        {p.size_options?.join(', ') || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditProduct(p); setAddOpen(true); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {products.length > 100 && (
                <div className="px-4 py-2 text-xs text-muted-foreground font-sans border-t border-border/40">
                  Showing 100 of {products.length} results. Use filters to narrow down.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
              <AlertTriangle className="w-4 h-4 text-destructive" /> Remove Product
            </DialogTitle>
            <DialogDescription className="font-sans text-sm">
              This will soft-delete "{deleteTarget?.name}" from the supply library. Organizations that already added it will keep their copy.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="font-sans">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="font-sans">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
            </Button>
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

  // Reset form when product changes
  const resetForm = () => {
    setBrand(product?.brand || '');
    setName(product?.name || '');
    setCategory(product?.category || 'color');
    setDepletion(product?.default_depletion || 'weighed');
    setUnit(product?.default_unit || 'g');
    setSizes(product?.size_options?.join(', ') || '');
  };

  const handleSave = async () => {
    if (!brand.trim() || !name.trim()) return;
    setSaving(true);
    try {
      const sizeArr = sizes.split(',').map((s) => s.trim()).filter(Boolean);
      const payload = {
        brand: brand.trim(),
        name: name.trim(),
        category,
        default_depletion: depletion,
        default_unit: unit,
        size_options: sizeArr,
      };

      if (isEdit && product) {
        const { error } = await supabase
          .from('supply_library_products')
          .update(payload)
          .eq('id', product.id);
        if (error) throw error;
        toast.success('Product updated');
      } else {
        const { error } = await supabase
          .from('supply_library_products')
          .insert({ ...payload, is_active: true });
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
            <Input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Schwarzkopf"
              className="font-sans"
              list="brand-suggestions"
            />
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-sans">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !brand.trim() || !name.trim()} className="font-sans">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Save Changes' : 'Add Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
