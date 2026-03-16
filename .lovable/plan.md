

# Fix Sticky Conversion Bar Overlap with Sidebar and FAB

The sticky bottom bar currently uses `fixed bottom-0 inset-x-0`, which spans the full viewport width. This causes it to be hidden behind the dashboard sidebar on the left and overlapped by the HelpFAB on the right.

## Problem

The bar doesn't account for the dashboard sidebar margin (`lg:ml-24` when collapsed, `lg:ml-[340px]` when expanded). Other fixed-bottom elements in the codebase (e.g., `ZuraStickyGuidance`) already handle this by reading sidebar state from localStorage and applying conditional left offsets.

## Fix

**File:** `src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

1. **Read sidebar collapsed state** — add a `useState` + localStorage read for `dashboard-sidebar-collapsed` (same pattern used elsewhere).

2. **Update the sticky bar positioning** (line 1211) — replace `inset-x-0` with sidebar-aware left offset and right padding for the FAB:
   - `left-0 right-0` base (mobile)
   - `lg:left-24` when sidebar collapsed, `lg:left-[340px]` when expanded
   - `pb-safe` or sufficient `bottom` offset if needed

3. **Add right padding** to the inner container so the CTA button doesn't sit under the HelpFAB (which is `fixed bottom-6 right-6`). Add `lg:pr-20` to the inner div to clear the FAB area.

This follows the exact same pattern as `ZuraStickyGuidance.tsx` lines 76-78.

