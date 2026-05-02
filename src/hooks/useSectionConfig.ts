import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';
import { useIsDraftReader } from './useIsDraftReader';
import { fetchSiteSetting, writeSiteSettingDraft } from '@/lib/siteSettingsDraft';
import type { SectionTextColors } from '@/lib/sectionTextColors';

// Generic hook for section configurations.
// Editor + preview iframe read drafts; the public site reads live `value`.
// All writes go to `draft_value` only — call publishSiteSettingsDrafts() to
// promote drafts to live.
function useSectionConfig<T>(sectionId: string, defaultValue: T) {
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId();
  // Single source of truth: draft mode for both the iframe and the
  // dashboard editor surface; live mode for public visitors.
  const mode: 'live' | 'draft' = useIsDraftReader() ? 'draft' : 'live';

  const query = useQuery({
    // Cache key includes mode so the editor iframe and public visitor never
    // share cached data.
    queryKey: ['site-settings', orgId, sectionId, mode],
    queryFn: async () => {
      const value = await fetchSiteSetting<object>(orgId!, sectionId, mode);
      if (!value) return defaultValue;
      // Merge with defaults to handle new fields
      return { ...defaultValue, ...value } as T;
    },
    enabled: !!orgId,
  });

  const mutation = useMutation({
    mutationFn: async (value: T) => {
      if (!orgId) throw new Error('No organization context');
      const { data: { user } } = await supabase.auth.getUser();
      await writeSiteSettingDraft(orgId, sectionId, value, user?.id ?? null);
    },
    onSuccess: () => {
      // Invalidate every cached mode for this key so the editor sees the
      // fresh draft AND any open preview iframe re-fetches on next focus.
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, sectionId] });
      // Refresh the per-key dirty-draft set so the DRAFT chip on editor
      // inputs (see useDirtyDraftKey) flips on immediately after save.
      queryClient.invalidateQueries({ queryKey: ['site-settings-dirty-drafts', orgId] });
    },
  });

  return {
    data: query.data ?? defaultValue,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    update: mutation.mutateAsync,
    error: query.error || mutation.error,
  };
}

// ============================================
// Section Types
// ============================================

/**
 * Per-section/per-slide color overrides for hero text + buttons. Every field
 * is optional — empty/missing means "fall back to auto-contrast" (white over
 * media, theme foreground otherwise). Operators set hex strings; renderers
 * apply via inline style so any color value is supported.
 */
export interface HeroTextColors {
  headline?: string;
  subheadline?: string;
  eyebrow?: string;
  notes?: string;
  primary_button_bg?: string;
  primary_button_fg?: string;
  primary_button_hover_bg?: string;
  secondary_button_border?: string;
  secondary_button_fg?: string;
  secondary_button_hover_bg?: string;
  secondary_button_hover_border?: string;
  secondary_button_hover_fg?: string;
}

/**
 * Scrim styles applied over background media to keep text legible regardless
 * of dark/light fluctuations in a video or image.
 *
 * - `flat`        — uniform dark wash (legacy `overlay_opacity` behavior).
 * - `gradient-bottom` — darker at the text region (bottom 60%), transparent up top.
 * - `gradient-radial` — darker at the center (where headlines sit), transparent at edges.
 * - `vignette`    — darker at all four edges, lighter in the middle.
 * - `none`        — no scrim. Text relies solely on its own color.
 */
export type HeroScrimStyle =
  | 'flat'
  | 'gradient-bottom'
  | 'gradient-radial'
  | 'vignette'
  | 'none';

export interface HeroSlide {
  id: string;
  background_type: 'image' | 'video' | 'inherit';
  background_url: string;
  background_poster_url: string;
  overlay_opacity: number | null; // null = inherit from section (legacy flat-scrim strength)
  /** Per-slide scrim style override. null = inherit from section. */
  scrim_style?: HeroScrimStyle | null;
  /** Per-slide scrim strength override (0..1). null = inherit from section. */
  scrim_strength?: number | null;
  /** Per-slide focal point override (0..100). null/undefined = inherit. */
  background_focal_x?: number | null;
  background_focal_y?: number | null;
  /** Per-slide overlay mode override. null/undefined = inherit from section. */
  overlay_mode?: 'darken' | 'lighten' | null;
  /** Per-slide fit override. null/undefined = inherit from section. */
  background_fit?: 'cover' | 'contain' | null;
  eyebrow: string;
  show_eyebrow: boolean;
  headline_text: string;
  subheadline_line1: string;
  subheadline_line2: string;
  cta_new_client: string;
  cta_new_client_url: string;
  cta_returning_client: string;
  cta_returning_client_url: string;
  show_secondary_button: boolean;
  /** Per-slide color overrides; empty fields inherit from section text_colors. */
  text_colors?: HeroTextColors;
  /**
   * Captured at upload time. Drives the editor's "3200×2133 · 480 KB" caption
   * AND caps the public site's responsive srcSet (no point asking Storage for
   * 3200px variants of a 1600px master). Optional — pasted URLs and legacy
   * slides leave these unset and the UI silently degrades.
   */
  media_width?: number | null;
  media_height?: number | null;
  media_size_bytes?: number | null;
  media_format?: string | null;
  /**
   * Which `qualityProfile` was active when this asset was uploaded. Drives the
   * editor's "Re-upload at higher quality" nudge for legacy assets that landed
   * before the hero profile existed (or were uploaded through a non-hero
   * surface). `null` / absent = unknown legacy upload.
   */
  media_optimized_with_profile?: 'standard' | 'hero' | null;
  /**
   * Per-slide horizontal alignment override for headline/subheadline/CTAs.
   * `null` / undefined = inherit the section-level `content_alignment`.
   */
  content_alignment?: 'left' | 'center' | 'right' | null;
  /**
   * Per-slide content column width override. `null` / undefined inherits
   * the section-level `content_width` (which itself defaults to 'default'
   * for legacy back-compat).
   *   - 'narrow'  → tighter column for copy-heavy slides
   *   - 'default' → balanced 896px column
   *   - 'wide'    → flex wider for punchy single-line headlines
   */
  content_width?: 'narrow' | 'default' | 'wide' | null;
  /**
   * Whether the slide is included in the public rotator. `false` hides it
   * from the live site without deleting (operator can re-enable). Default
   * is `true` — `null`/`undefined` is treated as active for legacy slides.
   */
  active?: boolean | null;
}

export interface HeroConfig {
  headline_text: string;
  eyebrow: string;
  rotating_words: string[];
  subheadline_line1: string;
  subheadline_line2: string;
  cta_new_client: string;
  cta_returning_client: string;
  consultation_note_line1: string;
  consultation_note_line2: string;
  // Advanced options
  animation_start_delay: number;
  word_rotation_interval: number;
  cta_new_client_url: string;
  cta_returning_client_url: string;
  scroll_indicator_text: string;
  show_scroll_indicator: boolean;
  // Visibility toggles
  show_secondary_button: boolean;
  show_consultation_notes: boolean;
  show_eyebrow: boolean;
  show_rotating_words: boolean;
  show_subheadline: boolean;
  // Background media (single-slide / fallback when slides[] is empty)
  background_type: 'none' | 'image' | 'video';
  background_url: string;
  background_poster_url: string;
  background_fit: 'cover' | 'contain';
  /** Focal point as percentages 0..100 (CSS object-position). Default 50/50. */
  background_focal_x?: number;
  background_focal_y?: number;
  /** Overlay mode: darken (black scrim) or lighten (white scrim). Mutually exclusive. */
  overlay_mode?: 'darken' | 'lighten';
  overlay_opacity: number; // 0..0.8 — strength used when scrim_style === 'flat' or unset
  /** Section-level scrim style. Defaults to `gradient-bottom` for media backgrounds. */
  scrim_style?: HeroScrimStyle;
  /** Section-level scrim strength (0..1). Defaults to 0.55 when set, else falls back to overlay_opacity. */
  scrim_strength?: number;
  // Multi-slide rotator (Revolution Slider–style)
  slides: HeroSlide[];
  /**
   * How the rotator presents slides:
   * - `multi_slide` (default): each slide owns its own background AND its own
   *   foreground copy/CTAs. Foreground re-animates per slide.
   * - `background_only`: slides own only the background; foreground copy +
   *   CTAs come from the section-level fields and stay still while the
   *   imagery cross-fades. Per-slide copy is preserved (just not rendered)
   *   so switching back to `multi_slide` restores it.
   * Legacy configs without this field render as `multi_slide`.
   */
  rotator_mode?: 'multi_slide' | 'background_only';
  /**
   * ISO timestamp set when the operator switches into `background_only` mode.
   * Used by the editor to detect "stuck in background-only with 1 slide for
   * >7 days" and suggest collapsing to a static hero. Null/unset → no hint.
   */
  background_only_since?: string | null;
  /**
   * ISO timestamp set when the operator dismisses the duplicate-headline
   * "Convert to Background-Only" hint. Suppresses the nudge for 30 days.
   */
  dismissed_convert_hint_at?: string | null;
  auto_rotate: boolean;
  slide_interval_ms: number;
  transition_style: 'fade' | 'crossfade' | 'slide-up';
  pause_on_hover: boolean;
  /** Section-level color overrides; per-slide overrides win when set. */
  text_colors?: HeroTextColors;
  /** Upload-time metadata for the section background. See HeroSlide notes. */
  media_width?: number | null;
  media_height?: number | null;
  media_size_bytes?: number | null;
  media_format?: string | null;
  media_optimized_with_profile?: 'standard' | 'hero' | null;
  /**
   * Section-level horizontal alignment for headline/subheadline/CTAs.
   * Defaults to 'center' for back-compat with pre-alignment hero layouts.
   * Per-slide `content_alignment` overrides this when set.
   */
  content_alignment?: 'left' | 'center' | 'right';
  /**
   * Section-level content column width default. Per-slide `content_width`
   * overrides this when set. Defaults to 'default' (896px) for back-compat.
   */
  content_width?: 'narrow' | 'default' | 'wide';
  /**
   * Section-level vertical spacing density. Picks one of three preset
   * rhythms (compact / standard / airy) defined in `src/lib/heroSpacing.ts`.
   * Defaults to 'compact' so existing operators see the tightened May 2026
   * rhythm. Container-aware compression forces 'compact' on narrow widths
   * regardless of this value.
   */
  content_spacing?: 'compact' | 'standard' | 'airy';
}

export interface BrandStatementConfig {
  eyebrow: string;
  rotating_words: string[];
  headline_prefix: string;
  headline_suffix: string;
  paragraphs: string[];
  // New advanced options
  typewriter_speed: number;
  typewriter_pause: number;
  show_typewriter_cursor: boolean;
  // Visibility toggles
  show_eyebrow: boolean;
  show_headline: boolean;
  show_paragraphs: boolean;
  /** Per-element color overrides. Empty/missing = inherit theme. */
  text_colors?: SectionTextColors;
}

export interface TestimonialsConfig {
  eyebrow: string;
  headline: string;
  google_review_url: string;
  link_text: string;
  // New advanced options
  verified_badge_text: string;
  scroll_animation_duration: number;
  show_star_ratings: boolean;
  max_visible_testimonials: number;
  // Visibility toggles
  show_eyebrow: boolean;
  show_headline: boolean;
  show_google_review_link: boolean;
  /** Per-element color overrides. Empty/missing = inherit theme. */
  text_colors?: SectionTextColors;
}

export interface NewClientConfig {
  headline_prefix: string;
  rotating_words: string[];
  description: string;
  benefits: string[];
  cta_text: string;
  // Advanced options
  cta_url: string;
  show_benefits_icons: boolean;
  // Visibility toggles
  show_benefits: boolean;
  show_headline: boolean;
  show_description: boolean;
  show_cta: boolean;
}

export interface ExtensionsFeature {
  icon: string;
  title: string;
  description: string;
}

export interface ExtensionsConfig {
  badge_text: string;
  eyebrow: string;
  headline_line1: string;
  headline_line2: string;
  description: string;
  features: ExtensionsFeature[];
  cta_primary: string;
  cta_secondary: string;
  education_link_text: string;
  // Advanced options
  cta_primary_url: string;
  cta_secondary_url: string;
  education_link_url: string;
  floating_badge_text: string;
  floating_badge_description: string;
  // Visibility toggles
  show_education_link: boolean;
  show_floating_badge: boolean;
  show_secondary_cta: boolean;
  show_eyebrow: boolean;
  show_headline: boolean;
  show_description: boolean;
  show_features: boolean;
  show_primary_cta: boolean;
}

export interface FAQConfig {
  rotating_words: string[];
  intro_paragraphs: string[];
  cta_primary_text: string;
  cta_secondary_text: string;
  // New advanced options
  search_placeholder: string;
  show_search_bar: boolean;
  cta_primary_url: string;
  cta_secondary_url: string;
  // Visibility toggles
  show_rotating_words: boolean;
  show_intro_paragraphs: boolean;
  show_primary_cta: boolean;
  show_secondary_cta: boolean;
}

export interface Brand {
  id: string;
  name: string;
  display_text: string;
  logo_url?: string;
}

export interface BrandsConfig {
  intro_text: string;
  // New advanced options
  brands: Brand[];
  marquee_speed: number;
  show_intro_text: boolean;
  // Visibility toggles
  show_logos: boolean;
}

export interface Drink {
  id: string;
  name: string;
  image_url: string;
  ingredients: string;
}

export interface DrinkMenuConfig {
  eyebrow: string;
  eyebrow_highlight: string;
  eyebrow_suffix: string;
  // New advanced options
  drinks: Drink[];
  carousel_speed: number;
  hover_slowdown_factor: number;
  // Visibility toggles
  show_eyebrow: boolean;
  show_drink_images: boolean;
}

export interface FooterCTAConfig {
  eyebrow: string;
  headline_line1: string;
  headline_line2: string;
  description: string;
  cta_text: string;
  cta_url: string;
  show_phone_numbers: boolean;
  // Visibility toggles
  show_description: boolean;
  show_eyebrow: boolean;
  show_headline: boolean;
  show_cta_button: boolean;
}

/**
 * Floating "Sticky Footer" bar (the glassmorphism call-bar that appears
 * after the visitor scrolls past the hero). Lives in `<StickyFooterBar />`.
 * Defaults preserve today's hardcoded behavior so legacy installs render
 * unchanged on first read.
 */
export interface StickyFooterBarConfig {
  /** Master kill-switch. When false the bar never renders site-wide. */
  enabled: boolean;
  cta_text: string;
  cta_url: string;
  show_phone_numbers: boolean;
  /**
   * Ordered allow-list of location IDs whose phone tile renders in the bar.
   * Empty array = show every active location with a phone (legacy behavior).
   */
  visible_location_ids: string[];
  /** Pixels scrolled before the bar slides in. Editor exposes 0–600. */
  scroll_show_after_px: number;
  /**
   * Pathnames where the bar is suppressed in addition to `/booking` (which
   * is always implicit — no escape hatch for that since the booking page
   * has its own footer CTA and the bar would collide).
   */
  page_exclusions: string[];
}

export interface LocationsSectionConfig {
  section_eyebrow: string;
  section_title: string;
  card_cta_primary_text: string;
  card_cta_secondary_text: string;
  show_tap_hint: boolean;
}

// Section Display Configs (for homepage section editors)
export interface ServicesPreviewConfig {
  section_eyebrow: string;
  section_title: string;
  section_description: string;
  layout: 'grid' | 'list' | 'accordion';
  max_categories_visible: number;
  // Visibility toggles
  show_eyebrow: boolean;
  show_title: boolean;
  show_description: boolean;
}

export interface PopularServicesConfig {
  section_eyebrow: string;
  section_title: string;
  section_description: string;
  max_featured: number;
  layout: 'grid' | 'carousel';
  // Visibility toggles
  show_eyebrow: boolean;
  show_title: boolean;
  show_description: boolean;
}

export interface GalleryDisplayConfig {
  section_eyebrow: string;
  section_title: string;
  section_title_highlight: string;
  section_description: string;
  cta_text: string;
  grid_columns: number;
  max_images: number;
  // Visibility toggles
  show_eyebrow: boolean;
  show_title: boolean;
  show_description: boolean;
  show_cta: boolean;
}

export interface StylistsDisplayConfig {
  section_eyebrow: string;
  section_title: string;
  section_description: string;
  card_style: 'minimal' | 'detailed';
  max_visible: number;
  // Visibility toggles
  show_eyebrow: boolean;
  show_title: boolean;
  show_description: boolean;
}

export interface LocationsDisplayConfig {
  section_eyebrow: string;
  section_title: string;
  section_description: string;
  show_map: boolean;
  layout: 'cards' | 'list';
  // Visibility toggles
  show_eyebrow: boolean;
  show_title: boolean;
  show_description: boolean;
}

export interface ExtensionReviewsConfig {
  eyebrow: string;
  headline: string;
  extension_categories: string[];
  show_eyebrow: boolean;
  show_headline: boolean;
  show_categories: boolean;
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_HERO: HeroConfig = {
  headline_text: "Your Salon",
  eyebrow: "Your Tagline Here",
  rotating_words: ["Salon", "Studio", "Experience"],
  subheadline_line1: "Where expertise meets artistry.",
  subheadline_line2: "Your journey to beautiful hair starts here.",
  cta_new_client: "Book Now",
  cta_returning_client: "Explore Services",
  consultation_note_line1: "",
  consultation_note_line2: "",
  animation_start_delay: 4,
  word_rotation_interval: 5.5,
  cta_new_client_url: "",
  cta_returning_client_url: "/booking",
  scroll_indicator_text: "Scroll",
  show_scroll_indicator: true,
  show_secondary_button: true,
  show_consultation_notes: true,
  show_eyebrow: true,
  show_rotating_words: true,
  show_subheadline: true,
  background_type: 'none',
  background_url: '',
  background_poster_url: '',
  background_fit: 'cover',
  background_focal_x: 50,
  background_focal_y: 50,
  overlay_mode: 'darken',
  overlay_opacity: 0.4,
  scrim_style: 'gradient-bottom',
  scrim_strength: 0.55,
  slides: [],
  rotator_mode: 'multi_slide',
  auto_rotate: true,
  slide_interval_ms: 6000,
  transition_style: 'crossfade',
  pause_on_hover: true,
  text_colors: {},
  content_alignment: 'center',
  content_spacing: 'compact',
};

export const DEFAULT_BRAND_STATEMENT: BrandStatementConfig = {
  eyebrow: "Our Brand",
  rotating_words: ["Average", "Boring", "Standard", "Typical", "Basic", "Ordinary"],
  headline_prefix: "Not Your",
  headline_suffix: "Salon",
  paragraphs: [
    "We've built a destination for transformative hair experiences that go beyond the ordinary.",
    "Experience an extensive range of innovative treatments meticulously crafted by our artist-led team."
  ],
  typewriter_speed: 100,
  typewriter_pause: 2,
  show_typewriter_cursor: true,
  show_eyebrow: true,
  show_headline: true,
  show_paragraphs: true,
};

export const DEFAULT_TESTIMONIALS: TestimonialsConfig = {
  eyebrow: "Check out 100's of",
  headline: "Our happy 5-star reviews",
  google_review_url: "https://g.page/r/YOUR_GOOGLE_REVIEW_LINK",
  link_text: "Leave a review",
  // New defaults
  verified_badge_text: "Verified Customer",
  scroll_animation_duration: 60,
  show_star_ratings: true,
  max_visible_testimonials: 20,
  show_eyebrow: true,
  show_headline: true,
  show_google_review_link: true,
};

export const DEFAULT_NEW_CLIENT: NewClientConfig = {
  headline_prefix: "New Clients",
  rotating_words: ["Start Here", "Wanted", "Are The Best"],
  description: "Let's get you matched to a stylist right for you.",
  benefits: [
    "Complimentary Drinks & Snacks",
    "Fun & Friendly Staff",
    "No Judgement, All Are Welcome"
  ],
  cta_text: "Let's Get Started",
  cta_url: "",
  show_benefits_icons: true,
  show_benefits: true,
  show_headline: true,
  show_description: true,
  show_cta: true,
};

export const DEFAULT_EXTENSIONS: ExtensionsConfig = {
  badge_text: "OUR SIGNATURE",
  eyebrow: "Get the most comfortable extensions with the",
  headline_line1: "Our Signature",
  headline_line2: "Method",
  description: "The most versatile and comfortable hidden beaded row method available.",
  features: [
    { icon: "Star", title: "Hidden & Seamless", description: "Invisible beaded rows that lay completely flat" },
    { icon: "Award", title: "Maximum Comfort", description: "No tension, no damage" },
    { icon: "MapPin", title: "Nationwide Education", description: "We train salons across the country" },
  ],
  cta_primary: "Book Extension Consult",
  cta_secondary: "Learn More",
  education_link_text: "Are you a stylist wanting to learn our method?",
  cta_primary_url: "",
  cta_secondary_url: "/extensions",
  education_link_url: "/education",
  floating_badge_text: "Change Your Look Instantly",
  floating_badge_description: "Premium extensions that blend seamlessly",
  show_education_link: true,
  show_floating_badge: true,
  show_secondary_cta: true,
  show_eyebrow: true,
  show_headline: true,
  show_description: true,
  show_features: true,
  show_primary_cta: true,
};

export const DEFAULT_FAQ: FAQConfig = {
  rotating_words: ["Asked", "Answered"],
  intro_paragraphs: [
    "We're here to answer your most common questions before you visit.",
    "If you don't find what you're looking for, reach out and we'll be happy to help."
  ],
  cta_primary_text: "See All FAQ's",
  cta_secondary_text: "Salon Policies",
  // New defaults
  search_placeholder: "Search questions...",
  show_search_bar: true,
  cta_primary_url: "/faq",
  cta_secondary_url: "/policies",
  show_rotating_words: true,
  show_intro_paragraphs: true,
  show_primary_cta: true,
  show_secondary_cta: true,
};

export const DEFAULT_BRANDS: BrandsConfig = {
  intro_text: "Our favorite brands we love to use in the salon",
  brands: [],
  marquee_speed: 40,
  show_intro_text: true,
  show_logos: true,
};

export const DEFAULT_DRINK_MENU: DrinkMenuConfig = {
  eyebrow: "Drinks on us. We have an exclusive menu of",
  eyebrow_highlight: "complimentary",
  eyebrow_suffix: "options for your appointment.",
  // New defaults
  drinks: [],
  carousel_speed: 30,
  hover_slowdown_factor: 0.1,
  show_eyebrow: true,
  show_drink_images: true,
};

export const DEFAULT_FOOTER_CTA: FooterCTAConfig = {
  eyebrow: "Ready for Something Different?",
  headline_line1: "Book Your",
  headline_line2: "Consult",
  description: "Every great transformation begins with a conversation. Let's plan yours.",
  cta_text: "Book consult",
  cta_url: "/booking",
  show_phone_numbers: true,
  show_description: true,
  show_eyebrow: true,
  show_headline: true,
  show_cta_button: true,
};

export const DEFAULT_STICKY_FOOTER_BAR: StickyFooterBarConfig = {
  enabled: true,
  cta_text: 'Book consult',
  cta_url: '/booking',
  show_phone_numbers: true,
  visible_location_ids: [],
  scroll_show_after_px: 180,
  page_exclusions: [],
};

export const DEFAULT_LOCATIONS_SECTION: LocationsSectionConfig = {
  section_eyebrow: "Find Us",
  section_title: "Our Locations",
  card_cta_primary_text: "Book consult",
  card_cta_secondary_text: "Check out the stylists",
  show_tap_hint: true,
};

export const DEFAULT_SERVICES_PREVIEW: ServicesPreviewConfig = {
  section_eyebrow: "What We Do",
  section_title: "Our Services",
  section_description: "From cuts to color, extensions to styling — explore everything we offer.",
  layout: 'accordion',
  max_categories_visible: 10,
  show_eyebrow: true,
  show_title: true,
  show_description: true,
};

export const DEFAULT_POPULAR_SERVICES: PopularServicesConfig = {
  section_eyebrow: "Most Loved",
  section_title: "Popular Services",
  section_description: "Our most booked services by clients who know what they want.",
  max_featured: 6,
  layout: 'grid',
  show_eyebrow: true,
  show_title: true,
  show_description: true,
};

export const DEFAULT_GALLERY_DISPLAY: GalleryDisplayConfig = {
  section_eyebrow: "Our Work",
  section_title: "Get the Look",
  section_title_highlight: "You've Always Wanted",
  section_description: "Real clients. Real transformations. See our artistry in action.",
  cta_text: "View gallery",
  grid_columns: 3,
  max_images: 12,
  show_eyebrow: true,
  show_title: true,
  show_description: true,
  show_cta: true,
};

export const DEFAULT_STYLISTS_DISPLAY: StylistsDisplayConfig = {
  section_eyebrow: "Meet The Team",
  section_title: "Our Stylists",
  section_description: "Talented artists dedicated to your perfect look.",
  card_style: 'detailed',
  max_visible: 8,
  show_eyebrow: true,
  show_title: true,
  show_description: true,
};

export const DEFAULT_LOCATIONS_DISPLAY: LocationsDisplayConfig = {
  section_eyebrow: "Visit Us",
  section_title: "Our Locations",
  section_description: "Find a salon near you.",
  show_map: true,
  layout: 'cards',
  show_eyebrow: true,
  show_title: true,
  show_description: true,
};

// DEFAULT_WEBSITE_SERVICES removed — services are now managed via useNativeServicesForWebsite hook

// ============================================
// Typed Hooks
// ============================================

export function useHeroConfig() {
  return useSectionConfig<HeroConfig>('section_hero', DEFAULT_HERO);
}

export function useBrandStatementConfig() {
  return useSectionConfig<BrandStatementConfig>('section_brand_statement', DEFAULT_BRAND_STATEMENT);
}

export function useTestimonialsConfig() {
  return useSectionConfig<TestimonialsConfig>('section_testimonials', DEFAULT_TESTIMONIALS);
}

export function useNewClientConfig() {
  return useSectionConfig<NewClientConfig>('section_new_client', DEFAULT_NEW_CLIENT);
}

export function useExtensionsConfig() {
  return useSectionConfig<ExtensionsConfig>('section_extensions', DEFAULT_EXTENSIONS);
}

export function useFAQConfig() {
  return useSectionConfig<FAQConfig>('section_faq', DEFAULT_FAQ);
}

export function useBrandsConfig() {
  return useSectionConfig<BrandsConfig>('section_brands', DEFAULT_BRANDS);
}

export function useDrinkMenuConfig() {
  return useSectionConfig<DrinkMenuConfig>('section_drink_menu', DEFAULT_DRINK_MENU);
}

export function useFooterCTAConfig() {
  return useSectionConfig<FooterCTAConfig>('section_footer_cta', DEFAULT_FOOTER_CTA);
}

export function useStickyFooterBarConfig() {
  return useSectionConfig<StickyFooterBarConfig>(
    'section_sticky_footer_bar',
    DEFAULT_STICKY_FOOTER_BAR,
  );
}

export function useLocationsSectionConfig() {
  return useSectionConfig<LocationsSectionConfig>('section_locations', DEFAULT_LOCATIONS_SECTION);
}

export function useServicesPreviewConfig() {
  return useSectionConfig<ServicesPreviewConfig>('section_services_preview', DEFAULT_SERVICES_PREVIEW);
}

export function usePopularServicesConfig() {
  return useSectionConfig<PopularServicesConfig>('section_popular_services', DEFAULT_POPULAR_SERVICES);
}

export function useGalleryDisplayConfig() {
  return useSectionConfig<GalleryDisplayConfig>('section_gallery_display', DEFAULT_GALLERY_DISPLAY);
}

export function useStylistsDisplayConfig() {
  return useSectionConfig<StylistsDisplayConfig>('section_stylists_display', DEFAULT_STYLISTS_DISPLAY);
}

export function useLocationsDisplayConfig() {
  return useSectionConfig<LocationsDisplayConfig>('section_locations_display', DEFAULT_LOCATIONS_DISPLAY);
}

export const DEFAULT_EXTENSION_REVIEWS: ExtensionReviewsConfig = {
  eyebrow: "Real Reviews",
  headline: "What our extension clients say",
  extension_categories: [
    "Blondes",
    "Dimensional Brunettes",
    "Vivid & Fashion Colors",
    "Warm Tones",
    "High Contrast",
  ],
  show_eyebrow: true,
  show_headline: true,
  show_categories: true,
};

export function useExtensionReviewsConfig() {
  return useSectionConfig<ExtensionReviewsConfig>('section_extension_reviews', DEFAULT_EXTENSION_REVIEWS);
}

// useWebsiteServicesData removed — services are now managed via useNativeServicesForWebsite hook
