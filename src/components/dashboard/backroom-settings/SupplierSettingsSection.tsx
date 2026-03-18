/**
 * SupplierSettingsSection — Central supplier management: list, edit, link/unlink products.
 */
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Truck, Plus, X, AlertTriangle, Package, Loader2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  useSupplierGroups,
  useUnlinkedProducts,
  useUpdateSupplierContact,
  useLinkProducts,
  useUnlinkProduct,
  type SupplierGroup,
} from '@/hooks/backroom/useSupplierSettings';
import { useProducts } from '@/hooks/useProducts';
import { useBackroomOrgId } from '@/hooks/backroom/useBackroomOrgId';

interface ContactForm {
  supplier_email: string;
  supplier_phone: string;
  supplier_website: string;
  account_number: string;
  lead_time_days: string;
  moq: string;
}

export function SupplierSettingsSection() {
  const { data: groups, isLoading: groupsLoading } = useSupplierGroups();
  const { data: unlinked, isLoading: unlinkedLoading } = useUnlinkedProducts();
  const updateContact = useUpdateSupplierContact();
  const linkProducts = useLinkProducts();
  const unlinkProduct = useUnlinkProduct();
  const orgId = useBackroomOrgId();

  const [selected, setSelected] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const selectedGroup = useMemo(
    () => groups?.find(g => g.supplier_name === selected) ?? null,
    [groups, selected]
  );

  // Auto-select first supplier
  useEffect(() => {
    if (!selected && groups?.length) {
      setSelected(groups[0].supplier_name);
    }
  }, [groups, selected]);

  const { register, handleSubmit, reset } = useForm<ContactForm>();

  // Sync form when selection changes
  useEffect(() => {
    if (selectedGroup) {
      reset({
        supplier_email: selectedGroup.supplier_email || '',
        supplier_phone: selectedGroup.supplier_phone || '',
        supplier_website: selectedGroup.supplier_website || '',
        account_number: selectedGroup.account_number || '',
        lead_time_days: selectedGroup.lead_time_days?.toString() || '',
        moq: selectedGroup.moq?.toString() || '1',
      });
    }
  }, [selectedGroup, reset]);

  const onSaveContact = (data: ContactForm) => {
    if (!selected) return;
    updateContact.mutate({
      supplier_name: selected,
      supplier_email: data.supplier_email || null,
      supplier_phone: data.supplier_phone || null,
      supplier_website: data.supplier_website || null,
      account_number: data.account_number || null,
      lead_time_days: data.lead_time_days ? parseInt(data.lead_time_days) : null,
      moq: data.moq ? parseInt(data.moq) : 1,
    });
  };

  // Product name lookup
  const { data: allProducts } = useProducts();
  const productNameMap = useMemo(() => {
    const map = new Map<string, { name: string; brand: string | null }>();
    if (allProducts) {
      for (const p of allProducts) {
        map.set(p.id, { name: p.name, brand: p.brand });
      }
    }
    return map;
  }, [allProducts]);

  const handleAddSupplier = () => {
    if (!newSupplierName.trim()) return;
    setSelected(newSupplierName.trim());
    setAddSupplierOpen(false);
    setNewSupplierName('');
    // The supplier will be created when products are linked
  };

  // Unlinked products grouped by brand
  const unlinkedBrands = useMemo(() => {
    if (!unlinked) return [];
    const brandMap = new Map<string, typeof unlinked>();
    for (const p of unlinked) {
      const brand = p.brand || 'Uncategorized';
      if (!brandMap.has(brand)) brandMap.set(brand, []);
      brandMap.get(brand)!.push(p);
    }
    return Array.from(brandMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [unlinked]);

  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={tokens.heading.section}>Suppliers</h2>
        <p className={tokens.body.muted}>Manage supplier contacts and product assignments.</p>
      </div>

      {/* Main supplier panel */}
      <Card>
        <CardContent className="p-0">
          <div className="flex min-h-[480px]">
            {/* Left: Supplier List */}
            <div className="w-64 shrink-0 border-r border-border/60">
              <div className="p-4 border-b border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setAddSupplierOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Supplier
                </Button>
              </div>
              <ScrollArea className="h-[420px]">
                <div className="p-2 space-y-0.5">
                  {groups?.length === 0 && (
                    <div className={cn(tokens.empty.container, 'py-8')}>
                      <Truck className={tokens.empty.icon} />
                      <p className={tokens.empty.description}>No suppliers yet</p>
                    </div>
                  )}
                  {groups?.map(g => (
                    <button
                      key={g.supplier_name}
                      onClick={() => setSelected(g.supplier_name)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-sans transition-colors text-left',
                        selected === g.supplier_name
                          ? 'bg-muted text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <span className="truncate">{g.supplier_name}</span>
                      <Badge variant="secondary" className="ml-2 shrink-0 text-xs">
                        {g.product_ids.length}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Detail Panel */}
            <div className="flex-1 min-w-0">
              {!selectedGroup && selected && !groups?.find(g => g.supplier_name === selected) ? (
                // New supplier — no rows yet, prompt to link products
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className={tokens.heading.card}>{selected}</h3>
                    <p className={tokens.body.muted}>New supplier — link products to create.</p>
                  </div>
                  <Button size="sm" onClick={() => setLinkDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Link Products
                  </Button>
                </div>
              ) : selectedGroup ? (
                <div className="p-6 space-y-6">
                  {/* Supplier name */}
                  <div>
                    <h3 className={tokens.heading.card}>{selectedGroup.supplier_name}</h3>
                    <p className={tokens.body.muted}>
                      {selectedGroup.product_ids.length} product{selectedGroup.product_ids.length !== 1 ? 's' : ''} linked
                    </p>
                  </div>

                  {/* Contact form */}
                  <form onSubmit={handleSubmit(onSaveContact)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="se" className={tokens.label.default}>Email</Label>
                        <Input id="se" type="email" {...register('supplier_email')} placeholder="orders@supplier.com" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sp" className={tokens.label.default}>Phone</Label>
                        <Input id="sp" {...register('supplier_phone')} placeholder="(555) 123-4567" autoCapitalize="off" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sw" className={tokens.label.default}>Website</Label>
                      <Input id="sw" {...register('supplier_website')} placeholder="https://supplier.com" autoCapitalize="off" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="sa" className={tokens.label.default}>Account #</Label>
                        <Input id="sa" {...register('account_number')} placeholder="ACC-123" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sl" className={tokens.label.default}>Lead Time (days)</Label>
                        <Input id="sl" type="number" {...register('lead_time_days')} placeholder="5" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sm" className={tokens.label.default}>MOQ</Label>
                        <Input id="sm" type="number" {...register('moq')} placeholder="1" />
                      </div>
                    </div>
                    <Button type="submit" size="sm" disabled={updateContact.isPending}>
                      {updateContact.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                      Save Contact Info
                    </Button>
                  </form>

                  <Separator />

                  {/* Linked products */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={tokens.heading.subsection}>Linked Products</h4>
                      <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Link Products
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {selectedGroup.rows.map(row => {
                        const prod = productNameMap.get(row.product_id);
                        return (
                          <div key={row.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="min-w-0">
                              <span className={tokens.body.default}>{prod?.name || row.product_id}</span>
                              {prod?.brand && (
                                <span className="text-muted-foreground text-xs ml-2">{prod.brand}</span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => unlinkProduct.mutate(row.id)}
                              disabled={unlinkProduct.isPending}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={cn(tokens.empty.container, 'h-full')}>
                  <Truck className={tokens.empty.icon} />
                  <h3 className={tokens.empty.heading}>Select a supplier</h3>
                  <p className={tokens.empty.description}>Choose a supplier from the list or add a new one.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unlinked Products Banner */}
      {!unlinkedLoading && unlinked && unlinked.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <CardTitle className={tokens.heading.card}>
                Unlinked Products
              </CardTitle>
              <Badge variant="secondary" className="ml-1">{unlinked.length}</Badge>
            </div>
            <CardDescription className={tokens.body.muted}>
              These products have no supplier assigned. Assign them to enable automated PO creation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unlinkedBrands.map(([brand, products]) => (
                <div key={brand}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(tokens.body.emphasis, 'text-sm')}>{brand}</span>
                    {groups && groups.length > 0 && (
                      <AssignBrandDropdown
                        brand={brand}
                        productIds={products.map(p => p.id)}
                        suppliers={groups}
                        onAssign={(supplierName, pids) => linkProducts.mutate({ supplier_name: supplierName, product_ids: pids })}
                        isPending={linkProducts.isPending}
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    {products.slice(0, 5).map(p => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className={cn(tokens.body.default, 'truncate')}>{p.name}</span>
                        </div>
                        {groups && groups.length > 0 && (
                          <Select
                            onValueChange={(val) => linkProducts.mutate({ supplier_name: val, product_ids: [p.id] })}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue placeholder="Assign..." />
                            </SelectTrigger>
                            <SelectContent>
                              {groups.map(g => (
                                <SelectItem key={g.supplier_name} value={g.supplier_name}>
                                  {g.supplier_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                    {products.length > 5 && (
                      <p className={cn(tokens.body.muted, 'px-3 py-1 text-xs')}>
                        + {products.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link Products Dialog */}
      <LinkProductsDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        supplierName={selected}
        alreadyLinked={selectedGroup?.product_ids || []}
        onLink={(pids) => {
          if (selected) {
            linkProducts.mutate({ supplier_name: selected, product_ids: pids }, {
              onSuccess: () => setLinkDialogOpen(false),
            });
          }
        }}
        isPending={linkProducts.isPending}
      />

      {/* Add Supplier Dialog */}
      <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
            <DialogDescription>Enter the supplier name. You can add contact details after.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className={tokens.label.default}>Supplier Name</Label>
              <Input
                value={newSupplierName}
                onChange={e => setNewSupplierName(e.target.value)}
                placeholder="e.g. Goldwell Distribution"
                onKeyDown={e => e.key === 'Enter' && handleAddSupplier()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddSupplierOpen(false)}>Cancel</Button>
              <Button onClick={handleAddSupplier} disabled={!newSupplierName.trim()}>
                Add Supplier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Dropdown to assign all products in a brand to a supplier */
function AssignBrandDropdown({
  brand,
  productIds,
  suppliers,
  onAssign,
  isPending,
}: {
  brand: string;
  productIds: string[];
  suppliers: SupplierGroup[];
  onAssign: (name: string, ids: string[]) => void;
  isPending: boolean;
}) {
  return (
    <Select onValueChange={(val) => onAssign(val, productIds)} disabled={isPending}>
      <SelectTrigger className="w-40 h-8 text-xs">
        <SelectValue placeholder={`Assign all ${brand}...`} />
      </SelectTrigger>
      <SelectContent>
        {suppliers.map(s => (
          <SelectItem key={s.supplier_name} value={s.supplier_name}>
            {s.supplier_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Dialog for multi-selecting unlinked products to link to a supplier */
function LinkProductsDialog({
  open,
  onOpenChange,
  supplierName,
  alreadyLinked,
  onLink,
  isPending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  supplierName: string | null;
  alreadyLinked: string[];
  onLink: (ids: string[]) => void;
  isPending: boolean;
}) {
  const { data: unlinked } = useUnlinkedProducts();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setSearch('');
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!unlinked) return [];
    const q = search.toLowerCase();
    return unlinked
      .filter(p => !alreadyLinked.includes(p.id))
      .filter(p => !q || p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q));
  }, [unlinked, search, alreadyLinked]);

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link Products to {supplierName}</DialogTitle>
          <DialogDescription>Select products to assign to this supplier.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-9"
              autoCapitalize="off"
            />
          </div>
          <ScrollArea className="h-[300px] border border-border/60 rounded-lg">
            <div className="p-2 space-y-0.5">
              {filtered.length === 0 && (
                <p className={cn(tokens.body.muted, 'text-center py-8')}>No unlinked products found</p>
              )}
              {filtered.map(p => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.has(p.id)}
                    onCheckedChange={() => toggle(p.id)}
                  />
                  <div className="min-w-0">
                    <span className={tokens.body.default}>{p.name}</span>
                    {p.brand && <span className="text-muted-foreground text-xs ml-2">{p.brand}</span>}
                  </div>
                </label>
              ))}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between">
            <span className={tokens.body.muted}>{selectedIds.size} selected</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => onLink(Array.from(selectedIds))} disabled={selectedIds.size === 0 || isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Link {selectedIds.size} Product{selectedIds.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
