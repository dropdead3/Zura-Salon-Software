import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useMemo, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────
export interface ServiceLevelPrice {
  id: string;
  service_id: string;
  stylist_level_id: string;
  price: number;
  organization_id: string;
}

export interface StylistPriceOverride {
  id: string;
  service_id: string;
  employee_id: string;
  price: number;
  organization_id: string;
}

// ─── Level Prices ────────────────────────────────────────────────
// Wave 12: org-scoped query keys + explicit org filter (defense-in-depth on
// top of RLS) so super-admin org switches invalidate cleanly and no row from
// another tenant can ever leak into a per-service cache entry.
export function useServiceLevelPrices(serviceId: string | null, organizationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = organizationId ?? effectiveOrganization?.id;

  return useQuery({
    queryKey: ['service-level-prices', orgId, serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_level_prices')
        .select('*')
        .eq('service_id', serviceId!)
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data as unknown as ServiceLevelPrice[];
    },
    enabled: !!serviceId && !!orgId,
  });
}

export function useUpsertServiceLevelPrices() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async (rows: { service_id: string; stylist_level_id: string; price: number }[]) => {
      const orgId = effectiveOrganization?.id;
      if (!orgId) throw new Error('No organization');

      const payload = rows.map(r => ({
        ...r,
        organization_id: orgId,
      }));

      const { error } = await supabase
        .from('service_level_prices')
        .upsert(payload, { onConflict: 'service_id,stylist_level_id' });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      // Prefix-match invalidation so both org-scoped and any legacy keys refetch.
      queryClient.invalidateQueries({ queryKey: ['service-level-prices'] });
      toast.success('Level prices saved');
    },
    onError: (e) => toast.error('Failed to save level prices: ' + e.message),
  });
}

// ─── Stylist Overrides ───────────────────────────────────────────
export function useStylistPriceOverrides(serviceId: string | null, organizationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = organizationId ?? effectiveOrganization?.id;

  return useQuery({
    queryKey: ['stylist-price-overrides', orgId, serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_stylist_price_overrides')
        .select('*')
        .eq('service_id', serviceId!)
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data as unknown as StylistPriceOverride[];
    },
    enabled: !!serviceId && !!orgId,
  });
}

export function useUpsertStylistPriceOverride() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async (row: { service_id: string; employee_id: string; price: number }) => {
      const orgId = effectiveOrganization?.id;
      if (!orgId) throw new Error('No organization');

      const { error } = await supabase
        .from('service_stylist_price_overrides')
        .upsert({ ...row, organization_id: orgId }, { onConflict: 'service_id,employee_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist-price-overrides'] });
      toast.success('Override saved');
    },
    onError: (e) => toast.error('Failed to save override: ' + e.message),
  });
}

export function useDeleteStylistPriceOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, serviceId }: { id: string; serviceId: string }) => {
      const { error } = await supabase
        .from('service_stylist_price_overrides')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return serviceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist-price-overrides'] });
      toast.success('Override removed');
    },
    onError: (e) => toast.error('Failed to remove override: ' + e.message),
  });
}

// ─── Booking Lookup ──────────────────────────────────────────────

/**
 * Hook for booking components to look up level-based pricing.
 * Fetches all service_level_prices + stylist_levels for the org once,
 * then exposes a `getLevelPrice(serviceId, levelSlug)` function.
 */
export function useBookingLevelPricing() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: allLevelPrices } = useQuery({
    queryKey: ['service-level-prices-all', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_level_prices')
        .select('service_id, stylist_level_id, price')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: levels } = useQuery({
    queryKey: ['stylist-levels-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stylist_levels')
        .select('id, slug')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // serviceId → { levelId → price }
  const priceMap = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const lp of allLevelPrices ?? []) {
      if (!map.has(lp.service_id)) map.set(lp.service_id, {});
      map.get(lp.service_id)![lp.stylist_level_id] = Number(lp.price);
    }
    return map;
  }, [allLevelPrices]);

  // slug → levelId
  const slugToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of levels ?? []) {
      map.set(l.slug, l.id);
    }
    return map;
  }, [levels]);

  /**
   * Look up the level-based price for a service.
   * @param serviceId - The service UUID
   * @param levelSlug - The stylist level slug (e.g. 'emerging', 'senior')
   * @returns The numeric price, or null if no level price exists
   */
  const getLevelPrice = useCallback(
    (serviceId: string, levelSlug: string | null): number | null => {
      if (!levelSlug) return null;
      const levelId = slugToId.get(levelSlug);
      if (!levelId) return null;
      const servicePrices = priceMap.get(serviceId);
      if (!servicePrices) return null;
      const price = servicePrices[levelId];
      return price !== undefined ? price : null;
    },
    [priceMap, slugToId]
  );

  return { getLevelPrice };
}
