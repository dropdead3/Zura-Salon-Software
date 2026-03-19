/**
 * useRetailReorderQueue — Surfaces retail products below their reorder level
 * at a given location, combining product data with retail_product_settings.
 */
import { useMemo } from 'react';
import { useProducts, type Product } from '@/hooks/useProducts';
import { useRetailProductSettingsMap } from './useRetailProductSettings';
import { useProductSuppliers, type ProductSupplier } from '@/hooks/useProductSuppliers';

export interface RetailReorderItem {
  product: Product;
  onHand: number;
  parLevel: number;
  reorderLevel: number;
  suggestedQty: number;
  supplier: ProductSupplier | undefined;
  estimatedCost: number;
}

export function useRetailReorderQueue(locationId: string | undefined) {
  const { data: products, isLoading: productsLoading } = useProducts({
    locationId: locationId !== 'all' ? locationId : undefined,
    productType: 'Products',
  });
  const { settingsMap, isLoading: settingsLoading } = useRetailProductSettingsMap(
    locationId !== 'all' ? locationId : undefined
  );
  const { data: allSuppliers } = useProductSuppliers();

  const supplierMap = useMemo(() => {
    const map = new Map<string, ProductSupplier>();
    for (const s of allSuppliers || []) {
      map.set(s.product_id, s);
    }
    return map;
  }, [allSuppliers]);

  const reorderItems = useMemo((): RetailReorderItem[] => {
    if (!products) return [];

    return products
      .filter((p) => {
        // Use retail_product_settings reorder_level if available, else product-level
        const settings = settingsMap.get(p.id);
        const reorderLevel = settings?.reorder_level ?? p.reorder_level ?? 0;
        const onHand = p.quantity_on_hand ?? 0;
        return reorderLevel > 0 && onHand <= reorderLevel;
      })
      .map((p) => {
        const settings = settingsMap.get(p.id);
        const onHand = p.quantity_on_hand ?? 0;
        const parLevel = settings?.par_level ?? 0;
        const reorderLevel = settings?.reorder_level ?? p.reorder_level ?? 0;
        const suggestedQty = Math.max(0, parLevel > 0 ? parLevel - onHand : reorderLevel * 2 - onHand);
        const supplier = supplierMap.get(p.id);
        const estimatedCost = suggestedQty * (p.cost_price ?? 0);

        return {
          product: p,
          onHand,
          parLevel,
          reorderLevel,
          suggestedQty,
          supplier,
          estimatedCost,
        };
      })
      .sort((a, b) => {
        // Most urgent first (lowest stock relative to reorder level)
        const aRatio = a.onHand / (a.reorderLevel || 1);
        const bRatio = b.onHand / (b.reorderLevel || 1);
        return aRatio - bRatio;
      });
  }, [products, settingsMap, supplierMap]);

  return {
    reorderItems,
    isLoading: productsLoading || settingsLoading,
    totalEstimatedCost: reorderItems.reduce((sum, item) => sum + item.estimatedCost, 0),
  };
}
