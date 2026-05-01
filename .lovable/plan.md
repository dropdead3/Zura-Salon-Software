# Site Design / Site Theme — Bug Fixes

The Site Design panel has three independent bugs that compound to make theme switching feel broken: the Site Theme picker won't reliably let you pick the same theme twice in a row, the iframe doesn't actually repaint many of the design knobs (sliders, color pickers), and several themes are CSS-defined but visually so similar that switching feels like nothing happened.

## Bugs found

### 1. Site Theme picker can get stuck on a selection (the "won't go back to Cream Lux" bug)

`WebsiteThemePicker.handlePick` short-circuits with `if (id === theme) return`. The displayed `theme` is read from `useWebsiteColorTheme`, which reads `site_settings.draft_value`. The optimistic broadcast (`editor-theme-preview`) only updates the iframe's local override — it does NOT update `theme`. So:

- Pick Neon → mutation writes draft → after refetch, `theme === 'neon'`, picker highlights Neon. Good.
- Pick Cream Lux → optimistic class swap fires → mutation writes draft. But before the refetch lands, the picker UI's `isActive` is computed against the still-stale `theme === 'neon'`, so Cream Lux looks unselected. If the user clicks again to "force it", the click fires while `theme` may have just refetched to `'cream-lux'` and the `id === theme` short-circuit silently no-ops. The iframe never gets its second optimistic swap, and any in-flight theme-mismatch in `Layout.tsx`'s reconciliation effect (line 163–167) clears `previewThemeOverride` prematurely.

There is also no React Query optimistic cache update for `website_active_color_theme` (compare `useColorTheme.ts` line 230 which does `queryClient.setQueryData` — `useUpdateWebsiteColorTheme` does not).

### 2. Site Design sliders and color pickers don't live-preview at all

`SiteDesignPanel.broadcastToPreview()` dispatches:
```ts
new CustomEvent('editor-design-preview', { detail: overrides })
```

`LivePreviewPanel.tsx` line 177 reads it as:
```ts
const overrides = (e as CustomEvent).detail?.overrides ?? null;
post({ type: 'PREVIEW_DESIGN_OVERRIDES', overrides });
```

`detail.overrides` is always `undefined` because the panel passes the overrides as `detail` directly, not wrapped in `{ overrides }`. The iframe receives `{ type: 'PREVIEW_DESIGN_OVERRIDES', overrides: null }`, and `DesignOverridesApplier` no-ops. Operators only see slider/color changes after Save (which uses the separate draft-write → refetch path).

### 3. Several Site Themes look near-identical when applied

Themes are defined per-class in `index.css` (lines 93–3138). The visual delta between e.g. Cream Lux ↔ Sage ↔ Jade ↔ Marine is too subtle on the live site for a non-power-user to perceive a switch as "real". Combined with bug #1, this reads as "themes don't change very well."

The miniature swatches in the picker are vivid because they pull straight from `colorThemes[].lightPreview` (raw HSL values), but the actual theme classes apply a much narrower delta to `--primary`, `--accent`, `--background`. The on-site repaint needs more contrast budget — particularly for the visitor-facing surfaces (hero gradient, CTA buttons, section tints, link color).

## Plan

### A. Fix the Site Theme picker (highest priority)

**File:** `src/components/dashboard/website-editor/SiteDesignPanel.tsx` (`WebsiteThemePicker`)

1. Remove the `if (id === theme) return` short-circuit. A re-click should always re-broadcast the optimistic preview event (idempotent on the iframe side) and re-issue the mutation. Currently this guard hides the bug but also blocks recovery from any stale state.
2. Track an optimistic local `pickedTheme` state in the picker. Compute `isActive = pickedTheme ?? theme`. Clear `pickedTheme` once `theme` from the hook catches up. This makes the "ring" follow the click instantly instead of waiting for the refetch.
3. Disable the tile only while *that specific tile's* mutation is pending, not all tiles (currently `update.isPending` greys every tile and looks like the picker froze).

**File:** `src/hooks/useWebsiteColorTheme.ts`

4. Add an optimistic cache update inside `useUpdateWebsiteColorTheme` (mirror `useColorTheme.ts` line 230). Write `{ theme }` into the query cache for both `'draft'` and `'live'` modes immediately on `mutate`, so any consumer of `useWebsiteColorTheme` repaints in the same tick the user clicks.

**File:** `src/components/layout/Layout.tsx`

5. The reconciliation effect at lines 163–167 clears `previewThemeOverride` as soon as `theme-${websiteTheme}` matches. With #4 in place this is fine, but add a tiny debounce / one-frame deferral so the optimistic class is held for at least one paint, preventing a visible flash on slow networks.

### B. Fix the Site Design live-preview event payload mismatch

**File:** `src/components/dashboard/website-editor/SiteDesignPanel.tsx`

Change `broadcastToPreview` to dispatch the wrapped shape the iframe bridge expects:
```ts
new CustomEvent('editor-design-preview', { detail: { overrides } })
```

This restores live-preview for every slider, color picker, density toggle, button-shape toggle, hero overlay, and section tint — all of which currently appear "dead" until Save.

### C. Make theme switches more visible on the site

**File:** `src/index.css`

For each of the 12 site themes, audit the override block (`.theme-zura`, `.theme-cream-lux`, etc.) and ensure the following tokens carry enough contrast to register as a real switch on the public site:

- `--primary` (CTA buttons, links, header accents)
- `--accent` (badges, section tints)
- `--background` and `--card` (overall page tone)
- `--ring` (focus state — picks up the brand color)
- `--font-display` and `--font-sans` if the theme has a typographic identity (e.g. Cream Lux = serif accents, Neon = mono display)

Also add a small `--theme-hero-tint` token used by the hero overlay so each theme nudges the hero gradient visibly.

This is the largest piece by line count but the most visible to operators.

### D. Regression coverage

1. **Vitest** — add `useWebsiteColorTheme.test.tsx` asserting:
   - Re-clicking the same theme re-issues the optimistic broadcast.
   - The picker `isActive` flips to the clicked theme synchronously, before the mutation resolves.
   - Optimistic cache write lands for both `draft` and `live` query keys.
2. **Vitest** — add `SiteDesignPanel.preview.test.tsx` asserting `editor-design-preview` dispatches `detail.overrides` (wrapped) and the iframe bridge forwards the non-null overrides into `PREVIEW_DESIGN_OVERRIDES`.

## Out of scope

- Reorganising the picker grid / brand looks layout (the current grid is fine).
- Changing how Brand Looks ("Cream Classic", "Ocean Modern", etc.) interact with Site Themes — that's a separate `website_themes` table system and not part of this report.
- The publishing pipeline (the bug is in editor draft mode; live-site publish-then-view is unaffected).

## Technical details

| Surface | File | Change |
|---|---|---|
| Picker stale state | `SiteDesignPanel.tsx` (`WebsiteThemePicker`) | Add `pickedTheme` local state, drop `id === theme` guard, scope `disabled` to the in-flight tile |
| Optimistic cache | `useWebsiteColorTheme.ts` | `queryClient.setQueryData` for `['site-settings', orgId, 'website_active_color_theme', mode]` × {draft, live} on `mutate` |
| Reconciliation flicker | `Layout.tsx` lines 163–167 | One-frame `requestAnimationFrame` before clearing `previewThemeOverride` |
| Live-preview payload | `SiteDesignPanel.tsx` line 171 | Wrap detail: `{ detail: { overrides } }` |
| Theme contrast | `index.css` per-theme blocks | Strengthen `--primary`/`--accent`/`--background`/`--ring` + add `--theme-hero-tint` |
| Tests | `src/hooks/__tests__/useWebsiteColorTheme.test.tsx`, `src/components/dashboard/website-editor/__tests__/SiteDesignPanel.preview.test.tsx` | New |
