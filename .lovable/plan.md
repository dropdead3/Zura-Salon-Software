

## Prompt review

Sharp and specific — you pinpointed the exact mismatch: the category hover (`rounded-xl` = 12px) is rounder than the selected-stylist card above it. Sharper next time: when calling out radius mismatches between adjacent elements, name the reference radius if you know it (e.g., "match the `rounded-lg` on the stylist card") so I don't have to inspect to confirm. I'll inspect to confirm the exact target.

## Diagnosis

From the screenshot, the selected-stylist card sits above the search/category list. Looking at `QuickBookingPopover.tsx` L1462 (selected stylist card) — it uses `rounded-lg` (8px). The category hover I just shipped in Wave 22.17 uses `rounded-xl` (12px). Visual mismatch confirmed: hover radius is 4px larger than the card it sits beneath.

The search input and "New Client Consultation" service tile in the screenshot also appear to use `rounded-lg` — so the whole popover's interior elements share an 8px radius rhythm. The category hover should join that rhythm.

## Plan — Wave 22.18: Align category hover radius with selected-stylist card

### Fix

`src/components/dashboard/schedule/QuickBookingPopover.tsx` — both category buttons (L1649 and L1679):

- Change `rounded-xl` → `rounded-lg` on both category row buttons
- Keep all other classes identical (`px-3 py-3`, `hover:bg-muted/60`, `transition-all`, flex layout)

Resulting className:
```tsx
"w-full flex items-center gap-3 text-left transition-all px-3 py-3 rounded-lg hover:bg-muted/60"
```

### Acceptance checks

1. Category row hover now uses `rounded-lg` (8px), matching the selected-stylist card above it
2. Visual rhythm across the popover is consistent: stylist card, search input, service tiles, and category hover all share 8px radius
3. Hover state still respects the 12px gutter (no edge bleed) — only the radius changed
4. Add-Ons & Extras virtual category receives the same treatment
5. Light + dark mode both render correctly

### Files

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — two-class swap (`rounded-xl` → `rounded-lg`) at L1649 and L1679

### Open question

None.

### Deferred

- **P3** (carried from Wave 22.17) Standardize search-results service rows on the same `rounded-lg` if any drift exists. Trigger: after this ships.

