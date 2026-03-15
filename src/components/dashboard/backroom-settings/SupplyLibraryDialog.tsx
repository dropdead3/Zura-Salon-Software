import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Search, Package, Check, Library, Loader2, MessageSquarePlus, Send, PackagePlus } from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import {
  SUPPLY_CATEGORY_LABELS,
  type SupplyLibraryItem,
} from '@/data/professional-supply-library';
import { useSupplyLibraryItems } from '@/hooks/platform/useSupplyLibrary';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  existingProducts: Array<{ name: string; brand: string | null }>;
}

/** Build a selection key — includes size when present */
function sizedKey(brand: string, name: string, size?: string) {
  return size ? `${brand}::${name}::${size}` : `${brand}::${name}`;
}

/** Build the product name with optional size suffix */
function sizedName(name: string, size?: string) {
  return size ? `${name} — ${size}` : name;
}

export function SupplyLibraryDialog({ open, onOpenChange, orgId, existingProducts }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [addingBrand, setAddingBrand] = useState<string | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestBrand, setSuggestBrand] = useState('');
  const [suggestDetails, setSuggestDetails] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  const brands = useMemo(() => getSupplyBrands(), []);

  // Build set of existing keys — match both "Product Name" and "Product Name — 60ml"
  const existingKeys = useMemo(() => {
    const s = new Set<string>();
    existingProducts.forEach((p) => {
      if (p.brand && p.name) {
        s.add(`${p.brand}::${p.name}`);
      }
    });
    return s;
  }, [existingProducts]);

  const isExisting = (brand: string, name: string, size?: string) => {
    return existingKeys.has(sizedKey(brand, name, size))
      || existingKeys.has(`${brand}::${sizedName(name, size)}`);
  };

  // Filter brands by search
  const filteredBrands = useMemo(() => {
    if (!search) return brands;
    const q = search.toLowerCase();
    return brands.filter((brand) => {
      if (brand.toLowerCase().includes(q)) return true;
      return getProductsByBrand(brand).some((p) => p.name.toLowerCase().includes(q));
    });
  }, [brands, search]);

  // Products for selected brand, optionally filtered
  const brandProducts = useMemo(() => {
    if (!selectedBrand) return [];
    const products = getProductsByBrand(selectedBrand);
    if (!search) return products;
    const q = search.toLowerCase();
    if (selectedBrand.toLowerCase().includes(q)) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [selectedBrand, search]);

  /** Get all selectable keys for an item (one per size, or one if no sizes) */
  const getItemKeys = (item: SupplyLibraryItem): { key: string; size?: string }[] => {
    if (item.sizeOptions && item.sizeOptions.length > 0) {
      return item.sizeOptions.map((size) => ({ key: sizedKey(item.brand, item.name, size), size }));
    }
    return [{ key: sizedKey(item.brand, item.name) }];
  };

  const toggleSize = (item: SupplyLibraryItem, size?: string) => {
    const key = sizedKey(item.brand, item.name, size);
    if (isExisting(item.brand, item.name, size)) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const toggleAllBrand = () => {
    if (!selectedBrand) return;
    const allKeys: string[] = [];
    brandProducts.forEach((p) => {
      getItemKeys(p).forEach(({ key, size }) => {
        if (!isExisting(p.brand, p.name, size)) allKeys.push(key);
      });
    });
    const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));
    const next = new Set(selected);
    allKeys.forEach((k) => {
      if (allSelected) next.delete(k);
      else next.add(k);
    });
    setSelected(next);
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
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

      SUPPLY_LIBRARY.forEach((item) => {
        getItemKeys(item).forEach(({ key, size }) => {
          if (!selected.has(key)) return;
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
      setSelected(new Set());
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to add products: ' + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  // Count selected per brand for badges
  const selectedCountForBrand = (brand: string) => {
    let count = 0;
    getProductsByBrand(brand).forEach((p) => {
      getItemKeys(p).forEach(({ key }) => {
        if (selected.has(key)) count++;
      });
    });
    return count;
  };

  // Check if all selectable items for a brand are fully in catalog
  const brandFullyAdded = (brand: string) => {
    const items = getProductsByBrand(brand);
    return items.every((p) =>
      getItemKeys(p).every(({ size }) => isExisting(p.brand, p.name, size))
    );
  };

  const handleAddEntireBrand = async (brand: string) => {
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
      setSelected(new Set());
    } catch (err: any) {
      toast.error('Failed to add products: ' + err.message);
    } finally {
      setAddingBrand(null);
    }
  };

  const handleSuggestBrand = async () => {
    if (!suggestBrand.trim()) return;
    setIsSuggesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profileData } = await supabase
        .from('employee_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      await supabase.from('platform_feedback' as any).insert({
        type: 'feature_request',
        title: `Brand Request: ${suggestBrand.trim()}`,
        description: suggestDetails.trim() || `Salon would like the brand "${suggestBrand.trim()}" added to the Professional Supply Library.`,
        category: 'supply_library',
        submitted_by: user.id,
        organization_id: profileData?.organization_id || null,
      });

      toast.success('Brand suggestion submitted', {
        description: `Thank you — the ${PLATFORM_NAME} team will review your request.`,
      });
      setSuggestBrand('');
      setSuggestDetails('');
      setShowSuggest(false);
    } catch (err: any) {
      toast.error('Failed to submit suggestion', { description: err.message });
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 max-h-[80vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Library className={tokens.card.icon} />
            </div>
            <div>
              <DialogTitle className={tokens.card.title}>Professional Supply Library</DialogTitle>
              <DialogDescription className={tokens.body.muted}>
                Browse 26+ brands. Select products and sizes to add to your catalog.
              </DialogDescription>
            </div>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search brands or products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 font-sans"
            />
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Brand list */}
          <ScrollArea className="w-[220px] border-r border-border/40">
            <div className="p-2 space-y-0.5">
              {filteredBrands.map((brand) => {
                const count = getProductsByBrand(brand).length;
                const selCount = selectedCountForBrand(brand);
                const allAdded = brandFullyAdded(brand);

                return (
                  <button
                    key={brand}
                    onClick={() => setSelectedBrand(brand)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg text-sm font-sans transition-colors flex items-center justify-between gap-2 relative',
                      selectedBrand === brand
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted/60 text-foreground'
                    )}
                  >
                    {selectedBrand === brand && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary" />
                    )}
                    <span className="truncate">{brand}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {selCount > 0 && (
                        <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] bg-primary text-primary-foreground">
                          {selCount}
                        </Badge>
                      )}
                      {allAdded ? (
                        <Check className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{count}</span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Suggest Missing Brand */}
              <div className="mt-3 pt-3 border-t border-border/30 px-1">
                {!showSuggest ? (
                  <button
                    onClick={() => setShowSuggest(true)}
                    className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg text-xs font-sans text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
                    <span>Missing a brand?</span>
                  </button>
                ) : (
                  <div className="space-y-2.5 pb-1">
                    <p className="text-[11px] font-sans font-medium text-muted-foreground">Suggest a brand:</p>
                    <Input
                      placeholder="Brand name"
                      value={suggestBrand}
                      onChange={(e) => setSuggestBrand(e.target.value)}
                      className="h-9 text-xs font-sans rounded-lg"
                      autoCapitalize="words"
                    />
                    <Input
                      placeholder="Products (optional)"
                      value={suggestDetails}
                      onChange={(e) => setSuggestDetails(e.target.value)}
                      className="h-9 text-xs font-sans rounded-lg"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 h-8 text-xs font-sans"
                        onClick={() => { setShowSuggest(false); setSuggestBrand(''); setSuggestDetails(''); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs font-sans"
                        disabled={!suggestBrand.trim() || isSuggesting}
                        onClick={handleSuggestBrand}
                      >
                        {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Send
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Product list */}
          <ScrollArea className="flex-1">
            {selectedBrand ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-sans text-sm font-medium text-foreground">{selectedBrand}</h3>
                  <div className="flex items-center gap-1.5">
                    {selectedBrand && !brandFullyAdded(selectedBrand) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddEntireBrand(selectedBrand)}
                        disabled={addingBrand === selectedBrand}
                        className="text-xs font-sans h-7 gap-1"
                      >
                        {addingBrand === selectedBrand ? (
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
                        return allKeys.length > 0 && allKeys.every((k) => selected.has(k))
                          ? 'Deselect All'
                          : 'Select All';
                      })()}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {brandProducts.map((item) => {
                    const hasSizes = item.sizeOptions && item.sizeOptions.length > 0;
                    const itemKeys = getItemKeys(item);
                    const allExisting = itemKeys.every(({ size }) => isExisting(item.brand, item.name, size));
                    const anySelected = itemKeys.some(({ key }) => selected.has(key));
                    const allSelected = itemKeys.every(({ key, size }) =>
                      selected.has(key) || isExisting(item.brand, item.name, size)
                    );

                    return (
                      <div
                        key={`${item.brand}::${item.name}`}
                        className={cn(
                          'rounded-lg border p-4 transition-colors',
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
                              checked={allExisting || selected.has(sizedKey(item.brand, item.name))}
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
                                  const sizeSelected = selected.has(key);

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
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 px-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                  <Package className="w-7 h-7 text-muted-foreground/50" />
                </div>
                <p className="font-sans text-sm text-muted-foreground max-w-xs">
                  Select a brand from the left to browse their professional supply products.
                </p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/40 flex items-center justify-between bg-muted/20 shadow-[0_-4px_12px_-4px_hsl(var(--foreground)/0.04)]">
          <span className="text-sm font-sans text-muted-foreground">
            {selected.size > 0
              ? `${selected.size} product${selected.size === 1 ? '' : 's'} selected`
              : 'No products selected'}
          </span>
          <Button
            onClick={handleAdd}
            disabled={selected.size === 0 || isAdding}
            className="font-sans"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Adding...
              </>
            ) : (
              `Add ${selected.size || ''} Product${selected.size === 1 ? '' : 's'}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
