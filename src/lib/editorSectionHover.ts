/**
 * Sole owner of the `editor-section-hover` CustomEvent.
 *
 * Pattern: mirrors the CustomEvent Ownership canon — see
 * `src/lib/siteSettingsDraft.ts` and `src/lib/promoPopupPreviewReset.ts`.
 *
 * Why it exists: the website editor sidebar lists every section on a page.
 * Hovering a sidebar row should outline the matching section in the live
 * preview iframe so the operator can confirm "this row is that section"
 * before clicking. The preview lives in a cross-origin iframe, so the
 * hover signal can't reach it directly — it travels:
 *
 *   SectionNavItem (sidebar) ──onMouseEnter──▶ dispatchEditorSectionHover
 *      └─▶ window CustomEvent ('editor-section-hover')
 *           └─▶ LivePreviewPanel listener
 *                └─▶ iframe.postMessage({ type: 'PREVIEW_HOVER_SECTION', sectionId })
 *                     └─▶ PageSectionRenderer (in iframe) toggles .preview-hover on the section node
 *
 * Hover-end is the same payload with `sectionId: null` to clear.
 *
 * Only this module may construct the CustomEvent — enforced by the
 * `defineEventOwnershipSelector` entry in `eslint.helpers.js` and by the
 * banned-fixture meta-test under `src/test/lint-fixtures/`.
 */

import { dispatchOwnedEvent } from './eventOwnership';

export const EDITOR_SECTION_HOVER_EVENT = 'editor-section-hover';

export interface EditorSectionHoverDetail {
  /** Section id being hovered, or null to clear. */
  sectionId: string | null;
}

export function dispatchEditorSectionHover(
  detail: EditorSectionHoverDetail,
): void {
  dispatchOwnedEvent<EditorSectionHoverDetail>(
    EDITOR_SECTION_HOVER_EVENT,
    detail,
  );
}
