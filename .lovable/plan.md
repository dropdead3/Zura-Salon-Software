

## Reconfigure Appointment Card Layout — Two-Column Design

**Problem:** All info is vertically stacked on the left, making cards tall with wasted horizontal space on the right side.

**Solution:** Rearrange to a two-column layout:

```text
┌──────────────────────────────────────────┐
│  Sarah Mitchell          9:29–10:59 PM   │
│  Balayage + Toner     👤 Jenna B.    🧪  │
│                       👥 w/ Alexis R.    │
└──────────────────────────────────────────┘
```

**Layout changes in `DockAppointmentCard.tsx`:**

1. **Top row** — Client name (left) + time (right, no icon, muted). Both on one line.
2. **Bottom row** — Service name (left) + stylist & assistant stacked (right, aligned right).
3. **Flask icon** — stays top-right as-is, overlapping the time area.

This eliminates the separate time row and separate stylist/assistant rows from the left stack, distributing info across the card width. Reduces card height by ~40%.

**Specific changes:**
- Remove the vertical stack of stylist → assistant → time from the left column
- Place time in the top-right corner as text (no Clock icon needed)
- Place stylist and assistant names in the bottom-right, right-aligned, with their icons
- Service stays below client name on the left
- Reduce vertical margins (`mt-2` → `mt-0.5`, `mt-1.5` → removed)
- Both the invisible spacer div and the visible text overlay get the same layout update

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx` (single file)

