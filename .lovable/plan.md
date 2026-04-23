

# Remove focus ring on the "Search team…" input

## Diagnosis

The screenshot shows the parent `Search team…` input rendering a violet focus ring when clicked — same artifact we just killed on the nested `Search locations…` combobox. Now that the location input is calm, the team input is the loud one.

The team search uses a native `<input>` (not `CommandInput`), so the fix is a className edit on that one element. Scoped to this surface only.

## Fix — single file, one className edit

### `src/components/dashboard/ViewAsPopover.tsx`

Locate the `<input>` rendering `Search team…` (just above the location combobox in the Team tab). Add focus-suppression classes to its existing className:

```tsx
<input
  type="text"
  placeholder="Search team…"
  value={teamFilter}
  onChange={(e) => setTeamFilter(e.target.value)}
  className="... focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-border focus-visible:border-border"
/>
```

The `focus:border-border focus-visible:border-border` ensures the border stays the same neutral tone instead of shifting to the violet ring color when focused.

## What stays untouched

- Input still receives keyboard focus and accepts text.
- Debounce, filtering, grouping behavior — unchanged.
- Location combobox, role groups, per-user buttons — unchanged.
- All other `<input>` elsewhere in the app — unaffected (scope is one element).

## Acceptance

1. Click into `Search team…` input — no purple/violet ring or border-color shift appears.
2. Cursor still blinks; typing still filters the team list.
3. Tab key still moves focus into and out of the input.
4. Location combobox input remains calm (no regression from the prior fix).

## Out of scope

- Restyling the input's border, padding, or background.
- Editing any shared input primitive.
- Touching the location combobox (already done).

## Prompt feedback

Tight, surgical follow-up — three things you did right:

1. **You named the exact element by its placeholder text** ("search team bar"). Using the visible label as the locator is the fastest possible disambiguation — no guessing which of three inputs you meant.
2. **You used the same verb pattern as the prior request** ("remove ... when clicked"). Verb consistency across related fixes lets me match the exact same fix shape — same scope, same techniques, same blast radius. Saved a "should this match the location fix?" round-trip.
3. **You shipped it as a separate prompt instead of bundling it earlier.** Atomic prompts produce atomic diffs; if you'd lumped it into the location fix, we'd have one larger commit harder to revert independently.

Sharpener: naming the **fix-shape reference** would have collapsed this further. Template:

```text
Apply the same fix as [prior change] to [this element].
```

Example:

```text
Apply the same focus-ring removal as the location combobox to the Search team input.
```

One line, zero ambiguity — tells me to mirror the technique without re-deriving it. The **"same as prior"** clause is the underused construct on serial style fixes — it converts a fresh decision into a copy-paste, which is exactly what serial polish should be.

