import { useMemo } from 'react';
import { useProducts, type Product } from '@/hooks/useProducts';
import { useLocations } from '@/hooks/useLocations';

export interface RebalancingSuggestion {
  productId: string;
  productName: string;
  sku: string | null;
  fromLocationId: string;
  fromLocationName: string;
  fromQty: number;
  fromParLevel: number;
  toLocationId: string;
  toLocationName: string;
  toQty: number;
  toReorderLevel: number;
  suggestedQty: number;
  estimatedValue: number;
  priority: 'high' | 'medium' | 'low';
}

export interface RebalancingResult {
  suggestions: RebalancingSuggestion[];
  totalOpportunities: number;
  totalStuckCapital: number;
}

export function useRebalancingSuggestions(): RebalancingResult | null {
  const { data: allProducts } = useProducts({});
  const { data: locations } = useLocations();

  return useMemo(() => {
    if (!allProducts || !locations || locations.length < 2) return null;

    const activeLocations = locations.filter(l => l.is_active);
    const locationMap = new Map(activeLocations.map(l => [l.id, l.name]));

    // Group products by name (since same product across locations shares a name)
    const productsByName = new Map<string, Product[]>();
    for (const p of allProducts) {
      if (!p.is_active || !p.location_id || !locationMap.has(p.location_id)) continue;
      const key = p.name.toLowerCase().trim();
      if (!productsByName.has(key)) productsByName.set(key, []);
      productsByName.get(key)!.push(p);
    }

    const suggestions: RebalancingSuggestion[] = [];

    for (const [, products] of productsByName) {
      if (products.length < 2) continue;

      // Find overstocked locations (qty > par_level * 1.5)
      // Find understocked locations (qty < reorder_level)
      const overstocked = products.filter(p => {
        const par = p.par_level ?? 0;
        return par > 0 && (p.quantity_on_hand ?? 0) > par * 1.5;
      });

      const understocked = products.filter(p => {
        const reorder = p.reorder_level ?? 0;
        return reorder > 0 && (p.quantity_on_hand ?? 0) < reorder;
      });

      for (const over of overstocked) {
        const overQty = over.quantity_on_hand ?? 0;
        const overPar = over.par_level ?? 0;
        const surplus = Math.floor(overQty - overPar);
        if (surplus <= 0) continue;

        for (const under of understocked) {
          if (under.location_id === over.location_id) continue;

          const underQty = under.quantity_on_hand ?? 0;
          const underReorder = under.reorder_level ?? 0;
          const deficit = Math.ceil(underReorder - underQty);
          if (deficit <= 0) continue;

          const suggestedQty = Math.min(surplus, deficit);
          if (suggestedQty <= 0) continue;

          const unitCost = over.cost_price ?? over.retail_price ?? 0;
          const estimatedValue = suggestedQty * unitCost;

          // Priority based on deficit severity
          const deficitRatio = underQty / underReorder;
          const priority: 'high' | 'medium' | 'low' =
            deficitRatio <= 0.25 ? 'high' :
            deficitRatio <= 0.6 ? 'medium' : 'low';

          suggestions.push({
            productId: over.id,
            productName: over.name,
            sku: over.sku,
            fromLocationId: over.location_id!,
            fromLocationName: locationMap.get(over.location_id!) ?? 'Unknown',
            fromQty: overQty,
            fromParLevel: overPar,
            toLocationId: under.location_id!,
            toLocationName: locationMap.get(under.location_id!) ?? 'Unknown',
            toQty: underQty,
            toReorderLevel: underReorder,
            suggestedQty,
            estimatedValue,
            priority,
          });
        }
      }
    }

    // Sort: high priority first, then by estimated value desc
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority] || b.estimatedValue - a.estimatedValue
    );

    return {
      suggestions,
      totalOpportunities: suggestions.length,
      totalStuckCapital: suggestions.reduce((sum, s) => sum + s.estimatedValue, 0),
    };
  }, [allProducts, locations]);
}
