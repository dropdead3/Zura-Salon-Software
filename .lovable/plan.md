

## Enhanced Gap Breakdown with Appointment-Level Detail

### Current State
The gap breakdown shows aggregate counts (e.g., "3 cancellations → -$845") but no detail about which appointments, which stylists, or which services were lost.

### Plan

#### 1. Enhance `useRevenueGapAnalysis` hook

Expand the query to fetch full appointment details for cancelled and no-show records:

**Fields fetched per appointment:** `id`, `service_name`, `client_name`, `total_price`, `appointment_date`, `start_time`, `phorest_staff_id`, `status`

**Staff name resolution:** Join `phorest_staff_id` → `phorest_staff_mapping` to get stylist names (same pattern as `useAvgTicketByStylist`).

**New return shape additions:**
```typescript
cancellations: {
  count: number;
  lostRevenue: number;
  appointments: GapAppointment[];  // NEW
};
noShows: {
  count: number;
  lostRevenue: number;
  appointments: GapAppointment[];  // NEW
};

interface GapAppointment {
  id: string;
  clientName: string | null;
  serviceName: string | null;
  stylistName: string | null;
  totalPrice: number;
  appointmentDate: string;
  startTime: string | null;
}
```

#### 2. Enhance `RevenueGapDrilldown` component

Make each category row (Cancellations, No-shows, Unexplained) **expandable** using a collapsible pattern:

- Click the "3 cancellations → -$845" row to expand and see a list of individual appointments
- Each appointment row shows: **Client name**, **Service**, **Stylist**, **Amount**, **Date/time** (for multi-day ranges)
- Appointments sorted by price descending (highest lost revenue first)
- All amounts wrapped in `BlurredAmount`
- Expand/collapse with `ChevronDown`/`ChevronUp` icon and subtle animation
- Cap visible list at 5 items with a "Show all X" toggle if more exist

#### 3. Files Modified

| File | Change |
|---|---|
| `src/hooks/useRevenueGapAnalysis.ts` | Fetch full appointment details + staff names instead of just `id, total_price` |
| `src/components/dashboard/sales/RevenueGapDrilldown.tsx` | Add collapsible appointment lists inside each gap category row |

