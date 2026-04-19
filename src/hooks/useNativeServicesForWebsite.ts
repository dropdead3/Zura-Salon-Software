import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────

export interface NativeServiceItem {
  id: string;
  name: string;
  description: string | null;
  websiteDescription: string | null;
  isPopular: boolean;
  bookableOnline: boolean;
  basePrice: number;
  category: string;
  displayOrder: number;
  // Wave 1: Online & App overrides
  onlineName: string | null;
  onlineDurationOverride: number | null;
  onlineDiscountPct: number | null;
  includeFromPrefix: boolean;
  levelPrices: Record<string, number>; // stylist_level_id → price
}

export interface NativeServiceCategory {
  id: string;
  categoryName: string;
  description: string | null;
  colorHex: string;
  textColorHex: string;
  displayOrder: number;
  items: NativeServiceItem[];
}

export interface StylistLevelInfo {
  id: string;
  slug: string;
  label: string;
  clientLabel: string;
  displayOrder: number;
}

// ─── Main Hook ──────────────────────────────────────────────────

export function useNativeServicesForWebsite() {
  const { effectiveOrganization, currentOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id ?? currentOrganization?.id;

  const servicesQuery = useQuery({
    queryKey: ['services-website', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description, website_description, is_popular, bookable_online, price, category, display_order, online_name, online_duration_override, online_discount_pct, include_from_prefix')
        .eq('is_active', true)
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const categoriesQuery = useQuery({
    queryKey: ['service-category-colors', orgId],
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
    queryKey: ['service-level-prices-all', orgId],
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
    queryKey: ['stylist-levels-active'],
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

  // ── Assemble ──────────────────────────────────────────────────

  const isLoading =
    servicesQuery.isLoading ||
    categoriesQuery.isLoading ||
    levelPricesQuery.isLoading ||
    levelsQuery.isLoading;

  const levels: StylistLevelInfo[] = (levelsQuery.data ?? []).map((l) => ({
    id: l.id,
    slug: l.slug,
    label: l.label,
    clientLabel: l.client_label,
    displayOrder: l.display_order,
  }));

  // Build lookup: serviceId → { levelId → price }
  const priceMap = new Map<string, Record<string, number>>();
  for (const lp of levelPricesQuery.data ?? []) {
    if (!priceMap.has(lp.service_id)) priceMap.set(lp.service_id, {});
    priceMap.get(lp.service_id)![lp.stylist_level_id] = Number(lp.price);
  }

  // Filter out non-service categories (Block, Break)
  const serviceCategories = (categoriesQuery.data ?? []).filter(
    (c) => !['Block', 'Break'].includes(c.category_name)
  );

  const categories: NativeServiceCategory[] = serviceCategories.map((cat) => {
    const catItems = (servicesQuery.data ?? [])
      .filter((s) => s.category === cat.category_name)
      .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        websiteDescription: s.website_description,
        isPopular: s.is_popular ?? false,
        bookableOnline: s.bookable_online ?? true,
        basePrice: Number(s.price),
        category: s.category!,
        displayOrder: s.display_order ?? 999,
        onlineName: s.online_name ?? null,
        onlineDurationOverride: s.online_duration_override ?? null,
        onlineDiscountPct: s.online_discount_pct != null ? Number(s.online_discount_pct) : null,
        includeFromPrefix: s.include_from_prefix ?? false,
        levelPrices: priceMap.get(s.id) ?? {},
      }));

    return {
      id: cat.id,
      categoryName: cat.category_name,
      description: cat.description,
      colorHex: cat.color_hex,
      textColorHex: cat.text_color_hex,
      displayOrder: cat.display_order,
      items: catItems,
    };
  });

  const hasLevelPrices = (levelPricesQuery.data ?? []).length > 0;

  return {
    categories,
    levels,
    isLoading,
    hasLevelPrices,
    error: servicesQuery.error || categoriesQuery.error || levelPricesQuery.error || levelsQuery.error,
  };
}

// ─── Mutations ──────────────────────────────────────────────────

export function useToggleServicePopular() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async ({ serviceId, isPopular }: { serviceId: string; isPopular: boolean }) => {
      const { error } = await supabase
        .from('services')
        .update({ is_popular: isPopular })
        .eq('id', serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-website', effectiveOrganization?.id] });
    },
    onError: (e) => toast.error('Failed to update: ' + e.message),
  });
}

export function useToggleBookableOnline() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async ({ serviceId, bookableOnline }: { serviceId: string; bookableOnline: boolean }) => {
      const { error } = await supabase
        .from('services')
        .update({ bookable_online: bookableOnline })
        .eq('id', serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-website', effectiveOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['booking-visibility-services'] });
    },
    onError: (e) => toast.error('Failed to update: ' + e.message),
  });
}

export function useUpdateServiceDescription() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async ({ serviceId, description }: { serviceId: string; description: string }) => {
      const { error } = await supabase
        .from('services')
        .update({ website_description: description })
        .eq('id', serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-website', effectiveOrganization?.id] });
      toast.success('Description updated');
    },
    onError: (e) => toast.error('Failed to update description: ' + e.message),
  });
}
