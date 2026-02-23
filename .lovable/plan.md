

## Fix: Tab Switch Wipes Search Param

### The Gap

In `AppointmentsHub.tsx` line 290, `handleTabChange` does:

```typescript
setSearchParams({ tab }, { replace: true });
```

This replaces ALL query params with just `{ tab }`, discarding the `search` param. If a user arrives via `?tab=appointments&search=Jane` and switches tabs, the search filter is lost from the URL (though it persists in React state, it won't survive a page refresh after tab switch).

### Fix

**File: `src/pages/dashboard/AppointmentsHub.tsx`** (line 289-291)

Preserve the `search` param when switching tabs:

```typescript
const handleTabChange = useCallback((tab: string) => {
  const params: Record<string, string> = { tab };
  if (search) params.search = search;
  setSearchParams(params, { replace: true });
}, [setSearchParams, search]);
```

### Summary of All Wiring (Now Complete)

- "View in Client Directory" from Appointment Detail Drawer -- working
- "View in Client Directory" from Schedule Detail Sheet -- working
- "View All Appointments" from Client Detail Sheet -- working
- Deep-link search param consumed on load -- working (previous fix)
- Search param preserved across tab switches -- this fix
- Transaction History tab in Client Detail Sheet -- working
- No remaining gaps identified
