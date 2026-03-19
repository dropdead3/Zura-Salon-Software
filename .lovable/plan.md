

# Fix Suggested Qty Column Alignment

## Problem
The quantity numbers (the "1"s) don't left-align because the "Auto" / "Edited" labels that follow them vary in width, pushing the numbers to different positions. The column is right-aligned with `justify-end`, so the varying trailing content causes misalignment.

## Solution
Give the quantity span a fixed minimum width so it always occupies consistent space, and separate the "Auto"/"Edited" label into a fixed-width slot so the number position stays stable.

### File: `CommandCenterRow.tsx`

**Line 303** — Change the inner flex container to use a fixed-width slot for the number:
- Give the number `<span>` a consistent `min-w-[2rem] text-center` so single and multi-digit numbers align
- Give the "Auto"/"Edited" label a fixed `min-w-[3.5rem]` wrapper so the number's position doesn't shift based on label presence

This ensures all "1"s align vertically regardless of whether "Auto", "Edited", or nothing appears beside them.

| File | Change |
|------|--------|
| `CommandCenterRow.tsx` (~lines 303, 328-359) | Add fixed-width slots for qty number and label |

