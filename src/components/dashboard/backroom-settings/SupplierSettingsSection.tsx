/**
 * SupplierSettingsSection — Central supplier management: list, edit, link/unlink products.
 * Enhanced with rename, delete, search, reorder fields, unlink confirmation, reassign, and stats.
 */
import { useState, useEffect, useMemo } from 'react';
import { AddSupplierWizard } from './AddSupplierWizard';
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
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Truck, Plus, X, AlertTriangle, Package, Loader2, Search, Pencil, Trash2, FileText, ShoppingCart } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import {
  useSupplierGroups,
  useUnlinkedProducts,
  useAllProductsWithSupplier,
  useSupplierStats,
  useSupplierSpendSummary,
  useUpdateSupplierContact,
  useLinkProducts,
  useUnlinkProduct,
  useRenameSupplier,
  useDeleteSupplier,
  type SupplierGroup,
} from '@/hooks/backroom/useSupplierSettings';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useProducts } from '@/hooks/useProducts';
import { useBackroomOrgId } from '@/hooks/backroom/useBackroomOrgId';

interface ContactForm {
  contact_name: string;
  supplier_email: string;
  supplier_phone: string;
  supplier_website: string;
  account_number: string;
  lead_time_days: string;
  moq: string;
  reorder_method: string;
  reorder_method_other: string;
  reorder_notes: string;
  secondary_contact_name: string;
  secondary_contact_email: string;
  secondary_contact_phone: string;
}

export function SupplierSettingsSection() {
  const { data: groups, isLoading: groupsLoading } = useSupplierGroups();
  const { data: unlinked, isLoading: unlinkedLoading } = useUnlinkedProducts();
  const updateContact = useUpdateSupplierContact();
  const linkProducts = useLinkProducts();
  const unlinkProduct = useUnlinkProduct();
  const renameSupplier = useRenameSupplier();
  const deleteSupplier = useDeleteSupplier();
  const orgId = useBackroomOrgId();

  const [selected, setSelected] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [renameMode, setRenameMode] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const selectedGroup = useMemo(
    () => groups?.find(g => g.supplier_name === selected) ?? null,
    [groups, selected]
  );

  // Filter supplier list by search
  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (!searchFilter.trim()) return groups;
    const q = searchFilter.toLowerCase();
    return groups.filter(g => g.supplier_name.toLowerCase().includes(q));
  }, [groups, searchFilter]);

  // Auto-select first supplier
  useEffect(() => {
    if (!selected && groups?.length) {
      setSelected(groups[0].supplier_name);
    }
  }, [groups, selected]);

  const { register, handleSubmit, reset, setValue, watch } = useForm<ContactForm>();

  // Sync form when selection changes
  useEffect(() => {
    if (selectedGroup) {
      reset({
        contact_name: selectedGroup.contact_name || '',
        supplier_email: selectedGroup.supplier_email || '',
        supplier_phone: selectedGroup.supplier_phone || '',
        supplier_website: selectedGroup.supplier_website || '',
        account_number: selectedGroup.account_number || '',
        lead_time_days: selectedGroup.lead_time_days?.toString() || '',
        moq: selectedGroup.moq?.toString() || '1',
        reorder_method: selectedGroup.reorder_method || '',
        reorder_method_other: selectedGroup.reorder_method_other || '',
        reorder_notes: selectedGroup.reorder_notes || '',
      });
      setRenameMode(false);
    }
  }, [selectedGroup, reset]);

  const onSaveContact = (data: ContactForm) => {
    if (!selected) return;
    updateContact.mutate({
      supplier_name: selected,
      contact_name: data.contact_name || null,
      supplier_email: data.supplier_email || null,
      supplier_phone: data.supplier_phone || null,
      supplier_website: data.supplier_website || null,
      account_number: data.account_number || null,
      lead_time_days: data.lead_time_days ? parseInt(data.lead_time_days) : null,
      moq: data.moq ? parseInt(data.moq) : 1,
      reorder_method: data.reorder_method || null,
      reorder_method_other: data.reorder_method === 'other' ? (data.reorder_method_other || null) : null,
      reorder_notes: data.reorder_notes || null,
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

  const handleRename = () => {
    if (!selected || !renameValue.trim() || renameValue.trim() === selected) {
      setRenameMode(false);
      return;
    }
    renameSupplier.mutate(
      { old_name: selected, new_name: renameValue.trim() },
      { onSuccess: () => { setSelected(renameValue.trim()); setRenameMode(false); } }
    );
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteSupplier.mutate(selected, {
      onSuccess: () => setSelected(null),
    });
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
              <div className="p-4 space-y-2 border-b border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setAddSupplierOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Supplier
                </Button>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Search suppliers..."
                    className="pl-8 h-8 text-xs"
                    autoCapitalize="off"
                  />
                </div>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="p-2 space-y-0.5">
                  {filteredGroups.length === 0 && (
                    <div className={cn(tokens.empty.container, 'py-8')}>
                      <Truck className={tokens.empty.icon} />
                      <p className={tokens.empty.description}>
                        {searchFilter ? 'No matches' : 'No suppliers yet'}
                      </p>
                    </div>
                  )}
                  {filteredGroups.map(g => (
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
            <div className="flex-1 min-w-0 overflow-y-auto">
              {!selectedGroup && selected && !groups?.find(g => g.supplier_name === selected) ? (
                // New supplier — no rows yet
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
                  {/* Supplier name with rename */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {renameMode ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            className="h-8 text-sm max-w-xs"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRename();
                              if (e.key === 'Escape') setRenameMode(false);
                            }}
                          />
                          <Button size="sm" variant="outline" onClick={handleRename} disabled={renameSupplier.isPending}>
                            {renameSupplier.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRenameMode(false)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className={tokens.heading.card}>{selectedGroup.supplier_name}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setRenameValue(selectedGroup.supplier_name); setRenameMode(true); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                      <p className={tokens.body.muted}>
                        {selectedGroup.product_ids.length} product{selectedGroup.product_ids.length !== 1 ? 's' : ''} linked
                      </p>
                    </div>
                  </div>

                  {/* Supplier Stats */}
                  <SupplierStatsCard supplierName={selectedGroup.supplier_name} />

                  {/* Contact form */}
                  <form onSubmit={handleSubmit(onSaveContact)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="cn" className={tokens.label.default}>Contact Name</Label>
                      <Input id="cn" {...register('contact_name')} placeholder="e.g. Jane Smith" />
                    </div>
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

                    {/* Reorder method + notes */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="srm" className={tokens.label.default}>Reorder Method</Label>
                        <Select
                          value={watch('reorder_method') || ''}
                          onValueChange={val => {
                            setValue('reorder_method', val);
                            if (val !== 'other') setValue('reorder_method_other', '');
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select method..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="portal">Portal</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {watch('reorder_method') === 'other' && (
                          <Input
                            {...register('reorder_method_other')}
                            placeholder="Specify method..."
                            className="mt-1.5"
                          />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="srn" className={tokens.label.default}>Reorder Notes</Label>
                        <Textarea
                          id="srn"
                          {...register('reorder_notes')}
                          placeholder="Standing notes for reorders..."
                          className="min-h-[36px] text-sm resize-none"
                          rows={1}
                        />
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0"
                                  disabled={unlinkProduct.isPending}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Unlink Product</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Remove "{prod?.name || 'this product'}" from {selectedGroup.supplier_name}? This won't delete the product.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => unlinkProduct.mutate(row.id)}>
                                    Unlink
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Delete supplier */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Delete Supplier
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedGroup.supplier_name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will unlink all {selectedGroup.product_ids.length} product{selectedGroup.product_ids.length !== 1 ? 's' : ''} from this supplier. Products themselves won't be deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete Supplier
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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

      {/* Link Products Dialog — now shows ALL products with supplier badges */}
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

      {/* Add Supplier Wizard */}
      <AddSupplierWizard
        open={addSupplierOpen}
        onOpenChange={setAddSupplierOpen}
        onComplete={(name) => {
          setSelected(name);
        }}
      />
    </div>
  );
}

/** Supplier stats card with PO history + inventory spend/margin */
function SupplierStatsCard({ supplierName }: { supplierName: string }) {
  const { data: stats, isLoading: statsLoading } = useSupplierStats(supplierName);
  const { data: spend, isLoading: spendLoading } = useSupplierSpendSummary(supplierName);
  const { formatCurrency } = useFormatCurrency();

  const hasPOData = stats && stats.po_count > 0;
  const hasSpendData = spend && spend.productCount > 0;

  if ((statsLoading && spendLoading) || (!hasPOData && !hasSpendData)) return null;

  return (
    <div className="space-y-2">
      {/* Row 1: PO stats */}
      {hasPOData && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-muted/30 border border-border/40">
          <ShoppingCart className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">POs: </span>
              <span className={tokens.body.emphasis}>{stats.po_count}</span>
            </div>
            {stats.last_order_date && (
              <div>
                <span className="text-muted-foreground">Last order: </span>
                <span className={tokens.body.emphasis}>
                  {format(new Date(stats.last_order_date), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            {stats.total_spend > 0 && (
              <div>
                <span className="text-muted-foreground">PO Spend: </span>
                <span className={tokens.body.emphasis}>{formatCurrency(stats.total_spend)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Row 2: Inventory value & margin */}
      {hasSpendData && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-muted/30 border border-border/40">
          <Package className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Cost Value: </span>
              <span className={tokens.body.emphasis}>{formatCurrency(spend.inventoryValueAtCost)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Retail Value: </span>
              <span className={tokens.body.emphasis}>{formatCurrency(spend.inventoryValueAtRetail)}</span>
            </div>
            {spend.impliedMarginPct !== null && (
              <div>
                <span className="text-muted-foreground">Margin: </span>
                <span className={cn(
                  tokens.body.emphasis,
                  spend.impliedMarginPct < 40 ? 'text-amber-500' : 'text-primary'
                )}>
                  {spend.impliedMarginPct.toFixed(1)}%
                </span>
              </div>
            )}
            {spend.missingCostCount > 0 && (
              <div className="flex items-center gap-1 text-amber-500">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-xs">{spend.missingCostCount} missing cost</span>
              </div>
            )}
          </div>
        </div>
      )}
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

/** Dialog for selecting products to link — shows ALL products with current supplier badges */
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
  const { data: allProducts } = useAllProductsWithSupplier();
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
    if (!allProducts) return [];
    const q = search.toLowerCase();
    return allProducts
      // Exclude products already linked to THIS supplier
      .filter(p => !alreadyLinked.includes(p.id))
      .filter(p => !q || p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q));
  }, [allProducts, search, alreadyLinked]);

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
          <DialogDescription>Select products to assign. Products with another supplier will be reassigned.</DialogDescription>
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
                <p className={cn(tokens.body.muted, 'text-center py-8')}>No products found</p>
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
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={cn(tokens.body.default, 'truncate')}>{p.name}</span>
                    {p.brand && <span className="text-muted-foreground text-xs shrink-0">{p.brand}</span>}
                  </div>
                  {p.current_supplier && (
                    <Badge variant="outline" className="text-xs shrink-0 ml-auto">
                      {p.current_supplier}
                    </Badge>
                  )}
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
