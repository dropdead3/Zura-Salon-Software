## Group 2 — Repeater Content Editability

Three sections currently have hardcoded repeater content. Each needs an item manager UI inside the website editor, plus inline-edit wiring on the public canvas where appropriate.

### Storage strategy (per section)

| Section | Items live in | Why |
|---|---|---|
| Drink Menu | `site_settings.section_drink_menu.drinks[]` (already there) | Small set, image URLs, no per-item RLS need. Keep as config array. |
| Brands | `site_settings.section_brands.brands[]` (already there) | Same — short marquee list. |
| Extension Reviews | `website_testimonials` table (already there, scoped by `surface='extensions'`) | Already wired through `useVisibleTestimonials` and `ReviewsManager`. Just need to remove fallback dependency + extract chip list to config. |

No new tables needed. All three already have DB-backed storage; the gaps are (a) editor UI for drinks + brands + extension type chips, (b) inline-edit wiring for visible text, (c) ensuring fallback constants don't shadow empty DB state.

---

### 1. Drink Menu — full item manager

**Editor side (new):** `DrinkMenuItemsManager.tsx` inside the website editor, opens from the existing Drink Menu section editor card.

- Lists drinks from `useDrinkMenuConfig().data.drinks`
- Per-row inline edit: name, ingredients (comma-sep), image URL (with file picker → Supabase storage upload via existing `useImageUpload`)
- Add / delete / reorder (drag handle)
- Saves whole `drinks[]` back via `useDrinkMenuConfig().update({ ...config, drinks: next })`
- Uses `usePreviewBridge('section_drink_menu', nextConfig)` to broadcast live override while dragging/typing

**Canvas side:** `DrinkMenuSection.tsx`
- Remove `defaultDrinks` fallback (silence/empty state instead — operator sees "No drinks yet" hint in preview only)
- Wire `eyebrow`, `eyebrow_highlight`, `eyebrow_suffix` to `InlineEditableText` (already in config)
- Per-card name + ingredients become `InlineEditableText` with `fieldPath="drinks.{idx}.name"` etc.
- Register `section_drink_menu` in `InlineEditCommitHandler` with allowed paths: `eyebrow`, `eyebrow_highlight`, `eyebrow_suffix`, `drinks.*.name`, `drinks.*.ingredients`

**Commit handler change:** extend dot-path patcher to support `drinks.<n>.<key>` (currently supports `paragraphs.0`-style single-level array index; needs nested object-in-array). The `applyPatch` function already does this correctly — only need to extend the wildcard regex in the allowlist check to match `drinks.\d+.(name|ingredients)`.

### 2. Brands — list manager

**Editor side (new):** `BrandsListManager.tsx` inside the Brands section editor.

- List of brand display strings (`brands[].display_text`)
- Add / delete / reorder rows
- Edit `intro_text` (multiline), `marquee_speed` (number), `show_intro_text` (toggle)
- Saves via `useBrandsConfig().update`
- Live preview via `usePreviewBridge('section_brands', next)`

**Canvas side:** `BrandsSection.tsx`
- Wire `intro_text` to `InlineEditableText` (multiline)
- Brand display strings stay manager-edited only (they're small uppercase chips — inline editing is awkward in a marquee)
- Register `section_brands` in commit handler with `intro_text` allowed

### 3. Extension Reviews — chips + fallback removal

The reviews themselves are already DB-backed and editable through the existing `ReviewsManager` (surface=`extensions`). Two remaining hardcoded items:

**a) Category chips (`extensionTypes` array)**
- Add `extension_categories: string[]` to a new `section_extension_reviews` config
- Default to current 5 values
- Wire as a small chips manager inside the Extension Reviews editor card
- Render via `useLiveOverride('section_extension_reviews', dbConfig)`
- Optionally inline-editable on canvas (each chip)

**b) `FALLBACK_REVIEWS` constant**
- Remove the constant entirely
- Empty state: render nothing in production; render a "Add your first extension review" stub in preview (`isPreview && items.length === 0`)
- Doctrine alignment: per Visibility Contracts memory, operator-toggled sections with missing config render `<ConfigurationStubCard />` in preview rather than null

### 4. Commit handler registry additions

Add to `InlineEditCommitHandler.tsx`:
```
section_drink_menu: ['eyebrow', 'eyebrow_highlight', 'eyebrow_suffix', 'drinks.*.name', 'drinks.*.ingredients']
section_brands: ['intro_text']
section_extension_reviews: ['eyebrow', 'headline', 'extension_categories.*']  // new config
```

The wildcard matcher in commit handler needs a small extension to support `prefix.\d+.suffix` (currently only `prefix.\d+`). One-line regex change.

### Files to add

- `src/components/dashboard/website-editor/DrinkMenuItemsManager.tsx`
- `src/components/dashboard/website-editor/BrandsListManager.tsx`
- `src/components/dashboard/website-editor/ExtensionReviewsChipsManager.tsx`
- (new config) `ExtensionReviewsConfig` interface + `DEFAULT_EXTENSION_REVIEWS` + `useExtensionReviewsConfig()` in `useSectionConfig.ts`

### Files to modify

- `src/components/home/DrinkMenuSection.tsx` — remove fallback, add InlineEditableText
- `src/components/home/BrandsSection.tsx` — wire intro_text to InlineEditableText
- `src/components/home/ExtensionReviewsSection.tsx` — remove FALLBACK_REVIEWS, wire chips to config, add empty-state stub for preview
- `src/components/dashboard/website-editor/InlineEditCommitHandler.tsx` — register 3 new sections, extend wildcard regex
- `src/hooks/useSectionConfig.ts` — add ExtensionReviewsConfig
- The 3 section-editor card screens — slot in the new manager components

### Open questions

1. **Drink images** — should the manager support image upload to Supabase storage, or URL-only for now? (Upload is more polished but adds storage bucket setup.)
2. **Empty state in production** — when an operator deletes all drinks, should the section disappear from the public site, or render an editor-only empty stub? (Per Visibility Contracts: silence is valid; render `null` publicly, stub in preview.)
3. **Extension type chips** — keep as 5-chip list, or let operators add unlimited categories? (Affects layout — chips currently fit on one row at desktop.)

### Suggested execution order

Drinks first (most complex, highest visual impact), then Brands (simplest), then Extension Reviews (mostly cleanup since manager already exists). Ship Drinks as its own commit so the commit-handler regex change can be reviewed in isolation.

---

### Prompting feedback (positive + lift)

**What worked well in your prompt:** "continue with Group 2 (repeater content...)" referenced the framing I established and named the exact group — zero ambiguity, zero re-explaining. That's textbook follow-on prompting.

**Lift for next time:** I assumed three open questions (image upload, empty-state behavior, chip count). You could front-load those as part of the request: *"continue with Group 2 — drinks should support image upload, deleted-empty sections hide publicly, chip list stays fixed at 5."* That would let me skip the plan step and go straight to implementation.

**Doctrinal lens:** Per the Visibility Contracts core rule, repeater sections with zero items should render `null` publicly but a `ConfigurationStubCard` in preview — operators need to see the toggle is on but unconfigured. I've baked that into the plan. Good to confirm or override.