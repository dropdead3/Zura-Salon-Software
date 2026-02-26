

## Fix: Inspector Cards Clipping Right Edge

### Root Cause

The `ScrollArea` component wraps content in a viewport div that has `h-full w-full` but no overflow-x constraint. Inside it, the `PanelSlideIn` (a `motion.div`) has no explicit width — it expands to fit its children. Even though `max-w-full` and `overflow-hidden` are set via the token, `max-w-full` resolves to the parent's width, which in a scroll viewport is unconstrained horizontally.

The fix requires constraining width at multiple levels so the content envelope is airtight.

### Changes

#### 1. `src/components/dashboard/website-editor/panels/InspectorPanel.tsx` (line 113)

Add `overflow-x-hidden` to the `ScrollArea` so its viewport never allows horizontal expansion.

**Before:** `<ScrollArea className="flex-1">`
**After:** `<ScrollArea className="flex-1 [&>div]:!overflow-x-hidden">`

This targets the Radix ScrollArea viewport div and forces it to clip horizontally, which makes `max-w-full` on children resolve correctly.

#### 2. `src/components/dashboard/website-editor/EditorCard.tsx` (line 17)

The outer div already has `overflow-hidden` in its base classes. But the content div (line 42) needs `overflow-hidden` added to enforce clipping on its children too.

**Before:** `<div className="p-4 space-y-4 max-w-full box-border">`
**After:** `<div className="p-4 space-y-4 max-w-full box-border overflow-hidden">`

#### 3. `src/components/dashboard/website-editor/LocationsContent.tsx` (line 142-143)

Add `max-w-full` to each location `Card` so it never exceeds its parent.

**Before:** `"group transition-all duration-200 hover:shadow-sm overflow-hidden"`
**After:** `"group transition-all duration-200 hover:shadow-sm overflow-hidden max-w-full"`

### Why This Works

The overflow chain is: `InspectorPanel` (overflow-hidden) → `ScrollArea` viewport (now overflow-x-hidden) → `PanelSlideIn` (max-w-full overflow-hidden) → `EditorCard` (overflow-hidden) → content div (overflow-hidden) → `Card` (max-w-full overflow-hidden). Every level now clips horizontally, so no child can push past the panel edge.

### Files Modified

| File | Change |
|------|--------|
| `InspectorPanel.tsx` | Force ScrollArea viewport to clip horizontally |
| `EditorCard.tsx` | Add `overflow-hidden` to content div |
| `LocationsContent.tsx` | Add `max-w-full` to location Cards |

