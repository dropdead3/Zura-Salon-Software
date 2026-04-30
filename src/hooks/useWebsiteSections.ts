import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebsitePages, useUpdateWebsitePages, type WebsitePagesConfig } from './useWebsitePages';

// Built-in section types (have dedicated editor components)
export const BUILTIN_SECTION_TYPES = [
  'hero', 'brand_statement', 'testimonials', 'services_preview',
  'popular_services', 'gallery', 'new_client', 'stylists',
  'locations', 'faq', 'extensions', 'brands', 'drink_menu',
] as const;

export type BuiltinSectionType = typeof BUILTIN_SECTION_TYPES[number];

// Custom section types users can add
export const CUSTOM_SECTION_TYPES = [
  'rich_text', 'image_text', 'video', 'custom_cta', 'spacer',
] as const;

export type CustomSectionType = typeof CUSTOM_SECTION_TYPES[number];

export type SectionType = BuiltinSectionType | CustomSectionType;

export interface StyleOverrides {
  background_type: 'none' | 'color' | 'gradient' | 'image';
  background_value: string;
  padding_top: number;
  padding_bottom: number;
  max_width: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  text_color_override: string;
  border_radius: number;
}

export interface SectionConfig {
  id: string;
  type: SectionType;
  label: string;
  description: string;
  enabled: boolean;
  order: number;
  deletable: boolean;
  style_overrides?: Partial<StyleOverrides>;
}

export interface WebsiteSectionsConfig {
  homepage: SectionConfig[];
}

// Labels for custom section type picker
export const CUSTOM_TYPE_INFO: Record<CustomSectionType, { label: string; description: string }> = {
  rich_text: { label: 'Rich Text Block', description: 'Heading and body text with alignment controls' },
  image_text: { label: 'Image + Text', description: 'Side-by-side image and text layout with CTA' },
  video: { label: 'Video Embed', description: 'YouTube or Vimeo embedded video section' },
  custom_cta: { label: 'Call to Action', description: 'Banner with heading, text, and button' },
  spacer: { label: 'Spacer / Divider', description: 'Visual spacing or divider line' },
};

// Section display names for built-in sections
export const SECTION_LABELS: Record<BuiltinSectionType, string> = {
  hero: 'Hero Section',
  brand_statement: 'Brand Statement',
  testimonials: 'Testimonials',
  services_preview: 'Services Preview',
  popular_services: 'Popular Services',
  gallery: 'Gallery',
  new_client: 'New Client CTA',
  stylists: 'Meet Our Stylists',
  locations: 'Locations',
  faq: 'FAQ',
  extensions: 'Extensions Spotlight',
  brands: 'Partner Brands',
  drink_menu: 'Drink Menu',
};

// Section descriptions for built-in sections
export const SECTION_DESCRIPTIONS: Record<BuiltinSectionType, string> = {
  hero: 'Main hero banner with rotating headlines and CTAs',
  brand_statement: 'Brand identity section with typewriter effect',
  testimonials: '5-star reviews carousel',
  services_preview: 'Overview of service categories',
  popular_services: 'Featured popular services',
  gallery: 'Before/after transformation gallery',
  new_client: 'New client conversion CTA with benefits',
  stylists: 'Team showcase with stylist cards',
  locations: 'Salon location information and maps',
  faq: 'Frequently asked questions accordion',
  extensions: 'Hand-tied extensions spotlight',
  brands: 'Partner brand logos',
  drink_menu: 'Complimentary drink menu',
};

// Default sections
const DEFAULT_HOMEPAGE: SectionConfig[] = BUILTIN_SECTION_TYPES.map((type, index) => ({
  id: type,
  type,
  label: SECTION_LABELS[type],
  description: SECTION_DESCRIPTIONS[type],
  enabled: true,
  order: index + 1,
  deletable: false,
}));

/**
 * Thin adapter: reads/writes the HOME page's sections from `website_pages`.
 * This is the SINGLE source of truth — no more `website_sections` key.
 */
export function useWebsiteSections() {
  const pagesQuery = useWebsitePages();

  const data = useMemo<WebsiteSectionsConfig | undefined>(() => {
    if (!pagesQuery.data) return undefined;
    const homePage = pagesQuery.data.pages.find(p => p.id === 'home');
    return { homepage: homePage?.sections ?? DEFAULT_HOMEPAGE };
  }, [pagesQuery.data]);

  return {
    data,
    isLoading: pagesQuery.isLoading,
    error: pagesQuery.error,
    isError: pagesQuery.isError,
  };
}

export function useUpdateWebsiteSections() {
  const pagesQuery = useWebsitePages();
  const updatePages = useUpdateWebsitePages();

  return useMutation({
    mutationFn: async (value: WebsiteSectionsConfig) => {
      // Source of truth = the live useWebsitePages query, not an arbitrary
      // cache lookup. The previous implementation read
      // ['site-settings', 'website_pages'] which never matches the actual key
      // (`['site-settings', orgId, 'website_pages', mode]`) and always threw
      // "Pages config not loaded" — surfacing as "Failed to update section"
      // when toggling a homepage row.
      const currentPages = pagesQuery.data;
      if (!currentPages) throw new Error('Pages config not loaded');

      const updated: WebsitePagesConfig = {
        pages: currentPages.pages.map(p =>
          p.id === 'home' ? { ...p, sections: value.homepage } : p
        ),
      };
      await updatePages.mutateAsync(updated);
    },
  });
}

// Helper to get ordered sections
export function getOrderedSections(config: WebsiteSectionsConfig | null | undefined): SectionConfig[] {
  if (!config) return DEFAULT_HOMEPAGE;
  return [...config.homepage].sort((a, b) => a.order - b.order);
}

// Helper to get only enabled sections in order
export function getEnabledSections(config: WebsiteSectionsConfig | null | undefined): SectionConfig[] {
  return getOrderedSections(config).filter(s => s.enabled);
}

// Check if a section type is built-in
export function isBuiltinSection(type: string): type is BuiltinSectionType {
  return BUILTIN_SECTION_TYPES.includes(type as BuiltinSectionType);
}

// Generate a unique ID for custom sections
export function generateSectionId(): string {
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
