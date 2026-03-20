

## Make Assistant Selection Clearer with "+ Add Assistant" Label

### Single file: `src/components/dock/schedule/DockNewBookingSheet.tsx`

**Replace the inline chips on the Stylist row** (lines 955-982) with a dedicated "Assistant" row below the Stylist row (still inside the Details card). This new row will:

1. **Show a clear label**: An "ASSISTANT" label on the left (same style as "STYLIST", "LOCATION" etc.) with a `Users` icon
2. **Show "+ Add an assistant" text** on the right when none selected — tapping it expands/reveals the chip picker
3. **When expanded or when assistants are selected**: Show the selectable team member chips inline
4. **When assistants are selected but picker collapsed**: Show selected names as summary text

### Layout
```text
│ 👤 STYLIST                                           │
│    Demo Mode                                         │
├──────────────────────────────────────────────────────┤
│ 👥 ASSISTANT                      + Add an assistant │
│    (tap to expand)                                   │
│    [Alexis R.] [✓ Eric D.] [Sam T.]  ← shown when   │
│                                        expanded      │
├──────────────────────────────────────────────────────┤
│ 📅 DATE                                              │
```

### Implementation

- Add `showAssistantPicker` state back to `ConfirmStepDock`
- After the Stylist `DetailRow` (line 944–983), insert a new row with the `Users` icon and "Assistant" label
- Right side: if no assistants selected, show "+ Add an assistant" button (violet text); if selected, show names + tap to edit
- Below: conditionally render the chip list when `showAssistantPicker` is true
- Restore the Stylist row to a simple `DetailRow` (remove the inline chips from it)

