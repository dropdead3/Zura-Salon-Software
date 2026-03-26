/**
 * AllowanceCalculatorDialog — Vish-style bowl-based product allowance calculator.
 * Builds recipes from real catalog products to derive a dollar-based allowance.
 * Product picker uses a 3-step Brand → Category → Product drill-down.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Loader2, Beaker, FlaskConical, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Palette, Search, TestTube2 } from 'lucide-react';
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
  containerTypes?: ('bowl' | 'bottle')[];
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
  id: string | null;
  bowlNumber: number;
  label: string;
  vesselType: 'bowl' | 'bottle';
  lines: BowlLine[];
  collapsed: boolean;
}

interface PickerState {
  step: 'brand' | 'category' | 'product';
  selectedBrand: string | null;
  selectedCategory: string | null;
  search: string;
}

const WEIGHT_PRESETS = [15, 30, 45, 60, 90];
const RATIO_PRESETS = [1, 1.5, 2];
const DEVELOPER_KEYWORDS = ['developer', 'dev', 'peroxide', 'oxidant', 'activator', 'vol'];

function isDeveloperProduct(product: CatalogProduct): boolean {
  const name = (product.name || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  return DEVELOPER_KEYWORDS.some((kw) => name.includes(kw) || category.includes(kw));
}

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

function getBowlWeight(bowl: BowlState): number {
  const colorQty = bowl.lines.filter((l) => !l.isDeveloper).reduce((s, l) => s + l.quantity, 0);
  return bowl.lines.reduce((s, line) => {
    if (line.isDeveloper) return s + colorQty * line.developerRatio;
    return s + line.quantity;
  }, 0);
}

const DEFAULT_PICKER: PickerState = { step: 'brand', selectedBrand: null, selectedCategory: null, search: '' };

export function AllowanceCalculatorDialog({ open, onOpenChange, serviceId, serviceName, containerTypes = ['bowl'] }: Props) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const hasBowls = containerTypes.includes('bowl');
  const hasBottles = containerTypes.includes('bottle');
  const hasBoth = hasBowls && hasBottles;
  const defaultVesselType = containerTypes[0] || 'bowl';
  const vesselLabel = (type: 'bowl' | 'bottle', num: number) => type === 'bottle' ? `Bottle ${num}` : `Bowl ${num}`;
  const VesselIcon = (type: 'bowl' | 'bottle') => type === 'bottle' ? TestTube2 : Beaker;

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

  const { data: existingBowls } = useAllowanceBowls(serviceId);
  const { data: existingBaselines } = useServiceRecipeBaselines(serviceId);

  const upsertBowl = useUpsertAllowanceBowl();
  const deleteBowl = useDeleteAllowanceBowl();
  const upsertBaseline = useUpsertRecipeBaseline();
  const deleteBaseline = useDeleteRecipeBaseline();
  const upsertPolicy = useUpsertAllowancePolicy();

  const [bowls, setBowls] = useState<BowlState[]>([]);
  const [saving, setSaving] = useState(false);
  const [bowlPickers, setBowlPickers] = useState<Record<number, PickerState>>({});

  const getPickerState = useCallback((bowlIdx: number): PickerState => {
    return bowlPickers[bowlIdx] || DEFAULT_PICKER;
  }, [bowlPickers]);

  const setPickerState = useCallback((bowlIdx: number, update: Partial<PickerState>) => {
    setBowlPickers((prev) => ({
      ...prev,
      [bowlIdx]: { ...(prev[bowlIdx] || DEFAULT_PICKER), ...update },
    }));
  }, []);

  // Derived brand list from catalog
  const brandList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of catalogProducts) {
      const brand = p.brand || 'Other';
      counts.set(brand, (counts.get(brand) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => a.brand.localeCompare(b.brand));
  }, [catalogProducts]);

  // Categories for a selected brand
  const getCategoriesForBrand = useCallback((brand: string) => {
    const products = catalogProducts.filter((p) => (p.brand || 'Other') === brand);
    const counts = new Map<string, number>();
    for (const p of products) {
      const cat = p.category || 'Other';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [catalogProducts]);

  // Products for a selected brand + category
  const getProductsForBrandCategory = useCallback((brand: string, category: string) => {
    return catalogProducts.filter(
      (p) => (p.brand || 'Other') === brand && (p.category || 'Other') === category
    );
  }, [catalogProducts]);

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
              lineCost: 0,
            };
          });
        const vType = b.label.toLowerCase().includes('bottle') ? 'bottle' as const : 'bowl' as const;
        return { id: b.id, bowlNumber: b.bowl_number, label: b.label, vesselType: vType, lines: bowlLines, collapsed: false };
      });

      loaded.forEach((bowl) => {
        const colorQty = bowl.lines.filter((l) => !l.isDeveloper).reduce((s, l) => s + l.quantity, 0);
        bowl.lines.forEach((line) => {
          line.lineCost = computeLineCost(line.quantity, line.costPerGram, line.isDeveloper, line.developerRatio, colorQty);
        });
      });

      setBowls(loaded);
    } else {
      setBowls([{ id: null, bowlNumber: 1, label: vesselLabel(defaultVesselType, 1), vesselType: defaultVesselType, lines: [], collapsed: false }]);
    }
    setBowlPickers({});
  }, [open, existingBowls, existingBaselines, catalogProducts]);

  const grandTotal = useMemo(() => {
    return bowls.reduce((sum, bowl) => sum + bowl.lines.reduce((ls, line) => ls + line.lineCost, 0), 0);
  }, [bowls]);

  const totalWeight = useMemo(() => {
    return bowls.reduce((sum, bowl) => sum + getBowlWeight(bowl), 0);
  }, [bowls]);

  const addVessel = useCallback((type: 'bowl' | 'bottle' = defaultVesselType) => {
    setBowls((prev) => [
      ...prev,
      { id: null, bowlNumber: prev.length + 1, label: vesselLabel(type, prev.length + 1), vesselType: type, lines: [], collapsed: false },
    ]);
  }, [defaultVesselType]);

  const removeBowl = useCallback((idx: number) => {
    setBowls((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((b, i) => ({ ...b, bowlNumber: i + 1, label: vesselLabel(b.vesselType, i + 1) }));
    });
  }, []);

  const toggleBowlCollapse = useCallback((idx: number) => {
    setBowls((prev) => prev.map((b, i) => (i === idx ? { ...b, collapsed: !b.collapsed } : b)));
  }, []);

  const addProductToBowl = useCallback(
    (bowlIdx: number, product: CatalogProduct) => {
      const cpg = getCostPerGram(product);
      const asDeveloper = isDeveloperProduct(product);
      const newLine: BowlLine = {
        localId: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        swatchColor: product.swatch_color,
        quantity: asDeveloper ? 0 : 30,
        costPerGram: cpg,
        isDeveloper: asDeveloper,
        developerRatio: 1,
        lineCost: asDeveloper ? 0 : Math.round(30 * cpg * 100) / 100,
      };

      setBowls((prev) =>
        prev.map((b, i) => {
          if (i !== bowlIdx) return b;
          const lines = [...b.lines, newLine];
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

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);

    try {
      if (existingBowls) {
        for (const b of existingBowls) {
          await deleteBowl.mutateAsync(b.id);
        }
      }
      if (existingBaselines) {
        for (const bl of existingBaselines) {
          await deleteBaseline.mutateAsync(bl.id);
        }
      }

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

      await upsertPolicy.mutateAsync({
        organization_id: orgId,
        service_id: serviceId,
        included_allowance_qty: Math.round(totalWeight * 100) / 100,
        allowance_unit: 'g',
        overage_rate: 0,
        overage_rate_type: 'per_unit',
        billing_mode: 'allowance',
        is_active: true,
        notes: `Recipe-based: $${grandTotal.toFixed(2)} product allowance across ${bowls.filter((b) => b.lines.length > 0).length} vessel(s)`,
      });

      toast.success(`Product allowance saved: $${grandTotal.toFixed(2)}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to save allowance: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const renderPickerPanel = (bowlIdx: number) => {
    const picker = getPickerState(bowlIdx);
    const searchLower = picker.search.toLowerCase().trim();

    // Step 1: Brand list
    if (picker.step === 'brand') {
      const filtered = searchLower
        ? brandList.filter((b) => b.brand.toLowerCase().includes(searchLower))
        : brandList;

      return (
        <div className="pt-2 space-y-1.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search brands..."
              value={picker.search}
              onChange={(e) => setPickerState(bowlIdx, { search: e.target.value })}
              className="h-8 text-xs pl-8"
            />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border/40 bg-background">
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-xs text-center text-muted-foreground">No brands found</div>
            )}
            {filtered.map(({ brand, count }) => (
              <button
                key={brand}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors text-left group"
                onClick={() => setPickerState(bowlIdx, { step: 'category', selectedBrand: brand, search: '' })}
              >
                <span className="text-xs font-sans text-foreground">{brand}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Step 2: Category list for selected brand
    if (picker.step === 'category' && picker.selectedBrand) {
      const categories = getCategoriesForBrand(picker.selectedBrand);
      const filtered = searchLower
        ? categories.filter((c) => c.category.toLowerCase().includes(searchLower))
        : categories;

      return (
        <div className="pt-2 space-y-1.5">
          {/* Breadcrumb back */}
          <button
            className="flex items-center gap-1 text-xs font-sans text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setPickerState(bowlIdx, { step: 'brand', selectedBrand: null, selectedCategory: null, search: '' })}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="font-medium text-foreground">{picker.selectedBrand}</span>
          </button>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={picker.search}
              onChange={(e) => setPickerState(bowlIdx, { search: e.target.value })}
              className="h-8 text-xs pl-8"
            />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border/40 bg-background">
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-xs text-center text-muted-foreground">No categories found</div>
            )}
            {filtered.map(({ category, count }) => (
              <button
                key={category}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors text-left group"
                onClick={() => setPickerState(bowlIdx, { step: 'product', selectedCategory: category, search: '' })}
              >
                <span className="text-xs font-sans text-foreground">{category}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Step 3: Product list for selected brand + category
    if (picker.step === 'product' && picker.selectedBrand && picker.selectedCategory) {
      const products = getProductsForBrandCategory(picker.selectedBrand, picker.selectedCategory);
      const filtered = searchLower
        ? products.filter((p) => p.name.toLowerCase().includes(searchLower))
        : products;

      return (
        <div className="pt-2 space-y-1.5">
          {/* Breadcrumb back */}
          <div className="flex items-center gap-1 text-xs font-sans text-muted-foreground">
            <button
              className="hover:text-foreground transition-colors flex items-center gap-0.5"
              onClick={() => setPickerState(bowlIdx, { step: 'brand', selectedBrand: null, selectedCategory: null, search: '' })}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Brands
            </button>
            <span className="text-muted-foreground/40">/</span>
            <button
              className="hover:text-foreground transition-colors"
              onClick={() => setPickerState(bowlIdx, { step: 'category', selectedCategory: null, search: '' })}
            >
              <span className="font-medium text-foreground">{picker.selectedBrand}</span>
            </button>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-medium text-foreground">{picker.selectedCategory}</span>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={picker.search}
              onChange={(e) => setPickerState(bowlIdx, { search: e.target.value })}
              className="h-8 text-xs pl-8"
            />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border/40 bg-background">
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-xs text-center text-muted-foreground">No products found</div>
            )}
            {filtered.map((p) => {
              const cpg = getCostPerGram(p);
              const isDevProduct = isDeveloperProduct(p);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-muted/20 transition-colors group"
                >
                  <div
                    className="w-5 h-5 rounded-full border border-border/60 shrink-0"
                    style={{ backgroundColor: p.swatch_color || 'hsl(var(--muted))' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-sans text-foreground truncate">{p.name}</div>
                    <div className="text-[11px] font-sans text-muted-foreground">
                      ${cpg.toFixed(4)}/g
                      {isDevProduct && (
                        <span className="ml-1.5">
                          <FlaskConical className="w-3 h-3 inline text-muted-foreground/60" />
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => addProductToBowl(bowlIdx, p)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogTitle className={cn(tokens.card.title)}>Product Allowance</DialogTitle>
          <DialogDescription className="text-sm font-sans text-muted-foreground">
            {serviceName} — Build sample {hasBoth ? 'bowls & bottles' : hasBottles ? 'bottles' : 'bowls'} to calculate the included product cost.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-200px)]">
          <div className="px-6 py-4 space-y-4">
            {bowls.map((bowl, bowlIdx) => {
              const bowlWeight = getBowlWeight(bowl);
              const bowlCost = bowl.lines.reduce((s, l) => s + l.lineCost, 0);
              const colorLines = bowl.lines.filter((l) => !l.isDeveloper);
              const devLines = bowl.lines.filter((l) => l.isDeveloper);
              const colorQty = colorLines.reduce((s, l) => s + l.quantity, 0);

              return (
                <div key={bowl.id || `new-${bowlIdx}`} className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                  {/* Vessel header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-muted/30 cursor-pointer"
                    onClick={() => toggleBowlCollapse(bowlIdx)}
                  >
                    <div className="flex items-center gap-2">
                      {(() => { const Icon = VesselIcon(bowl.vesselType); return <Icon className="w-4 h-4 text-primary" />; })()}
                      <span className="text-sm font-sans font-medium text-foreground">{bowl.label}</span>
                      {bowl.lines.length > 0 && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          {Math.round(bowlWeight)}g · ${bowlCost.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {bowls.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBowl(bowlIdx);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {bowl.collapsed ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {!bowl.collapsed && (
                    <div className="px-4 py-3 space-y-2">
                      {/* Empty state */}
                      {bowl.lines.length === 0 && (
                        <div className="flex flex-col items-center py-4 text-center">
                          <div className="w-10 h-10 rounded-full bg-muted/40 border border-border/60 flex items-center justify-center mb-3">
                            <Palette className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-sans text-muted-foreground">
                            Select a brand below to start adding products
                          </p>
                          <p className="text-xs font-sans text-muted-foreground/60 mt-1">
                            Developers are auto-detected from the catalog
                          </p>
                        </div>
                      )}

                      {/* Color product lines */}
                      {colorLines.map((line) => (
                        <div
                          key={line.localId}
                          className="flex items-center gap-2.5 py-2 border-b border-border/20 last:border-0"
                        >
                          <div
                            className="w-6 h-6 rounded-full border border-border/60 shrink-0"
                            style={{ backgroundColor: line.swatchColor || 'hsl(var(--muted))' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-sans text-foreground truncate">{line.productName}</div>
                            <div className="text-[11px] font-sans text-muted-foreground">
                              {line.brand} · ${line.costPerGram.toFixed(4)}/g
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {WEIGHT_PRESETS.map((g) => (
                              <button
                                key={g}
                                className={cn(
                                  'px-2.5 py-1 rounded-full text-xs font-sans transition-colors border',
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
                              className="h-6 w-14 text-xs rounded px-1.5"
                            />
                          </div>

                          <span className="text-xs font-sans text-foreground tabular-nums w-16 text-right shrink-0">
                            ${line.lineCost.toFixed(2)}
                          </span>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => removeLineFromBowl(bowlIdx, line.localId)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}

                      {/* Developer lines */}
                      {devLines.length > 0 && (
                        <div className="rounded-lg bg-muted/20 border border-border/30 px-3 py-2 space-y-2 mt-1">
                          <div className="flex items-center gap-1.5">
                            <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[11px] font-sans font-medium text-muted-foreground tracking-wide">Developer</span>
                          </div>
                          {devLines.map((line) => {
                            const devWeight = Math.round(colorQty * line.developerRatio);
                            return (
                              <div
                                key={line.localId}
                                className="flex items-center gap-2.5 py-1.5"
                              >
                                <div
                                  className="w-5 h-5 rounded-full border border-border/60 shrink-0"
                                  style={{ backgroundColor: line.swatchColor || 'hsl(var(--muted))' }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-sans text-foreground truncate">{line.productName}</div>
                                  <div className="text-[11px] font-sans text-muted-foreground">
                                    {devWeight}g at {line.developerRatio}× · ${line.costPerGram.toFixed(4)}/g
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {RATIO_PRESETS.map((r) => (
                                    <button
                                      key={r}
                                      className={cn(
                                        'px-2.5 py-1 rounded-full text-xs font-sans transition-colors border',
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
                                    className="h-6 w-14 text-xs rounded px-1.5"
                                  />
                                </div>

                                <span className="text-xs font-sans text-foreground tabular-nums w-16 text-right shrink-0">
                                  ${line.lineCost.toFixed(2)}
                                </span>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => removeLineFromBowl(bowlIdx, line.localId)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Brand → Category → Product picker */}
                      {renderPickerPanel(bowlIdx)}

                      {/* Vessel subtotal */}
                      {bowl.lines.length > 0 && (
                        <div className="flex justify-end pt-2 border-t border-border/30">
                          <span className="text-xs font-sans text-muted-foreground">
                            {bowl.vesselType === 'bottle' ? 'Bottle' : 'Bowl'} Total:{' '}
                            <span className="text-foreground font-medium">
                              {Math.round(bowlWeight)}g · ${bowlCost.toFixed(2)}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add vessel buttons */}
            <div className="flex gap-2">
              {hasBowls && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 text-xs border-dashed"
                  onClick={() => addVessel('bowl')}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Bowl
                </Button>
              )}
              {hasBottles && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 text-xs border-dashed"
                  onClick={() => addVessel('bottle')}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Bottle
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/40 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-sans text-muted-foreground">Product Allowance</div>
              <div className="text-xl font-sans font-medium text-foreground tabular-nums">
                ${grandTotal.toFixed(2)}
              </div>
              <div className="text-[11px] font-sans text-muted-foreground">
                {Math.round(totalWeight)}g total across {bowls.filter((b) => b.lines.length > 0).length} vessel(s)
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
