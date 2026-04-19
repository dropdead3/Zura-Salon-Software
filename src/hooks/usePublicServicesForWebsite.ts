import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ───────────────────────────────────────────────────────

export interface PublicServiceItem {
  name: string;
  description: string | null;
  isPopular: boolean;
  prices: Record<string, string | null>; // level slug → formatted price
}

export interface PublicServiceCategory {
  category: string;
  description: string | null;
  isAddOn?: boolean;
  items: PublicServiceItem[];
}

export interface PublicStylistLevel {
  id: string;
  slug: string;
  label: string;
  clientLabel: string;
}

// ─── Hook ────────────────────────────────────────────────────────

export function usePublicServicesForWebsite(orgId: string | undefined) {
  const servicesQuery = useQuery({
    queryKey: ['public-services', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description, website_description, is_popular, price, category, display_order, online_name, online_duration_override, online_discount_pct, include_from_prefix')
        .eq('is_active', true)
        .eq('bookable_online', true)
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const categoriesQuery = useQuery({
    queryKey: ['public-service-categories', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_category_colors')
        .select('*')
        .eq('organization_id', orgId!)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const levelPricesQuery = useQuery({
    queryKey: ['public-level-prices', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_level_prices')
        .select('*')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const levelsQuery = useQuery({
    queryKey: ['public-stylist-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stylist_levels')
        .select('id, slug, label, client_label, display_order')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  // ── Loading ────────────────────────────────────────────────────

  const isLoading =
    servicesQuery.isLoading ||
    categoriesQuery.isLoading ||
    levelPricesQuery.isLoading ||
    levelsQuery.isLoading;

  // ── Levels ─────────────────────────────────────────────────────

  const levels: PublicStylistLevel[] = (levelsQuery.data ?? []).map((l) => ({
    id: l.id,
    slug: l.slug,
    label: l.label,
    clientLabel: l.client_label,
  }));

  // ── Price map: serviceId → { levelId → price } ────────────────

  const priceMap = new Map<string, Record<string, number>>();
  for (const lp of levelPricesQuery.data ?? []) {
    if (!priceMap.has(lp.service_id)) priceMap.set(lp.service_id, {});
    priceMap.get(lp.service_id)![lp.stylist_level_id] = Number(lp.price);
  }

  // ── Build level-slug → level-id lookup ─────────────────────────

  const slugToId = new Map<string, string>();
  for (const l of levelsQuery.data ?? []) {
    slugToId.set(l.slug, l.id);
  }

  // ── Build categories with slug-keyed price strings ─────────────

  const serviceCategories = (categoriesQuery.data ?? []).filter(
    (c) => !['Block', 'Break'].includes(c.category_name)
  );

  const categories: PublicServiceCategory[] = serviceCategories.map((cat) => {
    const catItems = (servicesQuery.data ?? [])
      .filter((s) => s.category === cat.category_name)
      .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))
      .map((s) => {
        const serviceLevelPrices = priceMap.get(s.id) ?? {};
        // Build slug → formatted price string
        const prices: Record<string, string | null> = {};
        for (const level of levelsQuery.data ?? []) {
          const p = serviceLevelPrices[level.id];
          prices[level.slug] = p !== undefined ? `$${p}` : null;
        }
        // If no level prices exist, fall back to base price for all levels
        const hasAnyLevelPrice = Object.values(prices).some((v) => v !== null);
        if (!hasAnyLevelPrice && s.price != null) {
          for (const level of levelsQuery.data ?? []) {
            prices[level.slug] = `$${Number(s.price)}`;
          }
        }
        return {
          name: s.name,
          description: s.website_description ?? s.description,
          isPopular: s.is_popular ?? false,
          prices,
        };
      });

    return {
      category: cat.category_name,
      description: cat.description,
      items: catItems,
    };
  });

  return {
    categories,
    levels,
    isLoading,
    error: servicesQuery.error || categoriesQuery.error || levelPricesQuery.error || levelsQuery.error,
  };
}
