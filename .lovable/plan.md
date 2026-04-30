# Website Publish UX — Sidebar Dot + Discard Changes

Three improvements to the publishing/versioning system shipped previously. Per-section restore is scoped but deferred per your instruction.

---

## 1. Sidebar unpublished-changes dot

Surface the same "you have unpublished work" signal on the **Website Hub** sidebar entry, so operators see pending work without entering the editor.

**Behavior**
- Small accent dot appears on the right side of the "Website Hub" nav row when `useChangelogSummary().hasChanges === true`.
- In collapsed sidebar mode, dot positions on the upper-right corner of the icon.
- Dot uses `bg-primary` with a soft pulse (re-uses existing pulse keyframes).
- Tooltip on hover (collapsed mode): "Unpublished website changes".
- Hides automatically once the operator publishes (the existing `usePublishAll` invalidates `page-versions` + `site-versions`, which feeds the summary).

**Implementation**
- Extend `NavItem` in `src/components/dashboard/CollapsibleNavGroup.tsx` with an optional `badgeIndicator?: ReactNode` slot (or `showDot?: boolean`) so this stays generic and doesn't hardcode "website" knowledge into the nav primitive.
- In `SidebarNavContent.tsx`, wrap the Website Hub nav item construction with a small subscriber component (or call `useChangelogSummary()` once at the top) and inject `showDot` onto the matching item before passing to `CollapsibleNavGroup`.
- Render the dot inside `NavLink` (both expanded + collapsed variants) and inside the popover row for grouped/collapsed mode.

**Why a generic prop, not a Website-specific hack:** other surfaces (Connect chat, Capital opportunities) already have or will want the same treatment — a generic `showDot` slot keeps the Canon Pattern intact.

---

## 2. "Discard changes" — revert to last published

Pair with the existing Restore flow. One click snapshots-then-restores the most recent **published** version of every page + site surface.

**Placement**
- In `WebsiteSettingsContent.tsx` editor toolbar, beside the existing **Publish Changes** + **History** buttons.
- Label: **Discard Changes**, ghost variant, destructive accent on hover.
- Disabled when `hasChanges === false`.

**Confirmation dialog**
- Title: *"Discard unpublished changes?"*
- Body: *"This will revert pages, theme, footer, and announcement bar to the last published version. A backup of the current state will be saved to History so you can recover it later."*
- Confirm CTA: **Discard & Restore**.

**Behavior (non-destructive — matches Restore doctrine)**
For every page and every site-wide surface (theme / footer / announcement_bar):
1. Save the **current live state** as a new version with `change_summary: "Pre-discard backup"` (so nothing is ever lost).
2. Look up the most recent version where `is_published === true` (or fallback: most recent version if no explicit published flag exists).
3. Write that snapshot back to live (`website_pages` / `site_settings`).
4. Append a new version entry with `change_summary: "Reverted to last published"` and `restored_from_version_id` pointing at the source.

**Hook**
- New `useDiscardToLastPublished()` in `src/hooks/usePublishChangelog.ts` (co-located with `usePublishAll` since it's the inverse operation).
- Reuses `useSavePageVersion`, `useRestorePageVersion`, `useSaveSiteVersion`, and a new `useRestoreSiteVersion` (mirroring page restore logic) inside `useSiteVersions.ts`.
- On success: toast `"Reverted to last published version. Backup saved to History."`, invalidate `page-versions`, `site-versions`, `site-settings`, `website-pages`.

**Edge case — nothing has ever been published**
- Disable the Discard button entirely, with tooltip: *"No published version yet — publish first to enable discard."*
- Detected via a new `useHasEverPublished()` selector that checks if any `website_page_versions` or `website_site_versions` row exists with a published marker.

---

## 3. Per-section restore — deferred (scoped only)

Per your instruction, **not building this now**. Captured here so it lands in the Deferral Register.

**What it would do:** in `VersionHistoryPanel`, allow restoring a single section (e.g. just "Hero") from a page version without touching other sections (testimonials, services, etc.) on that same page.

**Why deferred:**
- Requires a section-level diff engine — currently versions snapshot whole-page JSON.
- Requires UI to expand a version into its constituent sections with per-section "Restore this section" actions.
- Adds a new failure mode (section restored against an incompatible newer page schema) that needs a compatibility check.

**Revisit trigger:** first operator request OR when section-level versioning is needed by the theme system. Tracked in `mem://architecture/visibility-contracts.md` Deferral Register with trigger condition: *"Operator restores a full page version solely to recover one section, ≥2 occurrences."*

---

## Files touched

- `src/components/dashboard/CollapsibleNavGroup.tsx` — add optional `showDot` to `NavItem`, render in expanded + collapsed + popover variants.
- `src/components/dashboard/SidebarNavContent.tsx` — call `useChangelogSummary()`, inject `showDot` onto the Website Hub item.
- `src/hooks/usePublishChangelog.ts` — add `useDiscardToLastPublished` and `useHasEverPublished`.
- `src/hooks/useSiteVersions.ts` — add `useRestoreSiteVersion` (mirror of page restore).
- `src/components/dashboard/settings/WebsiteSettingsContent.tsx` — add "Discard Changes" button + confirmation dialog beside Publish/History.
- (No DB migration — existing `website_page_versions` + `website_site_versions` schema covers it.)

## Memory updates after build

- Append to Deferral Register: per-section restore + revisit trigger.
