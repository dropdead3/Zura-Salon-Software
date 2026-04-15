import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { calculateReplenishment, REPLENISHMENT_DEFAULTS, type ReplenishmentResult } from '@/lib/inventory/replenishment-engine';

export interface ReplenishmentRecommendation {
  id: string;
  organization_id: string;
  product_id: string;
  vendor_id: string | null;
  daily_usage_rate: number;
  usage_stddev: number;
  lead_time_days: number;
  safety_stock: number;
  reorder_point: number;
  target_stock: number;
  recommended_qty: number;
  current_on_hand: number;
  open_po_qty: number;
  status: string;
  generated_at: string;
  expires_at: string | null;
  created_at: string;
}

export function useReplenishmentRecommendations(status = 'pending') {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['replenishment-recommendations', orgId, status],
    queryFn: async () => {
      let query = supabase
        .from('replenishment_recommendations')
        .select('*')
        .eq('organization_id', orgId!)
        .order('recommended_qty', { ascending: false });
      if (status !== 'all') query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ReplenishmentRecommendation[];
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

/**
 * Generates replenishment recommendations for all active products in the org.
 * Fetches trailing 28-day stock movement data per product, runs the engine,
 * and inserts recommendations into the table.
 */
export function useGenerateReplenishment() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productIds?: string[]) => {
      if (!orgId) throw new Error('No organization selected');

      // 1. Fetch active products
      let productQuery = supabase
        .from('products')
        .select('id, quantity_on_hand, reorder_level')
        .eq('organization_id', orgId)
        .eq('is_active', true);
      if (productIds?.length) productQuery = productQuery.in('id', productIds);
      const { data: products, error: pErr } = await productQuery;
      if (pErr) throw pErr;
      if (!products?.length) return { generated: 0 };

      // 2. Fetch preferred vendors for these products
      const { data: vendorProducts } = await supabase
        .from('vendor_products')
        .select('product_id, vendor_id, moq, pack_size, lead_time_days')
        .eq('organization_id', orgId)
        .eq('is_preferred', true)
        .in('product_id', products.map((p) => p.id));

      const vpMap = new Map(vendorProducts?.map((vp) => [vp.product_id, vp]) ?? []);

      // 3. Fetch vendor default lead times
      const vendorIds = [...new Set(vendorProducts?.map((vp) => vp.vendor_id) ?? [])];
      const vendorLeadTimes = new Map<string, number>();
      if (vendorIds.length) {
        const { data: vendors } = await supabase
          .from('vendors')
          .select('id, default_lead_time_days')
          .in('id', vendorIds);
        vendors?.forEach((v) => vendorLeadTimes.set(v.id, v.default_lead_time_days ?? 7));
      }

      // 4. Fetch open PO quantities per product
      const { data: openPOLines } = await supabase
        .from('purchase_order_lines')
        .select('product_id, quantity_ordered, quantity_received, purchase_orders!inner(status)')
        .in('product_id', products.map((p) => p.id));

      const openPoMap = new Map<string, number>();
      openPOLines?.forEach((line: any) => {
        const poStatus = line.purchase_orders?.status;
        if (poStatus && !['received', 'closed', 'cancelled'].includes(poStatus)) {
          const remaining = (line.quantity_ordered ?? 0) - (line.quantity_received ?? 0);
          if (remaining > 0) {
            openPoMap.set(line.product_id, (openPoMap.get(line.product_id) ?? 0) + remaining);
          }
        }
      });

      // 5. Fetch trailing 28-day stock movements (outbound / usage)
      const twentyEightDaysAgo = new Date();
      twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

      const { data: movements } = await supabase
        .from('stock_movements')
        .select('product_id, quantity_change, created_at')
        .eq('organization_id', orgId)
        .lt('quantity_change', 0)
        .gte('created_at', twentyEightDaysAgo.toISOString())
        .in('product_id', products.map((p) => p.id));

      // Aggregate daily usage per product
      const usageByProduct = new Map<string, number[]>();
      movements?.forEach((m) => {
        const dayIndex = Math.floor(
          (new Date(m.created_at).getTime() - twentyEightDaysAgo.getTime()) / (1000 * 60 * 60 * 24)
        );
        const arr = usageByProduct.get(m.product_id) ?? new Array(28).fill(0);
        if (dayIndex >= 0 && dayIndex < 28) {
          arr[dayIndex] += Math.abs(m.quantity_change);
        }
        usageByProduct.set(m.product_id, arr);
      });

      // 6. Run engine for each product
      const recommendations: any[] = [];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // 24h expiry

      for (const product of products) {
        const vp = vpMap.get(product.id);
        const leadTimeDays = vp?.lead_time_days ?? (vp ? vendorLeadTimes.get(vp.vendor_id) ?? 7 : 7);
        const dailyUsage = usageByProduct.get(product.id) ?? new Array(28).fill(0);
        const totalUsage = dailyUsage.reduce((a, b) => a + b, 0);

        const result: ReplenishmentResult = calculateReplenishment({
          trailingUsage28d: totalUsage,
          usageValues: dailyUsage,
          leadTimeDays,
          reviewPeriodDays: REPLENISHMENT_DEFAULTS.reviewPeriodDays,
          safetyFactor: REPLENISHMENT_DEFAULTS.safetyFactor,
          minimumBuffer: REPLENISHMENT_DEFAULTS.minimumBuffer,
          currentOnHand: product.quantity_on_hand ?? 0,
          openPoQty: openPoMap.get(product.id) ?? 0,
          moq: vp?.moq ?? REPLENISHMENT_DEFAULTS.moq,
          packSize: vp?.pack_size ?? REPLENISHMENT_DEFAULTS.packSize,
        });

        if (result.needsReorder && result.recommendedQty > 0) {
          recommendations.push({
            organization_id: orgId,
            product_id: product.id,
            vendor_id: vp?.vendor_id ?? null,
            daily_usage_rate: result.dailyUsageRate,
            usage_stddev: result.usageStddev,
            lead_time_days: leadTimeDays,
            safety_stock: result.safetyStock,
            reorder_point: result.reorderPoint,
            target_stock: result.targetStock,
            recommended_qty: result.recommendedQty,
            current_on_hand: product.quantity_on_hand ?? 0,
            open_po_qty: openPoMap.get(product.id) ?? 0,
            status: 'pending',
            expires_at: expiresAt.toISOString(),
          });
        }
      }

      if (recommendations.length > 0) {
        const { error } = await supabase
          .from('replenishment_recommendations')
          .insert(recommendations);
        if (error) throw error;
      }

      return { generated: recommendations.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['replenishment-recommendations'] });
      toast.success(`${result.generated} replenishment recommendation(s) generated`);
    },
    onError: (error) => {
      toast.error('Failed to generate recommendations: ' + error.message);
    },
  });
}

export function useUpdateRecommendationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('replenishment_recommendations')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replenishment-recommendations'] });
    },
  });
}

/**
 * Converts pending recommendations into multi-line POs grouped by vendor.
 */
export function useConvertRecommendationsToPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recommendationIds: string[]) => {
      // Fetch full recommendations
      const { data: recs, error: recErr } = await supabase
        .from('replenishment_recommendations')
        .select('*')
        .in('id', recommendationIds);
      if (recErr) throw recErr;
      if (!recs?.length) throw new Error('No recommendations found');

      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Group by vendor_id (null vendor goes into separate PO)
      const byVendor = new Map<string, typeof recs>();
      for (const rec of recs) {
        const key = rec.vendor_id ?? `no-vendor-${rec.id}`;
        const arr = byVendor.get(key) ?? [];
        arr.push(rec);
        byVendor.set(key, arr);
      }

      let createdCount = 0;

      for (const [vendorKey, vendorRecs] of byVendor) {
        const vendorId = vendorKey.startsWith('no-vendor-') ? null : vendorKey;

        // Fetch vendor info if available
        let supplierName: string | null = null;
        let supplierEmail: string | null = null;
        if (vendorId) {
          const { data: vendor } = await supabase
            .from('vendors')
            .select('name, email')
            .eq('id', vendorId)
            .single();
          supplierName = vendor?.name ?? null;
          supplierEmail = vendor?.email ?? null;
        }

        // Fetch vendor_products for unit costs
        const productIds = vendorRecs.map((r) => r.product_id);
        let vps: { product_id: string; unit_cost: number | null; id: string }[] = [];
        if (vendorId) {
          const { data } = await supabase
            .from('vendor_products')
            .select('product_id, unit_cost, id')
            .eq('vendor_id', vendorId)
            .in('product_id', productIds);
          vps = (data ?? []) as { product_id: string; unit_cost: number | null; id: string }[];
        }
        const vpMap = new Map(vps.map((vp) => [vp.product_id, vp] as const));

        // Build PO lines
        const lines = vendorRecs.map((rec) => {
          const vp = vpMap.get(rec.product_id);
          const unitCost = vp?.unit_cost ?? null;
          return {
            product_id: rec.product_id,
            vendor_product_id: vp?.id ?? null,
            quantity_ordered: rec.recommended_qty,
            unit_cost: unitCost,
            line_total: unitCost ? unitCost * rec.recommended_qty : null,
          };
        });

        const subtotal = lines.reduce((s, l) => s + (l.line_total ?? 0), 0);

        // Create PO
        const { data: po, error: poErr } = await supabase
          .from('purchase_orders')
          .insert({
            organization_id: vendorRecs[0].organization_id,
            vendor_id: vendorId,
            supplier_name: supplierName,
            supplier_email: supplierEmail,
            status: 'draft',
            receiving_status: 'not_received',
            line_count: lines.length,
            subtotal,
            grand_total: subtotal,
            quantity: lines.reduce((s, l) => s + l.quantity_ordered, 0),
            created_by: userId,
          } as any)
          .select('id')
          .single();

        if (poErr) throw poErr;

        // Insert lines
        await supabase.from('purchase_order_lines').insert(
          lines.map((l) => ({
            purchase_order_id: po.id,
            ...l,
          }))
        );

        createdCount++;

        // Mark recommendations as ordered
        await supabase
          .from('replenishment_recommendations')
          .update({ status: 'ordered' })
          .in('id', vendorRecs.map((r) => r.id));
      }

      return { created: createdCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-lines'] });
      queryClient.invalidateQueries({ queryKey: ['replenishment-recommendations'] });
      toast.success(`${result.created} purchase order(s) created from recommendations`);
    },
    onError: (error) => {
      toast.error('Failed to convert recommendations: ' + error.message);
    },
  });
}
