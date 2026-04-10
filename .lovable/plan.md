

# Conditionally Show "My Pay" Based on Payroll Enrollment

## Problem

"My Pay" appears in the sidebar for all roles regardless of whether the team member has been enrolled in payroll (i.e., has a row in `employee_payroll_settings`). It should only appear when the user actually has payroll settings configured.

## Approach

Add a lightweight query inside `SidebarNavContent` to check if the current user has a record in `employee_payroll_settings`. Then filter out the `/dashboard/my-pay` link when they don't.

## Changes

### 1. `src/components/dashboard/SidebarNavContent.tsx`

- Import `useQuery` from `@tanstack/react-query`, `supabase` client, `useAuth`, and `useOrganizationContext`
- Add a query that checks for existence of a row in `employee_payroll_settings` for the current user + org:
  ```ts
  const { data: hasPayrollEnrollment } = useQuery({
    queryKey: ['my-payroll-enrollment', user?.id, organizationId],
    queryFn: async () => {
      const { count } = await supabase
        .from('employee_payroll_settings')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', user!.id)
        .eq('organization_id', organizationId!);
      return (count ?? 0) > 0;
    },
    enabled: !!user?.id && !!organizationId,
    staleTime: 5 * 60 * 1000, // cache for 5 min to keep sidebar light
  });
  ```
- In the section-specific filtering block (around line 520-560), add a filter that removes `/dashboard/my-pay` when `hasPayrollEnrollment` is false:
  ```ts
  // Hide My Pay if user is not enrolled in payroll
  if (!hasPayrollEnrollment) {
    filteredItems = filteredItems.filter(item => 
      item.href !== '/dashboard/my-pay'
    );
  }
  ```
  This goes right after the existing section-specific logic, applied to all sections (since My Pay lives in `myTools`/`stats`).

## Result

- "My Pay" only appears when the user has an `employee_payroll_settings` record
- Lightweight `head: true` query (no data fetched, just count) with 5-min cache
- Super admins who aren't enrolled in payroll won't see it; enrolled team members will

| File | Change |
|------|--------|
| `src/components/dashboard/SidebarNavContent.tsx` | Add payroll enrollment check; conditionally hide My Pay link |

