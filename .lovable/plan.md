
## Move Appointments Hub and Rename Navigation Section

### Changes

**1. `src/config/dashboardNav.ts` (line 113)**
Change the `managerGroup` for the Appointments & Transactions nav item from `'operations'` to `'analytics'`.

**2. `src/hooks/useSidebarLayout.ts` (line 47)**
Rename the `analytics` sub-group label from `'Analytics & Insights'` to `'Analytics & Reports'`.

### Result

The "Appointments & Transactions" link will move from the **Operations** sub-group into the **Analytics & Reports** sub-group within the Management sidebar section. The section header will read "Analytics & Reports" instead of "Analytics & Insights".

### Files Modified

| File | Change |
|------|--------|
| `src/config/dashboardNav.ts` | Move appointments-hub to `analytics` managerGroup |
| `src/hooks/useSidebarLayout.ts` | Rename label to "Analytics & Reports" |
