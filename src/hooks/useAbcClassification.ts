import { useMemo } from 'react';
import type { ProductRow } from '@/hooks/useRetailAnalytics';

export type AbcClass = 'A' | 'B' | 'C';

export interface AbcProduct {
  name: string;
  brand: string | null;
  category: string | null;
  revenue: number;
  cumulativePercent: number;
  abcClass: AbcClass;
  quantityOnHand: number | null;
  cycleCountFrequency: 'Weekly' | 'Monthly' | 'Quarterly';
}

export interface AbcSummary {
  class: AbcClass;
  count: number;
  revenue: number;
  revenuePercent: number;
}

export interface AbcResult {
  products: AbcProduct[];
  summary: AbcSummary[];
  classMap: Map<string, AbcClass>;
}

/**
 * ABC Classification by revenue contribution.
 * A = top 80% of revenue, B = next 15%, C = bottom 5%.
 */
export function useAbcClassification(products: ProductRow[] | undefined): AbcResult | null {
  return useMemo(() => {
    if (!products || products.length === 0) return null;

    // Sort by revenue descending
    const sorted = [...products]
      .filter(p => p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    if (sorted.length === 0) return null;

    const totalRevenue = sorted.reduce((s, p) => s + p.revenue, 0);
    if (totalRevenue === 0) return null;

    let cumulative = 0;
    const classified: AbcProduct[] = sorted.map(p => {
      cumulative += p.revenue;
      const cumulativePercent = (cumulative / totalRevenue) * 100;

      let abcClass: AbcClass;
      if (cumulativePercent <= 80) {
        abcClass = 'A';
      } else if (cumulativePercent <= 95) {
        abcClass = 'B';
      } else {
        abcClass = 'C';
      }

      // Edge case: if the first product already crosses 80%, it's still A
      if (cumulative === p.revenue && cumulativePercent > 80) {
        abcClass = 'A';
      }

      return {
        name: p.name,
        brand: p.brand,
        category: p.category,
        revenue: p.revenue,
        cumulativePercent: Math.round(cumulativePercent * 10) / 10,
        abcClass,
        quantityOnHand: p.quantityOnHand,
        cycleCountFrequency: abcClass === 'A' ? 'Weekly' : abcClass === 'B' ? 'Monthly' : 'Quarterly',
      };
    });

    const summary: AbcSummary[] = (['A', 'B', 'C'] as AbcClass[]).map(cls => {
      const items = classified.filter(p => p.abcClass === cls);
      const rev = items.reduce((s, p) => s + p.revenue, 0);
      return {
        class: cls,
        count: items.length,
        revenue: rev,
        revenuePercent: totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0,
      };
    });

    const classMap = new Map(classified.map(p => [p.name, p.abcClass]));

    return { products: classified, summary, classMap };
  }, [products]);
}
