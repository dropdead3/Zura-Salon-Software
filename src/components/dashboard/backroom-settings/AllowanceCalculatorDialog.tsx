/**
 * AllowanceCalculatorDialog — Vish-style bowl-based product allowance calculator.
 * Builds recipes from real catalog products to derive a dollar-based allowance.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Loader2, Beaker, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAllowanceBowls, useUpsertAllowanceBowl, useDeleteAllowanceBowl } from '@/hooks/backroom/useAllowanceBowls';
import { useServiceRecipeBaselines, useUpsertRecipeBaseline, useDeleteRecipeBaseline } from '@/hooks/inventory/useServiceRecipeBaselines';
import { useUpsertAllowancePolicy } from '@/hooks/billing/useServiceAllowancePolicies';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  serviceName: string;
}

interface CatalogProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  cost_per_gram: number | null;
  cost_price: number | null;
  container_size: string | null;
  swatch_color: string | null;
  product_type: string;
}

interface BowlLine {
  localId: string;
  productId: string;
  productName: string;
  brand: string | null;
  swatchColor: string | null;
  quantity: number;
  costPerGram: number;
  isDeveloper: boolean;
  developerRatio: number;
  lineCost: number;
}

interface BowlState {
  id: string | null; // null = new unsaved bowl
  bowlNumber: number;
  label: string;
  lines: BowlLine[];
  collapsed: boolean;
}

const WEIGHT_PRESETS = [15, 30, 45, 60, 90];
const RATIO_PRESETS = [1, 1.5, 2];

function computeLineCost(qty: number, costPerGram: number, isDeveloper: boolean, developerRatio: number, colorQty: number): number {
  if (isDeveloper) {
    const devQty = colorQty * developerRatio;
    return Math.round(devQty * costPerGram * 100) / 100;
  }
  return Math.round(qty * costPerGram * 100) / 100;
}

function getCostPerGram(product: CatalogProduct): number {
  if (product.cost_per_gram && product.cost_per_gram > 0) return product.cost_per_gram;
  if (product.cost_price && product.container_size) {
    const size = parseFloat(product.container_size);
    if (size > 0) return Math.round((product.cost_price / size) * 10000) / 10000;
  }
  return 0;
}

export function AllowanceCalculatorDialog({ open, onOpenChange, serviceId, serviceName }: Props) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  // Fetch catalog products (Supplies type for backroom)
  const { data: catalogProducts = [] } = useQuery({
    queryKey: ['catalog-products-for-allowance', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, category, cost_per_gram, cost_price, container_size, swatch_color, product_type')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('product_type', 'Supplies')
        .order('brand')
        .order('name');
      if (error) throw error;
      return data as CatalogProduct[];
    },
    enabled: !!orgId && open,
  });

  // Existing bowls and baselines for this service
  const { data: existingBowls } = useAllowanceBowls(serviceId);
  const { data: existingBaselines } = useServiceRecipeBaselines(serviceId);

  const upsertBowl = useUpsertAllowanceBowl();
  const deleteBowl = useDeleteAllowanceBowl();
  const upsertBaseline = useUpsertRecipeBaseline();
  const deleteBaseline = useDeleteRecipeBaseline();
  const upsertPolicy = useUpsertAllowancePolicy();

  // Local bowl state
  const [bowls, setBowls] = useState<BowlState[]>([]);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Load existing data into local state when dialog opens
  useEffect(() => {
    if (!open) return;

    if (existingBowls && existingBowls.length > 0 && existingBaselines) {
      const loaded: BowlState[] = existingBowls.map((b) => {
        const bowlLines = existingBaselines
          .filter((bl) => (bl as any).bowl_id === b.id)
          .map((bl) => {
            const prod = catalogProducts.find((p) => p.id === bl.product_id);
            const cpg = (bl as any).cost_per_unit_snapshot || (prod ? getCostPerGram(prod) : 0);
            return {
              localId: bl.id,
              productId: bl.product_id,
              productName: prod?.name || 'Unknown Product',
              brand: prod?.brand || null,
              swatchColor: prod?.swatch_color || null,
              quantity: bl.expected_quantity,
              costPerGram: cpg,
              isDeveloper: (bl as any).is_developer || false,
              developerRatio: (bl as any).developer_ratio || 1,
              lineCost: 0, // recomputed below
            };
          });
        return {
          id: b.id,
          bowlNumber: b.bowl_number,
          label: b.label,
          lines: bowlLines,
          collapsed: false,
        };
      });

      // Recompute costs
      loaded.forEach((bowl) => {
        const colorQty = bowl.lines.filter((l) => !l.isDeveloper).reduce((s, l) => s + l.quantity, 0);
        bowl.lines.forEach((line) => {
          line.lineCost = computeLineCost(line.quantity, line.costPerGram, line.isDeveloper, line.developerRatio, colorQty);
        });
      });

      setBowls(loaded);
    } else {
      // Start with one empty bowl
      setBowls([{ id: null, bowlNumber: 1, label: 'Bowl 1', lines: [], collapsed: false }]);
    }
  }, [open, existingBowls, existingBaselines, catalogProducts]);

  // Filtered products for picker
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return catalogProducts.slice(0, 50);
    const q = productSearch.toLowerCase();
    return catalogProducts
      .filter((p) => p.name.toLowerCase().includes(q) || (p.brand && p.brand.toLowerCase().includes(q)))
      .slice(0, 50);
  }, [catalogProducts, productSearch]);

  // Grand total
  const grandTotal = useMemo(() => {
    return bowls.reduce((sum, bowl) => {
      return sum + bowl.lines.reduce((ls, line) => ls + line.lineCost, 0);
    }, 0);
  }, [bowls]);

  // Total weight
  const totalWeight = useMemo(() => {
    return bowls.reduce((sum, bowl) => {
      return sum + bowl.lines.reduce((ls, line) => {
        if (line.isDeveloper) {
          const colorQty = bowl.lines.filter((l) => !l.isDeveloper).reduce((s, l) => s + l.quantity, 0);
          return ls + colorQty * line.developerRatio;
        }
        return ls + line.quantity;
      }, 0);
    }, 0);
  }, [bowls]);

  const addBowl = useCallback(() => {
    setBowls((prev) => [
      ...prev,
      { id: null, bowlNumber: prev.length + 1, label: `Bowl ${prev.length + 1}`, lines: [], collapsed: false },
    ]);
  }, []);

  const removeBowl = useCallback((idx: number) => {
    setBowls((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((b, i) => ({ ...b, bowlNumber: i + 1, label: `Bowl ${i + 1}` }));
    });
  }, []);

  const toggleBowlCollapse = useCallback((idx: number) => {
    setBowls((prev) => prev.map((b, i) => (i === idx ? { ...b, collapsed: !b.collapsed } : b)));
  }, []);

  const addProductToBowl = useCallback(
    (bowlIdx: number, product: CatalogProduct, isDeveloper: boolean = false) => {
      const cpg = getCostPerGram(product);
      const newLine: BowlLine = {
        localId: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        swatchColor: product.swatch_color,
        quantity: isDeveloper ? 0 : 30,
        costPerGram: cpg,
        isDeveloper,
        developerRatio: 1,
        lineCost: isDeveloper ? 0 : Math.round(30 * cpg * 100) / 100,
      };

      setBowls((prev) =>
        prev.map((b, i) => {
          if (i !== bowlIdx) return b;
          const lines = [...b.lines, newLine];
          // Recompute developer costs
          const colorQty = lines.filter((l) => !l.isDeveloper).reduce((s, l) => s + l.quantity, 0);
          lines.forEach((line) => {
            line.lineCost = computeLineCost(line.quantity, line.costPerGram, line.isDeveloper, line.developerRatio, colorQty);
          });
          return { ...b, lines };
        })
      );
    },
    []
  );

  const removeLineFromBowl = useCallback((bowlIdx: number, lineLocalId: string) => {
    setBowls((prev) =>
      prev.map((b, i) => {
        if (i !== bowlIdx) return b;
        const lines = b.lines.filter((l) => l.localId !== lineLocalId);
        const colorQty = lines.filter((l) => !l.isDeveloper).reduce((s, l) => s + l.quantity, 0);
        lines.forEach((line) => {
          line.lineCost = computeLineCost(line.quantity, line.costPerGram, line.isDeveloper, line.developerRatio, colorQty);
        });
        return { ...b, lines };
      })
    );
  }, []);

  const updateLineQuantity = useCallback((bowlIdx: number, lineLocalId: string, qty: number) => {
    setBowls((prev) =>
      prev.map((b, i) => {
        if (i !== bowlIdx) return b;
        const lines = b.lines.map((l) => (l.localId === lineLocalId ? { ...l, quantity: qty } : l));
        const colorQty = lines.filter((l) => !l.isDeveloper).reduce((s, l) => s + l.quantity, 0);
        lines.forEach((line) => {
          line.lineCost = computeLineCost(line.quantity, line.costPerGram, line.isDeveloper, line.developerRatio, colorQty);
        });
        return { ...b, lines };
      })
    );
  }, []);

  const updateDevRatio = useCallback((bowlIdx: number, lineLocalId: string, ratio: number) => {
    setBowls((prev) =>
      prev.map((b, i) => {
        if (i !== bowlIdx) return b;
        const lines = b.lines.map((l) => (l.localId === lineLocalId ? { ...l, developerRatio: ratio } : l));
        const colorQty = lines.filter((l) => !l.isDeveloper).reduce((s, l) => s + l.quantity, 0);
        lines.forEach((line) => {
          line.lineCost = computeLineCost(line.quantity, line.costPerGram, line.isDeveloper, line.developerRatio, colorQty);
        });
        return { ...b, lines };
      })
    );
  }, []);

  // Save all bowls + baselines + policy
  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);

    try {
      // Delete old bowls (cascades baselines via bowl_id SET NULL)
      if (existingBowls) {
        for (const b of existingBowls) {
          await deleteBowl.mutateAsync(b.id);
        }
      }
      // Delete old baselines for this service that had bowl_id
      if (existingBaselines) {
        for (const bl of existingBaselines) {
          await deleteBaseline.mutateAsync(bl.id);
        }
      }

      // Create new bowls + baselines
      for (const bowl of bowls) {
        if (bowl.lines.length === 0) continue;

        const savedBowl = await upsertBowl.mutateAsync({
          organization_id: orgId,
          service_id: serviceId,
          bowl_number: bowl.bowlNumber,
          label: bowl.label,
        });

        for (const line of bowl.lines) {
          const colorQty = bowl.lines.filter((l) => !l.isDeveloper).reduce((s, l) => s + l.quantity, 0);
          const effectiveQty = line.isDeveloper ? colorQty * line.developerRatio : line.quantity;

          await upsertBaseline.mutateAsync({
            organization_id: orgId,
            service_id: serviceId,
            product_id: line.productId,
            expected_quantity: effectiveQty,
            unit: 'g',
            notes: line.isDeveloper ? `Developer ${line.developerRatio}× ratio` : undefined,
          });

          // Update the baseline with bowl_id and cost snapshot
          await supabase
            .from('service_recipe_baselines')
            .update({
              bowl_id: savedBowl.id,
              cost_per_unit_snapshot: line.costPerGram,
              is_developer: line.isDeveloper,
              developer_ratio: line.developerRatio,
            } as any)
            .eq('organization_id', orgId)
            .eq('service_id', serviceId)
            .eq('product_id', line.productId);
        }
      }

      // Update allowance policy with dollar total
      await upsertPolicy.mutateAsync({
        organization_id: orgId,
        service_id: serviceId,
        included_allowance_qty: Math.round(totalWeight * 100) / 100,
        allowance_unit: 'g',
        overage_rate: 0,
        overage_rate_type: 'per_unit',
        billing_mode: 'allowance',
        is_active: true,
        notes: `Recipe-based: $${grandTotal.toFixed(2)} product allowance across ${bowls.filter((b) => b.lines.length > 0).length} bowl(s)`,
      });

      toast.success(`Product allowance saved: $${grandTotal.toFixed(2)}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to save allowance: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Grouped products by brand for picker
  const productsByBrand = useMemo(() => {
    const map = new Map<string, CatalogProduct[]>();
    for (const p of filteredProducts) {
      const brand = p.brand || 'Other';
      if (!map.has(brand)) map.set(brand, []);
      map.get(brand)!.push(p);
    }
    return map;
  }, [filteredProducts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogTitle className={cn(tokens.card.title)}>Product Allowance</DialogTitle>
          <DialogDescription className="text-sm font-sans text-muted-foreground">
            {serviceName} — Build sample bowls to calculate the included product cost.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-200px)]">
          <div className="px-6 py-4 space-y-4">
            {bowls.map((bowl, bowlIdx) => (
              <div key={bowl.id || `new-${bowlIdx}`} className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                {/* Bowl header */}
                <div
                  className="flex items-center justify-between px-4 py-2.5 bg-muted/30 cursor-pointer"
                  onClick={() => toggleBowlCollapse(bowlIdx)}
                >
                  <div className="flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-primary" />
                    <span className="text-sm font-sans font-medium text-foreground">{bowl.label}</span>
                    {bowl.lines.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        ${bowl.lines.reduce((s, l) => s + l.lineCost, 0).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {bowls.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBowl(bowlIdx);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                    {bowl.collapsed ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </div>

                {!bowl.collapsed && (
                  <div className="px-4 py-3 space-y-3">
                    {/* Existing lines */}
                    {bowl.lines.map((line) => (
                      <div key={line.localId} className="flex items-center gap-2 py-1.5 border-b border-border/20 last:border-0">
                        {/* Swatch */}
                        <div
                          className="w-5 h-5 rounded-full border border-border/60 shrink-0"
                          style={{ backgroundColor: line.swatchColor || 'hsl(var(--muted))' }}
                        />

                        {/* Product info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-sans text-foreground truncate">{line.productName}</div>
                          <div className="text-[10px] font-sans text-muted-foreground">
                            {line.brand} · ${line.costPerGram.toFixed(4)}/g
                          </div>
                        </div>

                        {/* Weight or ratio controls */}
                        {line.isDeveloper ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-sans text-muted-foreground">Ratio:</span>
                            {RATIO_PRESETS.map((r) => (
                              <button
                                key={r}
                                className={cn(
                                  'px-2 py-0.5 rounded-full text-[10px] font-sans transition-colors border',
                                  line.developerRatio === r
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-transparent border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground'
                                )}
                                onClick={() => updateDevRatio(bowlIdx, line.localId, r)}
                              >
                                {r}×
                              </button>
                            ))}
                            <Input
                              type="number"
                              step="0.1"
                              min="0.5"
                              max="4"
                              value={line.developerRatio}
                              onChange={(e) => updateDevRatio(bowlIdx, line.localId, parseFloat(e.target.value) || 1)}
                              className="h-5 w-12 text-[10px] rounded px-1"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            {WEIGHT_PRESETS.map((g) => (
                              <button
                                key={g}
                                className={cn(
                                  'px-2 py-0.5 rounded-full text-[10px] font-sans transition-colors border',
                                  line.quantity === g
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-transparent border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground'
                                )}
                                onClick={() => updateLineQuantity(bowlIdx, line.localId, g)}
                              >
                                {g}g
                              </button>
                            ))}
                            <Input
                              type="number"
                              step="1"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => updateLineQuantity(bowlIdx, line.localId, parseInt(e.target.value) || 0)}
                              className="h-5 w-12 text-[10px] rounded px-1"
                            />
                          </div>
                        )}

                        {/* Line cost */}
                        <span className="text-xs font-sans text-foreground tabular-nums w-16 text-right shrink-0">
                          ${line.lineCost.toFixed(2)}
                        </span>

                        {/* Remove */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeLineFromBowl(bowlIdx, line.localId)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}

                    {/* Add product picker */}
                    <div className="pt-2 space-y-2">
                      <Input
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="h-7 text-xs"
                      />
                      {productSearch.trim() && (
                        <div className="max-h-40 overflow-y-auto rounded-lg border border-border/40 bg-background">
                          {Array.from(productsByBrand.entries()).map(([brand, products]) => (
                            <div key={brand}>
                              <div className="px-3 py-1 text-[10px] font-sans text-muted-foreground bg-muted/30 sticky top-0">{brand}</div>
                              {products.map((p) => {
                                const cpg = getCostPerGram(p);
                                return (
                                  <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/20 cursor-pointer group">
                                    <div
                                      className="w-4 h-4 rounded-full border border-border/60 shrink-0"
                                      style={{ backgroundColor: p.swatch_color || 'hsl(var(--muted))' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-sans text-foreground truncate">{p.name}</div>
                                      <div className="text-[10px] font-sans text-muted-foreground">
                                        ${cpg.toFixed(4)}/g
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-5 px-2 text-[10px]"
                                        onClick={() => {
                                          addProductToBowl(bowlIdx, p, false);
                                          setProductSearch('');
                                        }}
                                      >
                                        <Beaker className="w-2.5 h-2.5 mr-0.5" />
                                        Color
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-5 px-2 text-[10px]"
                                        onClick={() => {
                                          addProductToBowl(bowlIdx, p, true);
                                          setProductSearch('');
                                        }}
                                      >
                                        <FlaskConical className="w-2.5 h-2.5 mr-0.5" />
                                        Dev
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                          {filteredProducts.length === 0 && (
                            <div className="px-3 py-4 text-xs text-center text-muted-foreground">No products found</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bowl subtotal */}
                    {bowl.lines.length > 0 && (
                      <div className="flex justify-end pt-2 border-t border-border/30">
                        <span className="text-xs font-sans text-muted-foreground">
                          Bowl Total: <span className="text-foreground font-medium">${bowl.lines.reduce((s, l) => s + l.lineCost, 0).toFixed(2)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add Bowl button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs border-dashed"
              onClick={addBowl}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Bowl
            </Button>
          </div>
        </ScrollArea>

        {/* Footer: Grand total + Save */}
        <div className="px-6 py-4 border-t border-border/40 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-sans text-muted-foreground">Product Allowance</div>
              <div className="text-xl font-sans font-medium text-foreground tabular-nums">
                ${grandTotal.toFixed(2)}
              </div>
              <div className="text-[10px] font-sans text-muted-foreground">
                {Math.round(totalWeight)}g total across {bowls.filter((b) => b.lines.length > 0).length} bowl(s)
              </div>
            </div>
            <Button
              size="sm"
              className="h-9 px-6"
              disabled={saving || grandTotal === 0}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Allowance
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
