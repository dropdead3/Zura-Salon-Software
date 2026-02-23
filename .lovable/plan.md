

## Add Page Description to Appointments & Transactions Hub

### Change

One-line update to `src/pages/dashboard/AppointmentsHub.tsx` -- add the `description` prop to the existing `DashboardPageHeader` component (which already supports it).

### Before

```tsx
<DashboardPageHeader title="Appointments & Transactions" />
```

### After

```tsx
<DashboardPageHeader
  title="Appointments & Transactions"
  description="View, filter, and manage individual appointment records, transactions, and gift cards. Use batch actions to update statuses or export data."
/>
```

This renders the description as a `text-muted-foreground text-sm` paragraph directly below the page title, consistent with every other dashboard page that uses `DashboardPageHeader`.

### Files Modified

- **Edit:** `src/pages/dashboard/AppointmentsHub.tsx` (line 298 -- add `description` prop)

