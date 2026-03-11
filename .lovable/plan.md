
Root-cause analysis (from current code + screenshot)

1) The hover row is being horizontally clipped.
- In `src/components/dashboard/AggregateSalesCard.tsx`, both breakdown wrappers use:
  - `motion.div` with `className="overflow-hidden"` (needed for height animation)
  - inner list container with `-mx-1` (lines around 1057 and 1119)
- Because the list is pushed outside by negative horizontal margin, the row corners (`rounded-lg`) extend past the clipping box and get cut off, which creates the “strange” edge shape.

2) Why it still looks off even after radius tweaks
- Changing `rounded-xl` → `rounded-lg` reduced curvature, but clipping remained.
- So the problem is geometry (overflow + negative margin), not only corner radius.

Plan to fix and polish (single file)

File: `src/components/dashboard/AggregateSalesCard.tsx`

A) Remove the clipping conflict
- Services list wrapper: change `... space-y-1 text-left -mx-1` → `... space-y-1 text-left px-1`
- Retail list wrapper: same change.
- Keep the `motion.div overflow-hidden` for vertical animation; stop extending children outside its bounds.

B) Make hover chips match the bento/subcard look
- Keep row radius at `rounded-lg` (matches nested card radius token scale in this project).
- Keep row as self-contained inset highlight with balanced padding (e.g. `px-3 py-2.5`).
- Slightly soften hover fill so edges read cleaner in dark mode (e.g. `hover:bg-muted/40` or `/45`).

C) Improve interaction polish
- Retail row buttons: add `focus-visible` ring classes for clean keyboard focus and visual quality.
- Services rows are non-clickable: either remove hover background there or switch to a neutral non-interactive style to avoid “fake button” feel.

D) Keep both columns visually identical
- Apply same spacing/radius structure to Services and Retail breakdown rows so they render as a matched pair.

Validation checklist after implementation

1) Hover first and last row in Retail and Services: corners should be fully visible (no flat/chopped ends).
2) Ensure left/right inset spacing looks intentional (content never feels edge-touching).
3) Confirm expanded/collapsed animation still smooth (no horizontal jump).
4) Check at current viewport (`1424x1162`) and one narrower dashboard width for consistency.
