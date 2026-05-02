/**
 * Promotional Popup Library — saved promo snapshots.
 *
 * Persists named snapshots of `PromotionalPopupSettings` so operators can
 * load previous offers, duplicate them, or rotate them without re-typing.
 *
 * Storage:
 *   - Stored as a single `site_settings` row keyed `promotional_popup_library`.
 *   - Goes through the standard draft → publish flow via `writeSiteSettingDraft`.
 *   - RLS already covers org-scoped reads/writes on `site_settings`.
 *
 * Doctrine:
 *   - Snapshots NEVER include `enabled`. Reloading a saved promo must not
 *     auto-publish it — the operator explicitly flips the toggle.
 *   - 25-snapshot cap to keep the JSONB row small. Operators are nudged to
 *     prune old offers; the cap is enforced silently at save time (oldest
 *     `updatedAt` is dropped if a save would push past 25). This is a
 *     low-cardinality feature; if we ever need >25, that's a signal to
 *     promote the library to its own table with a `library_entry_id` FK
 *     onto redemptions for per-promo performance attribution.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';
import { useIsDraftReader } from './useIsDraftReader';
import { fetchSiteSetting, writeSiteSettingDraft } from '@/lib/siteSettingsDraft';
import type { PromotionalPopupSettings } from './usePromotionalPopup';

export const SAVED_PROMO_CAP = 25;
const SETTING_KEY = 'promotional_popup_library';

/**
 * Snapshot config — the saved popup payload, with `enabled` stripped so a
 * reload can never auto-publish. Everything else (appearance, targeting,
 * style) is preserved so the operator gets the full setup back.
 */
export type SavedPromoConfig = Omit<PromotionalPopupSettings, 'enabled'>;

export interface SavedPromo {
  id: string;
  name: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  config: SavedPromoConfig;
  /** Set when the operator clicks Apply — drives the "Last used" caption. */
  lastAppliedAt?: string;
}

export interface PromoLibrary {
  saved: SavedPromo[];
}

const EMPTY_LIBRARY: PromoLibrary = { saved: [] };

/** Strips `enabled` from a popup snapshot. Pure — exported for testing. */
export function snapshotConfig(cfg: PromotionalPopupSettings): SavedPromoConfig {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { enabled, ...rest } = cfg;
  return rest;
}

/**
 * Enforces the 25-snapshot cap by dropping the oldest entries (by
 * `updatedAt`) until the list fits. Pure — exported for testing.
 */
export function enforceCap(saved: SavedPromo[], cap = SAVED_PROMO_CAP): SavedPromo[] {
  if (saved.length <= cap) return saved;
  const sortedNewestFirst = [...saved].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  return sortedNewestFirst.slice(0, cap);
}

/**
 * Read the saved-promo library for the current org. Mirrors
 * `usePromotionalPopup` mode resolution so the editor sees drafts and
 * public-side reads (which don't actually consume this setting) get live.
 */
export function usePromoLibrary(explicitOrgId?: string) {
  const orgId = useSettingsOrgId(explicitOrgId);
  const isDraftReader = useIsDraftReader();
  const mode: 'live' | 'draft' = isDraftReader ? 'draft' : 'live';

  return useQuery({
    queryKey: ['site-settings', orgId, SETTING_KEY, mode],
    queryFn: async () => {
      const value = await fetchSiteSetting<PromoLibrary>(orgId!, SETTING_KEY, mode);
      // Normalize: missing row = empty library, not error.
      if (!value || !Array.isArray(value.saved)) return EMPTY_LIBRARY;
      return value;
    },
    enabled: !!orgId,
  });
}

/**
 * Mutation factory. Returns helpers for the four operations the editor
 * needs: save (new), update (rename/notes), apply (stamp lastAppliedAt),
 * delete. All routes go through the same write so the cap is enforced
 * consistently and the cache invalidates once per change.
 */
export function usePromoLibraryActions(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId(explicitOrgId);

  const writeLibrary = useMutation({
    mutationFn: async (next: PromoLibrary) => {
      if (!orgId) throw new Error('No organization context');
      const { data: { user } } = await supabase.auth.getUser();
      const capped: PromoLibrary = { saved: enforceCap(next.saved) };
      await writeSiteSettingDraft(orgId, SETTING_KEY, capped, user?.id ?? null);
      return capped;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, SETTING_KEY] });
    },
  });

  return writeLibrary;
}
