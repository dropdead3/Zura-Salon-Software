

## Prompt review

Clear ask — name the surface (selected stylist chip), the relabel ("studio-artist" → "Level 2"), and the layout shift (inline, not stacked). Sharper next time: tell me whether you want the level slug *replaced* by the level number everywhere it appears, or just on this confirmation chip. I'll scope to this chip and flag the broader question.

## Diagnosis

The screenshot shows the **selected-stylist confirmation chip** that appears after a stylist is preselected (Wave 22.1 column-click flow) in `QuickBookingPopover.tsx`. It currently renders:

- Avatar (left)
- Name + slug stacked (`Jamie Vieira` / `studio-artist`)
- X button (right)

The slug `studio-artist` is `employee_profiles.stylist_level` (the raw slug from `stylist_levels` table). The component already has `getLevelNumber()` that maps slug → numeric level (used elsewhere in the picker for the Level badges). We just need to reuse it here.

## Plan — Wave 22.4: Selected stylist chip — inline level badge

### Behavior

Transform the chip from:
```
[Avatar]  Jamie Vieira              [X]
          studio-artist
```

To:
```
[Avatar]  Jamie Vieira  [Level 2]   [X]
```

### Fix shape

In `QuickBookingPopover.tsx` — locate the selected-stylist chip (the block rendering `preSelectedStylistName` with the slug below):

1. **Replace stacked layout** with inline flex row: avatar → name → level badge → spacer → X
2. **Resolve level number** from the preselected stylist's record using existing `getLevelNumber()` helper
3. **Render badge** using `<Badge variant="secondary">Level {N}</Badge>` (matches the picker's level badges for consistency)
4. **Fallback**: if no level → render `<Badge variant="outline">Unranked</Badge>` (consistent with Wave 22.2)
5. Remove the slug subtitle entirely

### Acceptance checks

1. Selected chip shows `Jamie Vieira` and `Level 2` inline on the same row
2. Avatar, name, badge are vertically centered
3. X button stays right-aligned
4. If stylist has no level → "Unranked" outline badge appears in the same slot
5. Tap X still clears preselection and returns to the picker
6. Chip styling (background, border, padding) unchanged — only inner layout differs

### Files

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — selected-stylist chip block

### Open question (worth flagging)

Should the slug also be replaced with "Level N" in the **stylist picker rows** themselves (where it may also appear as subtitle)? I'll keep the picker rows unchanged for now since they already have the Level badge on the right; happy to align them in a follow-up if you want the slug fully retired from staff-facing surfaces.

### Deferred

- **P2** Replace `stylist_level` slug with level number across all staff-facing surfaces (stylist directory, profile cards, schedule column headers) — trigger: when staff confusion arises about slug names like `studio-artist` vs. tier numbers
- **P2** Tooltip on the level badge showing the slug + tier description ("Level 2 — Studio Artist") for context — trigger: when a salon defines custom level names worth surfacing

