import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Search, Package, Check, Library, Loader2 } from 'lucide-react';
import {
  SUPPLY_LIBRARY,
  getSupplyBrands,
  getProductsByBrand,
  SUPPLY_CATEGORY_LABELS,
  type SupplyLibraryItem,
} from '@/data/professional-supply-library';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  existingProducts: Array<{ name: string; brand: string | null }>;
}

export function SupplyLibraryDialog({ open, onOpenChange, orgId, existingProducts }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  const brands = useMemo(() => getSupplyBrands(), []);

  // Build a set of "brand::name" for already-added products
  const existingKeys = useMemo(() => {
    const s = new Set<string>();
    existingProducts.forEach((p) => {
      if (p.brand && p.name) s.add(`${p.brand}::${p.name}`);
    });
    return s;
  }, [existingProducts]);

  const itemKey = (item: SupplyLibraryItem) => `${item.brand}::${item.name}`;

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

  const toggleItem = (item: SupplyLibraryItem) => {
    const key = itemKey(item);
    if (existingKeys.has(key)) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const toggleAllBrand = () => {
    if (!selectedBrand) return;
    const items = brandProducts.filter((p) => !existingKeys.has(itemKey(p)));
    const allSelected = items.every((p) => selected.has(itemKey(p)));
    const next = new Set(selected);
    items.forEach((p) => {
      const key = itemKey(p);
      if (allSelected) next.delete(key);
      else next.add(key);
    });
    setSelected(next);
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setIsAdding(true);

    try {
      const itemsToInsert = SUPPLY_LIBRARY
        .filter((item) => selected.has(itemKey(item)))
        .map((item) => ({
          name: item.name,
          brand: item.brand,
          category: item.category,
          product_type: 'Supplies',
          is_backroom_tracked: true,
          depletion_method: item.defaultDepletion,
          unit_of_measure: item.defaultUnit,
          organization_id: orgId,
          is_active: true,
        }));

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
    return getProductsByBrand(brand).filter((p) => selected.has(itemKey(p))).length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Library className={tokens.card.icon} />
            </div>
            <div>
              <DialogTitle className={tokens.card.title}>Professional Supply Library</DialogTitle>
              <DialogDescription className={tokens.body.muted}>
                Browse 26+ brands. Select products and add them to your catalog with tracking enabled.
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
          <ScrollArea className="w-[200px] border-r border-border/40">
            <div className="p-2 space-y-0.5">
              {filteredBrands.map((brand) => {
                const count = getProductsByBrand(brand).length;
                const selCount = selectedCountForBrand(brand);
                const existCount = getProductsByBrand(brand).filter((p) => existingKeys.has(itemKey(p))).length;

                return (
                  <button
                    key={brand}
                    onClick={() => setSelectedBrand(brand)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm font-sans transition-colors flex items-center justify-between gap-2',
                      selectedBrand === brand
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted/60 text-foreground'
                    )}
                  >
                    <span className="truncate">{brand}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {selCount > 0 && (
                        <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] bg-primary text-primary-foreground">
                          {selCount}
                        </Badge>
                      )}
                      {existCount > 0 && existCount === count ? (
                        <Check className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{count}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Product list */}
          <ScrollArea className="flex-1">
            {selectedBrand ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-sans text-sm font-medium text-foreground">{selectedBrand}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllBrand}
                    className="text-xs font-sans h-7"
                  >
                    {brandProducts.filter((p) => !existingKeys.has(itemKey(p))).every((p) => selected.has(itemKey(p)))
                      ? 'Deselect All'
                      : 'Select All'}
                  </Button>
                </div>

                <div className="space-y-1">
                  {brandProducts.map((item) => {
                    const key = itemKey(item);
                    const alreadyAdded = existingKeys.has(key);
                    const isSelected = selected.has(key);

                    return (
                      <button
                        key={key}
                        onClick={() => toggleItem(item)}
                        disabled={alreadyAdded}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                          alreadyAdded
                            ? 'border-border/30 bg-muted/20 opacity-60 cursor-default'
                            : isSelected
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border/40 hover:border-border hover:bg-muted/30'
                        )}
                      >
                        <Checkbox
                          checked={alreadyAdded || isSelected}
                          disabled={alreadyAdded}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-sans text-foreground">{item.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {SUPPLY_CATEGORY_LABELS[item.category] || item.category}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {item.defaultDepletion === 'per_pump' ? 'Per Pump' : item.defaultDepletion} · {item.defaultUnit}
                            </span>
                          </div>
                        </div>
                        {alreadyAdded && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            <Check className="w-3 h-3 mr-0.5" /> Added
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                <Package className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="font-sans text-sm text-muted-foreground">
                  Select a brand from the left to browse their professional supply products.
                </p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/40 flex items-center justify-between bg-muted/20">
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
