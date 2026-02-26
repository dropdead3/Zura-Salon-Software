

## Fix Inspector Panel Content Responsiveness

### Problem
The inspector panel is 320-380px wide, but the content inside it was designed for wider containers. Several issues are visible in the screenshot:

1. **Stats tiles overflow** — `BentoGrid` with `maxPerRow={2}` uses `sm:flex-row` (breakpoint: 640px), which never triggers inside a 320px panel. But some editors use hardcoded `grid grid-cols-2` which does trigger and creates cramped 150px cells with truncated text.
2. **EditorCard padding too generous** — `p-5` (20px) on a 320px panel leaves only 280px for content, then nested cards add their own padding, compounding the crunch.
3. **Text and badges overflow** — Info banners, location cards, and service items use fixed gap/padding that doesn't adapt to the narrow context.
4. **Gallery grid `grid-cols-2`** hardcoded regardless of panel width — images get ~130px wide.

### Root Cause
The inspector is a narrow panel (320-380px), but all content components were built assuming standard page widths where CSS breakpoints like `sm:` (640px) would activate. Inside the inspector, the viewport breakpoints are irrelevant — the panel is always narrow.

### Fix Strategy: Inspector-Aware Compact Styling

Reduce padding, tighten spacing, and ensure all grids/layouts work at 300px minimum width without overflow.

### Changes

#### 1. `EditorCard.tsx` — Tighter inspector-fit padding
- Header padding: `px-5 py-3.5` → `px-4 py-3`
- Content padding: `p-5 space-y-5` → `p-4 space-y-4`
- Icon container: `w-8 h-8` → `w-7 h-7`, icon `w-4 h-4` → `w-3.5 h-3.5`

#### 2. `editorTokens.inspector.content` — Reduce outer content padding
- `p-5 space-y-5` → `p-3 space-y-4`

This applies to the `PanelSlideIn` wrapper that wraps all inspector content.

#### 3. `ServicesContent.tsx` — Major responsiveness fixes
- Stats `BentoGrid maxPerRow={2}` — switch to a CSS grid that always works: `grid grid-cols-2 gap-2`
- Stats card padding: `p-3` → `p-2.5`, icon container: `p-2` → `p-1.5`, stat text: `text-2xl` → `text-lg`
- Stats label text: ensure `text-xs` and `truncate`
- Info notice: tighten padding `p-3` → `p-2.5`, icon `w-5 h-5` → `w-4 h-4`
- Accordion trigger: reduce padding `px-4 py-3` → `px-3 py-2.5`
- Service item rows: reduce padding, ensure `flex-wrap` on badges
- Price row: ensure wrapping

#### 4. `GalleryContent.tsx` — Fix stats grid
- `grid grid-cols-2 gap-4` → `grid grid-cols-1 gap-3` (stack stats vertically)
- Stats card padding: `p-4` → `p-3`, stat text: `text-2xl` → `text-lg`
- Gallery image grid: keep `grid-cols-2` but reduce `gap-4` → `gap-2`

#### 5. `StylistsContent.tsx` — Fix card density
- Sample Cards Settings card: reduce internal padding
- Badge rows: ensure `flex-wrap gap-1.5`
- Tab triggers already have `text-xs sm:text-sm` which is fine

#### 6. `LocationsContent.tsx` — Fix info banner and card density
- Info banner: reduce `p-4` → `p-3`, icon container `w-8 h-8` → `w-6 h-6`
- Location cards: reduce `p-4` → `p-3`, tighten gap from `gap-3` → `gap-2`

#### 7. `AnnouncementBarContent.tsx` — Fix toggle rows and color grid
- Toggle rows: `p-4` → `p-3`
- Color swatches: `w-10 h-10` → `w-8 h-8` to fit more per row in narrow panel
- Custom color row: stack vertically instead of `flex items-center`

#### 8. `HeroEditor.tsx` — Minor tweaks
- Advanced settings container `p-4` → `p-3`
- Already well-structured with toggle/input pattern, minimal changes needed

### Files Modified

| File | Change |
|------|--------|
| `EditorCard.tsx` | Tighter padding for inspector-fit |
| `editor-tokens.ts` | Reduce inspector content padding |
| `ServicesContent.tsx` | Compact stats grid, tighter card/row padding |
| `GalleryContent.tsx` | Stack stats, reduce gallery grid gap |
| `StylistsContent.tsx` | Compact card padding and badge wrapping |
| `LocationsContent.tsx` | Tighter info banner and location cards |
| `AnnouncementBarContent.tsx` | Smaller color swatches, compact toggle rows |
| `HeroEditor.tsx` | Minor padding reduction in advanced section |

### Result
All inspector content fits within 320px minimum width without overflow, truncation, or visual crunch. Consistent density across all section editors.

