

## Move Time Inline with Client Name

**Problem:** Time and staff info on the far right get covered by the Finish Appt button on swipe. The time should sit next to the client name on the left so it stays visible.

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx`

### Layout Change

```text
Current:
│  Sarah Mitchell          9:14 AM – 10:44 AM  │
│  Balayage + Toner              👤 Jenna B.    │
│                                👥 w/ Alexis R. │

Proposed:
│  Sarah Mitchell · 9:14 – 10:44 AM             │
│  Balayage + Toner              👤 Jenna B.    │
│                                👥 w/ Alexis R. │
```

**Changes:**
1. Move the time span from the right side of the top row to inline after the client name, separated by a middle dot (·) delimiter, both sharing the left side
2. Remove the `justify-between` on the top row since both elements are now left-aligned
3. Apply to both the invisible spacer div and the visible text overlay
4. Time text gets the muted color treatment to visually separate it from the name

This keeps the time visible even when the card is swiped open, since it's on the left side away from the action tray.

