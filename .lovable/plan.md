## Problem

You're right — there is **no draft layer** in the current build. Every Save writes directly to live, and "Publish" only takes a checkpoint snapshot of the already-live state. The Live Preview iframe and the public site read from the same database row, so:

- Save in editor → instantly visible to public visitors
- Publish button → just creates a version snapshot for rollback (does **not** push anything live)
- Discard → restores from the most recent snapshot

This is the inverse of what the UX implies.

## Root cause (architecture)

`site_settings` table has a single `value jsonb` column per `(organization_id, id)`. Both the editor and the public site read/write that column.

```
Editor Save ──┐
              ├──► site_settings.value ◄──── Public site
Live Preview ─┘
```

What you actually want:

```
Editor Save ──► site_settings.draft_value ◄── Live Preview (preview=true)
                       │
                  Publish copies
                       ▼
                site_settings.value ◄──────── Public site
```

The same pattern applies to `website_pages`, `website_menus`, and the announcement bar — every config row currently has only one value column.

## Solution: dual-column draft/published model

### Phase 1 — Database migration (single source of truth)

Add `draft_value jsonb` to `site_settings`. Backfill `draft_value = value` so nothing breaks for existing orgs. Add `draft_updated_at` and `draft_updated_by` for audit + dirty detection.

```sql
ALTER TABLE site_settings
  ADD COLUMN draft_value jsonb,
  ADD COLUMN draft_updated_at timestamptz,
  ADD COLUMN draft_updated_by uuid REFERENCES auth.users(id);

UPDATE site_settings SET draft_value = value WHERE draft_value IS NULL;
```

Apply the same pattern to `website_menus` (it already has a `published_at` column — verify, then add `draft_items` if needed).

### Phase 2 — Hook split: `useDraft*` (writes) vs `usePublished*` (public reads)

Refactor `useSectionConfig` so:

- **Editor surfaces** read/write `draft_value` (fall back to `value` if `draft_value` is null).
- **Public site components** read `value` only.
- A new `useIsEditorPreview()` already exists — extend it so when true, the public components also read `draft_value` instead of `value`. This makes the live-preview iframe (already loaded with `?preview=true`) show drafts in real time.

Files affected:
- `src/hooks/useSectionConfig.ts` — split into `useSectionConfig` (writes draft) + `useSectionConfigPublic` (reads published or draft based on preview mode).
- `src/hooks/useWebsitePages.ts` — same split.
- `src/hooks/useWebsiteSettings.ts`, `useAnnouncementBar.ts`, `useSiteSettings.ts` — same split.
- `src/components/home/**` — leave unchanged; they call the same hook names which now route based on preview mode.

### Phase 3 — Publish becomes a real promotion

Rewrite `usePublishAll` to **copy `draft_value → value`** for every changed `site_settings` row in the org (and equivalent for `website_menus.draft → published`). Wrap in a transaction so partial publishes can't leave an inconsistent live site.

The version snapshot logic (`website_page_versions`, `website_site_versions`) stays — but now it snapshots the *newly-promoted* live state, which is what the History tab implies.

Add a server-side RPC `publish_website_drafts(org_id uuid)` to do the copy atomically with proper RLS bypass + audit.

### Phase 4 — Changelog becomes a real diff

`useChangelogSummary` currently lists every existing config row as "changed." Rewrite it to compare `draft_value` vs `value` per row and only surface true diffs. The Publish button's count/badge will then reflect actual unpublished changes.

### Phase 5 — Editor UX corrections

- **Save** label stays, but its tooltip becomes "Save draft (not yet live)."
- **Publish** dialog header changes from "Publish changes" to "Push N draft changes live."
- **Discard** in the editor toolbar becomes "Discard draft changes" and copies `value → draft_value` (revert draft to live), instead of restoring an old snapshot. The existing "restore from version history" stays available under the History panel.
- **Live Preview iframe** automatically shows drafts because it loads with `?preview=true` and the public components now branch on that flag.
- Add a small "Draft mode" badge to the live preview frame so you can visually confirm you're seeing unpublished work.

## Implementation order (incremental, each shippable)

1. **Migration only** — add columns, backfill. Zero behavior change. (5 min, reversible.)
2. **Public-site read split** — `useIsEditorPreview` branches reads. Editor still writes to `value`. Verifies the preview iframe data path works before flipping writes.
3. **Editor-write split** — flip all editor mutations to write `draft_value`. Save no longer affects public site. **This is the user-visible behavior change.**
4. **Publish RPC** — implement atomic `draft → live` promotion. Wire to existing Publish button.
5. **Changelog diff** — replace placeholder summary with real per-row diff.
6. **UX polish** — badges, copy, discard semantics.

After step 3 the user's reported bug is fixed; steps 4–6 complete the model.

## Files affected (estimate)

- 1 SQL migration
- 1 new edge function (`publish-website-drafts`)
- ~6 hook files refactored
- ~3 small UI text/badge tweaks in `WebsiteEditorShell.tsx`, `LivePreviewPanel.tsx`, `PublishChangelog.tsx`
- Zero changes to `src/components/home/**` section components (they keep calling the same hook names)

## Risks & mitigations

- **Existing orgs with no draft column data**: backfill `draft_value = value` covers this; new edits then diverge naturally.
- **Public site cache**: `value` queries already use `staleTime: 30s` — no cache key change needed since they still read the same column.
- **Race on publish**: handled by RPC + transaction.
- **Inline edit handler** (`InlineEditCommitHandler.tsx`) currently writes via `useSectionConfig.update` — once that hook flips to draft writes, inline edits become drafts automatically. No code change needed there.

## Out of scope (call out, don't ship in this wave)

- Per-section publish (publish only Hero, leave rest in draft) — the diff infrastructure makes this trivial later, but adds UX complexity now.
- Scheduled publish.
- Multi-author draft conflict resolution.

---

### Prompt feedback

**What worked well:** You diagnosed both the symptom *and* the architectural inversion in one paragraph ("save button is saving to the front end, not a preproduction version"). That's the highest-signal kind of bug report — it tells me whether to patch a button handler or rebuild a data layer. In this case, rebuild.

**Sharpening tip:** When you suspect an architectural problem (vs a bug), it's worth asking explicitly: *"Is there a draft layer at all, or am I editing live?"* — because the answer reframes the whole conversation. You did this implicitly; making it explicit would let me skip straight to "no, there isn't, here's how to add one" instead of confirming the absence first.

### Enhancement suggestions

1. **Draft autosave + recovery.** Once drafts exist, autosave every keystroke to `draft_value` (debounced 1s) and show "Draft saved 3s ago" in the toolbar. Removes the cognitive load of remembering to hit Save and provides crash-recovery for free.
2. **Preview-as-visitor toggle.** Add a "Public" toggle in the Live Preview header that flips the iframe between `?preview=true` (drafts) and the bare URL (published). Lets you confirm what visitors actually see before publishing — the gold-standard pattern from Webflow / Framer.
3. **Diff panel before publish.** When Publish is clicked, open a side-by-side diff of `draft_value` vs `value` per section ("Hero headline: 'Drop Dead Salon' → 'Drop Dead Hair Studio'"). Catches accidental publishes and is the doctrine-aligned visibility-contract surface for this action.
