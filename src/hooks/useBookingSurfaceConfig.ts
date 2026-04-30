import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';

// ─── Types ───────────────────────────────────────────────────────

export interface BookingSurfaceTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  buttonRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  cardRadius: 'none' | 'sm' | 'md' | 'lg';
  fontFamily: 'inter' | 'dm-sans' | 'plus-jakarta' | 'cormorant' | 'playfair';
  headingStyle: 'uppercase' | 'titlecase' | 'lowercase';
  elevation: 'flat' | 'subtle' | 'elevated';
  density: 'compact' | 'comfortable' | 'spacious';
  mode: 'light' | 'dark';
  logoUrl: string | null;
  heroImageUrl: string | null;
}

export interface BookingSurfaceFlow {
  template: 'category-first' | 'stylist-first' | 'location-first';
  showPrices: boolean;
  showDuration: boolean;
  showDescriptions: boolean;
  showStylistBios: boolean;
  showAddOns: boolean;
  featuredCategoryIds: string[];
  /** Org-wide policy for first-time visitors.
   *  - `open` (default): anyone can book any service directly.
   *  - `consultation-required`: new visitors are gated through a consultation
   *    step before they can book non-consult services. The booking surface
   *    enforces this; the promotional popup editor unlocks the
   *    "Schedule a consultation" destination only when this is set. */
  newClientPolicy?: 'open' | 'consultation-required';
}

export interface BookingSurfaceHosted {
  pageTitle: string;
  introText: string | null;
  showHero: boolean;
  showFaq: boolean;
  faqItems: { q: string; a: string }[];
  policyText: string | null;
  poweredByVisible: boolean;
}

export interface BookingSurfaceEmbed {
  allowedTypes: ('inline' | 'modal' | 'popup' | 'iframe')[];
  allowServicePreselect: boolean;
  allowStylistPreselect: boolean;
  allowLocationPreselect: boolean;
  allowCategoryPreselect: boolean;
  allowConsultationMode: boolean;
}

export interface BookingSurfaceConfig {
  [key: string]: unknown;
  mode: 'hosted' | 'embed' | 'both';
  published: boolean;
  slug: string;
  theme: BookingSurfaceTheme;
  flow: BookingSurfaceFlow;
  hosted: BookingSurfaceHosted;
  embed: BookingSurfaceEmbed;
  version: number;
  publishedAt: string | null;
  updatedAt: string | null;
}

// ─── Defaults ────────────────────────────────────────────────────

export const DEFAULT_BOOKING_THEME: BookingSurfaceTheme = {
  primaryColor: '#7c3aed',
  secondaryColor: '#a78bfa',
  accentColor: '#c4b5fd',
  backgroundColor: '#ffffff',
  surfaceColor: '#f8fafc',
  textColor: '#0f172a',
  mutedTextColor: '#64748b',
  borderColor: '#e2e8f0',
  buttonRadius: 'md',
  cardRadius: 'md',
  fontFamily: 'dm-sans',
  headingStyle: 'titlecase',
  elevation: 'subtle',
  density: 'comfortable',
  mode: 'light',
  logoUrl: null,
  heroImageUrl: null,
};

export const DEFAULT_BOOKING_FLOW: BookingSurfaceFlow = {
  template: 'category-first',
  showPrices: true,
  showDuration: true,
  showDescriptions: true,
  showStylistBios: false,
  showAddOns: false,
  featuredCategoryIds: [],
  newClientPolicy: 'open',
};

export const DEFAULT_BOOKING_HOSTED: BookingSurfaceHosted = {
  pageTitle: 'Book an Appointment',
  introText: null,
  showHero: false,
  showFaq: false,
  faqItems: [],
  policyText: null,
  poweredByVisible: true,
};

export const DEFAULT_BOOKING_EMBED: BookingSurfaceEmbed = {
  allowedTypes: ['inline', 'modal', 'iframe'],
  allowServicePreselect: true,
  allowStylistPreselect: true,
  allowLocationPreselect: true,
  allowCategoryPreselect: true,
  allowConsultationMode: true,
};

export const DEFAULT_BOOKING_SURFACE_CONFIG: BookingSurfaceConfig = {
  mode: 'hosted',
  published: false,
  slug: '',
  theme: DEFAULT_BOOKING_THEME,
  flow: DEFAULT_BOOKING_FLOW,
  hosted: DEFAULT_BOOKING_HOSTED,
  embed: DEFAULT_BOOKING_EMBED,
  version: 1,
  publishedAt: null,
  updatedAt: null,
};

// ─── Hooks ───────────────────────────────────────────────────────

export function useBookingSurfaceConfig(explicitOrgId?: string) {
  const orgId = useSettingsOrgId(explicitOrgId);

  return useQuery({
    queryKey: ['site-settings', orgId, 'booking_surface_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'booking_surface_config')
        .eq('organization_id', orgId!)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return DEFAULT_BOOKING_SURFACE_CONFIG;
        throw error;
      }
      return (data?.value as unknown as BookingSurfaceConfig) ?? DEFAULT_BOOKING_SURFACE_CONFIG;
    },
    enabled: !!orgId,
  });
}

export function useUpdateBookingSurfaceConfig(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId(explicitOrgId);

  return useMutation({
    mutationFn: async (config: BookingSurfaceConfig) => {
      if (!orgId) throw new Error('No organization context');
      const { data: { user } } = await supabase.auth.getUser();

      // Upsert: try update first, then insert if not found
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('id', 'booking_surface_config')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: config as never, updated_by: user?.id })
          .eq('id', 'booking_surface_config')
          .eq('organization_id', orgId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert({
            id: 'booking_surface_config',
            organization_id: orgId,
            value: config as never,
            updated_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, 'booking_surface_config'] });
    },
  });
}

// ─── Public config fetcher (no auth context needed) ──────────────

export function usePublicBookingSurfaceConfig(orgId: string | undefined) {
  return useQuery({
    queryKey: ['public-booking-config', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'booking_surface_config')
        .eq('organization_id', orgId!)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return DEFAULT_BOOKING_SURFACE_CONFIG;
        throw error;
      }
      return (data?.value as unknown as BookingSurfaceConfig) ?? DEFAULT_BOOKING_SURFACE_CONFIG;
    },
    enabled: !!orgId,
  });
}
