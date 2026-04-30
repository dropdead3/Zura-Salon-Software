# Wave 6 — Website Editor: Density, Alignment & Real-Estate Polish

Audit of the current state at 1281px (user's viewport). Problems are real, ranked by user-impact, and scoped tight.

## What's wrong (ranked)

**1. Preview pane is empty 60% of the time.** The Live Preview pane (right column) is showing a Drop Dead site rendered at 26% scale, occupying ~25% of pane width — a postage stamp surrounded by black. The default 38% pane size is too small for click-to-edit at this viewport. Worse, when the iframe is `device='desktop'` (1440×900) the natural fit is 26%, which is below the legibility floor.

**2. The "collapse" strips waste a full row.** Two near-empty horizontal strips eat ~36px each:
   - Sidebar header: a single "« Collapse" button on its own row (~44px).
   - Canvas pane header: a single panel-collapse icon on its own row (~36px).
   Together that's ~80px of vertical real-estate above content, on a viewport with `calc(100vh − 18rem)` already constraining the canvas.

**3. Editor card has 24px outer padding inside an already-padded canvas.** The "HERO SECTION" card sits inside `p-6` (24px) on the canvas pane, then the card itself has `p-6`. That's 48px of left/right padding before the user reaches form controls. At 1281px with sidebar+preview open, the editor pane is ~470px wide → form fields render at ~370px usable width.

**4. Editor card has a redundant title block.** The card header reads "HERO SECTION / Configure the main hero banner on your…" — but the toolbar breadcrumb already says "Hero Section" and the page picker already says "Home". Three labels for the same thing. The `Reset` button in the card header is also far from where the eye lands when scanning the form.

**5. Status strip in the preview pane truncates the Org ID.** "READY • b06a5744-64b6-462… • 1440×900 · 26%" — the UUID slug is showing because the org has no custom domain. We promised the Wave 5 friendlyUrl logic would fix this, but `previewUrl` here resolves to `/org/<orgId>/...` and the host/path becomes `id-preview--…lovable.app/org/b06a5744…/`. The "host" segment is still UUID-bearing in dev. Need a smarter friendly format.

**6. Toolbar uses pill-shaped controls inconsistently.** Page picker is a pill (rounded-full). Publish, Canvas, and the overflow `…` are rounded-md. The Saved-pill is rounded-full. Mixing pills and squircles in the same row reads as broken hierarchy.

**7. Sidebar groups bunch up.** "SITE CHROME" → 4 items → "PAGES" header with no whitespace separator. The visual rhythm is good for the first group but the second-group header sits flush against item #4 with only the section's own padding.

## Plan

**1. Smarter default canvas allocation** — `WebsiteEditorShell.tsx`
- Bump preview default 38 → 44 (still under the 55 max). At 1281px this gives the preview ~430px which puts a desktop-1440 iframe at ~30% scale — still small but legibly framed.
- Make the preview pane *default to `device='fit'` on first load* if it's never been set. `fit` uses 100% of the pane and the site's real responsive breakpoints kick in. Persisted preference still wins.

**2. Reclaim the collapse strips** — `WebsiteEditorShell.tsx` + `WebsiteEditorSidebar.tsx`
- Remove the canvas pane's standalone collapse-strip row entirely. Move the collapse button into the **editor card header**, on the right side of the title row, adjacent to `Reset`. Visual density wins, and the action is now next to the surface it controls.
- Sidebar: collapse the "« Collapse" full-row button into a small icon button **inline with the search bar's right edge** (a 28×28 ghost icon button). Frees ~44px.

**3. Tighten editor card padding** — `WebsiteEditorShell.tsx`
- Outer canvas wrapper: `p-6` → `p-4` (16px). The editor card already has its own padding.
- Drop the redundant card title strip ("HERO SECTION / Configure the main…"). The toolbar breadcrumb is canonical. Keep the icon + Reset row, but compress: icon + small section label inline + Reset on the right, in a single `h-10` header band.
- Result: form fields gain ~80–100px of vertical room and ~32px of horizontal room.

**4. Better friendly URL** — `LivePreviewPanel.tsx`
- When the host contains `lovable.app` or matches a known sandbox pattern, replace it with a synthetic label like `Preview · Home` (using the page's title) instead of showing the UUID-bearing host. The full URL stays available via copy + open buttons.
- Add `org/<uuid>/` stripping: any path segment matching the org UUID pattern collapses to the page slug only. So `/org/b06a5744…/p/about` → `/about`.

**5. Toolbar shape unification** — `WebsiteEditorShell.tsx`
- Add `rounded-full` to Publish, Canvas, and the `…` overflow icon button. All toolbar controls become pills, matching the page picker and SaveStatusPill. One shape language.
- Reduce overflow button to `h-9 w-9 rounded-full` (already h-9, just shape).

**6. Sidebar group rhythm** — `WebsiteEditorSidebar.tsx`
- Add `mt-3` to SITE CHROME → PAGES boundary (and any subsequent group headers). Currently relies on `<Separator className="my-2" />` between site-content groups, but the SITE CHROME → PAGES jump uses no separator.

## What's NOT in this wave

- Click-to-edit highlight ring color (currently `ring-primary/20` — a bit too subtle on dark, but works). Defer until a real user complains.
- Replacing the iframe scale strategy with a virtualized DOM mirror — far too invasive.
- Sidebar drag-to-resize between page picker and section list — tracked as future work.

## Risk

- Preview default `fit` change: persisted prefs override, so existing users keep their setting. New orgs see a more useful first-paint.
- Removing the canvas pane collapse strip: the collapse action moves into the card header, so functionality is preserved. If a user is on `editorTab` that has no card header (e.g., empty state), we keep an inline collapse button in the empty-state CTA cluster.
- Outer `p-6 → p-4`: editors with their own internal padding (HeroEditor etc.) won't change. Only the canvas wrapper shrinks.

## Files touched

- `src/components/dashboard/website-editor/WebsiteEditorShell.tsx`
- `src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx`
- `src/components/dashboard/website-editor/LivePreviewPanel.tsx`

## Prompt feedback (per project doctrine)

What you did well: "Continue analyzing for improvements and cleaner UI layouts, paddings, spacing, reconfigurations, etc" — open-ended audit prompt that lets me find real issues rather than rubber-stamping a predetermined list. Good for discovery passes.

What would sharpen it next time: add a *constraint axis*. For example:
- *"…ranked by impact on form-field legibility at 1280px"* — forces me to weight against your actual viewport, not 1440.
- *"…without changing the toolbar layout"* — locks in approved Wave 5 work and prevents me from re-litigating it.
- *"…stay under 4 file edits"* — caps scope so a "polish" wave doesn't sprawl.

The current prompt could plausibly approve a 12-file refactor or a 3-file polish; I picked the latter, but a constraint would have made that decision yours, not mine.
