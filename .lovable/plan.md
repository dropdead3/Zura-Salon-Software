

# Fix Responsiveness — Backroom Product Catalog

Looking at the screenshot and code, the main issues at smaller window sizes are:

1. **Product rows overflow horizontally** — the depletion method controls (Select + Billable toggle + Overage toggle) don't wrap gracefully, causing horizontal overflow with controls getting cut off at the right edge
2. **Card header cramped** — title + badge + button cluster collides at narrower widths
3. **Alphabet selector dense** — 26 letters plus "My Catalog" chip can feel tight

## Changes in `BackroomProductCatalogSection.tsx`

### 1. ProductRow depletion controls — better stacking
The depletion controls row (lines 846–886) currently uses `flex-wrap` but the inner items don't break cleanly. Fix:
- On small screens, stack the depletion method select above the Billable/Overage toggles
- Make the Select full-width on mobile (`w-full sm:w-[120px]`)
- Group Billable + Overage toggles on one line, depletion method on its own line at small widths

### 2. Product name + brand — prevent overflow
Line 829: The product name can be very long (e.g., "Artistic Toner Cool Blonde —..."). The `truncate` class is there but the parent flex container needs `min-w-0` propagated properly. Ensure the info column constrains the name.

### 3. Card header — tighten mobile layout
Lines 367–393: Already has `flex-col sm:flex-row` which is good. Ensure the badge + button cluster wraps properly by adding `flex-wrap` to the right-side controls div.

### 4. Alphabet selector — smaller hit targets on narrow screens
Lines 408–462: Already using `w-6 h-6 sm:w-7 sm:h-7` and `flex-wrap` which is correct. Just verify gap doesn't cause overflow — reduce gap to `gap-0.5 sm:gap-1.5`.

### 5. Brand browsing header — stack on mobile
Lines 611–648: The brand name + "Add Entire Brand" + "Select All" buttons should stack on narrow screens. Change to `flex-col sm:flex-row` with proper alignment.

### Files changed
- `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx` — ProductRow depletion layout, card header, alphabet gap, brand browsing header

