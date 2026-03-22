

## Fix: Card Content Hidden Behind Opaque Draggable Layer

**Root cause:** The z-index swap (draggable `z-20`, text `z-10`) made the opaque card background cover the text overlay entirely. The card background is solid, so nothing below it is visible.

**Fix:** Merge the visible text content into the draggable `motion.div` itself, eliminating the separate static text overlay. This means:
- The text moves with the card on swipe (which is actually better UX — content slides with the card)
- No z-index conflict since there's only one visual layer
- The invisible spacer div is no longer needed

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

**Changes:**
1. Replace the invisible spacer div (lines 156-168) with the actual visible content (currently in the static overlay at lines 172-199)
2. Remove the static text overlay `motion.div` entirely (lines 172-199)
3. The `contentOpacity` transform is no longer needed — remove it
4. The flask icon stays inside the draggable div as-is

The card structure simplifies to:
```text
<div wrapper>          -- outer, z-[1], overflow hidden
  <motion.div tray>    -- action buttons behind
  <motion.div drag>    -- draggable card with VISIBLE content inside
</div>
```

Single file, removes ~20 lines of duplication.

