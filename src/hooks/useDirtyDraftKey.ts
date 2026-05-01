/**
 * useDirtyDraftKey — returns whether a specific site_settings key has an
 * unpublished draft (`draft_value IS DISTINCT FROM value`).
 *
 * Powers the small `DRAFT` indicator chip on editor inputs so operators
 * can tell at a glance which fields are queued for publish without
 * opening the publish-changes dialog. Re-uses the same `listDirtyDrafts`
 * RPC the publish dialog itself uses, so the two surfaces never disagree.
 *
 * Granularity
 * ───────────
 * Per-KEY, not per-FIELD. If any field inside `section_hero` is dirty,
 * every editor input bound to that key sees `isDirty=true`. Per-field
 * granularity would require shipping the live `value` payload alongside
 * the draft and diffing client-side — defer until operators ask for it.
 */
import { useQuery } from '@tanstack/react-query';
import { listDirtyDrafts } from '@/lib/siteSettingsDraft';
import { useSettingsOrgId } from './useSettingsOrgId';
import { useIsEditorSurface } from './useIsEditorSurface';

export function useDirtyDraftKeys(): { keys: Set<string>; isLoading: boolean } {
  const orgId = useSettingsOrgId();
  // Only the editor surface needs this signal. Public visitors and the
  // preview iframe should never trigger the RPC.
  const enabled = !!orgId && useIsEditorSurface();

  const query = useQuery({
    queryKey: ['site-settings-dirty-drafts', orgId],
    queryFn: async () => listDirtyDrafts(orgId!),
    enabled,
    // 30s — matches the project-wide query staleTime convention. Saves
    // refresh the cache via invalidation in the editor save flow, so
    // stale-while-revalidate is fine here.
    staleTime: 30_000,
  });

  return {
    keys: new Set(query.data ?? []),
    isLoading: query.isLoading,
  };
}

export function useIsKeyDirty(key: string): boolean {
  const { keys } = useDirtyDraftKeys();
  return keys.has(key);
}
