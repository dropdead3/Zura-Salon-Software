/**
 * AddSupplierWizard — 3-step wizard: Details → Assign Products → Review & Confirm.
 * Persists supplier + product links in one batch on final step.
 */
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  Loader2, ArrowLeft, ArrowRight, Check, Search, Package, Layers,
} from 'lucide-react';
import { useAllProductsWithSupplier } from '@/hooks/backroom/useSupplierSettings';
import { useLinkProducts, useUpdateSupplierContact } from '@/hooks/backroom/useSupplierSettings';

interface SupplierDetails {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  account_number: string;
  lead_time_days: string;
  moq: string;
  reorder_method: string;
  reorder_method_other: string;
  reorder_notes: string;
}

const EMPTY_DETAILS: SupplierDetails = {
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  account_number: '',
  lead_time_days: '',
  moq: '1',
  reorder_method: '',
  reorder_method_other: '',
  reorder_notes: '',
};

const STEPS = ['Supplier Details', 'Assign Products', 'Review & Confirm'] as const;

interface AddSupplierWizardProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onComplete: (supplierName: string) => void;
}

export function AddSupplierWizard({ open, onOpenChange, onComplete }: AddSupplierWizardProps) {
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<SupplierDetails>(EMPTY_DETAILS);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [assignMode, setAssignMode] = useState<'brand' | 'product'>('brand');
  const [search, setSearch] = useState('');

  const linkProducts = useLinkProducts();
  const updateContact = useUpdateSupplierContact();

  const { data: allProducts } = useAllProductsWithSupplier();

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(0);
      setDetails(EMPTY_DETAILS);
      setSelectedProductIds(new Set());
      setAssignMode('brand');
      setSearch('');
    }
  }, [open]);

  // Brand grouping for Step 2
  const brands = useMemo(() => {
    if (!allProducts) return [];
    const map = new Map<string, typeof allProducts>();
    for (const p of allProducts) {
      const brand = p.brand || 'Uncategorized';
      if (!map.has(brand)) map.set(brand, []);
      map.get(brand)!.push(p);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([brand, products]) => ({ brand, products }));
  }, [allProducts]);

  // Filtered products for "By Product" mode
  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    const q = search.toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(
      p => p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)
    );
  }, [allProducts, search]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBrand = (brandProducts: { id: string }[]) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      const allSelected = brandProducts.every(p => next.has(p.id));
      if (allSelected) {
        brandProducts.forEach(p => next.delete(p.id));
      } else {
        brandProducts.forEach(p => next.add(p.id));
      }
      return next;
    });
  };

  const isPending = linkProducts.isPending || updateContact.isPending;

  const handleCreate = async () => {
    const name = details.name.trim();
    if (!name) return;

    const productIds = Array.from(selectedProductIds);

    // If products selected, link them (this creates the supplier rows)
    if (productIds.length > 0) {
      linkProducts.mutate(
        { supplier_name: name, product_ids: productIds },
        {
          onSuccess: () => {
            // Now update contact details if any were provided
            const hasContact = details.email || details.phone || details.website || details.account_number || details.lead_time_days || details.reorder_method;
            if (hasContact) {
              updateContact.mutate({
                supplier_name: name,
                supplier_email: details.email || null,
                supplier_phone: details.phone || null,
                supplier_website: details.website || null,
                account_number: details.account_number || null,
                lead_time_days: details.lead_time_days ? parseInt(details.lead_time_days) : null,
                moq: details.moq ? parseInt(details.moq) : 1,
                reorder_method: details.reorder_method || null,
                reorder_method_other: details.reorder_method === 'other' ? (details.reorder_method_other || null) : null,
                reorder_notes: details.reorder_notes || null,
              }, {
                onSuccess: () => {
                  onOpenChange(false);
                  onComplete(name);
                },
              });
            } else {
              onOpenChange(false);
              onComplete(name);
            }
          },
        }
      );
    } else {
      // No products — just select this supplier name (it won't persist until products are linked)
      onOpenChange(false);
      onComplete(name);
    }
  };

  const canAdvance = step === 0 ? details.name.trim().length > 0 : true;
  const progressPct = ((step + 1) / STEPS.length) * 100;

  // Count selected per brand for display
  const brandSelectionCounts = useMemo(() => {
    const map = new Map<string, { total: number; selected: number }>();
    for (const b of brands) {
      map.set(b.brand, {
        total: b.products.length,
        selected: b.products.filter(p => selectedProductIds.has(p.id)).length,
      });
    }
    return map;
  }, [brands, selectedProductIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 space-y-3">
          <DialogHeader>
            <DialogTitle className={tokens.heading.card}>Add Supplier</DialogTitle>
            <DialogDescription className={tokens.body.muted}>
              {STEPS[step]}
            </DialogDescription>
          </DialogHeader>
          <Progress value={progressPct} className="h-1" />
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={cn(
                  'text-xs font-sans',
                  i <= step ? 'text-foreground' : 'text-muted-foreground/50'
                )}
              >
                {i + 1}. {s}
                {i < STEPS.length - 1 && <span className="mx-1.5 text-muted-foreground/30">→</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-6 pb-2">
          {step === 0 && (
            <StepDetails details={details} onChange={setDetails} />
          )}
          {step === 1 && (
            <StepAssignProducts
              assignMode={assignMode}
              onModeChange={setAssignMode}
              brands={brands}
              filteredProducts={filteredProducts}
              selectedIds={selectedProductIds}
              onToggleProduct={toggleProduct}
              onToggleBrand={toggleBrand}
              brandSelectionCounts={brandSelectionCounts}
              search={search}
              onSearchChange={setSearch}
            />
          )}
          {step === 2 && (
            <StepReview details={details} selectedCount={selectedProductIds.size} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/60">
          <div>
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step < 2 ? (
              <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canAdvance}>
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleCreate} disabled={isPending || !details.name.trim()}>
                {isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                <Check className="w-4 h-4 mr-1" />
                Create Supplier
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Step 1: Supplier Details ─── */
function StepDetails({
  details,
  onChange,
}: {
  details: SupplierDetails;
  onChange: (d: SupplierDetails) => void;
}) {
  const update = (field: keyof SupplierDetails, value: string) =>
    onChange({ ...details, [field]: value });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className={tokens.label.default}>
          Supplier Name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={details.name}
          onChange={e => update('name', e.target.value)}
          placeholder="e.g. Goldwell Distribution"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={tokens.label.default}>Email</Label>
          <Input
            type="email"
            value={details.email}
            onChange={e => update('email', e.target.value)}
            placeholder="orders@supplier.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label className={tokens.label.default}>Phone</Label>
          <Input
            value={details.phone}
            onChange={e => update('phone', e.target.value)}
            placeholder="(555) 123-4567"
            autoCapitalize="off"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className={tokens.label.default}>Website</Label>
        <Input
          value={details.website}
          onChange={e => update('website', e.target.value)}
          placeholder="https://supplier.com"
          autoCapitalize="off"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className={tokens.label.default}>Account #</Label>
          <Input
            value={details.account_number}
            onChange={e => update('account_number', e.target.value)}
            placeholder="ACC-123"
          />
        </div>
        <div className="space-y-1.5">
          <Label className={tokens.label.default}>Lead Time (days)</Label>
          <Input
            type="number"
            value={details.lead_time_days}
            onChange={e => update('lead_time_days', e.target.value)}
            placeholder="5"
          />
        </div>
        <div className="space-y-1.5">
          <Label className={tokens.label.default}>MOQ</Label>
          <Input
            type="number"
            value={details.moq}
            onChange={e => update('moq', e.target.value)}
            placeholder="1"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={tokens.label.default}>Reorder Method</Label>
          <Select value={details.reorder_method} onValueChange={v => {
            update('reorder_method', v);
            if (v !== 'other') update('reorder_method_other', '');
          }}>
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
          {details.reorder_method === 'other' && (
            <Input
              value={details.reorder_method_other}
              onChange={e => update('reorder_method_other', e.target.value)}
              placeholder="Specify method..."
              className="mt-1.5"
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label className={tokens.label.default}>Reorder Notes</Label>
          <Textarea
            value={details.reorder_notes}
            onChange={e => update('reorder_notes', e.target.value)}
            placeholder="Standing notes..."
            className="min-h-[36px] text-sm resize-none"
            rows={1}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Step 2: Assign Products ─── */
function StepAssignProducts({
  assignMode,
  onModeChange,
  brands,
  filteredProducts,
  selectedIds,
  onToggleProduct,
  onToggleBrand,
  brandSelectionCounts,
  search,
  onSearchChange,
}: {
  assignMode: 'brand' | 'product';
  onModeChange: (m: 'brand' | 'product') => void;
  brands: { brand: string; products: { id: string; name: string; brand: string | null; current_supplier: string | null }[] }[];
  filteredProducts: { id: string; name: string; brand: string | null; current_supplier: string | null }[];
  selectedIds: Set<string>;
  onToggleProduct: (id: string) => void;
  onToggleBrand: (products: { id: string }[]) => void;
  brandSelectionCounts: Map<string, { total: number; selected: number }>;
  search: string;
  onSearchChange: (s: string) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-1 p-0.5 bg-muted rounded-full w-fit">
        <button
          onClick={() => onModeChange('brand')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans transition-colors',
            assignMode === 'brand'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          By Brand
        </button>
        <button
          onClick={() => onModeChange('product')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans transition-colors',
            assignMode === 'product'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Package className="w-3.5 h-3.5" />
          By Product
        </button>
      </div>

      <p className={cn(tokens.body.muted, 'text-xs')}>
        {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
        {assignMode === 'brand' && ' • Check a brand to assign all its products'}
      </p>

      {assignMode === 'product' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search products..."
            className="pl-9"
            autoCapitalize="off"
          />
        </div>
      )}

      <ScrollArea className="h-[260px] border border-border/60 rounded-lg">
        <div className="p-2 space-y-0.5">
          {assignMode === 'brand' ? (
            brands.length === 0 ? (
              <p className={cn(tokens.body.muted, 'text-center py-8')}>No products found</p>
            ) : (
              brands.map(({ brand, products }) => {
                const counts = brandSelectionCounts.get(brand);
                const allSelected = counts ? counts.selected === counts.total : false;
                const someSelected = counts ? counts.selected > 0 && !allSelected : false;

                return (
                  <label
                    key={brand}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={() => onToggleBrand(products)}
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={cn(tokens.body.default, 'truncate')}>{brand}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {counts?.selected || 0}/{counts?.total || 0}
                      </Badge>
                    </div>
                  </label>
                );
              })
            )
          ) : (
            filteredProducts.length === 0 ? (
              <p className={cn(tokens.body.muted, 'text-center py-8')}>No products found</p>
            ) : (
              filteredProducts.map(p => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.has(p.id)}
                    onCheckedChange={() => onToggleProduct(p.id)}
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
              ))
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── Step 3: Review & Confirm ─── */
function StepReview({
  details,
  selectedCount,
}: {
  details: SupplierDetails;
  selectedCount: number;
}) {
  const rows = [
    { label: 'Supplier Name', value: details.name },
    { label: 'Email', value: details.email },
    { label: 'Phone', value: details.phone },
    { label: 'Website', value: details.website },
    { label: 'Account #', value: details.account_number },
    { label: 'Lead Time', value: details.lead_time_days ? `${details.lead_time_days} days` : '' },
    { label: 'MOQ', value: details.moq !== '1' ? details.moq : '' },
    { label: 'Reorder Method', value: details.reorder_method === 'other' && details.reorder_method_other ? `Other — ${details.reorder_method_other}` : details.reorder_method },
  ].filter(r => r.value);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
            <span className={cn(tokens.label.default, 'text-muted-foreground')}>{r.label}</span>
            <span className={tokens.body.default}>{r.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <Package className="w-5 h-5 text-primary shrink-0" />
        <div>
          <p className={tokens.body.default}>
            {selectedCount > 0
              ? `${selectedCount} product${selectedCount !== 1 ? 's' : ''} will be assigned`
              : 'No products assigned yet'}
          </p>
          {selectedCount === 0 && (
            <p className={cn(tokens.body.muted, 'text-xs')}>
              You can link products later from the supplier detail panel.
            </p>
          )}
        </div>
      </div>

      {details.reorder_notes && (
        <div className="space-y-1">
          <span className={cn(tokens.label.default, 'text-muted-foreground')}>Reorder Notes</span>
          <p className={cn(tokens.body.default, 'text-sm')}>{details.reorder_notes}</p>
        </div>
      )}
    </div>
  );
}
