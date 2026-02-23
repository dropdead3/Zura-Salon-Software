

## Add Analytics Navigation Links to Appointments & Transactions Hub

### Problem

Users landing on the Appointments & Transactions page may be looking for analytics (appointment trends, operations metrics, sales data) rather than raw records. Currently there is no way to navigate from this hub to the relevant Analytics Hub subtabs without going back to the sidebar.

### Solution

Add a subtle, contextual navigation strip below the page header with quick-link pills that route users to the relevant Analytics Hub subtabs. This follows the existing drill-down contract pattern (summary surface links to canonical Analytics Hub tabs).

### Navigation Links

| Label | Route | Rationale |
|-------|-------|-----------|
| Appointment Analytics | `/dashboard/admin/analytics?tab=operations&subtab=appointments` | Appointment-level operational analytics |
| Booking Pipeline | `/dashboard/admin/analytics?tab=operations&subtab=booking-pipeline` | Pipeline health and booking flow |
| Sales Overview | `/dashboard/admin/analytics?tab=sales` | Revenue and transaction analytics |
| Staff Utilization | `/dashboard/admin/analytics?tab=operations&subtab=staff-utilization` | Capacity and utilization metrics |

### UI Design

- A single row of pill-style links (ghost buttons with an external-link or arrow-right icon) positioned between the page header and the tab bar
- Styled with `text-muted-foreground` and `hover:text-foreground` for a calm, non-intrusive appearance
- Prefixed with a subtle label: "Looking for analytics?" in `text-muted-foreground text-sm`
- Responsive: wraps on mobile, single row on desktop

### Technical Changes

#### 1. Edit: `src/pages/dashboard/AppointmentsHub.tsx`

- Add a contextual navigation strip between the `DashboardPageHeader` and the `Tabs` component
- Uses `Link` from react-router-dom with pill-style buttons (`variant="ghost"`, `size="sm"`, `rounded-full`)
- Each link includes an `ArrowUpRight` icon (from lucide-react) to indicate it navigates away from the current hub
- The strip is wrapped in a simple flex container with `items-center gap-2 flex-wrap`

### What Does NOT Change

- No database changes
- No new components (inline in the page)
- No changes to DashboardPageHeader component
- No changes to analytics hub routing or tab structure
- Existing tab behavior (Appointments, Transactions, Gift Cards) is untouched

