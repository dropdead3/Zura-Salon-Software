

# Fix: A-Z Bar Should Filter, Not Scroll

The A-Z bar was changed to scroll-to-section behavior but you want it to **filter** — clicking "B" shows only B-brands, clicking again clears the filter.

## Changes in `SupplyLibraryDialog.tsx`

**1. Update `filtered` memo to include letter filter**
- When `activeLetter` is set, filter brands to only those starting with that letter
- This replaces the scroll-to behavior

**2. Remove scroll-to infrastructure**
- Remove `letterRefs`, `scrollRef`, `scrollToLetter`, `setLetterRef`
- Remove `groupedByLetter` memo

**3. Simplify A-Z button handler**
- `onClick` toggles `activeLetter` (click same letter = clear, click different = set)

**4. Flatten brand grid back to a single ungrouped grid**
- Remove letter-grouped sections with sticky headers
- Render `filtered` brands directly in a single grid, with normal overflow scrolling

