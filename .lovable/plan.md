

# Fix the Tone dropdown — use the shared SelectItem's `description` prop

## What's actually broken

The previous fix (`textValue`) didn't land because Radix's `<SelectValue>` mirrors **everything inside `<SelectPrimitive.ItemText>`** into the trigger — `textValue` only changes the announce/search string, not what gets visually rendered. The label + description stack is currently being passed as `children`, which means it's all inside `ItemText`, which means the trigger displays the entire stacked block (centered by the trigger's flex layout).

Meanwhile the shared primitive `src/components/ui/select.tsx` already solved this exact case — `SelectItem` accepts a `description` prop that renders the description **outside** `SelectPrimitive.ItemText`. Anything outside `ItemText` does not leak into the trigger. The caller just isn't using that prop.

## What ships

A 5-line edit inside the existing `<Select>` block. No primitive changes, no new components, no new tokens.

### The change

Replace lines 170-184 in `src/components/dashboard/policy/PolicySurfaceEditor.tsx`:

```tsx
{allowedVariants.map((v) => (
  <SelectItem
    key={v}
    value={v}
    description={VARIANT_META[v].description}
  >
    {VARIANT_META[v].label}
  </SelectItem>
))}
```

That's it. The label is the only child (so it's the only thing in `ItemText`, so it's the only thing the trigger displays). The description rides along via the prop, rendered as a sibling span inside the menu item — visible in the dropdown, invisible in the trigger.

The current shared primitive renders description **inline** to the right of the label (`flex items-center gap-2`). For a long description like "Plain-language version for clients." this could push the menu item width too wide on smaller dropdowns. If we want the stacked label-over-description look the operator currently sees in the menu, we need to also wrap description in a small layout tweak inside the primitive — but that's a primitive change with cross-codebase impact.

## Decision: which menu look do you want

**Option A — inline description (zero primitive risk):**
Menu items show "Client · Plain-language version for clients." on a single line (label, then muted description after a separator). Trigger shows just "Client". Zero primitive changes. Lowest risk, ships immediately.

**Option B — stacked description (matches current menu look):**
Menu items show label on top, description on a smaller muted line below. Trigger shows just "Client". Requires modifying the shared primitive's `description` slot from `flex items-center gap-2` to `flex flex-col` — affects every other Select in the codebase that uses the `description` prop. I'll grep first to confirm the blast radius, but at minimum we'd want to make stacking opt-in via a second prop (`descriptionPlacement="below"`) rather than a global change.

**Recommendation: ship Option A first** because it is the only change that's truly local and risk-free. If you want the stacked look back, file it as a follow-up that touches the primitive intentionally with the right prop API. The screenshot you uploaded shows the menu currently displays in a stacked layout because the description is inside `children` — once we move it to the prop, the menu changes look. That's the unavoidable tradeoff of routing it through the shared primitive.

## What stays untouched

- `src/components/ui/select.tsx` — unchanged.
- The trigger styling, the surface card layout, the save logic.
- All other Selects in the codebase.

## Files affected

- `src/components/dashboard/policy/PolicySurfaceEditor.tsx` — lines 170–184 collapsed to ~6 lines. Zero behavior change.

Total: ~10 lines modified, 0 files created, 0 schema changes.

## Acceptance

1. Open `/org/drop-dead-salons/dashboard/admin/policies?policy=booking_policy` → enable any surface → the **Written for** trigger displays only the variant label ("Client") on a single line, left-aligned, chevron flush right. No description visible inside the trigger pill.
2. Open the dropdown → each option shows "Client" as the primary text with the description rendered alongside in a muted style (inline per Option A, or stacked if you choose Option B).
3. Picking a different option updates the trigger to show only the new label.
4. No other dropdown in the dashboard shifts visually.

## Files to read for follow-on questions

- `src/components/dashboard/policy/PolicySurfaceEditor.tsx` — the only file changed.
- `src/components/ui/select.tsx` — confirms the `description` prop already exists and how it renders.

## Prompt feedback

Tight prompt with a useful constraint: **"inside the bubble"** told me the trigger pill itself is what's still wrong, which immediately ruled out the menu items as the failure point and pointed me at the trigger's content rendering. The screenshot confirmed the symptom (label + description still stacked inside the pill). Two-word location anchors like that are high-leverage — they keep me from re-investigating the parts that already work.

The sharpener: when a previous fix didn't land, naming **what the previous fix was supposed to do** in three words ("textValue didn't help" / "still showing both") would let me skip re-deriving the prior attempt. I had to re-read the file to remember what I shipped last turn before I could see why it didn't take. A one-line "the textValue thing didn't work" upfront saves one read. Same shape as a bug report: *what you tried, what you expected, what you got*.

The deeper meta-lesson on my side: when I propose a fix and it doesn't take, my instinct is to add another patch on top. That instinct is wrong. The right move is to **re-read the underlying primitive before patching the caller again** — because the second-most-likely cause of a Radix select trigger showing children verbatim is that the primitive *already* exposes the right escape hatch and the caller isn't using it. In this case the shared `SelectItem` had a `description` prop the whole time. Patching at the call site without reading the primitive would have led to a third round of "still broken." Read the floor before re-stacking the ceiling.

