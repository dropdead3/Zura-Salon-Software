## Website Publish & Version History

Add a clear "Publish Changes" action and full version history (with non-destructive restore) to the Website Hub editor, covering both pages and theme/site-level settings.

### Why this matters

Today the editor saves changes immediately to the live site with no separation between draft and published, and no way to undo a bad edit. Operators editing a public storefront need:
- A clear moment to publish (with a summary of what's changing)
- A safety net to roll back if something breaks
- Confidence that no past version is ever lost

### What you'll see in the UI

**Editor toolbar** (top-right, next to "Open Site"):
- `History` button — opens a slide-in panel listing the last 20 versions
- `Publish Changes` button — primary CTA, shows a small dot when there are unpublished changes; opens the existing changelog dialog

**Version History panel** (slide-in from right):
- Grouped by surface: **Pages**, **Theme**, **Footer**, **Announcement Bar**
- Each version row shows: version number, timestamp, who saved it, change summary
- `Restore` button on each row → confirmation dialog → applies snapshot to the live site
- Restoring v3 doesn't delete v4–v7. It creates a new v8 marked "Restored from v3" so the audit trail stays intact and you can undo the restore.

```text
┌─ Version History ──────────────────────┐
│ Page: Home                             │
│ ────────────────────────────────────── │
│ v8 · just now · "Restored from v3"     │
│ v7 · 2h ago  · Edited hero headline    │
│ v6 · 1d ago  · Updated testimonials    │
│ v3 · 3d ago  · Initial setup [Restore] │
└────────────────────────────────────────┘
```

### Scope of versioning

**Page-level** (already exists, just needs to be exposed):
- Each page snapshot stored in `website_page_versions`

**Site-level / Theme** (new in this wave):
- Theme + colors + typography
- Footer config
- Announcement bar
- Navigation menus (publish flow already exists)

A new table `website_site_versions` mirrors the page versions pattern but stores org-scoped snapshots of these site-wide configs.

### Restore behavior (non-destructive)

```text
Before restore:  v1 → v2 → v3 → v4 → v5 → v6 (live)
User restores v3
After restore:   v1 → v2 → v3 → v4 → v5 → v6 → v7 (live, snapshot of v3)
```

Nothing is deleted. Restore is itself a versioned action. You can restore the restore.

---

### Technical details

**Backend (1 new table + 1 column):**
- New table `website_site_versions` with columns: `id`, `organization_id`, `surface` (enum: `theme` | `footer` | `announcement_bar`), `version_number`, `snapshot` (jsonb), `status`, `saved_by`, `saved_at`, `change_summary`, `restored_from_version_id` (nullable). RLS scoped to `organization_id` via existing `is_org_member` / `is_org_admin` helpers.
- Add `restored_from_version_id uuid` column to `website_page_versions` to track restore lineage.

**Frontend hooks (extend existing + new):**
- Extend `useRestorePageVersion` in `src/hooks/usePageVersions.ts` so it actually writes the snapshot back via the existing page mutation, then inserts a new version row marked with `restored_from_version_id`.
- New `src/hooks/useSiteVersions.ts` with `useSiteVersions(surface)`, `useSaveSiteVersion`, `useRestoreSiteVersion`.
- New `src/hooks/useUnpublishedChangesCount.ts` — derives a badge count by comparing latest saved version to current draft state for pages + site surfaces.
- `usePublishAll` in `usePublishChangelog.ts` extended to also snapshot theme/footer/announcement bar surfaces.

**Frontend components (new):**
- `src/components/dashboard/website-editor/VersionHistoryPanel.tsx` — slide-in using `PremiumFloatingPanel` (per Drawer Canon). Tabbed by surface (Pages / Theme / Footer / Announcement Bar). Page tab has a sub-selector for which page.
- `src/components/dashboard/website-editor/RestoreConfirmDialog.tsx` — small confirm dialog showing "This will restore [surface] to v3 (saved 3 days ago by Jane). Your current version will be preserved as v8."

**Files modified:**
- `src/components/dashboard/settings/WebsiteSettingsContent.tsx` — add `History` and `Publish Changes` buttons to toolbar (both editor mode and overview mode); render `VersionHistoryPanel` and `PublishChangelog`.
- `src/hooks/usePublishChangelog.ts` — extend `useChangelogSummary` and `usePublishAll` to include theme/footer/announcement bar diffs.
- `src/hooks/usePageVersions.ts` — complete `useRestorePageVersion` write-back.

### Doctrine alignment

- **Site Settings Persistence**: restore writes use the existing read-then-update pattern via the page/theme/footer mutations.
- **Drawer Canon**: history panel uses `PremiumFloatingPanel` (no raw `Sheet`).
- **Tenant isolation**: new `website_site_versions` table has RLS keyed to `organization_id` — no `USING (true)`.
- **Signal preservation**: snapshots are full JSON copies; no defaults or fallbacks.
- **Visibility contracts**: when there are zero unpublished changes, the dot badge is silent (not "0").
- **Audit trail**: `restored_from_version_id` makes restores fully traceable.

### Out of scope (deferred)

- **Scheduled publish** (publish at 9am tomorrow): future wave. Tracked in Deferral Register with revisit trigger "operator requests scheduled publishing."
- **Per-section versioning** (restore just the hero, not the whole page): future wave.
- **Branching / staging environments**: not in scope.

### Acceptance criteria

1. Editor toolbar shows `History` and `Publish Changes` buttons.
2. Publish dialog lists pending page + theme + footer + announcement bar changes; clicking Publish snapshots all of them.
3. History panel lists versions per surface, last 20 each, ordered newest first.
4. Restore button writes the snapshot to the live config AND creates a new version row marked with `restored_from_version_id`.
5. Restoring a version does not delete any newer versions.
6. The dot badge on `Publish Changes` only appears when there is at least one unsaved diff.
7. RLS prevents any cross-org access to `website_site_versions`.
