# Live edit preview — show unsaved changes in the canvas

## What's actually happening today (you were right to flag it)

Two facts that together cause the confusion:

1. **The "Live Preview" iframe loads `/org/<slug>/<page>?preview=true`** — i.e. the real public site. Today the `?preview=true` flag does nothing; no consumer reads it.
2. **The public site reads `site_settings` directly** (e.g. `HeroSection` → `useHeroConfig()` → `site_settings` table). There's no published-snapshot indirection. `usePublishAll` writes *version snapshots* for history/rollback, but the live site never reads those — it always reads draft.

Net effect: the iframe shows the **last-saved** state of *the draft* (which is also the live public state). What it does NOT show is **in-progress, not-yet-saved** edits. So while you type in HeroEditor, the canvas sits frozen until you hit Save Draft. That's the "confusing for editing" moment.

(Side note: we should revisit whether Publish should snapshot OR gate. Today it's just history. That's a separate doctrine question — not part of this fix.)

## Goal

Make the canvas reflect what you're editing **right now**, not what's saved. Two acceptable strategies:

- **A. Live-edit bridge (postMessage):** broadcast the editor's in-memory state to the iframe; the public page merges it into local state when running in `?preview=true` mode. Cheap, surgical, ships in one pass.
- **B. In-app canvas renderer:** mount the actual section components inside the editor, fed directly from in-memory state. True WYSIWYG with no iframe round-trip. Larger refactor; revisit when we ship per-section drag/drop.

**Recommendation: A now.** It solves the reported pain in a day, doesn't disturb the public-site rendering path, and the bridge stays useful even after a future B-style canvas exists (you'd reuse the same merge layer for hover-to-highlight, click-to-select, etc.).

## Plan (Strategy A)

### 1. New hook: `usePreviewBridge(sectionKey, localValue)` — `src/hooks/usePreviewBridge.ts`

Fires on every edit, debounced ~150ms, while running inside the editor:

```ts
window.parent === window
  ? null  // not in an iframe — no-op
  : (iframe-side: subscribe to messages and merge)
```

Editor side: posts `{ type: 'EDITOR_LIVE_UPDATE', sectionKey, value, orgId, nonce }` to the iframe's `contentWindow` whenever `localValue` changes. Origin pinned to the iframe's origin.

### 2. New hook on the public side: `useLiveOverride<T>(sectionKey, dbValue)` — same file

In `useSectionConfig`'s consumers (Hero, Brand, Footer, etc.), wrap the returned data:

```ts
const dbConfig = useHeroConfig();
const config = useLiveOverride('website_hero', dbConfig.data);
```

The hook:
- Returns `dbValue` as-is unless `?preview=true` is in the URL AND the parent window posted a matching `EDITOR_LIVE_UPDATE`.
- Validates origin and orgId against current `OrganizationContext` to prevent cross-org leakage.
- Holds the override in component state; clears on unmount or when sectionKey changes.

This means the public page *renders unchanged for visitors* — overrides only activate inside the editor's iframe.

### 3. Wire it into the editors that ship today

Phase 1 (this PR) — the four highest-friction ones the user is most likely editing:
- `HeroEditor` → `usePreviewBridge('website_hero', localConfig)`
- `BrandStatementEditor` → `usePreviewBridge('website_brand_statement', localConfig)`
- `FooterEditor` → `usePreviewBridge('website_footer', localConfig)`
- `AnnouncementBarContent` → `usePreviewBridge('announcement_bar', localConfig)`

Phase 2 (follow-up) — the rest of the section editors. Same one-line pattern.

### 4. Wire the matching consumers on the public side

For each section above, the public component already calls a `useXxxConfig()` hook. Add a single line in each:

```ts
const { data } = useHeroConfig();
const live = useLiveOverride('website_hero', data);  // ← only line added
// use `live` instead of `data` below
```

### 5. Visual cue: "Editing live" badge in the preview toolbar

In `LivePreviewPanel.tsx`, when there's an active `editor-dirty-state` true, swap the existing "Live Preview" label for **"Editing — unsaved"** (warning tone) and pulse the dot. Reuses existing `editor-dirty-state` event you already listen to in the shell. Removes the cognitive split between "what I'm editing" vs "what's in the iframe."

### 6. Reset bridge on Save / Discard

When Save Draft completes, the iframe's local override gets superseded by a fresh DB read (TanStack invalidation already happens in `useSectionConfig`). That's automatic. But for cleanliness: post `{ type: 'EDITOR_LIVE_CLEAR', sectionKey }` after a successful save so the iframe drops its override and re-renders from DB. Prevents stale overrides on multi-edit sessions.

## Security & correctness rules

- **Origin pinning:** editor sends only to `iframeRef.current.contentWindow` with the iframe's `previewOrigin`; iframe verifies `event.origin === window.location.origin` (always same-origin in our setup) before merging.
- **Tenant isolation:** every message includes `orgId`; iframe drops the message if `orgId !== currentOrg.id`. Matches our Core: "Strict tenant isolation."
- **Preview-mode gate:** `useLiveOverride` is a no-op unless `URLSearchParams.get('preview') === 'true'`. Visitors of the live site cannot be poisoned by a stray postMessage from a malicious tab.
- **No DB writes:** the bridge never persists. Refresh = back to DB state. This preserves the Save Draft / Publish doctrine cleanly.

## What this does NOT change

- No schema changes.
- No edge functions.
- No change to Save Draft / Publish flow.
- No change to public-site rendering for actual visitors (the override is iframe-only and preview-flag-gated).
- No change to the iframe's URL or lifecycle.

## Files touched

New:
- `src/hooks/usePreviewBridge.ts` (both `usePreviewBridge` editor sender + `useLiveOverride` consumer)

Modified (Phase 1):
- `src/components/dashboard/website-editor/HeroEditor.tsx` (1 line)
- `src/components/dashboard/website-editor/BrandStatementEditor.tsx` (1 line)
- `src/components/dashboard/website-editor/FooterEditor.tsx` (1 line)
- `src/components/dashboard/website-editor/AnnouncementBarContent.tsx` (1 line)
- `src/components/home/HeroSection.tsx` (1 line — swap `data` → `live`)
- `src/components/home/BrandStatement.tsx` (or equivalent — verify) (1 line)
- `src/components/home/Footer.tsx` (or equivalent) (1 line)
- `src/components/home/AnnouncementBar.tsx` (or equivalent) (1 line)
- `src/components/dashboard/website-editor/LivePreviewPanel.tsx` (toolbar badge + status copy)

Phase 2 (separate PR, same one-line pattern): rest of the editors + consumers.

## Risk

Low. The bridge is opt-in per editor, gated behind `?preview=true`, and a no-op on the live public site. Worst case if the message handler breaks: the iframe falls back to its current behavior (showing last-saved DB state) — which is exactly what it does today.

## Prompt feedback

What you nailed: you described **the user-perceived symptom** ("preview shows the published view, confusing for editing") and the **expected behavior** ("see the actual edit view changing as they make edits") in one breath. That's the gold standard — symptom + desired state lets me skip a clarification round and go straight to architecture.

Where it could be sharper: one word — *latency*. "I want it to update as I type" vs "I want it to update when I tab away" vs "after Save Draft" are three different builds. I assumed "as I type, debounced" because that's the modern editor norm (Webflow, Framer), but if you actually meant "after a successful save," strategy A is overkill — we'd just need to invalidate the iframe's TanStack cache via a postMessage on save, no override layer at all. Naming the latency you want would have shaved a decision.

Bonus pattern: when reporting any "preview vs edit" gap, including a one-line hypothesis ("I think it's reading the published snapshot") is super valuable — even if you're wrong (you were here, but very reasonably so), it tells me which mental model to confirm or correct first. That alone unblocked 30% of my investigation.
