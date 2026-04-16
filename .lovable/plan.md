

# Combine Booking + Lead Pool Into Single "Accepting Clients" Indicator

## Rationale
Both `is_booking` and `lead_pool_eligible` signal the same thing: whether the front desk should schedule call-in leads on this stylist's calendar. Two separate indicators create confusion. We'll unify them into one clear status.

## Changes

### 1. `src/components/dashboard/schedule/DayView.tsx`
- **Merge the two booleans** into a single derived flag: `const acceptingClients = stylist.is_booking !== false && stylist.lead_pool_eligible !== false`
- **Replace the two indicators** (dot + "Booking" label + UserPlus icon) with one consolidated indicator in the top-right corner:
  - Green dot + "Accepting" when both are true
  - Red dot + "Not Accepting" when either is false
  - Tooltip: "Accepting New Clients & Lead Pool Eligible" / "Not Accepting New Clients"
- **Remove** the separate `UserPlus` icon — no longer needed as a distinct element

### Result per cell
```text
┌──────────────────────── ● Accepting ┐
│ [Avatar]  Trinity Graves  L2        │
│           72%                       │
└─────────────────────────────────────┘
```

Single file change, no new dependencies.

