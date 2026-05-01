/**
 * Site Settings Draft Layer
 * ─────────────────────────
 * Every `site_settings` row has TWO payload columns:
 *
 *   value        ← what the public site reads (live)
 *   draft_value  ← what the editor reads / writes (unpublished)
 *
 * This module is the single choke point for both reads and writes so that
 * every hook (`useSectionConfig`, `useWebsitePages`, `useSiteSettings`,
 * `useAnnouncementBar`, etc.) stays in sync with the draft model.
 *
 * Reading rules:
 *   - Public rendering (visitor on the live site): always read `value`.
 *   - Editor surfaces & live-preview iframe: read `coalesce(draft_value, value)`.
 *
 * Writing rules:
 *   - Editor mutations write to `draft_value` only. The live site is NOT
 *     affected until `publishSiteSettingsDrafts` is called.
 */

import { supabase } from '@/integrations/supabase/client';
import { emitAmbientTelemetry } from './editor-telemetry';

export interface SiteSettingRow {
  /** Live-published value. Public site reads this. */
  value: unknown;
  /** Editor draft value. Falls back to `value` if null. */
  draft_value: unknown;
  draft_updated_at: string | null;
  updated_at: string;
}

/**
 * Resolve which payload to surface to the caller.
 *
 * @param row    The raw site_settings row.
 * @param mode   'live' for public rendering, 'draft' for editor / preview.
 */
export function resolveSettingValue<T>(
  row: { value: unknown; draft_value: unknown } | null | undefined,
  mode: 'live' | 'draft',
): T | null {
  if (!row) return null;
  if (mode === 'live') return (row.value ?? null) as T | null;
  // Draft mode: prefer draft_value, fall back to live value (for orgs
  // whose draft has never diverged from live).
  return ((row.draft_value ?? row.value) ?? null) as T | null;
}

/**
 * Fetch a single site_settings row scoped to an organization.
 * Returns the resolved payload according to `mode`.
 */
export async function fetchSiteSetting<T>(
  orgId: string,
  key: string,
  mode: 'live' | 'draft',
): Promise<T | null> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value, draft_value')
    .eq('id', key)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error) throw error;
  return resolveSettingValue<T>(data as { value: unknown; draft_value: unknown } | null, mode);
}

/**
 * Write an editor change. Only touches `draft_value`. The live `value`
 * column is left untouched until publish.
 */
export async function writeSiteSettingDraft(
  orgId: string,
  key: string,
  value: unknown,
  userId: string | null | undefined,
): Promise<void> {
  // Read-then-update/insert pattern (project canon: site_settings writes
  // must use this pattern, never raw upsert with conflict_target).
  const { data: existing } = await supabase
    .from('site_settings')
    .select('id, value')
    .eq('id', key)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('site_settings')
      .update({
        draft_value: value as never,
        draft_updated_at: new Date().toISOString(),
        draft_updated_by: userId ?? null,
        updated_by: userId ?? null,
      })
      .eq('id', key)
      .eq('organization_id', orgId);
    if (error) throw error;
    broadcastDraftWrite(orgId, key);
    return;
  }

  // No row exists yet — seed only the DRAFT side. Leaving `value = null`
  // ensures the publish dialog correctly reports this as a pending change
  // (draft_value !== value), and the public site will simply have no row
  // until the operator clicks Publish.
  const { error } = await supabase
    .from('site_settings')
    .insert({
      id: key,
      organization_id: orgId,
      value: null as never,
      draft_value: value as never,
      draft_updated_at: new Date().toISOString(),
      draft_updated_by: userId ?? null,
      updated_by: userId ?? null,
    });
  if (error) throw error;
  broadcastDraftWrite(orgId, key);
}

/**
 * Broadcast a draft-write notification so the live preview iframe (and any
 * other listener in the parent window) can refresh in real time without a
 * full reload.
 *
 * - Parent window: dispatches a `site-settings-draft-write` CustomEvent
 *   that LivePreviewPanel forwards into the iframe via postMessage.
 * - Iframe context: posts up to parent (no-op if same window).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EVENT OWNERSHIP CONTRACT — DO NOT VIOLATE
 * ─────────────────────────────────────────────────────────────────────────
 * This module is the **sole owner** of the `site-settings-draft-write`
 * event. Every dispatch MUST originate from a real write path here
 * (`writeSiteSettingDraft`, `publishSiteSettingsDrafts`, `discardSiteSettingsDrafts`)
 * and MUST carry properly scoped `{orgId, key}` detail.
 *
 * Do NOT re-dispatch this event from `triggerPreviewRefresh()` or any other
 * helper. Doing so produces empty-detail dispatches that fall into the
 * iframe's broad invalidation branch (`['site-settings']`) and create a
 * post-save refetch race that snaps editor forms back to defaults. See the
 * regression test in `useHydratedFormState.test.tsx`
 * ("survives a post-save broad-invalidation refetch race").
 *
 * If you need to nudge the preview without a real write (e.g. theme swap
 * preview), call `triggerPreviewRefresh()` from `@/lib/preview-utils` —
 * it dispatches `website-preview-refresh` only.
 */
function broadcastDraftWrite(orgId: string, key: string): void {
  if (typeof window === 'undefined') return;
  emitAmbientTelemetry('draft-write-broadcast', { orgId, key });
  try {
    // eslint-disable-next-line no-restricted-syntax -- This module is the canonical owner of `site-settings-draft-write`. See doctrine in mem://architecture/site-settings-event-ownership.md.
    window.dispatchEvent(
      new CustomEvent('site-settings-draft-write', { detail: { orgId, key } }),
    );
  } catch {
    /* SSR / non-DOM env */
  }
}

/**
 * Promote every divergent draft for the given org to live in a SINGLE
 * transaction via the `publish_site_settings_drafts` RPC (SECURITY
 * DEFINER, jsonb-DISTINCT comparison — order-insensitive). Atomic: a
 * mid-publish failure leaves the org untouched, never half-published.
 *
 * Returns the number of rows promoted.
 */
export async function publishSiteSettingsDrafts(orgId: string): Promise<number> {
  const { data, error } = await supabase.rpc('publish_site_settings_drafts', {
    _org_id: orgId,
  });
  if (error) throw error;
  // Tell the live preview iframe (and any other listener) to refresh
  // every site-settings query for this org — values may have changed.
  if (typeof window !== 'undefined') {
    try {
      // eslint-disable-next-line no-restricted-syntax -- Canonical owner; see doctrine.
      window.dispatchEvent(
        new CustomEvent('site-settings-draft-write', { detail: { orgId, key: null } }),
      );
    } catch { /* SSR */ }
  }
  return (data as number | null) ?? 0;
}

/**
 * Discard all editor drafts for an org by copying live `value` back into
 * `draft_value`. Reverses unpublished changes without touching the live
 * site. Atomic via RPC.
 */
export async function discardSiteSettingsDrafts(orgId: string): Promise<number> {
  const { data, error } = await supabase.rpc('discard_site_settings_drafts', {
    _org_id: orgId,
  });
  if (error) throw error;
  // Broadcast a draft-wide refresh so the editor + preview re-read the
  // reverted draft state without a full reload.
  if (typeof window !== 'undefined') {
    try {
      // eslint-disable-next-line no-restricted-syntax -- Canonical owner; see doctrine.
      window.dispatchEvent(
        new CustomEvent('site-settings-draft-write', { detail: { orgId, key: null } }),
      );
    } catch { /* SSR */ }
  }
  return (data as number | null) ?? 0;
}

/**
 * Return the list of setting keys whose draft differs from live.
 * Uses `IS DISTINCT FROM` on jsonb server-side, which is order-insensitive
 * (fixes the JSON.stringify ordering false-positive).
 */
export async function listDirtyDrafts(orgId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('list_dirty_site_setting_drafts', {
    _org_id: orgId,
  });
  if (error) throw error;
  return ((data ?? []) as Array<{ setting_id: string }>).map(r => r.setting_id);
}
