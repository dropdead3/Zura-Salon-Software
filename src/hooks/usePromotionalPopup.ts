import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';
import { useIsEditorPreview } from './useIsEditorPreview';
import { useIsDraftReader } from './useIsDraftReader';
import { fetchSiteSetting, writeSiteSettingDraft } from '@/lib/siteSettingsDraft';
import type { PromoExperimentConfig } from '@/lib/promo-experiment';

export type PopupAppearance = 'modal' | 'banner' | 'corner-card';
export type PopupTrigger = 'immediate' | 'delay' | 'exit-intent' | 'scroll';
export type PopupFrequency = 'once' | 'once-per-session' | 'daily' | 'always';
export type PopupAudience = 'all' | 'new-visitors-only';
export type PopupSurface = 'home' | 'services' | 'booking' | 'all-public';
export type FabPosition = 'bottom-right' | 'bottom-left';
/** Curated companion glyph for the eyebrow tag. `none` hides the icon. */
export type EyebrowIcon = 'none' | 'zap' | 'gift' | 'clock' | 'sparkles' | 'scissors';
/** @deprecated Cross-surface image treatment — kept as legacy fallback only.
 *  Replaced by the per-surface pair `modalImageLayout` + `cornerCardImage`,
 *  which avoid phantom-equivalent options (e.g. on the modal, both `cover`
 *  and `hidden-on-corner` rendered identically — only the corner card differed).
 *  Existing rows still set `imageTreatment` and the resolver below maps it.
 *  - `cover`: full-width image strip above the headline.
 *  - `side`: image rendered as a left rail on modal (ignored on corner-card).
 *  - `hidden-on-corner`: image shown on modal/banner but hidden on corner-card. */
export type ImageTreatment = 'cover' | 'side' | 'hidden-on-corner';
/** Modal-only layout for the image. `cover` = full-width strip above the headline.
 *  `side` = left rail. */
export type ModalImageLayout = 'cover' | 'side';
/** Corner-card image visibility. `show` = top strip; `hide` = no image (the corner
 *  card is the smallest surface, and many operators want it text-only). */
export type CornerCardImage = 'show' | 'hide';
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
  /** @deprecated Use `modalImageLayout` + `cornerCardImage` instead. Kept for
   *  back-compat reads of existing rows. The resolver `resolveImageRender`
   *  maps this onto the new per-surface fields when they are absent. */
  imageTreatment?: ImageTreatment;
  /** Modal layout for the image (cover strip vs left rail). Optional; falls
   *  back to mapping the legacy `imageTreatment`. */
  modalImageLayout?: ModalImageLayout;
  /** Corner-card image visibility. Optional; falls back to mapping the legacy
   *  `imageTreatment`. */
  cornerCardImage?: CornerCardImage;
  /** Focal point as percentages 0..100 — drives CSS `object-position` on
   *  every image render site (modal side rail, modal top strip, corner-card
   *  top strip). Defaults to 50/50 (center). */
  imageFocalX?: number;
  imageFocalY?: number;
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
  /** Optional value-anchor chip rendered between the headline and body in the
   *  modal variant (e.g. "$45 value", "Save 30%", "Limited to 10 bookings").
   *  Empty/undefined hides the chip — silence is valid. */
  valueAnchor?: string;
  /** Scheduled rotation queue. When an entry's window covers `now`, the
   *  saved snapshot it references swaps in over the base config (content +
   *  styling fields only — `enabled` and `schedule` itself remain on the
   *  wrapper). Empty / undefined = base config always wins. Pure resolver
   *  in `@/lib/promo-schedule.ts`. */
  schedule?: SavedPromoScheduleEntry[];
  /** A/B experiment config. When `enabled`, each visitor is deterministically
   *  bucketed into one variant whose saved snapshot supplies the creative.
   *  Schedule rotation takes priority — experiments only run while no
   *  rotation window is active. Pure resolver in `@/lib/promo-experiment.ts`. */
  experiment?: PromoExperimentConfig;
  /** Goal-based auto-suppression (PR 4). When set, the lifecycle hook
   *  reads the live confirmed-redemption count for `offerCode` and
   *  suppresses the popup for new visitors once the cap or deadline is
   *  hit. Soft suppression — `enabled` and the rest of the config stay
   *  as-is so operators can raise the cap to re-arm without losing
   *  schedule / experiment state. Pure resolver in `@/lib/promo-goal.ts`. */
  goal?: import('@/lib/promo-goal').PromoGoal;
}

export type { PromoExperimentConfig, PromoExperimentVariant } from '@/lib/promo-experiment';

/** One queued rotation entry. References a `SavedPromo.id` from the library. */
export interface SavedPromoScheduleEntry {
  /** Stable id (uuid) — used for React keys and edits. */
  id: string;
  /** `SavedPromo.id` from `usePromoLibrary`. The resolver looks up the
   *  snapshot at runtime so a renamed/edited library entry always wins. */
  savedPromoId: string;
  /** Optional human label — defaults to the saved-promo name in the UI. */
  label?: string;
  /** ISO timestamps. Both required: a scheduled rotation must have a bound
   *  window (Signal Preservation: an open-ended schedule entry conflicts with
   *  the base config in a way that's indistinguishable from "no schedule"). */
  startsAt: string;
  endsAt: string;
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
  modalImageLayout: 'cover',
  cornerCardImage: 'show',
  imageFocalX: 50,
  imageFocalY: 50,
  fabPosition: 'bottom-right',
  acceptDestination: 'booking',
  customUrl: '',
  customUrlInstructions: '',
  autoMinimizeMs: 15000,
  valueAnchor: '$45 value',
};

/**
 * Pure resolver for "what should the popup render for the image, per surface".
 *
 * Two-tier read:
 *   1. New per-surface fields win when present (`modalImageLayout`,
 *      `cornerCardImage`).
 *   2. Otherwise, map the legacy `imageTreatment` onto the per-surface fields:
 *        - `'cover'`            → modal=cover, corner=show
 *        - `'side'`             → modal=side,  corner=show
 *        - `'hidden-on-corner'` → modal=cover, corner=hide
 *      (The legacy `'hidden-on-corner'` value never controlled the modal —
 *       it always rendered as a top strip there. This is the migration shim;
 *       once an editor save writes the new fields, the legacy value is ignored.)
 *
 * `imageUrl` is the master kill switch: no URL → no image anywhere, regardless
 * of layout choice.
 */
export function resolveImageRender(
  cfg: Pick<PromotionalPopupSettings, 'imageUrl' | 'imageTreatment' | 'modalImageLayout' | 'cornerCardImage'>,
): { modal: 'cover' | 'side' | 'none'; cornerCard: 'top' | 'none' } {
  if (!cfg.imageUrl) return { modal: 'none', cornerCard: 'none' };

  const legacy = cfg.imageTreatment;
  const modal: 'cover' | 'side' =
    cfg.modalImageLayout
      ?? (legacy === 'side' ? 'side' : 'cover');
  const cornerCard: 'top' | 'none' =
    cfg.cornerCardImage
      ? (cfg.cornerCardImage === 'show' ? 'top' : 'none')
      : (legacy === 'hidden-on-corner' ? 'none' : 'top');

  return { modal, cornerCard };
}

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
  // `isPreview` (iframe-only) is preserved for the popup-suppression flag
  // returned below — we mute the auto-open inside the iframe so operators
  // can edit copy without it cycling. The mode decision composes both
  // signals via the centralized draft-reader hook.
  const isPreview = useIsEditorPreview();
  const isDraftReader = useIsDraftReader();
  const mode: 'live' | 'draft' =
    options?.forceMode ?? (isDraftReader ? 'draft' : 'live');

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
