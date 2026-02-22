

# Enhance Appointment Card: Phone Formatting, Stylist Name, Assistant Name

## Current Issues (from screenshot)

1. **Phone number is raw digits** -- "14805430240" displayed unformatted on the card. Should be "(480) 543-0240" (strip leading country code 1, then format with parentheses and dashes).
2. **No stylist name** -- The card shows client name, services, and time but no indication of which stylist is assigned. In DayView, stylists are column headers so it's implicit, but in WeekView/AgendaView it's critical. Even in DayView, it's useful for multi-column overlap awareness.
3. **No assistant name** -- When an assistant is assigned (indicated by the Users icon), the assistant's name is not shown. Only a generic icon or "ASSISTING" badge appears.

## Changes

### 1. Fix phone formatting across all views

**Files:** `DayView.tsx`, `WeekView.tsx`

Replace the `formatPhone` function that currently just returns raw digits:

```
// Current (broken)
function formatPhone(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return digits; // just returns raw digits!
  return phone;
}
```

With proper formatting using the existing `formatPhoneDisplay` utility from `src/lib/utils.ts` which already handles 10-digit and 11-digit (with leading 1) US numbers and formats as `(XXX) XXX-XXXX`.

- Import `formatPhoneDisplay` from `@/lib/utils`
- Replace all `formatPhone(...)` calls with `formatPhoneDisplay(...)`
- Remove the local `formatPhone` function

### 2. Add stylist name to non-compact appointment cards

**Files:** `DayView.tsx`, `WeekView.tsx`

The `PhorestAppointment` type already includes `stylist_profile?: { display_name, full_name, photo_url }`. This data is already joined in the query.

- For non-compact DayView cards (duration > 30min): Add stylist name on a new line below service name, using `formatDisplayName` from `@/lib/utils` (shows "FirstName L." format)
- For WeekView medium and large cards: Same treatment -- add stylist display name below service name
- Style: `text-xs opacity-70` to keep it secondary to client name and service

### 3. Show assistant name on appointment cards when assigned

**Files:** `DayView.tsx`, `WeekView.tsx`

Currently, when `hasAssistants` is true, only a `Users` icon is shown. We need to show the assistant's name.

The challenge: assistant data (names) is not currently available on the appointment card props. The `appointmentsWithAssistants` is just a `Set<string>` of appointment IDs -- it doesn't carry names.

**Approach:** 
- Create a new hook `useAppointmentAssistantNames` that batch-fetches assistant names for all visible appointment IDs that have assistants
- Returns a `Map<appointmentId, assistantDisplayName[]>`
- Pass this map from Schedule.tsx down to DayView/WeekView
- On the card, when `hasAssistants` is true, show "w/ FirstName L." next to the Users icon

**New file:** `src/hooks/useAppointmentAssistantNames.ts`
- Accepts `appointmentIds: string[]` (the IDs from `appointmentsWithAssistants`)
- Queries `appointment_assistants` joined with `employee_profiles` for display names
- Returns `Map<string, string[]>` mapping appointment ID to array of assistant display names

**Schedule.tsx:**
- Call `useAppointmentAssistantNames` with the set of appointment IDs that have assistants
- Pass the resulting map to DayView and WeekView

**DayView.tsx / WeekView.tsx:**
- Add `assistantNamesMap?: Map<string, string[]>` to props
- On non-compact cards with assistants, render "w/ AssistantName" in `text-xs opacity-70`

### 4. Tooltip enhancement

**Files:** `DayView.tsx`, `WeekView.tsx`

Update the tooltip to also show:
- Formatted phone number (using `formatPhoneDisplay`)
- Stylist name
- Assistant name(s) if any

## Gap Analysis and Additional Suggestions

After implementing these changes, remaining gaps include:

1. **AgendaView parity** -- AgendaView should also show formatted phone, stylist name, and assistant names
2. **Client avatar** -- Cards could show a tiny avatar initial circle for quick client identification
3. **Service duration per service** -- For multi-service cards, showing individual durations (e.g., "Haircut 45min + Glaze 30min") would help stylists plan
4. **Price visibility** -- `total_price` exists on the appointment but is never shown on cards; could be useful for front desk staff
5. **New client indicator** -- `is_new_client` flag exists but isn't visually indicated on cards (e.g., a small star or "NEW" badge)

## File Summary

| Action | File |
|--------|------|
| Create | `src/hooks/useAppointmentAssistantNames.ts` -- batch fetch assistant display names |
| Modify | `src/pages/dashboard/Schedule.tsx` -- call new hook, pass assistant names map |
| Modify | `src/components/dashboard/schedule/DayView.tsx` -- format phone, add stylist name, show assistant name |
| Modify | `src/components/dashboard/schedule/WeekView.tsx` -- format phone, add stylist name, show assistant name |

No database changes. No new dependencies.
