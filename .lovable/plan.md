

## Fix Dock Bottom Nav Indicator to Full Round

**Problem:** The sliding pill indicator behind the active tab uses `rounded-xl` (line 43), but the outer nav is `rounded-full`. The indicator bubbles should match and be fully round.

**File:** `src/components/dock/DockBottomNav.tsx`

**Change:** Line 43 — replace `rounded-xl` with `rounded-full` on the `motion.div` indicator element.

