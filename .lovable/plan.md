

# Fix "Set Budget" Button Navigation

## Problem
The "Set Budget" button in the Procurement card navigates to `'inventory'` (the general inventory tab) instead of `'inventory:reorder'` where the Procurement Budget settings are actually located.

## Change

### `BackroomDashboardOverview.tsx` — line 334
Change `onClick={() => onNavigate('inventory')}` to `onClick={() => onNavigate('inventory:reorder')}`.

One-line fix.

