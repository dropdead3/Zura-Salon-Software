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
}

/**
 * Promote every divergent draft for the given org to live.
 *
 * Implemented client-side as a sequential loop because RLS already
 * restricts writes to org admins and the row count per org is small
 * (typically <30 settings rows). If we ever need atomicity across rows,
 * convert to a SECURITY DEFINER RPC.
 *
 * Returns the number of rows promoted.
 */
export async function publishSiteSettingsDrafts(orgId: string): Promise<number> {
  const { data: rows, error } = await supabase
    .from('site_settings')
    .select('id, value, draft_value')
    .eq('organization_id', orgId);

  if (error) throw error;
  if (!rows || rows.length === 0) return 0;

  let promoted = 0;
  for (const row of rows as Array<{ id: string; value: unknown; draft_value: unknown }>) {
    if (row.draft_value === null || row.draft_value === undefined) continue;
    if (JSON.stringify(row.draft_value) === JSON.stringify(row.value)) continue;

    const { error: updateErr } = await supabase
      .from('site_settings')
      .update({ value: row.draft_value as never })
      .eq('id', row.id)
      .eq('organization_id', orgId);

    if (updateErr) throw updateErr;
    promoted += 1;
  }
  return promoted;
}

/**
 * Discard all editor drafts for an org by copying live `value` back into
 * `draft_value`. Reverses unpublished changes without touching the live
 * site.
 */
export async function discardSiteSettingsDrafts(orgId: string): Promise<number> {
  const { data: rows, error } = await supabase
    .from('site_settings')
    .select('id, value, draft_value')
    .eq('organization_id', orgId);

  if (error) throw error;
  if (!rows || rows.length === 0) return 0;

  let reverted = 0;
  for (const row of rows as Array<{ id: string; value: unknown; draft_value: unknown }>) {
    if (JSON.stringify(row.draft_value) === JSON.stringify(row.value)) continue;

    const { error: updateErr } = await supabase
      .from('site_settings')
      .update({
        draft_value: row.value as never,
        draft_updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('organization_id', orgId);

    if (updateErr) throw updateErr;
    reverted += 1;
  }
  return reverted;
}

/**
 * Return the list of setting keys whose draft differs from live.
 * Used by the publish dialog's changelog summary.
 */
export async function listDirtyDrafts(orgId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('id, value, draft_value')
    .eq('organization_id', orgId);

  if (error) throw error;
  if (!data) return [];

  return (data as Array<{ id: string; value: unknown; draft_value: unknown }>)
    .filter(r => r.draft_value !== null && r.draft_value !== undefined)
    .filter(r => JSON.stringify(r.draft_value) !== JSON.stringify(r.value))
    .map(r => r.id);
}
