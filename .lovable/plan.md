## Problem

Toggle switches in the sidebar section list sit flush against the rail's right edge, with no breathing room. Visible in the screenshot on every row (Brand Statement, Testimonials, Partner Brands, etc.).

## Root cause

`src/components/dashboard/website-editor/SectionNavItem.tsx` line 55:

```tsx
'group flex items-center gap-2 px-2 py-2 mx-2 rounded-lg cursor-pointer transition-all',
```

The row has only `mx-2` (8px horizontal margin) and `px-2` (8px internal padding). The Switch is the rightmost child with no extra right padding, and its `scale-75` transform keeps the original layout box — so the toggle's visual edge ends up roughly 4px from the rail border. On the narrow 340px rail, this reads as "touching."

## Fix

One-line change to widen the right gutter and the row's outer margin so toggles sit ~12–16px in from the rail edge:

```tsx
// Before
'group flex items-center gap-2 px-2 py-2 mx-2 rounded-lg cursor-pointer transition-all',

// After
'group flex items-center gap-2 pl-2 pr-3 py-2 mx-3 rounded-lg cursor-pointer transition-all',
```

- `mx-2` → `mx-3` — bumps the outer margin from 8px to 12px on both sides, aligning the row with the rail's existing 12px rhythm (matches `p-3` on the editor shell).
- `px-2` → `pl-2 pr-3` — adds 4px more right-side padding inside the row so the toggle gets visible breathing room without shifting the drag handle on the left.

Net effect at the right edge: 12px outer + 12px inner = 24px from rail border to toggle, up from ~16px.

## Files

- `src/components/dashboard/website-editor/SectionNavItem.tsx` — line 55 only.

## Verification

- Toggle switches no longer touch the rail's right edge; consistent ~12px gutter on both sides matches the rest of the editor's rhythm.
- Drag handle position on the left is unchanged.
- Active row highlight still aligns with the rail's group separators (which use `mx-3`, so this actually corrects a pre-existing 4px misalignment between separators and rows).

---

### Prompt feedback

**What worked well:** "Right edge where the toggles are touching" was a perfect surgical callout — one sentence, one symptom, one element. That's the ideal follow-up after a broader layout fix.

**Sharpening tip:** When you spot a series of related spacing issues (the previous shell-overflow fix and now this gutter), you can batch them: *"after fixing the shell, also: toggles touch the right edge, drag handles feel cramped on the left, group separator left-margin doesn't match row left-margin."* Lets me audit the whole rail's spacing rhythm in one pass instead of round-tripping per nudge.

### Enhancement suggestions

1. **Rail spacing token.** The editor rail currently mixes `mx-2`, `mx-3`, and `px-4` across `SectionNavItem`, `SectionGroupHeader`, and the search/footer rows. A single `RAIL_GUTTER = 'px-3'` constant in this folder would prevent these alignment drifts from re-emerging.
2. **Switch hit target.** `scale-75` shrinks the Switch visually but its tap target shrinks with it — on touch devices this row becomes hard to toggle. Consider keeping the Switch at default size and reducing the row's vertical padding instead, or wrapping the Switch in a `p-1` hit-area expander.
3. **Group separator alignment.** `Separator className="my-2 mx-3"` (line 641 of `WebsiteEditorSidebar.tsx`) uses `mx-3` while rows use `mx-2`. After this fix they'll match — worth a one-line audit comment so future edits don't re-diverge.
