# Wave 5 — Website Editor Polish

Address the seven priority issues from the audit. Scope is limited to the editor surface; no schema or routing changes.

## Changes

**1. Toolbar reflow** — `WebsiteEditorShell.tsx`
- Page picker: shrink min-width 160→140, max 260→220, add `shrink-0`.
- Breadcrumb: drop the redundant "Home" segment (page picker already shows it). Keep only the section name. Hide below `lg`. Add `min-w-0 flex-1` so it truncates instead of pushing siblings.
- Move `<SaveStatusPill>` from the left cluster to the right cluster, immediately before the Publish button — it visually qualifies the action it describes.

**2. De-duplicate canvas pane header** — `WebsiteEditorShell.tsx`
- Remove the `{sectionLabel}` strip (the small "Hero Section" caption above the editor card). The toolbar breadcrumb now carries that, and the EditorCard has its own large title.
- Keep only the sidebar collapse toggle in that strip; if showSidebar is true, render an empty 8px spacer instead of the full strip.

**3. Preview pane polish** — `WebsiteEditorShell.tsx` + `LivePreviewPanel.tsx`
- Increase default canvas pane size 30 → 38 so click-to-edit and the embedded `EditorSectionCard` controls are usable at common viewports.
- In the preview metadata strip, replace the raw URL line with the **path + host** only (e.g., `dropdeadsalons.com/` instead of the full UUID-bearing iframe URL). The full URL stays available via the existing copy/open buttons.
- Collapse the metadata strip from two lines to one when the displayUrl already encodes the channel (drops `Org route` redundancy when the host matches `previewOrigin`).

**4. Remove redundant sidebar page picker** — `WebsiteEditorSidebar.tsx`
- Remove the "EDITING PAGE" block (lines ~491–~530) including the Select, the `+` add-page button, and the template/delete chip row beneath. The toolbar picker is canonical (⌘K bound).
- Keep the small page-context label in the sidebar's "Pages" section header (it's already there in the navigation hierarchy below).
- The collapsed-rail variant of the sidebar already shows a page icon — leave that intact.

**5. Token-ize SaveStatusPill colors** — `WebsiteEditorShell.tsx`
- Replace raw `amber-*` and `emerald-*` Tailwind colors with semantic equivalents using existing CSS tokens: amber → `bg-warning/10 text-warning` (or `bg-accent/10` if `--warning` isn't defined; verify against `index.css` first); emerald → `bg-success/10 text-success` with same fallback. If tokens aren't defined, leave a TODO and use existing `text-muted-foreground`/`bg-muted` for the saved state and a single `text-primary`/`bg-primary/10` for dirty — keep within the design system.

**6. AI assistant (HelpFAB) bounds** — `HelpFAB.tsx`
- Hide the floating Z when the user is inside the Website Editor route (mirrors the existing Team Chat suppression). Detection: `location.pathname.includes('/website-hub')` AND query `?tab=editor` OR pathname includes `/website-editor`. Simpler: just match the website-hub admin route.

## What's NOT in this wave (deferred)

- Moving each per-editor "Reset" button (HeroEditor, BrandStatementEditor, etc.) into an overflow menu — would touch ~15 editor files and risks regressions. Reset already uses `variant="ghost"` so visual weight is low; revisit if user reports accidental clicks.
- Character counter inline placement (would require touching `CharCountInput`).

## Risk

- Sidebar page picker removal: ensure no other component dispatches via that Select. Verified — `onPageChange` is a passed prop only used by this Select. Toolbar picker covers the same flow.
- Default canvas pane 30→38 reduces editor pane width by ~8% — still above 30% min for editor pane (`minSize={30}`).

## Files touched

- `src/components/dashboard/website-editor/WebsiteEditorShell.tsx`
- `src/components/dashboard/website-editor/LivePreviewPanel.tsx`
- `src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx`
- `src/components/dashboard/HelpFAB.tsx`
