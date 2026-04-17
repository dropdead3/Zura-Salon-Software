

## Prompt review

Sharp visual catch — the hover state on category rows currently extends edge-to-edge (see "Haircuts" row in your screenshot), which fights the bento-card aesthetic established everywhere else in the booking wizard. Sharper next time: when reporting a "make it bento" fix, mention the radius you want (e.g., "rounded-xl to match cards" vs "rounded-lg for tighter inline rows") so I don't have to infer. I'll plan for `rounded-xl` since it matches the bento card radius standard.

## Diagnosis

`src/components/dashboard/schedule/QuickBookingPopover.tsx` L1649 (and the duplicate Add-Ons branch at L1679):

```tsx
className="w-full flex items-center gap-3 text-left transition-all -mx-3 w-[calc(100%+1.5rem)] px-4 py-3 hover:bg-muted/60"
```

The `-mx-3 w-[calc(100%+1.5rem)]` pattern intentionally bleeds the row outward by 12px on each side to consume the parent's `p-3` padding. Combined with no `rounded-*` class, the hover renders as a full-width edge-to-edge band. That's the visual problem — it reads as "list selection" rather than "bento tile."

## Plan — Wave 22.17: Bento-style category hover

### Fix

`src/components/dashboard/schedule/QuickBookingPopover.tsx` — both category buttons (L1647–1669 and L1677–1696):

- Remove negative-margin bleed: drop `-mx-3 w-[calc(100%+1.5rem)] px-4`
- Add bento radius + inset padding: use `px-3 py-3 rounded-xl`
- Keep `hover:bg-muted/60` and `transition-all`
- Preserve existing flex/gap layout

Resulting className:
```tsx
"w-full flex items-center gap-3 text-left transition-all px-3 py-3 rounded-xl hover:bg-muted/60"
```

This lets the parent's `p-3` container remain the visual gutter, and the hover state becomes a contained rounded tile that respects the bento rhythm — matches the selected-stylist card and service tiles already in the same wizard.

### Acceptance checks

1. Hovering a category row (Haircuts, Blonding, etc.) shows a rounded-xl highlight that does NOT touch the popover's left/right edges
2. There's visible breathing room (12px) between the hover edge and the popover frame on both sides
3. The Add-Ons & Extras virtual category receives the same treatment
4. Selected-state styling (selectedCount badge) continues to render correctly
5. No layout shift between hover/non-hover states
6. Light + dark mode both render the contained hover correctly

### Files

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — two button className updates (L1649, L1679)

### Open question

None.

### Deferred

- **P3** Apply the same bento-hover treatment to the search-results service rows (L1557, L1600) — they already use `rounded-lg` so they're closer, but worth standardizing on `rounded-xl` for visual consistency across the wizard. Trigger: after this ships and you confirm the radius feels right.

