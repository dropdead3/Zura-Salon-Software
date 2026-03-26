/**
 * AllowanceCalculatorDialog — Bowl-based product allowance calculator.
 * Builds recipes from real catalog products to derive a dollar-based allowance.
 * Product picker uses a 3-step Brand → Category → Product drill-down.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Loader2, Beaker, FlaskConical, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Palette, Search, TestTube2, Check, ArrowRight, Copy, ClipboardCopy, Eraser, Pencil } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAllowanceBowls, useUpsertAllowanceBowl, useDeleteAllowanceBowl } from '@/hooks/backroom/useAllowanceBowls';
import { useServiceRecipeBaselines, useUpsertRecipeBaseline, useDeleteRecipeBaseline } from '@/hooks/inventory/useServiceRecipeBaselines';
import { useUpsertAllowancePolicy } from '@/hooks/billing/useServiceAllowancePolicies';
import { useBackroomBillingSettings } from '@/hooks/billing/useBackroomBillingSettings';
import { calculateRetailCostPerGram, calculateAllowanceHealth, type AllowanceHealthResult } from '@/lib/backroom/allowance-health';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  serviceName: string;
  containerTypes?: ('bowl' | 'bottle')[];
  servicePrice?: number | null;
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
  markup_pct: number | null;
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
  step: 'brand' | 'category' | 'product' | 'closed';
  selectedBrand: string | null;
  selectedCategory: string | null;
  search: string;
}

const WEIGHT_PRESETS = [15, 30, 45, 60, 90];
const RATIO_PRESETS = [1, 1.5, 2];
const DEVELOPER_KEYWORDS = ['developer', 'dev', 'peroxide', 'oxidant', 'activator', 'vol'];

/** Transform category slugs (e.g. "color-remover") into title-case labels ("Color Remover") */
function formatCategoryLabel(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isDeveloperProduct(product: CatalogProduct): boolean {
  const name = (product.name || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  return DEVELOPER_KEYWORDS.some((kw) => name.includes(kw) || category.includes(kw));
}

function computeLineCost(qty: number, costPerGram: number, isDeveloper: boolean, developerRatio: number, colorQty: number): number {
  if (isDeveloper) {
    // When no color products exist, use the developer's direct quantity instead of ratio
    const devQty = colorQty > 0 ? colorQty * developerRatio : qty;
    return Math.round(devQty * costPerGram * 100) / 100;
  }
  return Math.round(qty * costPerGram * 100) / 100;
}

function getWholesaleCostPerGram(product: CatalogProduct): number {
  if (product.cost_per_gram && product.cost_per_gram > 0) return product.cost_per_gram;
  if (product.cost_price && product.container_size) {
    const size = parseFloat(product.container_size);
    if (size > 0) return Math.round((product.cost_price / size) * 10000) / 10000;
  }
  return 0;
}

function getRetailCostPerGram(product: CatalogProduct, defaultMarkupPct: number): number {
  const wholesale = getWholesaleCostPerGram(product);
  const markup = product.markup_pct ?? defaultMarkupPct;
  return calculateRetailCostPerGram(wholesale, markup);
}

function getBowlWeight(bowl: BowlState): number {
  const colorQty = bowl.lines.filter((l) => !l.isDeveloper).reduce((s, l) => s + l.quantity, 0);
  return bowl.lines.reduce((s, line) => {
    if (line.isDeveloper) return s + (colorQty > 0 ? colorQty * line.developerRatio : line.quantity);
    return s + line.quantity;
  }, 0);
}

const DEFAULT_PICKER: PickerState = { step: 'brand', selectedBrand: null, selectedCategory: null, search: '' };

export function AllowanceCalculatorDialog({ open, onOpenChange, serviceId, serviceName, containerTypes = ['bowl'], servicePrice }: Props) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: billingSettings } = useBackroomBillingSettings(orgId);
  const defaultMarkupPct = billingSettings?.default_product_markup_pct ?? 0;

  const hasBowls = containerTypes.includes('bowl');
  const hasBottles = containerTypes.includes('bottle');
  const hasBoth = hasBowls && hasBottles;
  const defaultVesselType = containerTypes[0] || 'bowl';
  const vesselLabel = (type: 'bowl' | 'bottle', num: number) => type === 'bottle' ? `Bottle ${num}` : `Bowl ${num}`;
  const VesselIcon = (type: 'bowl' | 'bottle') => type === 'bottle' ? TestTube2 : Beaker;

  const { data: catalogProducts = [], isLoading: catalogLoading } = useQuery({
    queryKey: ['catalog-products-for-allowance', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, category, cost_per_gram, cost_price, container_size, swatch_color, product_type, markup_pct')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('product_type', 'Supplies')
        .order('brand')
        .order('name')
        .limit(2000);
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
  const [editingLabelIdx, setEditingLabelIdx] = useState<number | null>(null);
  const [modeledServicePrice, setModeledServicePrice] = useState<number | null>(null);
  const effectiveServicePrice = modeledServicePrice ?? servicePrice ?? 0;
  const initialBowlsRef = useRef<string>('');
  const isDirty = useMemo(() => {
    if (!initialBowlsRef.current) return false;
    const currentSnapshot = JSON.stringify(bowls.map(b => ({ label: b.label, lines: b.lines.map(l => ({ productId: l.productId, quantity: l.quantity, developerRatio: l.developerRatio })), vesselType: b.vesselType })));
    return currentSnapshot !== initialBowlsRef.current || modeledServicePrice !== null;
  }, [bowls, modeledServicePrice]);

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
          .filter((bl) => bl.bowl_id === b.id)
          .map((bl) => {
            const prod = catalogProducts.find((p) => p.id === bl.product_id);
            const cpg = bl.cost_per_unit_snapshot || (prod ? getRetailCostPerGram(prod, defaultMarkupPct) : 0);
            return {
              localId: bl.id,
              productId: bl.product_id,
              productName: prod?.name || 'Unknown Product',
              brand: prod?.brand || null,
              swatchColor: prod?.swatch_color || null,
              quantity: bl.expected_quantity,
              costPerGram: cpg,
              isDeveloper: bl.is_developer || false,
              developerRatio: bl.developer_ratio || 1,
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
      // Capture initial snapshot for dirty-state detection
      const snapshot = JSON.stringify(loaded.map(b => ({ label: b.label, lines: b.lines.map(l => ({ productId: l.productId, quantity: l.quantity, developerRatio: l.developerRatio })), vesselType: b.vesselType })));
      initialBowlsRef.current = snapshot;
    } else {
      const defaultBowls = [{ id: null, bowlNumber: 1, label: vesselLabel(defaultVesselType, 1), vesselType: defaultVesselType, lines: [] as BowlLine[], collapsed: false }];
      setBowls(defaultBowls);
      const snapshot = JSON.stringify(defaultBowls.map(b => ({ label: b.label, lines: b.lines.map(l => ({ productId: l.productId, quantity: l.quantity, developerRatio: l.developerRatio })), vesselType: b.vesselType })));
      initialBowlsRef.current = snapshot;
    }
    setBowlPickers({});
    setEditingLabelIdx(null);
    setModeledServicePrice(null);
  }, [open, existingBowls, existingBaselines, catalogProducts]);

  const grandTotal = useMemo(() => {
    return bowls.reduce((sum, bowl) => sum + bowl.lines.reduce((ls, line) => ls + line.lineCost, 0), 0);
  }, [bowls]);

  const wholesaleGrandTotal = useMemo(() => {
    return bowls.reduce((sum, bowl) => {
      const colorQty = bowl.lines.filter((l) => !l.isDeveloper).reduce((s, l) => s + l.quantity, 0);
      return sum + bowl.lines.reduce((ls, line) => {
        const product = catalogProducts.find((p) => p.id === line.productId);
        const wholesaleCpg = product ? getWholesaleCostPerGram(product) : 0;
        const effectiveQty = line.isDeveloper ? (colorQty > 0 ? colorQty * line.developerRatio : line.quantity) : line.quantity;
        return ls + Math.round(effectiveQty * wholesaleCpg * 100) / 100;
      }, 0);
    }, 0);
  }, [bowls, catalogProducts]);

  const totalWeight = useMemo(() => {
    return bowls.reduce((sum, bowl) => sum + getBowlWeight(bowl), 0);
  }, [bowls]);

  const healthResult: AllowanceHealthResult | null = useMemo(() => {
    if (effectiveServicePrice <= 0 || grandTotal <= 0) return null;
    return calculateAllowanceHealth({ allowanceAmount: grandTotal, servicePrice: effectiveServicePrice });
  }, [grandTotal, effectiveServicePrice]);

  const queryClient = useQueryClient();

  const updateServicePriceMutation = useMutation({
    mutationFn: async (newPrice: number) => {
      const { error } = await supabase
        .from('services')
        .update({ price: newPrice })
        .eq('id', serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-services'] });
      toast.success('Service price updated');
    },
    onError: (err: Error) => {
      toast.error('Failed to update price: ' + err.message);
    },
  });

  const addVessel = useCallback((type: 'bowl' | 'bottle' = defaultVesselType) => {
    setBowls((prev) => [
      ...prev,
      { id: null, bowlNumber: prev.length + 1, label: vesselLabel(type, prev.length + 1), vesselType: type, lines: [], collapsed: false },
    ]);
  }, [defaultVesselType]);

  const removedBowlRef = useRef<{ idx: number; bowl: BowlState } | null>(null);

  const removeBowl = useCallback((idx: number) => {
    const removed = bowls[idx];
    setBowls((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((b, i) => ({ ...b, bowlNumber: i + 1 }));
    });
    if (removed) {
      removedBowlRef.current = { idx, bowl: removed };
      toast(`Removed ${removed.label}`, {
        action: {
          label: 'Undo',
          onClick: () => {
            const ref = removedBowlRef.current;
            if (!ref) return;
            setBowls((prev) => {
              const next = [...prev];
              next.splice(Math.min(ref.idx, next.length), 0, ref.bowl);
              return next.map((b, i) => ({ ...b, bowlNumber: i + 1 }));
            });
            removedBowlRef.current = null;
          },
        },
        duration: 5000,
      });
    }
  }, [bowls]);

  const clearBowl = useCallback((idx: number) => {
    setBowls((prev) =>
      prev.map((b, i) => {
        if (i !== idx) return b;
        return { ...b, lines: [] };
      })
    );
    toast.success('Bowl cleared');
  }, []);

  const updateBowlLabel = useCallback((idx: number, label: string) => {
    setBowls((prev) =>
      prev.map((b, i) => (i === idx ? { ...b, label } : b))
    );
  }, []);

  const duplicateBowl = useCallback((idx: number) => {
    setBowls((prev) => {
      const source = prev[idx];
      if (!source) return prev;
      const clonedLines = source.lines.map((l) => ({ ...l, localId: crypto.randomUUID() }));
      const next = [...prev, { id: null, bowlNumber: prev.length + 1, label: vesselLabel(source.vesselType, prev.length + 1), vesselType: source.vesselType, lines: clonedLines, collapsed: false }];
      return next;
    });
    toast.success('Bowl duplicated');
  }, []);

  const setBulkQuantity = useCallback((bowlIdx: number, qty: number) => {
    setBowls((prev) =>
      prev.map((b, i) => {
        if (i !== bowlIdx) return b;
        const lines = b.lines.map((l) => (l.isDeveloper ? l : { ...l, quantity: qty }));
        const colorQty = lines.filter((l) => !l.isDeveloper).reduce((s, l) => s + l.quantity, 0);
        lines.forEach((line) => {
          line.lineCost = computeLineCost(line.quantity, line.costPerGram, line.isDeveloper, line.developerRatio, colorQty);
        });
        return { ...b, lines };
      })
    );
    toast.success(`All color lines set to ${qty}g`);
  }, []);

  const toggleBowlCollapse = useCallback((idx: number) => {
    setBowls((prev) => prev.map((b, i) => (i === idx ? { ...b, collapsed: !b.collapsed } : b)));
  }, []);

  const addProductToBowl = useCallback(
    (bowlIdx: number, product: CatalogProduct) => {
      const cpg = getRetailCostPerGram(product, defaultMarkupPct);
      const asDeveloper = isDeveloperProduct(product);
      // Give developers a default 30g quantity when no color lines exist in the bowl
      const currentBowl = bowls[bowlIdx];
      const hasColorLines = currentBowl?.lines.some((l) => !l.isDeveloper) ?? false;
      const devDefaultQty = asDeveloper && !hasColorLines ? 30 : (asDeveloper ? 0 : 30);
      const newLine: BowlLine = {
        localId: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        swatchColor: product.swatch_color,
        quantity: devDefaultQty,
        costPerGram: cpg,
        isDeveloper: asDeveloper,
        developerRatio: 1,
        lineCost: devDefaultQty > 0 ? Math.round(devDefaultQty * cpg * 100) / 100 : 0,
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
    [bowls, defaultMarkupPct]
  );

  const removedLineRef = useRef<{ bowlIdx: number; line: BowlLine; position: number } | null>(null);

  const removeLineFromBowl = useCallback((bowlIdx: number, lineLocalId: string) => {
    // Capture the line for undo
    const bowl = bowls[bowlIdx];
    const lineIdx = bowl?.lines.findIndex((l) => l.localId === lineLocalId) ?? -1;
    const removedLine = bowl?.lines[lineIdx];

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

    if (removedLine) {
      removedLineRef.current = { bowlIdx, line: removedLine, position: lineIdx };
      toast(`Removed ${removedLine.productName}`, {
        action: {
          label: 'Undo',
          onClick: () => {
            const ref = removedLineRef.current;
            if (!ref) return;
            setBowls((prev) =>
              prev.map((b, i) => {
                if (i !== ref.bowlIdx) return b;
                const lines = [...b.lines];
                lines.splice(Math.min(ref.position, lines.length), 0, ref.line);
                const colorQty = lines.filter((l) => !l.isDeveloper).reduce((s, l) => s + l.quantity, 0);
                lines.forEach((line) => {
                  line.lineCost = computeLineCost(line.quantity, line.costPerGram, line.isDeveloper, line.developerRatio, colorQty);
                });
                return { ...b, lines };
              })
            );
            removedLineRef.current = null;
          },
        },
        duration: 5000,
      });
    }
  }, [bowls]);

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

    // Warn about empty non-first bowls
    const emptyBowls = bowls.filter((b, i) => i > 0 && b.lines.length === 0);
    if (emptyBowls.length > 0) {
      toast.info(`${emptyBowls.map(b => b.label).join(', ')} ${emptyBowls.length === 1 ? 'is' : 'are'} empty and won't be saved.`);
    }

    // Snapshot existing data for rollback
    const existingBowlIds = existingBowls?.map(b => b.id) || [];
    const existingBaselineIds = existingBaselines?.map(bl => bl.id) || [];

    try {
      // Phase 1: Batch delete existing data
      if (existingBaselineIds.length > 0) {
        const { error: blErr } = await supabase
          .from('service_recipe_baselines')
          .delete()
          .in('id', existingBaselineIds);
        if (blErr) throw new Error('Failed to clear baselines: ' + blErr.message);
      }
      if (existingBowlIds.length > 0) {
        const { error: bowlErr } = await supabase
          .from('service_allowance_bowls')
          .delete()
          .in('id', existingBowlIds);
        if (bowlErr) throw new Error('Failed to clear bowls: ' + bowlErr.message);
      }

      // Phase 2: Insert new data — collect all baselines for batch update
      const baselineUpdates: Array<{ baselineId: string; bowlId: string; line: BowlLine }> = [];

      for (const bowl of bowls) {
        if (bowl.lines.length === 0) continue;

        const savedBowl = await upsertBowl.mutateAsync({
          organization_id: orgId,
          service_id: serviceId,
          bowl_number: bowl.bowlNumber,
          label: bowl.label,
        });

        for (const line of bowl.lines) {
          // Save the RAW quantity for developer lines, not the effective qty.
          // The effective qty is computed at runtime from colorQty * ratio.
          const savedBaseline = await upsertBaseline.mutateAsync({
            organization_id: orgId,
            service_id: serviceId,
            product_id: line.productId,
            expected_quantity: line.quantity,
            unit: 'g',
            notes: line.isDeveloper ? `Developer ${line.developerRatio}× ratio` : undefined,
          });

          // Track for update by ID (not composite key) to handle same product in multiple bowls
          baselineUpdates.push({ baselineId: savedBaseline.id, bowlId: savedBowl.id, line });
        }
      }

      // Phase 2b: Update bowl_id and metadata on each baseline by its unique ID
      for (const { baselineId, bowlId, line } of baselineUpdates) {
        const { error: updateErr } = await supabase
          .from('service_recipe_baselines')
          .update({
            bowl_id: bowlId,
            cost_per_unit_snapshot: line.costPerGram,
            is_developer: line.isDeveloper,
            developer_ratio: line.developerRatio,
          })
          .eq('id', baselineId);
        if (updateErr) throw new Error('Failed to update baseline metadata: ' + updateErr.message);
      }

      // Phase 3: Update policy
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
        allowance_health_status: healthResult?.status ?? null,
        allowance_health_pct: healthResult?.allowancePct ?? null,
        last_health_check_at: healthResult ? new Date().toISOString() : null,
      });

      // Update snapshot so isDirty resets
      initialBowlsRef.current = JSON.stringify(bowls.map(b => ({ label: b.label, lines: b.lines.map(l => ({ productId: l.productId, quantity: l.quantity, developerRatio: l.developerRatio })), vesselType: b.vesselType })));
      setModeledServicePrice(null);

      toast.success(`Product allowance saved: $${grandTotal.toFixed(2)}`);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error('Failed to save allowance: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
      // Show skeleton only while actively loading; show empty state if catalog is genuinely empty
      if (catalogLoading) {
        return (
          <div className="pt-2 space-y-1.5">
            <Skeleton className="h-8 w-full rounded-full" />
            <div className="rounded-lg border border-border/40 bg-background p-1">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md mb-1 last:mb-0" />
              ))}
            </div>
          </div>
        );
      }

      if (catalogProducts.length === 0) {
        return (
          <div className="pt-2 px-3 py-6 text-center">
            <p className="text-xs font-sans text-muted-foreground">No supply products found in your catalog.</p>
            <p className="text-[11px] font-sans text-muted-foreground/60 mt-1">Add products in Inventory to use the allowance calculator.</p>
          </div>
        );
      }

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
          <div
            className="max-h-48 overflow-y-auto rounded-lg border border-border/40 bg-background"
            role="listbox"
            onKeyDown={(e) => {
              const items = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]');
              const current = Array.from(items).indexOf(document.activeElement as HTMLButtonElement);
              if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(current + 1, items.length - 1)]?.focus(); }
              if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(current - 1, 0)]?.focus(); }
            }}
          >
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-xs text-center text-muted-foreground">No brands found</div>
            )}
            {filtered.map(({ brand, count }) => (
              <button
                key={brand}
                role="option"
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 focus:bg-muted/30 focus:outline-none transition-colors text-left group"
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
          <div
            className="max-h-48 overflow-y-auto rounded-lg border border-border/40 bg-background"
            role="listbox"
            onKeyDown={(e) => {
              const items = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]');
              const current = Array.from(items).indexOf(document.activeElement as HTMLButtonElement);
              if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(current + 1, items.length - 1)]?.focus(); }
              if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(current - 1, 0)]?.focus(); }
            }}
          >
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-xs text-center text-muted-foreground">No categories found</div>
            )}
            {filtered.map(({ category, count }) => (
              <button
                key={category}
                role="option"
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 focus:bg-muted/30 focus:outline-none transition-colors text-left group"
                onClick={() => setPickerState(bowlIdx, { step: 'product', selectedCategory: category, search: '' })}
              >
                <span className="text-xs font-sans text-foreground">{formatCategoryLabel(category)}</span>
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

      const bowl = bowls[bowlIdx];
      const addedCount = bowl?.lines.length ?? 0;
      const addedProductIds = new Set(bowl?.lines.map((l) => l.productId) ?? []);

      return (
        <div className="pt-2 space-y-1.5">
          {/* Breadcrumb back + ingredient counter */}
          <div className="flex items-center justify-between">
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
              <span className="font-medium text-foreground">{picker.selectedCategory ? formatCategoryLabel(picker.selectedCategory) : ''}</span>
            </div>
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
              const cpg = getRetailCostPerGram(p, defaultMarkupPct);
              const isDevProduct = isDeveloperProduct(p);
              const isAlreadyAdded = addedProductIds.has(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors cursor-pointer rounded-md"
                  onClick={() => {
                    if (isAlreadyAdded) {
                      const line = bowls[bowlIdx]?.lines.find((l) => l.productId === p.id);
                      if (line) removeLineFromBowl(bowlIdx, line.localId);
                    } else {
                      addProductToBowl(bowlIdx, p);
                    }
                  }}
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
                  <Checkbox
                    checked={isAlreadyAdded}
                    className="shrink-0"
                    tabIndex={-1}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => {
                      if (isAlreadyAdded) {
                        const line = bowls[bowlIdx]?.lines.find((l) => l.productId === p.id);
                        if (line) removeLineFromBowl(bowlIdx, line.localId);
                      } else {
                        addProductToBowl(bowlIdx, p);
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setPickerState(bowlIdx, { step: 'brand', selectedBrand: null, selectedCategory: null, search: '' })}
            >
              + Add Another Product
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setPickerState(bowlIdx, { step: 'closed' })}
            >
              Done Adding
            </Button>
          </div>
        </div>
      );
    }

    if (picker.step === 'closed') {
      return (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs mt-2"
          onClick={() => setPickerState(bowlIdx, { step: 'brand', selectedBrand: null, selectedCategory: null, search: '' })}
        >
          + Add Products
        </Button>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && isDirty) {
        toast.warning('You have unsaved changes', {
          action: { label: 'Discard & Close', onClick: () => { initialBowlsRef.current = ''; onOpenChange(false); } },
          duration: 6000,
        });
        return;
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <DialogTitle className={cn(tokens.card.title)}>Product Allowance Calculator</DialogTitle>
            <MetricInfoTooltip
              description="Use this tool to set a dollar allowance for this service. Pick sample products as benchmarks to calculate cost — stylists aren't limited to these products. During a service, they can mix whatever the client needs. If you carry a premium line, the higher cost per gram means less product before hitting the limit. Once the allowance amount is reached, any additional product cost is charged to the client as an overage fee."
              className="w-3.5 h-3.5"
            />
          </div>
          <DialogDescription className="text-sm font-sans text-muted-foreground">
            {serviceName} — Use sample products as benchmarks to set the included dollar allowance.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 overflow-hidden relative">
          {saving && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm font-sans text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving allowance...
              </div>
            </div>
          )}
          <div className="px-6 py-4 space-y-4">
            {bowls.map((bowl, bowlIdx) => {
              const bowlWeight = getBowlWeight(bowl);
              const bowlCost = bowl.lines.reduce((s, l) => s + l.lineCost, 0);
              const colorLines = bowl.lines.filter((l) => !l.isDeveloper);
              const devLines = bowl.lines.filter((l) => l.isDeveloper);
              const colorQty = colorLines.reduce((s, l) => s + l.quantity, 0);
              const bowlHealthPct = effectiveServicePrice > 0 ? ((bowlCost / effectiveServicePrice) * 100) : null;

              return (
                <div key={bowl.id || `new-${bowlIdx}`} className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                  {/* Vessel header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-muted/30 cursor-pointer"
                    onClick={() => toggleBowlCollapse(bowlIdx)}
                  >
                    <div className="flex items-center gap-2">
                      {(() => { const Icon = VesselIcon(bowl.vesselType); return <Icon className="w-4 h-4 text-primary" />; })()}
                      {editingLabelIdx === bowlIdx ? (
                        <Input
                          autoFocus
                          value={bowl.label}
                          className="h-6 w-32 text-sm font-sans px-1.5"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateBowlLabel(bowlIdx, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => setEditingLabelIdx(null)}
                          onKeyDown={(e) => { if (e.key === 'Enter') setEditingLabelIdx(null); }}
                        />
                      ) : (
                        <span
                          className="text-sm font-sans font-medium text-foreground cursor-text hover:underline decoration-dashed underline-offset-2"
                          onClick={(e) => { e.stopPropagation(); setEditingLabelIdx(bowlIdx); }}
                        >
                          {bowl.label}
                        </span>
                      )}
                      {bowl.lines.length > 0 && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          {Math.round(bowlWeight)}g · ${bowlCost.toFixed(2)}
                        </Badge>
                      )}
                      {bowl.lines.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                          {bowl.lines.length} added
                        </Badge>
                      )}
                      {bowlHealthPct !== null && bowl.lines.length > 0 && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-2 py-0.5',
                            bowlHealthPct > 10 ? 'text-destructive border-destructive/30' :
                            bowlHealthPct < 6 ? 'text-amber-500 border-amber-500/30' :
                            'text-emerald-500 border-emerald-500/30'
                          )}
                        >
                          {bowlHealthPct.toFixed(1)}% of service
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Bulk quantity presets */}
                      {colorLines.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Set All
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="end" onClick={(e) => e.stopPropagation()}>
                            <p className="text-[11px] font-sans text-muted-foreground mb-1.5">Set all color lines to:</p>
                            <div className="flex gap-1">
                              {WEIGHT_PRESETS.map((g) => (
                                <Button
                                  key={g}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs"
                                  onClick={() => { setBulkQuantity(bowlIdx, g); }}
                                >
                                  {g}g
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      {/* Duplicate bowl */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateBowl(bowlIdx);
                            }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Duplicate this {bowl.vesselType}</TooltipContent>
                      </Tooltip>
                      {/* Clear bowl */}
                      {bowl.lines.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={(e) => { e.stopPropagation(); clearBowl(bowlIdx); }}
                            >
                              <Eraser className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Clear all products</TooltipContent>
                        </Tooltip>
                      )}
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
                      {/* Brand → Category → Product picker */}
                      {renderPickerPanel(bowlIdx)}

                      {/* Empty state */}
                      {bowl.lines.length === 0 && !bowlPickers[bowlIdx] && (
                        <div className="flex flex-col items-center py-4 text-center">
                          <div className="w-10 h-10 rounded-full bg-muted/40 border border-border/60 flex items-center justify-center mb-3">
                            <Palette className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-sans text-muted-foreground">
                            Add benchmark products to calculate allowance
                          </p>
                          <p className="text-xs font-sans text-muted-foreground/60 mt-1">
                            These products set the dollar amount — stylists can mix any product during the service.
                          </p>
                        </div>
                      )}

                      {/* Color product lines — capped height with independent scroll */}
                      {colorLines.length > 0 && (
                      <div className="max-h-[240px] overflow-y-auto rounded-md border border-border/20 bg-background/50">
                      <AnimatePresence mode="popLayout">
                      {colorLines.map((line) => (
                        <motion.div
                          key={line.localId}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          layout
                          className="flex items-center gap-2.5 py-2 border-b border-border/20 last:border-0"
                        >
                          <div
                            className="w-6 h-6 rounded-full border border-border/60 shrink-0"
                            style={{ backgroundColor: line.swatchColor || 'hsl(var(--muted))' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-sans text-foreground truncate">
                              {line.productName}
                              {/* Cross-bowl duplicate warning */}
                              {(() => {
                                const otherBowlIdx = bowls.findIndex((ob, oi) => oi !== bowlIdx && ob.lines.some(ol => ol.productId === line.productId));
                                return otherBowlIdx >= 0 ? (
                                  <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 text-amber-500 border-amber-500/30">
                                    Also in {bowls[otherBowlIdx].label}
                                  </Badge>
                                ) : null;
                              })()}
                            </div>
                            <div className="text-[11px] font-sans text-muted-foreground">
                              {line.brand} · ${line.costPerGram.toFixed(4)}/g
                              {(() => {
                                const prod = catalogProducts.find(p => p.id === line.productId);
                                if (!prod) return null;
                                const wholesale = getWholesaleCostPerGram(prod);
                                if (wholesale <= 0) return null;
                                return <span className="text-muted-foreground/50"> · ${wholesale.toFixed(4)}/g wholesale</span>;
                              })()}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {WEIGHT_PRESETS.map((g) => (
                              <button
                                key={g}
                                className={cn(
                                   'px-2 py-1 rounded-full text-xs font-sans transition-colors border',
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
                              onChange={(e) => updateLineQuantity(bowlIdx, line.localId, Math.max(1, parseInt(e.target.value) || 1))}
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
                        </motion.div>
                      ))}
                      </AnimatePresence>
                      </div>
                      )}

                      {/* Developer lines */}
                      {devLines.length > 0 && (
                        <div className="rounded-lg bg-muted/20 border border-border/30 px-3 py-2 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[11px] font-sans font-medium text-muted-foreground tracking-wide">Developer</span>
                          </div>
                          <AnimatePresence mode="popLayout">
                          {devLines.map((line) => {
                            const devWeight = colorQty > 0 ? Math.round(colorQty * line.developerRatio) : line.quantity;
                            const showGramPresets = colorQty === 0;
                            return (
                              <motion.div
                                key={line.localId}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 12 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                layout
                                className="flex items-center gap-2.5 py-1.5"
                              >
                                <div
                                  className="w-5 h-5 rounded-full border border-border/60 shrink-0"
                                  style={{ backgroundColor: line.swatchColor || 'hsl(var(--muted))' }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-sans text-foreground truncate">{line.productName}</div>
                                  <div className="text-[11px] font-sans text-muted-foreground">
                                    {showGramPresets
                                      ? `${devWeight}g · $${line.costPerGram.toFixed(4)}/g`
                                      : `${devWeight}g at ${line.developerRatio}× · $${line.costPerGram.toFixed(4)}/g`
                                    }
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {showGramPresets ? (
                                    <>
                                      {WEIGHT_PRESETS.map((g) => (
                                        <button
                                          key={g}
                                          className={cn(
                                            'px-2 py-1 rounded-full text-xs font-sans transition-colors border',
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
                                        onChange={(e) => updateLineQuantity(bowlIdx, line.localId, Math.max(1, parseInt(e.target.value) || 1))}
                                        className="h-6 w-14 text-xs rounded px-1.5"
                                      />
                                    </>
                                  ) : (
                                    <>
                                      {RATIO_PRESETS.map((r) => (
                                        <button
                                          key={r}
                                          className={cn(
                                            'px-2 py-1 rounded-full text-xs font-sans transition-colors border',
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
                                    </>
                                  )}
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
                              </motion.div>
                            );
                          })}
                          </AnimatePresence>
                        </div>
                      )}

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
        <div className="px-6 py-4 border-t border-border/40 bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-sans font-medium tracking-wide text-muted-foreground uppercase">Total Allowance (Retail)</div>
              <div className="text-2xl font-sans font-medium text-foreground tabular-nums mt-0.5">
                ${grandTotal.toFixed(2)}
              </div>
              <div className="text-[11px] font-sans text-muted-foreground/70 mt-0.5 flex items-center gap-2">
                <span>{Math.round(totalWeight)}g across {bowls.filter((b) => b.lines.length > 0).length} vessel{bowls.filter((b) => b.lines.length > 0).length !== 1 ? 's' : ''}</span>
                {/* Inline editable service price */}
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1">
                  Service $
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    value={effectiveServicePrice || ''}
                    onChange={(e) => setModeledServicePrice(parseFloat(e.target.value) || null)}
                    className="h-5 w-16 text-[11px] px-1 inline-block tabular-nums"
                    placeholder={servicePrice?.toString() || '0'}
                  />
                  {modeledServicePrice !== null && modeledServicePrice !== servicePrice && (
                    <>
                      <button
                        className="text-[10px] text-primary hover:underline"
                        onClick={() => setModeledServicePrice(null)}
                      >
                        reset
                      </button>
                      <button
                        className="text-[10px] text-primary hover:underline"
                        onClick={() => {
                          const oldPrice = servicePrice;
                          updateServicePriceMutation.mutate(modeledServicePrice, {
                            onSuccess: () => {
                              setModeledServicePrice(null);
                              toast(`Service price updated to $${modeledServicePrice}`, {
                                action: oldPrice ? {
                                  label: 'Undo',
                                  onClick: () => updateServicePriceMutation.mutate(oldPrice),
                                } : undefined,
                                duration: 6000,
                              });
                            },
                          });
                        }}
                      >
                        apply
                      </button>
                    </>
                  )}
                </span>
              </div>
              {/* Allowance Health Indicator */}
              {healthResult ? (
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "text-[11px] font-sans px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5 cursor-help",
                        healthResult.status === 'healthy' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        healthResult.status === 'high' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        healthResult.status === 'low' && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                      )}>
                        <span className="font-medium">{healthResult.allowancePct}%</span>
                        <span>of ${effectiveServicePrice.toFixed(0)} service</span>
                        <span className="text-[10px] opacity-70">
                          {healthResult.status === 'healthy' && '— within target range'}
                          {healthResult.status === 'high' && '— consider raising service price or reducing product usage'}
                          {healthResult.status === 'low' && '— consider increasing product quality or adjusting service price'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] text-[11px] font-sans space-y-1 p-3">
                      <p className="font-medium mb-1.5">Cost Breakdown</p>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wholesale cost</span>
                        <span className="tabular-nums">${wholesaleGrandTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Markup applied</span>
                        <span className="tabular-nums">+${(grandTotal - wholesaleGrandTotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border/40 pt-1">
                        <span className="font-medium">Retail (after markup)</span>
                        <span className="font-medium tabular-nums">${grandTotal.toFixed(2)}</span>
                      </div>
                      {effectiveServicePrice > 0 && (
                        <>
                          <div className="flex justify-between pt-1 text-muted-foreground">
                            <span>Service price</span>
                            <span className="tabular-nums">${effectiveServicePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Margin (service − retail)</span>
                            <span className="tabular-nums">${(effectiveServicePrice - grandTotal).toFixed(2)} ({((1 - grandTotal / effectiveServicePrice) * 100).toFixed(1)}%)</span>
                          </div>
                        </>
                      )}
                      <div className="text-[10px] text-muted-foreground/70 pt-1">
                        Target: 6–10% of service price (8% ideal). Adjust by changing service price or product amounts.
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  {healthResult.status === 'high' && healthResult.suggestedServicePrice && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10 gap-1.5 rounded-md border border-amber-500/30"
                        disabled={updateServicePriceMutation.isPending}
                        onClick={() => {
                          const oldPrice = servicePrice;
                          updateServicePriceMutation.mutate(healthResult.suggestedServicePrice!, {
                            onSuccess: () => {
                              toast(`Service price updated to $${healthResult.suggestedServicePrice}`, {
                                action: oldPrice ? {
                                  label: 'Undo',
                                  onClick: () => updateServicePriceMutation.mutate(oldPrice),
                                } : undefined,
                                duration: 6000,
                              });
                            },
                          });
                        }}
                      >
                        {updateServicePriceMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArrowRight className="w-3 h-3" />
                        )}
                        Use ${healthResult.suggestedServicePrice} suggested price
                      </Button>
                      <MetricInfoTooltip
                        description="Calculated using the industry-standard 8% target: your after-markup product cost ÷ 0.08, rounded up to the nearest $5. You can also reduce product quantities in the bowls above to bring costs down, or adjust service pricing from Price Intelligence in the Backroom Hub."
                        className="w-3.5 h-3.5 text-amber-500/60"
                      />
                    </div>
                  )}
                  {healthResult.status === 'low' && healthResult.suggestedAllowance && (
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] font-sans text-blue-600 dark:text-blue-400 px-2.5 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/30">
                        Target allowance at 8%: <span className="font-medium">${healthResult.suggestedAllowance.toFixed(2)}</span>
                      </div>
                      <MetricInfoTooltip
                        description="To reach the ideal 8% ratio, increase product quality/quantity to this amount, or reduce the service price."
                        className="w-3.5 h-3.5 text-blue-500/60"
                      />
                    </div>
                  )}
                </div>
              ) : effectiveServicePrice > 0 ? (
                <div className="text-[10px] font-sans text-muted-foreground/50 mt-1">
                  Add products to see allowance health vs. service price
                </div>
              ) : (
                <div className="text-[10px] font-sans text-muted-foreground/50 mt-1">
                  Set a service price to see allowance health (target: 6–10% of service)
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {/* Copy summary */}
              {grandTotal > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => {
                    const summary = [
                      `${serviceName} — Product Allowance`,
                      `Total: $${grandTotal.toFixed(2)} (${Math.round(totalWeight)}g)`,
                      ...bowls.filter(b => b.lines.length > 0).map(b =>
                        `\n${b.label}:\n` + b.lines.map(l => {
                          const qty = l.isDeveloper
                            ? `${l.developerRatio}× ratio`
                            : `${l.quantity}g`;
                          return `  • ${l.productName} — ${qty} — $${l.lineCost.toFixed(2)}`;
                        }).join('\n')
                      ),
                      effectiveServicePrice > 0 ? `\nHealth: ${healthResult?.allowancePct ?? '—'}% of $${effectiveServicePrice.toFixed(0)} service (${healthResult?.status ?? 'N/A'})` : '',
                    ].join('\n');
                    navigator.clipboard.writeText(summary);
                    toast.success('Recipe summary copied to clipboard');
                  }}
                >
                  <ClipboardCopy className="w-3 h-3" />
                  Copy Summary
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
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
                </TooltipTrigger>
                {grandTotal === 0 && !saving && (
                  <TooltipContent side="top" className="text-xs">
                    Add at least one product to save the allowance
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
