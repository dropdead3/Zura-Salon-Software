/**
 * useServicePriceRecommendations — Hooks for price targets, computed recommendations, and acceptance.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';
import { buildRecommendation, calculateScalingRatio, type PriceRecommendation, type ProductCostInput } from '@/lib/backroom/price-recommendation';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────
export interface ServicePriceTarget {
  id: string;
  organization_id: string;
  service_id: string;
  target_margin_pct: number;
  created_at: string;
  updated_at: string;
}

// ─── Price Targets CRUD ──────────────────────────────────────
export function useServicePriceTargets() {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['service-price-targets', orgId],
    queryFn: async (): Promise<ServicePriceTarget[]> => {
      const { data, error } = await supabase
        .from('service_price_targets')
        .select('*')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data as unknown as ServicePriceTarget[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useUpsertPriceTarget() {
  const queryClient = useQueryClient();
  const orgId = useBackroomOrgId();

  return useMutation({
    mutationFn: async (params: { service_id: string; target_margin_pct: number }) => {
      if (!orgId) throw new Error('No organization');
      const { data, error } = await supabase
        .from('service_price_targets')
        .upsert(
          { organization_id: orgId, service_id: params.service_id, target_margin_pct: params.target_margin_pct },
          { onConflict: 'organization_id,service_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-price-targets'] });
    },
    onError: (error) => {
      toast.error('Failed to update target: ' + error.message);
    },
  });
}

// ─── Computed Recommendations ────────────────────────────────
export function useComputedPriceRecommendations() {
  const orgId = useBackroomOrgId();

  return useQuery({
    queryKey: ['computed-price-recommendations', orgId],
    queryFn: async (): Promise<PriceRecommendation[]> => {
      // Fetch all tracked chemical services
      const { data: services, error: sErr } = await supabase
        .from('services')
        .select('id, name, category, price, is_backroom_tracked, is_chemical_service')
        .eq('organization_id', orgId!)
        .eq('is_backroom_tracked', true)
        .eq('is_chemical_service', true);
      if (sErr) throw sErr;

      if (!services?.length) return [];

      // Fetch recipe baselines
      const { data: baselines, error: bErr } = await supabase
        .from('service_recipe_baselines')
        .select('service_id, product_id, expected_quantity')
        .eq('organization_id', orgId!);
      if (bErr) throw bErr;

      // Fetch product costs
      const productIds = [...new Set((baselines || []).map(b => b.product_id))];
      let productCosts: Record<string, number> = {};
      if (productIds.length > 0) {
        const { data: products, error: pErr } = await supabase
          .from('products')
          .select('id, cost_per_gram')
          .in('id', productIds);
        if (pErr) throw pErr;
        productCosts = Object.fromEntries((products || []).map(p => [p.id, Number(p.cost_per_gram) || 0]));
      }

      // Fetch targets
      const { data: targets, error: tErr } = await supabase
        .from('service_price_targets')
        .select('service_id, target_margin_pct')
        .eq('organization_id', orgId!);
      if (tErr) throw tErr;

      const targetMap = new Map((targets || []).map(t => [t.service_id, Number(t.target_margin_pct)]));
      const baselineMap = new Map<string, ProductCostInput[]>();

      for (const b of (baselines || [])) {
        const cost = productCosts[b.product_id] || 0;
        const entry: ProductCostInput = { product_id: b.product_id, expected_quantity: Number(b.expected_quantity), cost_per_gram: cost };
        if (!baselineMap.has(b.service_id)) baselineMap.set(b.service_id, []);
        baselineMap.get(b.service_id)!.push(entry);
      }

      const recommendations: PriceRecommendation[] = [];
      for (const svc of services) {
        const svcBaselines = baselineMap.get(svc.id);
        if (!svcBaselines?.length) continue;
        const targetMargin = targetMap.get(svc.id) ?? 60; // default 60%
        const rec = buildRecommendation({
          service_id: svc.id,
          service_name: svc.name,
          category: svc.category,
          current_price: Number(svc.price) || 0,
          baselines: svcBaselines,
          target_margin_pct: targetMargin,
        });
        if (rec) recommendations.push(rec);
      }

      return recommendations;
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

// ─── Accept Price Recommendation ─────────────────────────────
export function useAcceptPriceRecommendation() {
  const queryClient = useQueryClient();
  const orgId = useBackroomOrgId();

  return useMutation({
    mutationFn: async (rec: PriceRecommendation) => {
      if (!orgId) throw new Error('No organization');
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const ratio = calculateScalingRatio(rec.recommended_price, rec.current_price);

      // 1. Update base service price
      const { error: sErr } = await supabase
        .from('services')
        .update({ price: rec.recommended_price })
        .eq('id', rec.service_id);
      if (sErr) throw sErr;

      // 2. Scale level prices proportionally
      const { data: levelPrices } = await supabase
        .from('service_level_prices')
        .select('id, price')
        .eq('service_id', rec.service_id);

      if (levelPrices?.length) {
        for (const lp of levelPrices) {
          const newPrice = Math.round(Number(lp.price) * ratio * 100) / 100;
          await supabase.from('service_level_prices').update({ price: newPrice }).eq('id', lp.id);
        }
      }

      // 3. Scale location prices proportionally
      const { data: locPrices } = await supabase
        .from('service_location_prices')
        .select('id, price')
        .eq('service_id', rec.service_id);

      if (locPrices?.length) {
        for (const lp of locPrices) {
          const newPrice = Math.round(Number(lp.price) * ratio * 100) / 100;
          await supabase.from('service_location_prices').update({ price: newPrice }).eq('id', lp.id);
        }
      }

      // 4. Log recommendation acceptance
      const { error: rErr } = await supabase
        .from('service_price_recommendations')
        .insert({
          organization_id: orgId,
          service_id: rec.service_id,
          current_price: rec.current_price,
          recommended_price: rec.recommended_price,
          product_cost: rec.product_cost,
          margin_pct_current: rec.current_margin_pct,
          margin_pct_target: rec.target_margin_pct,
          status: 'accepted' as const,
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
        });
      if (rErr) throw rErr;
    },
    onSuccess: () => {
      // Invalidate all pricing-related queries
      queryClient.invalidateQueries({ queryKey: ['computed-price-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service-level-prices'] });
      queryClient.invalidateQueries({ queryKey: ['service-location-prices'] });
      queryClient.invalidateQueries({ queryKey: ['native-services'] });
      toast.success('Price updated across all tiers');
    },
    onError: (error) => {
      toast.error('Failed to apply recommendation: ' + error.message);
    },
  });
}

// ─── Dismiss Recommendation ──────────────────────────────────
export function useDismissPriceRecommendation() {
  const queryClient = useQueryClient();
  const orgId = useBackroomOrgId();

  return useMutation({
    mutationFn: async (rec: PriceRecommendation) => {
      if (!orgId) throw new Error('No organization');
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { error } = await supabase
        .from('service_price_recommendations')
        .insert({
          organization_id: orgId,
          service_id: rec.service_id,
          current_price: rec.current_price,
          recommended_price: rec.recommended_price,
          product_cost: rec.product_cost,
          margin_pct_current: rec.current_margin_pct,
          margin_pct_target: rec.target_margin_pct,
          status: 'dismissed' as const,
          accepted_by: userId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computed-price-recommendations'] });
      toast.success('Recommendation dismissed');
    },
    onError: (error) => {
      toast.error('Failed to dismiss: ' + error.message);
    },
  });
}

export type { PriceRecommendation };
