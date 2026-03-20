

## Replace Back Arrow with Tappable Progress Tracker

### Problem
The service step shows two back arrows (one in the header for step navigation, one for "All Categories" drill-down), which is confusing.

### Solution
Replace the header back arrow with a horizontal step progress tracker (Client → Service → Confirm) that:
- Shows all 3 steps as tappable segments
- Highlights the current step and marks completed steps
- Allows tapping a completed step to jump back to it
- Removes the back arrow from the header entirely

### Technical Changes

**File: `src/components/dock/schedule/DockNewBookingSheet.tsx`**

1. **Header area (lines 294-307)**: Remove the conditional back arrow button. Replace with a tappable 3-step progress bar below the title.

2. **Progress tracker markup**: Three pill segments labeled "Client", "Service", "Confirm" with:
   - Completed steps: solid violet background, checkmark icon, tappable
   - Current step: violet ring/outline, active label
   - Future steps: muted/dim, not tappable
   - Uses `font-display tracking-wide uppercase` to match existing Dock typography

3. **Navigation logic**: Tapping a completed step calls `setStep()` directly (e.g., tapping "Client" when on "Service" resets back to client selection). Future steps remain non-interactive.

4. **Remove `handleBack` usage from header** — the progress tracker replaces it entirely. The "All Categories" back link inside the service list remains unchanged.

### Visual Layout
```text
┌──────────────────────────────────┐
│  CHOOSE SERVICES            ✕    │
│  [✓ Client] ─ [● Service] ─ [ Confirm] │
│  ← All Categories                │
│  🔗 EXTENSIONS                   │
│  ...                             │
└──────────────────────────────────┘
```

Each step segment is a small rounded-full pill, tappable when completed.

