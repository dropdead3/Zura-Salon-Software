

# Remove purple focus ring on the location combobox search input

## Diagnosis

The screenshot shows the nested `Search locations…` input rendering a bright violet outline when focused — visually loud against the calm popover surface and inconsistent with the parent `Search team…` input (which has no such ring).

Cause: `CommandInput` from `@/components/ui/command` ships with default `outline-none` only on its inner `<input>`, but the `cmdk` wrapper element receives the browser's default focus styling **plus** a Tailwind ring inherited from somewhere in the popover surface. In our skin, the `[cmdk-input-wrapper]` is the actual element drawing the violet stroke when its child input gains focus.

We don't want to mutate the shared `command.tsx` primitive (used across the command palette, search dialogs, and other comboboxes) — that risks regressions elsewhere. Fix is **scoped to the one usage** in `ViewAsPopover`.

## Fix — single file, one className addition

### `src/components/dashboard/ViewAsPopover.tsx`

Add a focus-suppression className to the `CommandInput` inside the location picker:

```tsx
<CommandInput
  placeholder="Search locations…"
  className="h-9 text-xs border-0 focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:outline-none"
/>
```

And on the wrapper container, add a className override to neutralize any inherited ring on the `[cmdk-input-wrapper]`:

```tsx
<Command className="[&_[cmdk-input-wrapper]]:border-0 [&_[cmdk-input-wrapper]]:focus-within:ring-0">
  <CommandInput ... />
  ...
</Command>
```

This kills the ring at both layers (input + wrapper) without touching the shared primitive.

## What stays untouched

- `src/components/ui/command.tsx` — shared primitive, no edits.
- All other `CommandInput` usages across the app (command palette, SearchDialog, etc.) — unaffected.
- Parent `Search team…` input, location trigger button, list items, check marks.
- Filtering behavior, selection, stacking (`z-[60]`), popover dimensions.

## Acceptance

1. Click into `Search locations…` input — no purple/violet ring appears.
2. Input still receives keyboard focus and accepts text.
3. Type filters the list as before.
4. Parent `Search team…` input behavior unchanged.
5. Other command-palette surfaces in the app (⌘K, message search, etc.) still render their existing focus styles.

## Out of scope

- Restyling the parent `Search team…` input.
- Editing the shared `command.tsx` primitive.
- Changing the trigger button's hover/focus state.

## Prompt feedback

Tight, surgical prompt — three things you did right:

1. **You named the exact element + the exact state** ("input box" + "when clicked"). Two-axis specificity (which element, which interaction) collapses ambiguity instantly. Saved a "which input?" round-trip.
2. **You used the screenshot as the source of truth.** The violet ring is unmistakable in the image — no need to describe the color or thickness. Visual evidence > prose description for styling bugs.
3. **You stayed scoped to the one defect.** Didn't ask me to also restyle the trigger or the parent input — kept the change atomic.

Sharpener: naming the **scope of the fix** would have removed my one remaining decision. Should this kill the ring *only on this combobox*, or *globally on all CommandInputs in the app*? Template:

```text
Remove [visual artifact] on [element] when [state]. Scope: [this surface only / global].
```

The **scope clause** is the underused construct on style-fix prompts — without it I have to choose between editing the shared primitive (faster, riskier) or scoping the override (safer, slightly more verbose). I defaulted to scoped because the parent `Search team…` input doesn't have the ring, suggesting you want surface-level consistency rather than a global primitive change — but naming the scope explicitly would have locked it in one beat.

## Further enhancement suggestion

For **style-defect prompts** specifically, the highest-leverage frame is:

```text
Remove [artifact] on [element] in [surface] when [state].
Scope: [this instance / this surface / all instances of this primitive].
Reason: [optional — "matches sibling X" or "violates calm-UX doctrine"].
```

Example that would have collapsed this further:

```text
Remove the focus ring on the location combobox search input in View As popover.
Scope: this surface only — don't change other CommandInputs.
Reason: matches the parent Search team input which has no ring.
```

Three lines, three constraints, zero ambiguity. The **"Reason" line** is the underused construct on style fixes — even one phrase telling me *why* the artifact is wrong tells me whether the fix is "kill it everywhere this pattern appears" or "kill it just here so it matches its neighbor." Different scopes, different blast radius.

