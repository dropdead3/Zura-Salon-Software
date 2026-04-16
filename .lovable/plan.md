
## Prompt review

Tight, well-scoped prompt. Two clear asks: (1) collapsed-by-default state, (2) surface creator + timestamp on the collapsed header. Teaching note: you could tighten further by specifying the timestamp format you want ("2 hours ago" relative vs "Apr 16, 4:32 PM" absolute) — right now I'll pick the most operator-friendly default (relative, with absolute on hover via tooltip).

## Diagnosis

Current state in `DraftBookingsSheet.tsx`:
- Drafts are grouped by client name and rendered as `Collapsible` groups
- Default `open` state is `true` (groups expanded by default)
- Collapsed header shows: chevron, person icon, client name, draft count, "Discard All" button
- Creator name (`created_by_name`) and timestamp (`created_at`) are stored on each draft but only visible after expanding

The data is already on each `DraftBooking` row — just not surfaced at the group level.

## Fix

Single file: `src/components/dashboard/schedule/DraftBookingsSheet.tsx`.

### A. Default to collapsed
- Change the `Collapsible` `defaultOpen` from `true` to `false`.
- Keep manual expand/collapse fully functional.

### B. Surface creator + timestamp on collapsed header
For each client group, derive a "most recent draft" summary:
- Find the newest draft in the group (max `created_at`)
- Display `created_by_name` and a relative timestamp (e.g., "Eric Day · 2h ago")
- Use `date-fns` `formatDistanceToNow` for the relative format
- Add a tooltip showing the absolute timestamp on hover

Layout change to the collapsed header row:
- Left side stays: chevron + person icon + client name + draft count
- New subline (under the client name): `created_by_name · {relative time}`
- Use `tokens.body` muted styling (`text-xs text-muted-foreground`)
- Right side stays: "Discard All" button

If multiple creators contributed to one client's drafts, show the most recent creator + a "+N others" suffix.

### C. Visual polish
- The header row becomes two-line: client name on top, attribution beneath
- Maintain existing height rhythm — use `text-xs` and tight `leading-tight` so the row doesn't grow much
- Keep the chevron vertically centered against the full two-line block

## Acceptance checks

1. Open Draft Bookings sheet → all client groups collapsed by default.
2. Each group header shows: client name, draft count, creator name, relative timestamp ("2h ago", "yesterday").
3. Hover the timestamp → tooltip with absolute date/time.
4. Click chevron → group expands as before.
5. If a group has drafts from multiple creators → show most recent + "+N others".
6. "Clear All" and per-group "Discard All" still work.

## Follow-up enhancements

- Add a "Sort groups by" toggle (Most Recent / Alphabetical / Most Drafts).
- Show creator avatar instead of generic person icon when available — faster visual scan.
- Add a filter chip "Mine only" to show only drafts the current user created.
