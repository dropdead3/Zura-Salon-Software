import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface MarginErosionItem {
  productId: string;
  productName: string;
  supplierName: string | null;
  oldCost: number;
  newCost: number;
  costChangePercent: number;
  retailPrice: number | null;
  currentMargin: number | null; // percentage
  annualImpact: number; // estimated annual margin loss
  severity: 'critical' | 'warning';
}

export interface MarginErosionSummary {
  items: MarginErosionItem[];
  totalAffected: number;
  totalAnnualRisk: number;
}

export function useMarginErosion() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['margin-erosion', orgId],
    queryFn: async (): Promise<MarginErosionSummary> => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Get cost history
      const { data: costHistory, error } = await supabase
        .from('product_cost_history')
        .select('product_id, supplier_name, cost_price, recorded_at')
        .eq('organization_id', orgId!)
        .gte('recorded_at', ninetyDaysAgo.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      // Get current products for retail price and current cost
      const { data: products } = await supabase
        .from('products')
        .select('id, name, cost_price, retail_price, supplier_name, quantity_on_hand')
        .eq('organization_id', orgId!)
        .eq('is_active', true);

      if (!products || !costHistory || costHistory.length === 0) {
        return { items: [], totalAffected: 0, totalAnnualRisk: 0 };
      }

      const productMap = new Map(products.map(p => [p.id, p]));

      // Group cost history by product
      const historyByProduct = new Map<string, { cost_price: number; recorded_at: string; supplier_name: string | null }[]>();
      for (const ch of costHistory) {
        if (!historyByProduct.has(ch.product_id)) historyByProduct.set(ch.product_id, []);
        historyByProduct.get(ch.product_id)!.push({
          cost_price: Number(ch.cost_price),
          recorded_at: ch.recorded_at,
          supplier_name: ch.supplier_name,
        });
      }

      const items: MarginErosionItem[] = [];

      for (const [productId, history] of historyByProduct) {
        const product = productMap.get(productId);
        if (!product) continue;

        const oldCost = history[0].cost_price;
        const newCost = Number(product.cost_price ?? history[history.length - 1].cost_price);
        
        if (oldCost === 0) continue;

        const costChangePercent = ((newCost - oldCost) / oldCost) * 100;
        const retailPrice = product.retail_price ? Number(product.retail_price) : null;
        const currentMargin = retailPrice && retailPrice > 0
          ? ((retailPrice - newCost) / retailPrice) * 100
          : null;

        // Flag if: cost increased >5% OR margin below 30%
        const costIncreased = costChangePercent > 5;
        const marginCompressed = currentMargin !== null && currentMargin < 30;

        if (!costIncreased && !marginCompressed) continue;

        // Estimate annual impact: cost increase * estimated annual units
        const qoh = product.quantity_on_hand ?? 0;
        const estimatedAnnualUnits = Math.max(qoh * 4, 12); // rough estimate
        const annualImpact = Math.abs(newCost - oldCost) * estimatedAnnualUnits;

        items.push({
          productId,
          productName: product.name,
          supplierName: product.supplier_name ?? history[0].supplier_name,
          oldCost,
          newCost,
          costChangePercent: Math.round(costChangePercent * 10) / 10,
          retailPrice,
          currentMargin: currentMargin !== null ? Math.round(currentMargin * 10) / 10 : null,
          annualImpact: Math.round(annualImpact),
          severity: (marginCompressed && currentMargin !== null && currentMargin < 20) || costChangePercent > 15 ? 'critical' : 'warning',
        });
      }

      items.sort((a, b) => b.annualImpact - a.annualImpact);

      return {
        items,
        totalAffected: items.length,
        totalAnnualRisk: items.reduce((s, i) => s + i.annualImpact, 0),
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
