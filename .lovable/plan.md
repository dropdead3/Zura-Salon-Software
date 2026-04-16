

## Prompt review

Good — "scroll issues" + recent screenshot is enough to triangulate. Teaching note: specifying *which* scroll behavior is broken (wheel doesn't scroll? scrolls the dialog instead? list is cut off with no scrollbar? touchpad jitter?) would let me skip diagnosis steps. I'll address the most likely culprits based on what's visible.

## Diagnosis

Three layered issues in the Preferred Stylist combobox inside `NewClientDialog`:

1. **Hard-coded short max-height.** `CommandList` defaults to `max-h-[300px]` (from `src/components/ui/command.tsx`). Inside a popover anchored to the dialog, this caps the visible list at ~7 rows regardless of available viewport space, which is what the screenshot shows (Jamie Vieira clipped).

2. **Wheel scroll likely hijacked by the parent Dialog.** Radix `Dialog` locks body scroll and uses pointer-event guards. The popover portal renders outside the dialog content, and `CommandList`'s scroll container doesn't always receive wheel events cleanly when nested under a modal — common Radix + cmdk friction. Symptom: hovering over the list and scrolling does nothing or scrolls the dialog instead.

3. **No `onWheel` propagation safety on `PopoverContent`.** Without `onWheel={e => e.stopPropagation()}` (or equivalent), the dialog's scroll lock can swallow wheel intent.

## Fix

Single-file change in `src/components/dashboard/schedule/NewClientDialog.tsx`:

1. Pass an explicit, viewport-aware max-height to `CommandList`:
   - `className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain"`
   - `overscroll-contain` prevents scroll chaining into the dialog.

2. Add scroll-event isolation on `PopoverContent`:
   - `onWheel={e => e.stopPropagation()}`
   - `onTouchMove={e => e.stopPropagation()}` (mobile/trackpad parity)

3. Ensure the popover itself doesn't introduce a second scroll container — keep `PopoverContent` `p-0` with no internal `overflow` so only `CommandList` scrolls.

4. Keep the bottom "Show all stylists" footer outside `CommandList` (already correct) so it stays pinned and doesn't scroll away.

No structural or logic changes. Search, location filter, "None" item, auto-clear, and avatars all unchanged.

## Acceptance checks

1. Open Add New Client → click Preferred Stylist → list opens at a usable height (up to ~60% of viewport, capped at 420px).
2. Wheel/trackpad scroll inside the list scrolls the list — never the dialog body.
3. Touch scroll on mobile scrolls the list cleanly.
4. Reaching top/bottom of the list does not bounce-scroll the dialog.
5. "Show all stylists" footer stays pinned at the bottom of the popover.
6. No regression in search, selection, auto-clear, or avatar rendering.

## Files to touch

- `src/components/dashboard/schedule/NewClientDialog.tsx`
  - Add explicit `className` on `CommandList` with viewport-aware max-height + `overscroll-contain`.
  - Add `onWheel` / `onTouchMove` stopPropagation on the stylist `PopoverContent`.

## Further enhancement suggestions

- Promote the same fix to the global `CommandList` in `src/components/ui/command.tsx` so every popover-combobox in the app benefits — would prevent this class of bug app-wide.
- Add a subtle top/bottom fade mask on the scroll container (gradient) to visually signal "more below" when the list overflows.
- Consider virtualizing the list (e.g., `@tanstack/react-virtual`) once any tenant has 50+ stylists, to keep popover render snappy.

