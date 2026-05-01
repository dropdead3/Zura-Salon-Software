import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';
import { useIsEditorPreview } from './useIsEditorPreview';
import { fetchSiteSetting, writeSiteSettingDraft } from '@/lib/siteSettingsDraft';
import { useIsEditorSurface } from './useIsEditorSurface';

export type PopupAppearance = 'modal' | 'banner' | 'corner-card';
export type PopupTrigger = 'immediate' | 'delay' | 'exit-intent' | 'scroll';
export type PopupFrequency = 'once' | 'once-per-session' | 'daily' | 'always';
export type PopupAudience = 'all' | 'new-visitors-only';
export type PopupSurface = 'home' | 'services' | 'booking' | 'all-public';
export type FabPosition = 'bottom-right' | 'bottom-left';
/** Curated companion glyph for the eyebrow tag. `none` hides the icon. */
export type EyebrowIcon = 'none' | 'zap' | 'gift' | 'clock' | 'sparkles';
/** Per-layout image treatment.
 *  - `cover`: full-width image strip above the headline (default).
 *  - `side`: image rendered as a left rail on modal (ignored on corner-card).
 *  - `hidden-on-corner`: image shown on modal/banner but hidden on corner-card,
 *    where vertical room is the tightest. */
export type ImageTreatment = 'cover' | 'side' | 'hidden-on-corner';
/** Where the Claim Offer CTA sends the visitor.
 *  - `booking`: deep-links into the public booking surface with the promo code attached.
 *  - `consultation`: same as booking but flips on `?consultation=true` so the booking
 *    surface gates the visitor through a consultation step. Only valid when the org
 *    has set `newClientPolicy === 'consultation-required'` on its Booking Surface config.
 *  - `custom-url`: external destination (https/tel/mailto). Operator authors a short
 *    instructions string that surfaces inline within the popup so the visitor knows
 *    what to do once they arrive (e.g. "Mention code FREEHAIR on the call"). */
export type PopupAcceptDestination = 'booking' | 'consultation' | 'custom-url';

export interface PromotionalPopupSettings {
  enabled: boolean;
  // Content
  /** Small uppercase tag rendered above the headline. Optional — empty
   *  string hides the eyebrow row entirely. */
  eyebrow?: string;
  /** Companion glyph rendered to the left of the eyebrow text. */
  eyebrowIcon?: EyebrowIcon;
  headline: string;
  body: string;
  ctaAcceptLabel: string;
  ctaDeclineLabel: string;
  disclaimer?: string;
  imageUrl?: string;
  /** Accessible alt text for the image. When omitted the image is treated as
   *  decorative (`alt=""`). Operators should set this for booking-page SEO and
   *  screen-reader users. */
  imageAlt?: string;
  /** How the image renders per layout. Defaults to `cover`. */
  imageTreatment?: ImageTreatment;
  // Offer
  offerCode: string;
  // Behavior
  appearance: PopupAppearance;
  trigger: PopupTrigger;
  triggerValueMs?: number;
  // Targeting
  showOn: PopupSurface[];
  audience: PopupAudience;
  // Schedule (ISO strings; null/empty = no bound)
  startsAt?: string | null;
  endsAt?: string | null;
  // Frequency cap
  frequency: PopupFrequency;
  // Style
  accentColor?: string;
  // Identifies which curated preset (e.g. 'house' / 'high-contrast' / 'soft-neutral')
  // produced `accentColor`. Stored separately so the editor can re-highlight the
  // correct chip even after a theme change shifts the underlying hex value.
  // `null` / undefined = custom or untracked color.
  accentPresetKey?: string | null;
  // Re-entry FAB after dismissal
  fabPosition?: FabPosition;
  // Accept-CTA destination
  /** Where Claim Offer sends the visitor. Defaults to `booking` (legacy behavior). */
  acceptDestination?: PopupAcceptDestination;
  /** External URL when `acceptDestination === 'custom-url'`. Must start with
   *  `https://`, `tel:`, or `mailto:`. Validated at the editor + accept time. */
  customUrl?: string;
  /** Short operator-authored instructions surfaced beneath the CTA when the
   *  destination is `custom-url`. Lets the visitor know what to do at the
   *  destination (e.g. "Mention code FREEHAIR when you call"). */
  customUrlInstructions?: string;
  /** Auto-minimize the popup into the FAB after this many ms of no interaction.
   *  Default 15000. Range 5000–60000. Set to `null` to disable auto-minimize
   *  (popup stays open until the visitor explicitly closes it). */
  autoMinimizeMs?: number | null;
}

export const DEFAULT_PROMO_POPUP: PromotionalPopupSettings = {
  enabled: false,
  eyebrow: 'Limited time offer',
  eyebrowIcon: 'zap',
  headline: 'Free Haircut with Any Color Service',
  body: 'Book a color appointment this month and your haircut is on us.',
  ctaAcceptLabel: 'Claim Offer',
  ctaDeclineLabel: 'No thanks',
  disclaimer: 'New clients only. Cannot be combined with other offers. Mention code at booking.',
  offerCode: '',
  appearance: 'modal',
  trigger: 'delay',
  triggerValueMs: 10000,
  showOn: ['home'],
  audience: 'all',
  startsAt: null,
  endsAt: null,
  frequency: 'once-per-session',
  imageTreatment: 'cover',
  fabPosition: 'bottom-right',
  acceptDestination: 'booking',
  customUrl: '',
  customUrlInstructions: '',
};

const SETTING_KEY = 'promotional_popup';

/**
 * Reads the promotional popup config.
 *
 * Mode resolution:
 *   - Public visitor (no `?preview=true`): always reads `live` (published).
 *   - Editor surfaces & live-preview iframe: reads `draft`. Editors must
 *     read drafts so the toggle/form state matches what the preview is
 *     rendering — otherwise the editor reflects the published state while
 *     the iframe shows the draft, and the operator sees a desynced UI
 *     (e.g. toggle OFF but popup still visible because draft was enabled
 *     in a prior session and live has since been republished).
 *   - Callers that explicitly need the live copy (e.g. publish-changelog
 *     diffing) can pass `forceMode='live'`.
 */
export function usePromotionalPopup(
  explicitOrgId?: string,
  options?: { forceMode?: 'live' | 'draft' },
) {
  const orgId = useSettingsOrgId(explicitOrgId);
  const isPreview = useIsEditorPreview();
  const isEditorSurface = useIsEditorSurface();
  const mode: 'live' | 'draft' =
    options?.forceMode ?? (isPreview || isEditorSurface ? 'draft' : 'live');

  return useQuery({
    queryKey: ['site-settings', orgId, SETTING_KEY, mode],
    queryFn: async () => {
      const value = await fetchSiteSetting<PromotionalPopupSettings>(
        orgId!,
        SETTING_KEY,
        mode,
      );
      // Silence is valid output. Return null when nothing's configured so the
      // public component can render nothing instead of a default offer.
      return value ?? null;
    },
    enabled: !!orgId,
  });
}

export function useUpdatePromotionalPopup(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId(explicitOrgId);

  return useMutation({
    mutationFn: async (value: PromotionalPopupSettings) => {
      if (!orgId) throw new Error('No organization context');
      const { data: { user } } = await supabase.auth.getUser();
      // writeSiteSettingDraft enforces the read-then-update/insert pattern
      // that site_settings mutations must follow.
      await writeSiteSettingDraft(orgId, SETTING_KEY, value, user?.id ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, SETTING_KEY] });
    },
  });
}

/**
 * Validates whether a popup config should be presented to a visitor right now.
 * Pure function — call from the public component on every render.
 */
export function isPopupActive(
  cfg: PromotionalPopupSettings | null | undefined,
  surface: PopupSurface,
  now: Date = new Date(),
): boolean {
  if (!cfg || !cfg.enabled) return false;
  if (!cfg.showOn.includes(surface) && !cfg.showOn.includes('all-public')) return false;
  if (cfg.startsAt && new Date(cfg.startsAt) > now) return false;
  if (cfg.endsAt && new Date(cfg.endsAt) < now) return false;
  return true;
}
