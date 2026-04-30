import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SectionConfig, WebsiteSectionsConfig } from './useWebsiteSections';
import { BUILTIN_SECTION_TYPES, SECTION_LABELS, SECTION_DESCRIPTIONS } from './useWebsiteSections';
import type { StyleOverrides } from '@/components/home/SectionStyleWrapper';
import { useSettingsOrgId } from './useSettingsOrgId';
import { useIsEditorPreview } from './useIsEditorPreview';
import { fetchSiteSetting, writeSiteSettingDraft } from '@/lib/siteSettingsDraft';

export interface PageConfig {
  id: string;
  slug: string;
  title: string;
  seo_title: string;
  seo_description: string;
  enabled: boolean;
  show_in_nav: boolean;
  nav_order: number;
  sections: SectionConfig[];
  page_type: 'home' | 'standard' | 'custom';
  deletable: boolean;
  /** Page-level style overrides — applied as a wrapper around all sections.
   *  Used for whole-page background/padding presets driven by the Page
   *  Settings chip rail. Partial because every field has a sensible default
   *  in `SectionStyleWrapper.DEFAULT_STYLE_OVERRIDES`. */
  style_overrides?: Partial<StyleOverrides>;
}

export interface WebsitePagesConfig {
  pages: PageConfig[];
}

// Default pages that come with every site
function createDefaultPages(homeSections?: SectionConfig[]): PageConfig[] {
  const defaultHomeSections: SectionConfig[] = homeSections ?? BUILTIN_SECTION_TYPES.map((type, i) => ({
    id: type,
    type,
    label: SECTION_LABELS[type],
    description: SECTION_DESCRIPTIONS[type],
    enabled: true,
    order: i + 1,
    deletable: false,
  }));

  return [
    {
      id: 'home',
      slug: '',
      title: 'Home',
      seo_title: '',
      seo_description: '',
      enabled: true,
      show_in_nav: false,
      nav_order: 0,
      sections: defaultHomeSections,
      page_type: 'home',
      deletable: false,
    },
    {
      id: 'about',
      slug: 'about',
      title: 'About Us',
      seo_title: 'About Us',
      seo_description: 'Learn more about our story and team.',
      enabled: false,
      show_in_nav: true,
      nav_order: 1,
      sections: [
        { id: 'about_story', type: 'rich_text', label: 'Our Story', description: 'Tell your brand story', enabled: true, order: 1, deletable: true },
        { id: 'about_team', type: 'image_text', label: 'Meet the Team', description: 'Team photo and introduction', enabled: true, order: 2, deletable: true },
        { id: 'about_cta', type: 'custom_cta', label: 'Book Now', description: 'Call to action', enabled: true, order: 3, deletable: true },
      ],
      page_type: 'standard',
      deletable: false,
    },
    {
      id: 'contact',
      slug: 'contact',
      title: 'Contact',
      seo_title: 'Contact Us',
      seo_description: 'Get in touch with us.',
      enabled: false,
      show_in_nav: true,
      nav_order: 2,
      sections: [
        { id: 'contact_info', type: 'rich_text', label: 'Contact Info', description: 'Address, phone, hours', enabled: true, order: 1, deletable: true },
        { id: 'contact_cta', type: 'custom_cta', label: 'Schedule a Visit', description: 'Booking CTA', enabled: true, order: 2, deletable: true },
      ],
      page_type: 'standard',
      deletable: false,
    },
  ];
}

function migrateFromSections(sectionsConfig: WebsiteSectionsConfig): WebsitePagesConfig {
  return {
    pages: createDefaultPages(sectionsConfig.homepage),
  };
}

export function useWebsitePages(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId(explicitOrgId);
  const isPreview = useIsEditorPreview();
  const mode: 'live' | 'draft' = isPreview ? 'draft' : 'live';

  return useQuery({
    queryKey: ['site-settings', orgId, 'website_pages', mode],
    queryFn: async () => {
      const existing = await fetchSiteSetting<WebsitePagesConfig>(
        orgId!,
        'website_pages',
        mode,
      );
      if (existing) return existing;

      // No website_pages row yet. Try migrating from legacy website_sections.
      const legacy = await fetchSiteSetting<WebsiteSectionsConfig>(
        orgId!,
        'website_sections',
        mode,
      );

      const pagesConfig: WebsitePagesConfig = legacy
        ? migrateFromSections(legacy)
        : { pages: createDefaultPages() };

      // Only SEED the row from the editor (authed) — never from a public
      // visitor's read. RLS would reject anon inserts and surface as a
      // homepage error; in StrictMode this can also race.
      if (mode === 'draft') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          try {
            await writeSiteSettingDraft(
              orgId!,
              'website_pages',
              pagesConfig,
              user.id,
            );
            // Also promote to live so the public site has an initial config.
            await supabase
              .from('site_settings')
              .update({ value: pagesConfig as never })
              .eq('id', 'website_pages')
              .eq('organization_id', orgId!);
            queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, 'website_pages'] });
          } catch (err) {
            console.error('Failed to seed website_pages:', err);
          }
        }
      }

      return pagesConfig;
    },
    enabled: !!orgId,
  });
}

export function useUpdateWebsitePages(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId(explicitOrgId);

  return useMutation({
    mutationFn: async (value: WebsitePagesConfig) => {
      if (!orgId) throw new Error('No organization context');
      const { data: { user } } = await supabase.auth.getUser();
      // Editor mutations only touch the draft. Publish promotes to live.
      await writeSiteSettingDraft(orgId, 'website_pages', value, user?.id ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, 'website_pages'] });
    },
  });
}

// Helper to get a page by slug
export function getPageBySlug(config: WebsitePagesConfig | null | undefined, slug: string, preview = false): PageConfig | undefined {
  if (!config) return undefined;
  return config.pages.find(p => p.slug === slug && (preview || p.enabled));
}

// Helper to get nav pages
export function getNavPages(config: WebsitePagesConfig | null | undefined): PageConfig[] {
  if (!config) return [];
  return config.pages
    .filter(p => p.show_in_nav && p.enabled)
    .sort((a, b) => a.nav_order - b.nav_order);
}

// Generate unique page ID
export function generatePageId(): string {
  return `page_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
