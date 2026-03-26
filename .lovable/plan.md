

## Improve "Mark Configured" Visibility in Drill-Down

### Problem
"Mark Configured" is buried as a small ghost button alongside "Components" — users don't understand it's the final action needed to complete service setup. It blends into the UI rather than standing out as the completion step.

### Solution
Move "Mark Configured" out of the inline button row and place it as a **prominent footer bar** at the bottom of the drill-down panel. This creates a clear visual call-to-action that reads as "you're done configuring — confirm it."

```text
┌─────────────────────────────────────────────────────────┐
│  Requires Color/Chemical [on]    Vessels: [bowl] [bottle]│
│─────────────────────────────────────────────────────────│
│  Assistant Prep [off]   Smart Mix [off]   Formula [off] │
│  Variance Threshold ────────────────── 10%              │
│─────────────────────────────────────────────────────────│
│  ✓  Review complete? Mark this service as configured    │
│     to track your setup progress.                       │
│                              [ ✓ Mark Configured ]      │
└─────────────────────────────────────────────────────────┘
```

### Changes

**File: `ServiceTrackingSection.tsx`**

1. **Remove** "Mark Configured" / "Re-flag" from the top action row (lines ~672–698) — keep only the "Components" button there.

2. **Add a footer section** at the bottom of the tracked drill-down (after the toggles grid, ~line 798), with:
   - A light background strip (`bg-primary/5 border-t border-primary/20 rounded-b-lg`)
   - Helper text: "Review complete? Mark this service as configured to track your setup progress."
   - A visible `Mark Configured` button using `variant="default"` (filled) instead of ghost
   - If already dismissed, show a muted "Configured ✓" label with a small "Undo" link

3. **Same treatment for the untracked drill-down** (lines ~813–841): move "Mark Configured" to a bottom bar with context text explaining "If this service doesn't need tracking, mark it as reviewed."

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

