

## Fix: All Active Cards Should Swipe Left

**Root Cause:** The static text overlay (`z-20`) sits above the draggable card layer (`z-10`). Even with `pointer-events-none`, framer-motion's drag hit-testing gets blocked by the higher z-index overlay — particularly for cards below the first one in a scrollable container.

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

**Changes:**

1. **Line 92** — Add `relative z-[1]` to the outer wrapper so each card creates its own stacking context, preventing cross-card z-index interference:
   ```
   <div className="relative z-[1] overflow-hidden rounded-xl" ...>
   ```

2. **Line 124** — Raise the draggable `motion.div` from `z-10` → `z-20` so it's the top interactive layer that receives drag events.

3. **Line 153** — Lower the text overlay from `z-20` → `z-10` (it already has `pointer-events-none`, this just ensures it doesn't sit above the drag surface).

Three small class changes, no logic changes.

