

## Today's Prep Card — Gap Analysis and Enhancement Plan

After reviewing the compact `TodaysPrepSection` (dashboard card), the full `TodayPrep` page, and the `useTodayPrep` hook, here are the gaps and proposed enhancements.

---

### Gap 1: No Service Name Displayed

**Issue**: The compact card shows time, status, client name, CLV tier, and visit count — but never shows *what service* the client is booked for. This is critical prep context. The stylist needs to know if they're doing a cut, color, or blowout before looking at the full page.

**Fix**: Add the service name (truncated) after the client name, on the same line or as a subtle secondary line. The data is already in `appt.serviceName`.

---

### Gap 2: No Birthday Alert

**Issue**: The full prep page has a birthday alert ("It's Jane's birthday today 🎂") but the compact card does not. Birthdays are a high-value touchpoint — missing this on the dashboard means the stylist might not notice until they open the full page (if they even do).

**Fix**: Add a small birthday indicator (🎂 emoji or `Cake` icon) next to the client name when `appt.birthday` matches today's date.

---

### Gap 3: No "Now" / Next-Up Indicator

**Issue**: The full prep page highlights the active appointment with a `ring-primary/40` and a "Now" badge. The compact card has no sense of temporal context — the stylist can't tell which appointment is current or next without reading all the times.

**Fix**: Add a subtle left-border accent or small "Now" / "Next" label on the currently active or upcoming appointment row.

---

### Gap 4: No Notes Indicator

**Issue**: The hook fetches `clientDirectoryNotes`, `previousAppointmentNotes`, and `clientNotes`. The full page displays them. The compact card shows none of this, and doesn't even hint that notes exist. If a client has a color formula note or allergy warning, the stylist won't know from the card alone.

**Fix**: Add a small `StickyNote` icon indicator when the appointment has any notes attached. This serves as a visual cue to open the full prep page for details.

---

### Gap 5: No VIP Indicator

**Issue**: The hook returns `isVip` and the full page renders a VIP badge. The compact card ignores this entirely.

**Fix**: Add a small `Star` or `Crown` icon next to the client name for VIP clients, similar to how `UserPlus` is shown for new clients.

---

### Gap 6: Completed Appointments Not Visually Distinguished

**Issue**: The full page dims completed appointments (`opacity-60`). The compact card renders all rows identically regardless of completion status. As the day progresses, the stylist can't see at a glance which appointments are done.

**Fix**: Apply `opacity-50` and `line-through` (or just `opacity-50`) to completed appointment rows.

---

### Gap 7: Card Header Missing Appointment Count Summary

**Issue**: The card title says "TODAY'S PREP" but doesn't indicate how many appointments exist or how many need action. The full page shows "5 appointments today · 2 completed".

**Fix**: Add a `CardDescription` or a small stat badge in the card header showing total count and/or unconfirmed count (e.g., "5 today · 2 to confirm").

---

### Summary of Changes

**Single file edit**: `src/components/dashboard/TodaysPrepSection.tsx`

| Enhancement | Data Source | Visual Treatment |
|---|---|---|
| Service name | `appt.serviceName` | Truncated text below client name, `text-xs text-muted-foreground` |
| Birthday alert | `appt.birthday` | 🎂 emoji inline with client name |
| Now/Next indicator | Compare `appt.startTime` / `appt.endTime` to `new Date()` | Left border accent `border-l-2 border-primary` on active row |
| Notes indicator | `appt.clientDirectoryNotes.length + appt.previousAppointmentNotes.length + (appt.clientNotes ? 1 : 0)` | Small `StickyNote` icon (muted) |
| VIP indicator | `appt.isVip` | `Star` icon inline with client name |
| Completed dimming | `appt.status === 'completed'` | `opacity-50` on row |
| Header summary | `appointments.length` + count of `NEEDS_CONFIRM` statuses | `CardDescription` text under title |

### Row Layout After Enhancement

```text
│ 9:00 AM  [Booked]   Jane D. 🎂 ★VIP 📝  Cut + Color    Gold   📞 Confirm  │  ← border-l-2 primary (Next)
│10:30 AM  [Confirmed] Mark T.              Highlights     Silver  12 visits  │
│12:00 PM  [Completed] Sarah K.             Blowout        Bronze   4 visits  │  ← opacity-50
```

### No Hook Changes

All required data is already fetched and available in `PrepAppointment`. This is purely a UI enhancement.

