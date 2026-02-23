

## Fix Remaining Gaps in Appointments/Client Directory Wiring

### Gap Found: Deep-Link Search Parameter Not Read

The Client Directory's "View All Appointments" button navigates to:
```
/dashboard/appointments-hub?tab=appointments&search=ClientName
```

But the Appointments Hub page **ignores the `search` query parameter**. On line 287 of `AppointmentsHub.tsx`, the search state initializes as an empty string and never reads from `searchParams`:

```typescript
const [search, setSearch] = useState('');  // <-- never reads URL param
```

This means clicking "View All Appointments" from a client profile lands on the hub with no filter applied -- the cross-navigation is broken.

### Fix

**File: `src/pages/dashboard/AppointmentsHub.tsx`**

Initialize the `search` state from the URL search param so the deep-link pre-fills the filter:

```typescript
const initialSearch = searchParams.get('search') || '';
const [search, setSearch] = useState(initialSearch);
```

This is a one-line change. No other files need modification.

### What's Already Working

- "View in Client Directory" link in the Appointment Detail Drawer -- working (resolves phorest_client_id to directory ID)
- "View All Appointments" link in Client Detail Sheet -- navigation works, just the search param wasn't being consumed
- Transaction History tab in Client Detail Sheet -- working (useClientTransactionHistory wired up)
- `/dashboard/transactions` route -- already redirects to the hub (no dead page)
- Client Directory deep-link via `?clientId=` -- working (lines 104-124 of ClientDirectory.tsx)

### Technical Notes

- Single file edit, single line change
- No database or hook changes needed
- Existing `search` state flows correctly into `AppointmentsList` and the hub filters once initialized properly
