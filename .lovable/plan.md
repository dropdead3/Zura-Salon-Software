

# Fix Location Selector Double-Toggle Bug

## Root Cause

The location row has **two competing click handlers** that both call `toggleLocation(loc.id)`:

1. The parent `<div onClick={() => toggleLocation(loc.id)}>` (line 580)
2. The `<Checkbox onCheckedChange={() => toggleLocation(loc.id)}>` (line 584)

When you click the checkbox itself, both handlers fire — the checkbox toggles it ON, then the click event bubbles to the parent div and toggles it OFF again. Net result: nothing happens. Clicking the row text (outside the checkbox) works because only the div handler fires.

This explains the intermittent behavior — it depends on whether you click the checkbox directly or the surrounding row area.

## Fix — One change in `BackroomPaywall.tsx`

Remove the `onCheckedChange` handler from the `Checkbox` component (line 584) and change it to just reflect the checked state. The parent div's `onClick` already handles the toggle. Alternatively, add `e.stopPropagation()` on the checkbox change. The simplest fix:

```tsx
// Line 582-584: Remove the onCheckedChange, keep checked as display-only
<Checkbox
  checked={isChecked}
  className="pointer-events-none"
/>
```

Adding `pointer-events-none` to the Checkbox makes it purely visual — clicks pass through to the parent div which handles the toggle. This is the cleanest approach since the entire row is already clickable.

**File**: `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` (lines 582-584)

