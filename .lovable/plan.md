

## Make Unlock Glow More Subtle

**File:** `src/components/dock/DockUnlockTransition.tsx`

**Line 43** — Reduce the violet pulse opacity values:
- Center color: `rgba(139,92,246,0.25)` → `rgba(139,92,246,0.10)`
- Mid color: `rgba(59,130,246,0.08)` → `rgba(59,130,246,0.03)`

**Line 46** — Lower peak animated opacity from `1` to `0.7` so the glow never reaches full intensity.

These two changes make the radial pulse a gentle hint rather than a prominent flash, while preserving the premium handoff feel.

