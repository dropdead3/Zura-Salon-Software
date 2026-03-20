

## Split Stylist Row into 2 Columns with Assistant Button

### Change

In `src/components/dock/schedule/DockNewBookingSheet.tsx`, replace the standalone Stylist `DetailRow` (line 935) and the separate Assistant section (lines 940-974) with a single 2-column row inside the Details card:

- **Column 1 (left):** Stylist detail (icon + label + name) — same as current `DetailRow`
- **Column 2 (right):** An "Add Assistant" button that opens the assistant chip picker inline or toggles visibility of the assistant chips below

### Implementation

1. **Replace line 935** (the Stylist DetailRow) with a 2-column layout using `grid grid-cols-2`:
   - Left: existing Stylist icon/label/value
   - Right: a tappable "Add Assistant" button (Users icon + text, violet accent styling). If assistants are already selected, show their names (e.g., "Kylie M., Sam") instead of "Add Assistant"

2. **Move the assistant chip picker** (lines 940-974) into a collapsible section that appears directly below the Stylist row (still inside the Details card), toggled by the "Add Assistant" button. This keeps the UI clean — chips only appear when the button is tapped.

3. Remove the separate "Assistant (optional)" block outside the card since it's now integrated.

### Layout
```text
┌──────────────────────────────────────────┐
│ 📍 Location          │                   │
│    North Mesa         │                   │
├──────────────────────┼───────────────────┤
│ 👤 Stylist           │  [+ Add Assistant]│
│    Demo Mode         │   or "Kylie M."   │
├──────────────────────┴───────────────────┤
│ (if expanded) [Alexis R.] [✓Kylie] [Sam]│
├──────────────────────────────────────────┤
│ 📅 Date              │                   │
│    Fri, Mar 20       │                   │
├──────────────────────────────────────────┤
│ ⏱ Duration           │                   │
│    450m              │                   │
└──────────────────────────────────────────┘
```

Single file change: `src/components/dock/schedule/DockNewBookingSheet.tsx`

