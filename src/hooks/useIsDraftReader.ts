/**
 * useIsDraftReader — single source of truth for "should this hook read
 * draft (unpublished) site_settings instead of live?"
 *
 * Background
 * ──────────
 * `site_settings` rows carry two payloads: `value` (live, public) and
 * `draft_value` (editor-only). Three surfaces exist:
 *
 *   1. Public visitors on the live site → `value`
 *   2. Live preview iframe inside the editor (`?preview=true`) → `draft_value`
 *   3. The editor surface itself (`/dashboard/...`) → `draft_value`
 *
 * Earlier code only checked surface (2) via `useIsEditorPreview`, so the
 * editor's own form fields rendered against LIVE data while the adjacent
 * iframe rendered DRAFT — producing confusing desync (e.g. the hero
 * background upload tile went blank after save because live `value` was
 * still empty, even though the draft already had the URL).
 *
 * This hook composes both signals. Use it for **every site_settings
 * read** that backs an editor form, and for the iframe-side renderers
 * that need to honor unpublished changes.
 *
 * What it does NOT replace
 * ────────────────────────
 * - Animation / popup-suppression checks ("am I in an iframe so I should
 *   freeze auto-rotation / suppress the popup") — those still call
 *   `useIsEditorPreview` directly because they care about the iframe,
 *   not draft data.
 */
import { useIsEditorPreview } from './useIsEditorPreview';
import { useIsEditorSurface } from './useIsEditorSurface';

export function useIsDraftReader(): boolean {
  const isPreview = useIsEditorPreview();
  const isEditorSurface = useIsEditorSurface();
  return isPreview || isEditorSurface;
}
