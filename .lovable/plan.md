
# Fix Page Padding: Appointments & Transactions Hub

## Problem

The Appointments & Transactions Hub has **zero side padding** on its content. The page wraps children in `<div className="space-y-6">` with no `px-` or `py-` values, causing content to sit flush against the sidebar edge.

**Command Center reference padding:** `px-6 pb-6 lg:px-8 lg:pb-8`
**Management Hub reference padding:** `p-6 lg:p-8`
**Appointments Hub current padding:** none

## Fix

### File: `src/pages/dashboard/AppointmentsHub.tsx` (line 297)

Replace:
```tsx
<div className="space-y-6">
```

With:
```tsx
<div className="px-6 pb-6 lg:px-8 lg:pb-8 pt-2 lg:pt-3 space-y-6">
```

This matches the exact padding used by the Command Center (`DashboardHome.tsx` line 251): `pt-2 px-6 pb-6 lg:pt-3 lg:px-8 lg:pb-8`.

### Single file, single line change

No other files are affected. This is a one-line correction to bring the page into alignment with the canonical dashboard padding rhythm.
