

## Fix Crowded Tab Bar in Appointment Detail Drawer

The screenshot shows 5 tabs (Summary, Transaction, Notes, Audit Trail, Comms) crammed into a single row, with "Comms" getting cut off. The icons and badge on "Transaction" add to the width pressure.

### Changes to `AppointmentDetailDrawer.tsx` (lines 207-225)

**Approach: Convert to compact underline-style sub-tabs**

The drawer already has `SubTabsList` / `SubTabsTrigger` available (from `tabs.tsx`) which use an underline style that takes less horizontal space than the pill-style `TabsList`. This is the correct pattern for nested navigation inside a panel.

- Replace `TabsList` with `SubTabsList` and `TabsTrigger` with `SubTabsTrigger`
- Remove the `Receipt` and `StickyNote` icons from tab labels -- they add width without adding meaning when labels are already clear
- Keep the item-count badge on "Transaction" but make it smaller
- Shorten "Transaction" to "Payment" and "Audit Trail" to "Activity" to reduce character count
- Add `overflow-x-auto` and `scrollbar-hide` as a safety net so tabs never clip

**Before:**
```
[  Summary  ] [📄 Transaction ①] [📝 Notes ] [ Audit Trail ] [ Comms ]
```

**After:**
```
Summary    Payment ①    Notes    Activity    Comms
─────────────────────────────────────────────────
```

The underline style is more space-efficient and appropriate for in-panel navigation per the existing sub-tab pattern.

| File | Change |
|---|---|
| `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx` | Switch TabsList/TabsTrigger to SubTabsList/SubTabsTrigger, remove icons, shorten labels |

