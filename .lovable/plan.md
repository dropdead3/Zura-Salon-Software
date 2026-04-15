

## Fix: Show Full Names in Staff Filter Dropdown

### Problem
The staff filter dropdown (ScheduleHeader.tsx) displays `display_name || full_name`, which shows nicknames/first names only. User wants full names.

### Fix — ScheduleHeader.tsx

**Line 276** — Selected staff label: change from `display_name || full_name` to `full_name || display_name`

**Line 308** — Dropdown list items: change from `display_name || full_name` to use `formatFullDisplayName(s.full_name, s.display_name)` which shows "Nickname LastName" format (e.g., "Johnny Day" if nickname is Johnny and full name is Eric Day), or just full_name if no nickname.

Import `formatFullDisplayName` from `@/lib/utils`.

### Scope
- **1 file**: `src/components/dashboard/schedule/ScheduleHeader.tsx` (2 lines changed + 1 import)

