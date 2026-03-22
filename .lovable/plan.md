

## Fix Text Spilling Beyond Card During Swipe

**Problem:** The 4-layer card architecture means the text lives in Layer 3 (static content overlay, line 295-300) which has `overflow-hidden` — but the text container inside uses `pr-20` and `truncate` which only clip based on the full card width. When the card background (Layer 2) slides left, the text in Layer 3 remains full-width and visually extends past where the card background ends, spilling into the action buttons area.

**Root cause:** Layer 3 stays static at full width (`absolute inset-0`). The text truncates at the full card boundary, but the *visible card background* is narrower because Layer 2 has slid left. The text needs to shrink dynamically as the card opens.

### Fix — `src/components/dock/schedule/DockAppointmentCard.tsx`

Use the existing `x` motion value to dynamically clip Layer 3's width so it matches the visible card area:

1. **Add a `useTransform` for content width:** Derive a `contentWidth` from `x` that translates the drag offset into a CSS `calc()`:
   ```ts
   const contentClipRight = useTransform(x, (v) => `${Math.abs(v)}px`);
   ```

2. **Apply dynamic right padding on Layer 3** via `style={{ paddingRight: contentClipRight }}` — or better, use `clipPath` / `right` offset so the overflow-hidden clips earlier:
   ```tsx
   <motion.div
     className="absolute inset-0 z-20 pointer-events-none p-6 overflow-hidden"
     style={{ opacity: contentOpacity, right: contentClipRight }}
   >
   ```

   By setting `right` dynamically (e.g. when `x = -380`, `right = 380px`), the Layer 3 container physically shrinks from the right side. Combined with `overflow-hidden` and `truncate`, the text clips exactly at the visible card edge.

3. **Remove the fixed `pr-20`** from line 145 (`<div className="flex-1 min-w-0 pr-20">`) — the dynamic right offset on the parent handles the clipping, making the static padding unnecessary (badges are absolutely positioned anyway).

Single file, 3 small changes. The text will now dynamically truncate as the card slides open.

