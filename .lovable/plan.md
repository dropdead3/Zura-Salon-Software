
Fix the active dock tab so the glow becomes a true full-width rounded pill for the whole tab slot, not a small circle behind just the icon.

1. Re-anchor the active background to the button, not the icon
- File: `src/components/dock/DockBottomNav.tsx`
- Remove the active `motion.div` from the `h-11 w-11` icon wrapper.
- Render the active background as a button-level layer so it can span the full clickable area.
- Use a fully rounded pill shape such as `absolute inset-y-0 inset-x-1 rounded-full` so it fills the tab slot cleanly with even side padding.

2. Center the content independently above that pill
- Wrap icon + label in a `relative z-10 flex h-full flex-col items-center justify-center` content stack.
- This keeps the visual center tied to the whole selected tab area instead of the icon wrapper.
- The icon stays centered inside the widened glow, and the label is visually contained within the active button.

3. Stop offsetting the label outside the selected area
- The current absolute label positioning is part of why the selected state feels misaligned.
- Move the label into the centered content stack for the active tab instead of using `absolute -bottom-0.5`.
- Add a tiny vertical gap so icon and label feel balanced inside the pill.

4. Keep the visual language subtle and on-brand
- Preserve the existing violet fill/shadow treatment, just widen it to the full tab.
- Keep `rounded-full` on the active background so the ends stay fully round.
- Keep the current spring motion so the pill still slides smoothly between tabs.

Technical implementation shape
- Button remains the positioning container: `relative flex-1`
- Active layer becomes button-sized: `motion.div` on the button, not inside the icon wrapper
- Content becomes a centered stack above it
- If needed, slightly increase button height from `h-12` so both icon and label sit comfortably inside the rounded pill without clipping

Expected result
- The selected state reads as one full rounded button.
- The glow/fill covers the full intended tap target.
- The icon is centered within that active area.
- The label no longer makes the highlight feel off-center or incorrectly shaped.
