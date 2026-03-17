import { useState, useMemo, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  Search, Check, Library, Loader2, MessageSquarePlus, Send,
  PackagePlus, ChevronLeft, ArrowLeft, Package,
} from 'lucide-react';
import { PLATFORM_NAME } from '@/lib/brand';
import { BrowseColumn, type BrowseColumnItem } from '@/components/platform/backroom/BrowseColumn';
import { groupByProductLine } from '@/lib/supply-line-parser';
import {
  SUPPLY_CATEGORY_LABELS,
  type SupplyLibraryItem,
} from '@/data/professional-supply-library';
import { useSupplyLibraryItemsByBrand, useSupplyLibraryBrandSummaries, type BrandSummaryRow } from '@/hooks/platform/useSupplyLibrary';
import { useSupplyBrandsMeta } from '@/hooks/platform/useSupplyLibraryBrandMeta';
import { ColoredLogo } from '@/components/dashboard/ColoredLogo';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  existingProducts: Array<{ name: string; brand: string | null }>;
}

/* ────── Helpers ────── */

function sizedKey(brand: string, name: string, size?: string) {
  const b = brand.toLowerCase(), n = name.toLowerCase();
  return size ? `${b}::${n}::${size.toLowerCase()}` : `${b}::${n}`;
}

function sizedName(name: string, size?: string) {
  return size ? `${name} — ${size}` : name;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/* ────── Brand Card Grid (Level 0) ────── */

interface BrandCardData {
  brand: string;
  logoUrl: string | null;
  totalProducts: number;
  addedCount: number;
  categories: string[];
}

function BrandCardGrid({
  brands,
  search,
  onSearch,
  onSelectBrand,
  onShowSuggest,
}: {
  brands: BrandCardData[];
  search: string;
  onSearch: (v: string) => void;
  onSelectBrand: (brand: string) => void;
  onShowSuggest: () => void;
}) {
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = brands;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.brand.toLowerCase().includes(q));
    }
    if (activeLetter) {
      list = list.filter((b) => b.brand[0]?.toUpperCase() === activeLetter);
    }
    // Pin "Generic" to the front when viewing all (no letter filter)
    if (!activeLetter && !search) {
      const genericIndex = list.findIndex((b) => b.brand.toLowerCase() === 'generic');
      if (genericIndex > 0) {
        const [generic] = list.splice(genericIndex, 1);
        list = [generic, ...list];
      }
    }
    return list;
  }, [brands, search, activeLetter]);

  const availableLetters = useMemo(
    () => new Set(brands.map((b) => b.brand[0]?.toUpperCase())),
    [brands],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* A-Z filter bar */}
      <div className="px-6 pt-2 pb-1 flex flex-wrap gap-0.5 justify-center">
        {ALPHABET.map((letter) => {
          const available = availableLetters.has(letter);
          const active = activeLetter === letter;
          return (
            <button
              key={letter}
              onClick={() => setActiveLetter((prev) => (prev === letter ? null : letter))}
              disabled={!available}
              className={cn(
                'w-7 h-7 rounded-md text-[11px] font-display uppercase tracking-wider transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : available
                  ? 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  : 'text-muted-foreground/30 cursor-default',
              )}
            >
              {letter}
            </button>
          );
        })}
        {activeLetter && (
          <button
            onClick={() => setActiveLetter(null)}
            className="ml-1 text-[10px] font-sans text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Brand cards */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-6 pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((b) => {
              const allAdded = b.addedCount >= b.totalProducts && b.totalProducts > 0;
              return (
                <button
                  key={b.brand}
                  onClick={() => onSelectBrand(b.brand)}
                  className={cn(
                    'group relative flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all min-h-[120px]',
                    allAdded
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-border/40 bg-card/50 hover:border-border hover:shadow-sm hover:bg-muted/30',
                  )}
                >
                  {/* Brand name */}
                  <span className="text-sm font-display font-medium text-foreground leading-tight line-clamp-2 tracking-wide">
                    {b.brand}
                  </span>

                  {/* Product count */}
                  <span className="text-[11px] text-muted-foreground">
                    {b.totalProducts} products
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Missing brand CTA - fixed at bottom */}
      <div className="px-6 pb-4 pt-2 shrink-0 border-t border-border/30">
        <button
          onClick={onShowSuggest}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border/60 text-xs font-sans text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/30 transition-colors"
        >
          <MessageSquarePlus className="w-4 h-4 shrink-0" />
          <span>Missing a brand? Suggest one</span>
        </button>
      </div>
    </div>
  );
}

/* ────── Main Dialog ────── */

export function SupplyLibraryDialog({ open, onOpenChange, orgId, existingProducts }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [addingBrand, setAddingBrand] = useState<string | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestBrand, setSuggestBrand] = useState('');
  const [suggestDetails, setSuggestDetails] = useState('');

  // --- localStorage persistence for column selections ---
  const columnKey = useCallback(
    (col: 'cat' | 'line' | 'search', brand: string) =>
      `supply-dialog-${col}::${orgId}::${brand}`,
    [orgId],
  );

  // Persist selectedCategory
  useEffect(() => {
    if (!selectedBrand) return;
    const key = columnKey('cat', selectedBrand);
    if (selectedCategory) localStorage.setItem(key, selectedCategory);
    else localStorage.removeItem(key);
  }, [selectedCategory, selectedBrand, columnKey]);

  // Persist selectedLine
  useEffect(() => {
    if (!selectedBrand) return;
    const key = columnKey('line', selectedBrand);
    if (selectedLine) localStorage.setItem(key, selectedLine);
    else localStorage.removeItem(key);
  }, [selectedLine, selectedBrand, columnKey]);

  // Persist search
  useEffect(() => {
    if (!selectedBrand) return;
    const key = columnKey('search', selectedBrand);
    if (search) localStorage.setItem(key, search);
    else localStorage.removeItem(key);
  }, [search, selectedBrand, columnKey]);

  // Prune old keys (keep max 500)
  useEffect(() => {
    const PREFIX = 'supply-dialog-';
    const allKeys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
    if (allKeys.length <= 500) return;
    const currentPrefix = `${PREFIX}cat::${orgId}::`;
    const currentPrefixLine = `${PREFIX}line::${orgId}::`;
    const currentPrefixSearch = `${PREFIX}search::${orgId}::`;
    allKeys
      .filter((k) => !k.startsWith(currentPrefix) && !k.startsWith(currentPrefixLine) && !k.startsWith(currentPrefixSearch))
      .forEach((k) => localStorage.removeItem(k));
  }, [orgId]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // --- Data: brand summaries (server-side aggregation, no row-limit) ---
  const { data: brandSummaries = [] } = useSupplyLibraryBrandSummaries();
  const { data: brandsMeta = [] } = useSupplyBrandsMeta();

  // --- Data: per-brand products (fetched only when drilled in) ---
  const { data: brandItems = [], isLoading: brandItemsLoading } = useSupplyLibraryItemsByBrand(selectedBrand);

  // Brand logo map
  const brandLogoMap = useMemo(() => {
    const m = new Map<string, string | null>();
    brandsMeta.forEach((b) => m.set(b.name.toLowerCase(), b.logo_url));
    return m;
  }, [brandsMeta]);

  // Existing keys
  const existingKeys = useMemo(() => {
    const s = new Set<string>();
    existingProducts.forEach((p) => {
      if (p.brand && p.name) s.add(`${p.brand.toLowerCase()}::${p.name.toLowerCase()}`);
    });
    return s;
  }, [existingProducts]);

  const isExisting = (brand: string, name: string, size?: string) =>
    existingKeys.has(sizedKey(brand, name, size))
    || existingKeys.has(`${brand.toLowerCase()}::${sizedName(name, size).toLowerCase()}`);

  const getItemKeys = (item: SupplyLibraryItem): { key: string; size?: string }[] => {
    if (item.sizeOptions && item.sizeOptions.length > 0) {
      return item.sizeOptions.map((size) => ({ key: sizedKey(item.brand, item.name, size), size }));
    }
    return [{ key: sizedKey(item.brand, item.name) }];
  };

  // Brand card data — built from server-side summaries (no row-limit issue)
  const brandCardData = useMemo<BrandCardData[]>(() => {
    // Group summaries by brand
    const brandMap = new Map<string, { totalProducts: number; categories: string[] }>();
    brandSummaries.forEach((row) => {
      const existing = brandMap.get(row.brand);
      if (existing) {
        existing.totalProducts += Number(row.cnt);
        if (!existing.categories.includes(row.category)) existing.categories.push(row.category);
      } else {
        brandMap.set(row.brand, { totalProducts: Number(row.cnt), categories: [row.category] });
      }
    });

    // Count existing products per brand from existingProducts prop
    const existingByBrand = new Map<string, number>();
    existingProducts.forEach((p) => {
      if (p.brand) {
        const key = p.brand.toLowerCase();
        existingByBrand.set(key, (existingByBrand.get(key) || 0) + 1);
      }
    });

    return [...brandMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([brand, info]) => ({
        brand,
        logoUrl: brandLogoMap.get(brand.toLowerCase()) || null,
        totalProducts: info.totalProducts,
        addedCount: existingByBrand.get(brand.toLowerCase()) || 0,
        categories: info.categories,
      }));
  }, [brandSummaries, existingProducts, brandLogoMap]);

  // Products for selected brand (from per-brand hook)
  const brandProducts = useMemo(() => {
    if (!selectedBrand || brandItems.length === 0) return [];
    if (!search) return brandItems;
    const q = search.toLowerCase();
    if (selectedBrand.toLowerCase().includes(q)) return brandItems;
    return brandItems.filter((p) => p.name.toLowerCase().includes(q));
  }, [selectedBrand, search, brandItems]);

  // Category column items
  const categoryItems = useMemo<BrowseColumnItem[]>(() => {
    const map = new Map<string, number>();
    brandProducts.forEach((p) => {
      const cat = SUPPLY_CATEGORY_LABELS[p.category] || p.category;
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, count]) => ({ key: cat, label: cat, count }));
  }, [brandProducts]);

  // Products for selected category
  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return brandProducts.filter(
      (p) => (SUPPLY_CATEGORY_LABELS[p.category] || p.category) === selectedCategory,
    );
  }, [brandProducts, selectedCategory]);

  // Product line column items (from selected category)
  const productLineItems = useMemo<BrowseColumnItem[]>(() => {
    if (categoryProducts.length === 0) return [];
    const { groups } = groupByProductLine(
      categoryProducts.map((p) => ({ name: p.name })),
      0, // always group
    );
    return groups.map(([line, items]) => ({
      key: line,
      label: line,
      count: items.length,
    }));
  }, [categoryProducts]);

  // Display products for Column 3
  const displayProducts = useMemo(() => {
    if (!selectedCategory) return [];
    let items = categoryProducts;
    if (selectedLine) {
      items = items.filter((p) => {
        const { groups } = groupByProductLine([{ name: p.name }], 0);
        return groups.length > 0 && groups[0][0] === selectedLine;
      });
    }
    return items;
  }, [categoryProducts, selectedLine]);

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
        name: string; brand: string; category: string; product_type: string;
        is_backroom_tracked: boolean; depletion_method: string; unit_of_measure: string;
        organization_id: string; is_active: boolean;
      }> = [];

      brandItems.forEach((item) => {
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

  const handleAddEntireBrand = async (brand: string) => {
    setAddingBrand(brand);
    try {
      const items = brandItems;
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

      const insertedNames = itemsToInsert.map((i) => i.name);
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

  const brandFullyAdded = (brand: string) => {
    const items = brandItems;
    return items.every((p) =>
      getItemKeys(p).every(({ size }) => isExisting(p.brand, p.name, size)),
    );
  };

  const handleBack = () => {
    setSelectedBrand(null);
    setSelectedCategory(null);
    setSelectedLine(null);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 h-[85vh] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            {selectedBrand ? (
              <button
                onClick={handleBack}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
            ) : (
              <div className={tokens.card.iconBox}>
                <Library className={tokens.card.icon} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {selectedBrand ? (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={handleBack} className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors">
                      Supply Library
                    </button>
                    <ChevronLeft className="w-3 h-3 text-muted-foreground rotate-180" />
                    <DialogTitle className={cn(tokens.card.title, 'truncate')}>{selectedBrand}</DialogTitle>
                  </div>
                  <DialogDescription className={tokens.body.muted}>
                    Select products to add to your backroom catalog
                  </DialogDescription>
                </>
              ) : (
                <>
                  <DialogTitle className={tokens.card.title}>Professional Supply Library</DialogTitle>
                  <DialogDescription className={tokens.body.muted}>
                    Browse {brandCardData.length}+ brands. Select which products your salon carries.
                  </DialogDescription>
                </>
              )}
            </div>
            {selectedBrand && !brandFullyAdded(selectedBrand) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddEntireBrand(selectedBrand)}
                disabled={addingBrand === selectedBrand}
                className="text-xs font-sans h-8 gap-1.5 shrink-0"
              >
                {addingBrand === selectedBrand ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PackagePlus className="w-3.5 h-3.5" />
                )}
                Add Entire Brand
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={selectedBrand ? `Search ${selectedBrand} products...` : 'Search brands...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 font-sans"
            />
          </div>
        </DialogHeader>

        {/* Content area — Level 0 (brand grid) or Level 1 (product selection) */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {!selectedBrand ? (
            <BrandCardGrid
              brands={brandCardData}
              search={search}
              onSearch={setSearch}
              onSelectBrand={(brand) => {
                setSelectedBrand(brand);
                const savedCat = localStorage.getItem(columnKey('cat', brand));
                const savedLine = localStorage.getItem(columnKey('line', brand));
                const savedSearch = localStorage.getItem(columnKey('search', brand));
                setSelectedCategory(savedCat);
                setSelectedLine(savedLine);
                setSearch(savedSearch ?? '');
                if (savedCat || savedSearch) {
                  toast.info('Resumed where you left off', { duration: 2000 });
                }
              }}
              onShowSuggest={() => setShowSuggest(true)}
            />
          ) : brandItemsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Column 1: Categories */}
              <BrowseColumn
                title="Category"
                items={categoryItems}
                selectedKey={selectedCategory}
                onSelect={(key) => {
                  setSelectedCategory(key);
                  setSelectedLine(null);
                }}
                searchThreshold={8}
                className="w-[180px] shrink-0"
              />

              {/* Column 2: Product Lines */}
              {selectedCategory ? (
                <BrowseColumn
                  title="Product Line"
                  items={productLineItems}
                  selectedKey={selectedLine}
                  onSelect={setSelectedLine}
                  searchThreshold={8}
                  className="w-[200px] shrink-0"
                />
              ) : (
                <div className="w-[200px] shrink-0 border-r border-border/30 bg-muted/10 flex items-center justify-center">
                  <p className="text-xs font-sans text-muted-foreground/60">Select a category</p>
                </div>
              )}

              {/* Column 3: Products */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted/5">
                {!selectedCategory ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <Package className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-xs font-sans text-muted-foreground/60">Select a category to browse products</p>
                  </div>
                ) : displayProducts.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-xs font-sans text-muted-foreground">No products found</p>
                  </div>
                ) : (
                  <>
                    {/* Select all bar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 shrink-0">
                      <span className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">
                        {displayProducts.length} products
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleAllBrand}
                        className="text-[10px] font-sans h-6 px-2"
                      >
                        {(() => {
                          const allKeys: string[] = [];
                          displayProducts.forEach((p) => {
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

                    {/* Product rows */}
                    <ScrollArea className="flex-1 min-h-0">
                      <div className="p-1.5 space-y-0.5">
                        {displayProducts.map((item) => {
                          const hasSizes = item.sizeOptions && item.sizeOptions.length > 0;
                          const itemKeys = getItemKeys(item);
                          const allExisting = itemKeys.every(({ size }) => isExisting(item.brand, item.name, size));
                          const anySelected = itemKeys.some(({ key }) => selected.has(key));

                          return (
                            <div
                              key={`${item.brand}::${item.name}`}
                              className={cn(
                                'rounded-lg px-3 py-2.5 transition-colors',
                                allExisting
                                  ? 'opacity-50'
                                  : anySelected
                                  ? 'bg-primary/5 border border-primary/30'
                                  : 'hover:bg-muted/40 border border-transparent',
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                {!hasSizes && (
                                  <Checkbox
                                    checked={allExisting || selected.has(sizedKey(item.brand, item.name))}
                                    disabled={allExisting}
                                    onCheckedChange={() => toggleSize(item)}
                                    className="shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-sans font-medium text-foreground truncate">
                                      {item.name}
                                    </span>
                                    {allExisting && (
                                      <Badge variant="secondary" className="text-[9px] shrink-0 px-1.5 py-0">
                                        <Check className="w-2.5 h-2.5 mr-0.5" /> Added
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground capitalize">
                                    {item.defaultDepletion === 'per_pump' ? 'Per Pump' : item.defaultDepletion} · {item.defaultUnit}
                                  </span>
                                </div>
                              </div>

                              {hasSizes && (
                                <div className="flex flex-wrap gap-1.5 mt-2 pl-0">
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
                                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-sans transition-colors border',
                                          sizeExisting
                                            ? 'border-border/30 bg-muted/30 text-muted-foreground cursor-default'
                                            : sizeSelected
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border/60 hover:border-border text-foreground/70 hover:text-foreground',
                                        )}
                                      >
                                        {(sizeExisting || sizeSelected) && <Check className="w-2.5 h-2.5" />}
                                        {size}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer — shows when products are selected OR in product view */}
        {(selected.size > 0 || selectedBrand) && (
          <div className="px-6 py-4 border-t border-border/40 flex items-center justify-between bg-muted/20 shadow-[0_-4px_12px_-4px_hsl(var(--foreground)/0.04)] shrink-0">
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
        )}

        {/* Suggest brand modal overlay */}
        {showSuggest && (
          <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex items-center justify-center p-8 rounded-2xl">
            <div className="w-full max-w-sm space-y-4">
              <div className="text-center">
                <MessageSquarePlus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <h3 className="font-display text-sm uppercase tracking-wider text-foreground">Suggest a Brand</h3>
                <p className="text-xs font-sans text-muted-foreground mt-1">
                  Let the {PLATFORM_NAME} team know which brands you'd like added.
                </p>
              </div>
              <Input
                placeholder="Brand name"
                value={suggestBrand}
                onChange={(e) => setSuggestBrand(e.target.value)}
                className="font-sans"
                autoCapitalize="words"
                autoFocus
              />
              <Input
                placeholder="Products or details (optional)"
                value={suggestDetails}
                onChange={(e) => setSuggestDetails(e.target.value)}
                className="font-sans"
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 font-sans"
                  onClick={() => { setShowSuggest(false); setSuggestBrand(''); setSuggestDetails(''); }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 font-sans"
                  disabled={!suggestBrand.trim() || isSuggesting}
                  onClick={handleSuggestBrand}
                >
                  {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
