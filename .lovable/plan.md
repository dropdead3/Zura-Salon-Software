
## Prompt review

Sharp structural observation — you're recognizing that "All Stylists" and "Only Stylists With Appointments" are multi-select affordances that are structurally incompatible with week view's single-stylist constraint. Removing them isn't just cleanup; it's enforcing the architectural truth in the UI.

Tighter framing for next time: clarify whether the dropdown should also become a *radio* (single-select, click-to-switch) in week view vs. staying a checkbox list. I'll infer **radio behavior** since multi-select is structurally impossible.

## Diagnosis

In `ScheduleHeader.tsx`, the stylist filter dropdown contains:
1. "All Stylists That Work This Day" row — clears `selectedStaffIds` (multi-select clear).
2. "Only Stylists With Appointments" row — bulk-selects stylists with appointments.
3. Stylist rows with `<Checkbox>` — toggle into/out of `selectedStaffIds` (additive multi-select).

In week view, the grid can only render one stylist. Multi-select and "all" are dead affordances.

## Plan

**1. Hide the two top filter rows in week view**
- In `ScheduleHeader.tsx`, wrap the "All Stylists That Work This Day" and "Only Stylists With Appointments" rows (plus their separator) in `{view !== 'week' && (...)}`.
- Day view: unchanged (both rows visible).

**2. Convert stylist rows to radio behavior in week view**
- Replace `<Checkbox>` with a visual radio indicator (filled dot when selected) when `view === 'week'`.
- Clicking a stylist row in week view: `setSelectedStaffIds([stylistId])` (replace, not toggle).
- Day view: unchanged (checkbox toggle/multi-select).

**3. Keep `(week default)` suffix logic**
- Still shows on auto-resolved stylist when `selectedStaffIds.length === 0`.
- Once user clicks a stylist in week view, `selectedStaffIds = [thatId]` and the suffix disappears (matches existing acceptance check: explicit selection = no suffix).

**4. Dropdown stays open vs. closes on selection?**
- Day view: stays open (existing multi-select behavior).
- Week view: closes on selection (single-select pattern, matches user expectation for radio).

## Acceptance checks

1. Week view dropdown opened → no "All Stylists" or "Only Stylists With Appointments" rows visible.
2. Week view dropdown shows only the stylist list with radio-style indicators.
3. Clicking a stylist in week view → grid switches to that stylist, dropdown closes, trigger updates.
4. Week view with no manual selection → first stylist shows `(week default)` suffix in trigger and list.
5. Day view dropdown unchanged — both top rows visible, checkboxes for multi-select.
6. Switching from week → day preserves any explicit single selection; "All" reappears as an option.

**Files to modify:**
- `src/components/dashboard/schedule/ScheduleHeader.tsx`
