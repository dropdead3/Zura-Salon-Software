

# Surface User Brand/Product Requests in Supply Library Admin

## Context
Users can already submit "Missing a brand?" suggestions from the Supply Library dialog. These land in `platform_feedback` with `category = 'supply_library'`. But admins have no way to see these requests — they're invisible in the backroom.

## Solution
Add a "Requests" section inside the Supply Library tab that shows pending brand/product requests from users, with the ability to mark them as completed.

## Database
No schema changes needed. The `platform_feedback` table already has `status` (text), `title`, `description`, `organization_id`, `submitted_by`, and `created_at`. We'll use `status` values: `'pending'` (default/current), `'completed'`, `'dismissed'`.

**Data fix**: Ensure existing rows default to `'pending'` status if null — handled in the query with `COALESCE`.

## Hook: `src/hooks/platform/useSupplyLibraryRequests.ts` (new)
- `useSupplyLibraryRequests()` — fetches `platform_feedback` where `category = 'supply_library'` and `status != 'completed'`, joined with `employee_profiles` for submitter name and `organizations` for org name, ordered by `created_at DESC`
- `useResolveSupplyRequest()` — mutation to update `status` to `'completed'` or `'dismissed'`

## UI: `src/components/platform/backroom/SupplyLibraryTab.tsx`
- Add a collapsible "User Requests" panel at the top of the Supply Library tab (above the brand grid), shown only when there are pending requests
- Shows a count badge (e.g., "3 requests")
- Each request row: brand name requested, optional product details, submitter name, org name, relative timestamp, and two action buttons: "Mark Complete" (green check) and "Dismiss" (X)
- Completing a request updates its status and shows a toast
- When no requests exist, the panel is hidden entirely

Single new hook file, one edit to `SupplyLibraryTab.tsx`.

