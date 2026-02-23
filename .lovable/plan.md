
## Wire Appointments Hub and Client Directory Together

### Current Gaps Identified

1. **Appointments Hub detail drawer** (`AppointmentDetailDrawer.tsx`) shows client name/phone/email but has NO link to the Client Directory profile
2. **Client Directory detail sheet** (`ClientDetailSheet.tsx`) shows visit history but has NO link to filter/view all appointments in the Appointments Hub
3. **Transaction history hook** (`useClientTransactionHistory.ts`) exists but is completely unused -- never imported anywhere
4. The Schedule page's `AppointmentDetailSheet` already has a "View in Client Directory" link, but the Appointments Hub drawer does not

### Plan

#### 1. Add "View in Client Directory" link to Appointment Detail Drawer

**File:** `src/components/dashboard/appointments-hub/AppointmentDetailDrawer.tsx`

- In the Client Info section (after email), add a "View in Client Directory" button that navigates to `/dashboard/clients?clientId={resolvedClientId}`
- Resolve the client ID by looking up the `phorest_client_id` from the appointment against the `phorest_clients` table (same pattern used in `AppointmentDetailSheet.tsx`)
- Uses `useNavigate` from react-router-dom

#### 2. Add "View All Appointments" link to Client Detail Sheet

**File:** `src/components/dashboard/ClientDetailSheet.tsx`

- In the contact section or as a button near the Visit History tab, add a "View All Appointments" link
- Navigates to `/dashboard/appointments-hub?tab=appointments&search={clientName}` (pre-filters the hub by client name)
- Simple navigation link using the existing search filter mechanism

#### 3. Add Transaction History tab to Client Detail Sheet

**File:** `src/components/dashboard/ClientDetailSheet.tsx`

- Add a 4th tab "Transactions" alongside Visit History, Notes, and Redos
- Wire up the existing `useClientTransactionHistory` hook (currently unused)
- Display transactions in a simple timeline/list format showing date, item name, type (service/product), amount, and staff
- Show summary stats (total spend breakdown, average ticket) at the top of the tab

#### 4. Create a TransactionHistoryTimeline component

**New file:** `src/components/dashboard/TransactionHistoryTimeline.tsx`

- Similar in structure to `VisitHistoryTimeline.tsx`
- Renders the transaction list from `useClientTransactionHistory`
- Groups by date, shows item type badges (service vs product), amounts wrapped in `BlurredAmount`
- Shows spend summary KPIs at the top (total, services, products, avg ticket)

### Technical Notes

- No database changes needed -- all data sources already exist
- No new hooks needed -- `useClientTransactionHistory` is already built and tested
- Cross-navigation uses URL query params (existing pattern from `AppointmentDetailSheet`)
- Client ID resolution for Phorest appointments uses the same `phorest_clients` lookup pattern already in Schedule
- All monetary values wrapped in `BlurredAmount` per financial data privacy rules
- Typography follows design tokens (font-display for headings, font-sans for body, max weight font-medium)
