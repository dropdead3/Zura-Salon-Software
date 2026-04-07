

# Always Show Full Names for Staff

## Problem
`formatDisplayName()` in `src/lib/utils.ts` abbreviates staff names to "First L." format (e.g., "Gavin E." instead of "Gavin Espinoza"). This function is used in **75 files** across the entire app — dropdowns, analytics, chat, scheduling, payroll, and more. The `formatFirstLastInitial` function in `src/lib/dock-utils.ts` does the same for the Dock UI (5 files).

## Solution

Change the two central formatting functions to return full names. This is a 2-line fix that propagates everywhere instantly.

### 1. `src/lib/utils.ts` — `formatDisplayName()`
Change the return logic to output the full name instead of "First L." format. If a `display_name` (nickname) exists, use `formatFullDisplayName` logic (nickname replaces first name, keep last name). Otherwise return `fullName` as-is.

### 2. `src/lib/utils.ts` — `formatName()` 
No change needed — it delegates to `formatDisplayName`.

### 3. `src/lib/dock-utils.ts` — `formatFirstLastInitial()`
Change to return the full name instead of "First L." format.

### 4. `src/hooks/usePreferredStylist.ts` — `getStylistDisplayName()`
No change needed — it delegates to `formatDisplayName`.

## What Changes Globally
- Staff selector dropdowns: "Gavin Espinoza" instead of "Gavin E."
- Analytics cards, leaderboards, staff metrics: full names
- Chat mentions, message authors: full names
- Schedule/appointment views: full names
- Payroll, commission roster: full names
- Dock UI: full names

## Files Modified
| File | Change |
|---|---|
| `src/lib/utils.ts` | `formatDisplayName` returns full name |
| `src/lib/dock-utils.ts` | `formatFirstLastInitial` returns full name |

2 files, ~4 lines changed. No database changes.

