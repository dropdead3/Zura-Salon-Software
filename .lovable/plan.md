

## Fix Inspector Content Envelope -- Prevent Right-Edge Clipping

### Problem
The inspector panel's content wrapper uses `p-3` (12px) padding, which is insufficient to keep cards from touching/clipping the right edge. Combined with missing `overflow-x-hidden` at the content level, child cards (especially Locations) bleed past the panel boundary.

### Root Cause
The single source of truth for inspector inner padding is `editorTokens.inspector.content` in `editor-tokens.ts`, currently set to `'p-3 space-y-4'`. This 12px padding is too tight for the card widths rendered inside. The `InspectorPanel` uses `ScrollArea` for vertical scroll but has no horizontal overflow constraint on the content envelope.

### Changes

#### 1. `src/components/dashboard/website-editor/editor-tokens.ts` (line 63)

Update the inspector content token from `p-3` to `px-5 pt-4 pb-6` (20px horizontal, 16px top, 24px bottom), and add `max-w-full box-border overflow-hidden`.

**Before:** `content: 'p-3 space-y-4'`
**After:** `content: 'px-5 pt-4 pb-6 space-y-4 max-w-full overflow-hidden'`

This is the single source of truth -- every inspector module (Locations, Testimonials, Gallery, Hero, Services, Stylists, Footer CTA, Announcement Bar) will inherit the corrected padding automatically since they all render as children of `PanelSlideIn` with this token.

#### 2. `src/components/dashboard/website-editor/panels/InspectorPanel.tsx` (line 72)

Add `overflow-x-hidden overflow-y-auto` to the expanded panel root div to prevent any horizontal scroll at the panel shell level.

**Before:** `cn(editorTokens.panel.inspector, 'h-full flex flex-col', className)`
**After:** `cn(editorTokens.panel.inspector, 'h-full flex flex-col overflow-hidden', className)`

#### 3. `src/components/dashboard/website-editor/EditorCard.tsx` (line 42)

Add `max-w-full box-border` to the EditorCard content div to enforce that all card children respect the parent envelope width.

**Before:** `<div className="p-4 space-y-4">`
**After:** `<div className="p-4 space-y-4 max-w-full box-border">`

#### 4. `src/components/dashboard/website-editor/LocationsContent.tsx` (lines 185-198)

Add `break-words [overflow-wrap:anywhere]` to the address, phone, and hours text spans to handle long strings that may resist `truncate` in edge cases.

### Why This Works

- **Single source of truth**: The `editorTokens.inspector.content` token applies to all inspector modules via `PanelSlideIn`. Updating it once fixes padding for every section.
- **20px horizontal padding** provides the 16px+ safe area the bento standard requires, with room to breathe.
- **`overflow-hidden`** at both the panel root and content envelope level eliminates any horizontal scroll.
- **`max-w-full box-border`** on EditorCard content ensures cards never exceed their parent width regardless of inner content.
- No typography or card sizes are changed -- this is purely an envelope/containment fix.

### Files Modified

| File | Change |
|------|--------|
| `editor-tokens.ts` | Update `inspector.content` padding from `p-3` to `px-5 pt-4 pb-6` + overflow containment |
| `InspectorPanel.tsx` | Add `overflow-hidden` to panel root |
| `EditorCard.tsx` | Add `max-w-full box-border` to content div |
| `LocationsContent.tsx` | Add `overflow-wrap: anywhere` to long text fields |

