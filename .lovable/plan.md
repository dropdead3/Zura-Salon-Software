

# Fix Logo Size Selector for Wide Logos

## Problem
The logo size selector uses fixed height classes (`h-6`/`h-10`/`h-14`) with `object-contain`. For wide/landscape logos (like "DROP DEAD" in the screenshots), this only changes the bounding box height — the logo itself stays the same width because `object-contain` scales to fit the constraining dimension (width, not height). The visual result is more padding, not a bigger logo.

## Solution
Replace fixed `h-*` classes with `max-h-*` and add explicit width scaling so the logo actually grows/shrinks visually. Use a combination of `max-h` and `max-w` percentages to create meaningful size differences for both tall and wide logos.

### Size mapping (preview + print):
| Size | Preview (Tailwind) | Print (inline) |
|------|-------------------|----------------|
| `sm` | `max-h-8 max-w-[50%]` | `max-height:32px;max-width:50%` |
| `md` | `max-h-12 max-w-[70%]` | `max-height:48px;max-width:70%` |
| `lg` | `max-h-16 max-w-[90%]` | `max-height:64px;max-width:90%` |

All with `w-auto h-auto object-contain` so the image scales naturally within the constraint box.

## Files to modify

### `src/components/dashboard/settings/terminal/ZuraPayReceiptsTab.tsx`
- Line 33: Replace `logoHeightClass` with a combined class string using `max-h` + `max-w` instead of fixed `h-*`
- Line 53: Update the `<img>` to use the new sizing classes, remove fixed height

### `src/components/dashboard/transactions/ReceiptPrintView.tsx`
- Update `getLogoHeight()` (or replace it) to return both max-height and max-width inline styles
- Line 62: Apply the new sizing to the logo `<img>` tag

