

# "Pending Orders: 20 Units" — Not a Bug, But a UX Gap

## What's Happening

The data is technically correct. There are **two draft purchase orders** in your database for this product (Epilogue 1-0 Natural), each for 10 units — totaling 20 units. They were created on March 18 and are sitting in `draft` status, never sent or received.

The "Pending Orders" count comes from all POs in `draft`, `sent`, or `partially_received` status. So the system is accurately reporting what's in the database.

These were likely created by accidental double-clicks on "Add to PO" or from testing.

## Proposed Fix — Two Parts

### 1. Delete the stale draft POs (immediate data cleanup)
Run a one-time cleanup to remove these orphaned drafts, or you can manually delete them from the Orders tab.

### 2. Prevent future confusion (code changes)

**File: `CommandCenterRow.tsx`**
- Make the "Pending Orders" label in the expanded detail row clickable / linked to the Orders tab so users can see and manage the actual POs
- Add the PO status (e.g., "2 drafts") so it's clear these aren't sent orders

**File: `StockTab.tsx` (or `CommandCenterRow.tsx`)**
- Add duplicate-click protection on "Add to PO" — disable the button while the mutation is pending (this is partially done but may not cover all paths)

| File | Change |
|------|--------|
| `CommandCenterRow.tsx` | Make "Pending Orders" detail actionable with PO status breakdown |
| Data cleanup | Remove 2 stale draft POs for this product |

