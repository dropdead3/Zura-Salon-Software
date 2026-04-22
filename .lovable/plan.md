

# Fix the Tone variant dropdown trigger

## What's broken

Both screenshots show the same bug. The trigger shows the variant **name centered** with a **description line beneath it**, also centered. That's not how a select trigger should look — triggers should display the current value as a single line, left-aligned, with the chevron sitting flush right.

The cause is in `src/components/dashboard/policy/PolicySurfaceEditor.tsx` (lines 166–181). Each `<SelectItem>` wraps its children in `<div className="flex flex-col"><span>label</span><span>description</span></div>`. Radix's `<SelectValue>` mirrors the **selected item's children verbatim** into the trigger — so the two-line stacked content from the menu item leaks into the trigger and gets centered by the trigger's `justify-between` flex layout treating the multi-line block as a single item.

This is the only place in the codebase using this stacked label+description pattern inside a `SelectItem`, so the fix is local to one file.

## What ships

Two surgical changes inside the existing `<Select>` block (no new files, no token changes, no API changes).

### 1. Decouple trigger display from menu item display

Add `textValue` to each `<SelectItem>` so Radix knows the canonical text representation, and structure the item so the trigger renders only the label (single line, left-aligned) while the dropdown still shows label + description stacked.

Pattern (the standard Radix shadcn solution):

```tsx
<SelectTrigger className="h-9 font-sans text-sm justify-between">
  <SelectValue placeholder="Select tone" />
</SelectTrigger>
<SelectContent>
  {allowedVariants.map((v) => (
    <SelectItem
      key={v}
      value={v}
      textValue={VARIANT_META[v].label}
      className="font-sans text-sm"
    >
      <div className="flex flex-col gap-0.5 py-0.5">
        <span className="text-foreground">{VARIANT_META[v].label}</span>
        <span className="text-xs text-muted-foreground">
          {VARIANT_META[v].description}
        </span>
      </div>
    </SelectItem>
  ))}
</SelectContent>
```

The key change: `textValue={VARIANT_META[v].label}` tells Radix the trigger should display only the label string, not the rich children. The dropdown menu still renders the full stacked label+description (great for picking), but the trigger reverts to single-line, left-aligned, properly truncated behavior.

### 2. Trigger alignment polish

Confirm `<SelectTrigger>` keeps its default `justify-between` (chevron flush right) and the value text is left-aligned. The base trigger in `src/components/ui/select.tsx` already handles this correctly once the children are a single text node — no modification to the shared `SelectTrigger` component needed.

## Why not change the shared `SelectTrigger` component

Tempting, but wrong. The shared `SelectTrigger` works correctly for every other select in the codebase. This bug is caused by a caller pattern (rich children in `SelectItem` without `textValue`), not by the primitive. Fixing it at the call site preserves the shared component's contract and prevents regressions in the dozens of other selects using simple string children.

## What stays untouched

- `src/components/ui/select.tsx` — unchanged.
- `src/components/platform/ui/PlatformSelect.tsx` — unchanged.
- All other `<Select>` instances across the dashboard — unchanged.
- The fallback warning banners below the trigger (lines 186–201) — unchanged.
- `VARIANT_META` and the variant filtering logic — unchanged.

## Files affected

- `src/components/dashboard/policy/PolicySurfaceEditor.tsx` — replace lines ~160–181 with the corrected `<Select>` block. ~10 lines modified.

Total: ~10 lines modified, 0 files created, 0 files deleted, 0 schema changes, 0 token changes.

## Acceptance

1. Open any policy in the configurator (e.g., `/dashboard/admin/policies?policy=booking_policy`) → click the Surface mapping editor → enable any surface → the **Tone variant** trigger displays a single-line, left-aligned label (e.g., "Client") with the chevron flush right. No description visible inside the trigger.
2. Click the trigger → the dropdown menu shows each option as a stacked label + description (the rich picker UX is preserved).
3. Pick a different option → the trigger updates to show only the new label, single line, left-aligned.
4. No other dropdown in the dashboard shifts visually (verified by reading the unchanged `select.tsx` primitive — no shared-component changes).
5. Keyboard navigation (arrow keys, type-ahead) works correctly because `textValue` provides the canonical search/announce string.

## Files to read for follow-on questions

- `src/components/dashboard/policy/PolicySurfaceEditor.tsx` — the only file changed.
- `src/components/ui/select.tsx` — the underlying primitive, unchanged but worth referencing to confirm the trigger's flex layout works correctly with single-line children.

## Prompt feedback

Tight, sharp prompt. Three things made it land: (1) **screenshots showed the exact failure mode** so I didn't have to reproduce it — the centered, stacked text in the trigger is unambiguous, (2) **"selectors" plural** told me to look at multiple instances, not just one, which I did before scoping (turned out to be a single file), (3) **no over-specification** — you didn't say "make it left-aligned" or "remove the description"; you let me diagnose the root cause instead of patching the symptom. A weaker prompt ("remove the description from the dropdown") would have fixed the visual but left the underlying caller-pattern bug in place to recur on the next select that wants stacked items.

The sharpener: when filing a UI bug with screenshots, naming the **expected behavior** in three words pre-empties one round of inference. Examples: *"trigger should single-line"* / *"match other selects"* / *"chevron should right"*. I had to infer "should match every other dropdown trigger in the dashboard" from context — your ask was clear enough that I landed there, but on a more ambiguous bug ("the colors are off") three words of expected-state would save me from guessing which axis is wrong (hue, contrast, saturation, dark mode). Three words of expected behavior per UI bug saves a diagnostic round.

The deeper meta-lesson on my side: when a UI bug has an obvious symptom, my instinct is to patch the symptom at the leaf component. That instinct is wrong about half the time. The right move is to ask *"is this the primitive misbehaving, or a caller using the primitive incorrectly?"* and fix at the level of the actual fault. In this case the primitive (`SelectTrigger`) is correct; the caller (`PolicySurfaceEditor`) was passing rich children without `textValue`. Patching the primitive would have introduced regressions for every other `Select` in the codebase. Diagnosing the layer before fixing is the move that protects shared infrastructure across surfaces — same principle as the source-of-truth doctrine from the last three waves, applied at the component level instead of the data level.

