/**
 * DockProductPicker — Full-screen modal: Brand grid → Product list with search.
 * Mobile-first, dark theme, optimized for iPad.
 */

import { useState, useMemo } from 'react';
import { X, Search, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDockBrands, useDockBrandProducts, useDockProductSearch, type DockProduct } from '@/hooks/dock/useDockProductCatalog';

export interface PickedProduct {
  product: DockProduct;
  targetWeight: number;
}

interface DockProductPickerProps {
  open: boolean;
  onClose: () => void;
  onAddProducts: (products: PickedProduct[]) => void;
  selectedIds?: Set<string>;
}

export function DockProductPicker({ open, onClose, onAddProducts, selectedIds = new Set() }: DockProductPickerProps) {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [picked, setPicked] = useState<Map<string, DockProduct>>(new Map());

  const { data: brands } = useDockBrands();
  const { data: brandProducts, isLoading: loadingProducts } = useDockBrandProducts(selectedBrand);
  const { data: searchResults } = useDockProductSearch(searchQuery);

  const isSearching = searchQuery.trim().length >= 2;
  const displayProducts = isSearching ? searchResults : brandProducts;

  // Group products by category
  const grouped = useMemo(() => {
    if (!displayProducts) return new Map<string, DockProduct[]>();
    const map = new Map<string, DockProduct[]>();
    for (const p of displayProducts) {
      const cat = p.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return map;
  }, [displayProducts]);

  // A-Z letters for quick jump
  const brandLetters = useMemo(() => {
    if (!brands) return [];
    const letters = new Set(brands.map((b) => b.brand.charAt(0).toUpperCase()));
    return Array.from(letters).sort();
  }, [brands]);

  const toggleProduct = (product: DockProduct) => {
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.set(product.id, product);
      }
      return next;
    });
  };

  const handleAdd = () => {
    const items: PickedProduct[] = Array.from(picked.values()).map((p) => ({
      product: p,
      targetWeight: 0,
    }));
    onAddProducts(items);
    setPicked(new Map());
    setSelectedBrand(null);
    setSearchQuery('');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[hsl(var(--platform-bg))] text-[hsl(var(--platform-foreground))] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-6 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedBrand && !isSearching ? (
              <button
                onClick={() => setSelectedBrand(null)}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : null}
            <h1 className="font-display text-base tracking-wide uppercase">
              {selectedBrand && !isSearching ? selectedBrand : 'Products'}
            </h1>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--platform-foreground-muted)/0.5)]" />
          <input
            type="text"
            placeholder="Search products…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.4)] focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
        {!selectedBrand && !isSearching ? (
          /* Brand grid */
          <div className="flex gap-2">
            <div className="flex-1 grid grid-cols-2 gap-2">
              {(brands || []).map(({ brand, count }) => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className="text-left rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] p-4 hover:border-[hsl(var(--platform-border)/0.5)] active:scale-[0.98] transition-all duration-150"
                >
                  <p className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground))] truncate">
                    {brand}
                  </p>
                  <p className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.6)] mt-1">
                    {count} products
                  </p>
                </button>
              ))}
            </div>

            {/* A-Z scrubber */}
            {brandLetters.length > 5 && (
              <div className="flex flex-col items-center justify-center gap-0.5 w-5 flex-shrink-0">
                {brandLetters.map((letter) => (
                  <button
                    key={letter}
                    className="text-[9px] text-[hsl(var(--platform-foreground-muted)/0.5)] hover:text-violet-400 transition-colors"
                  >
                    {letter}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Product list grouped by category */
          <div className="space-y-5">
            {grouped.size === 0 && (
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))] text-center pt-12">
                {loadingProducts ? 'Loading…' : 'No products found'}
              </p>
            )}
            {Array.from(grouped.entries()).map(([category, products]) => (
              <div key={category}>
                <p className="text-[10px] font-medium tracking-wide uppercase text-[hsl(var(--platform-foreground-muted)/0.6)] mb-2">
                  {category}
                </p>
                <div className="space-y-1">
                  {products.map((product) => {
                    const isSelected = picked.has(product.id) || selectedIds.has(product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => toggleProduct(product)}
                        disabled={selectedIds.has(product.id)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-xl p-3 transition-all duration-150 text-left',
                          isSelected
                            ? 'bg-violet-600/20 border border-violet-500/40'
                            : 'bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] hover:border-[hsl(var(--platform-border)/0.4)]',
                          selectedIds.has(product.id) && 'opacity-40'
                        )}
                      >
                        {/* Swatch */}
                        <div
                          className="w-7 h-7 rounded-full flex-shrink-0 border border-[hsl(var(--platform-border)/0.3)]"
                          style={{
                            backgroundColor: product.swatch_color || 'hsl(var(--platform-bg-elevated))',
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[hsl(var(--platform-foreground))] truncate">{product.name}</p>
                          {isSearching && (
                            <p className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.5)]">{product.brand}</p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar — selection count + Add button */}
      {picked.size > 0 && (
        <div className="flex-shrink-0 px-5 py-4 border-t border-[hsl(var(--platform-border)/0.3)] bg-[hsl(var(--platform-bg-elevated))]">
          <button
            onClick={handleAdd}
            className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            Add {picked.size} Product{picked.size > 1 ? 's' : ''} to Formula
          </button>
        </div>
      )}
    </div>
  );
}
