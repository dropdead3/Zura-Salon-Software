

## Add "+ Add Another Service" Button to Service Step Footer

### Change

In `src/components/dock/schedule/DockNewBookingSheet.tsx`, add a secondary button above the "Continue" button in the service step footer (lines 768-774). This button:

- Labeled "+ Add Another Service"
- Only visible when at least one service is selected (same condition as the chips)
- On tap, calls `setSelectedCategory(null)` to return to the category grid
- Styled as outline/dashed, matching the existing one from the confirm step (violet-400 text, border-dashed)

### Location
Insert before line 768 (the Continue button), inside the footer `div`, after the price summary.

```text
┌─────────────────────────────────────┐
│  [Full Balayage ✕] [Merm ✕]        │
│  2 services · 360m           $325   │
│  [ + Add Another Service ] (outline) │
│  [      Continue         ] (violet)  │
└─────────────────────────────────────┘
```

Single insertion, ~6 lines.

