import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';
import { useIsEditorPreview } from './useIsEditorPreview';
import { fetchSiteSetting, writeSiteSettingDraft } from '@/lib/siteSettingsDraft';

export type PopupAppearance = 'modal' | 'banner' | 'corner-card';
export type PopupTrigger = 'immediate' | 'delay' | 'exit-intent' | 'scroll';
export type PopupFrequency = 'once' | 'once-per-session' | 'daily' | 'always';
export type PopupAudience = 'all' | 'new-visitors-only';
export type PopupSurface = 'home' | 'services' | 'booking' | 'all-public';
export type FabPosition = 'bottom-right' | 'bottom-left';

export interface PromotionalPopupSettings {
  enabled: boolean;
  // Content
  headline: string;
  body: string;
  ctaAcceptLabel: string;
  ctaDeclineLabel: string;
  disclaimer?: string;
  imageUrl?: string;
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
}

export const DEFAULT_PROMO_POPUP: PromotionalPopupSettings = {
  enabled: false,
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
  fabPosition: 'bottom-right',
};

const SETTING_KEY = 'promotional_popup';

export function usePromotionalPopup(explicitOrgId?: string) {
  const orgId = useSettingsOrgId(explicitOrgId);
  const isPreview = useIsEditorPreview();
  const mode: 'live' | 'draft' = isPreview ? 'draft' : 'live';

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
