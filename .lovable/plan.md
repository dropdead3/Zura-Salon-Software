
Goal: keep the Supply Library dialog the same height even when an A–Z filter returns only a few brands, while preserving normal scrolling for large result sets.

What’s causing it
- The dialog shell currently uses `max-h-[85vh]`, so its height collapses to match content when the filtered brand list is short.
- The inner brand browser already has scroll behavior, but the outer dialog is still allowed to resize, which creates the “jumping window” effect.

Implementation plan

1. Lock the dialog to a stable height
- In `SupplyLibraryDialog.tsx`, change the main `DialogContent` from a max-height-only layout to a fixed viewport-aware height.
- Use a stable shell such as `h-[85vh] max-h-[85vh] overflow-hidden flex flex-col` so the window stays visually consistent whether there are 1 brand or 100.

2. Keep only the brand list area scrollable
- Preserve the current header and alphabet bar as fixed, non-scrolling regions.
- Ensure the brand browsing region remains the only vertical scroll container with `flex-1 min-h-0 overflow-y-auto`.

3. Prevent bottom controls from causing layout shifts
- Move the “Missing a brand? Suggest one” CTA out of the scrolling list and make it a fixed bottom row inside the dialog content area.
- Keep it `shrink-0` so it stays anchored and doesn’t affect the height of the scrollable list when filters reduce results.

4. Maintain current filtering behavior
- Keep the A–Z selector as a true filter, not a scroll/jump control.
- Keep all brands visible when no letter is active, and show only matching brands when a letter is selected.

Expected result
- The modal keeps the same size before and after filtering.
- Short filtered results show empty breathing room instead of shrinking the window.
- Long result sets still scroll normally inside the brand list area.
- The experience feels much more stable and less visually jarring.

Technical notes
- File: `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx`
- Main layout change is at the dialog shell (`DialogContent`) plus the `BrandCardGrid` body structure.
- No backend or data changes are needed; this is purely a UI layout stabilization fix.
