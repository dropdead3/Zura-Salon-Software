

## Add Dynamic Filter Description Above the Appointments List

### What Changes

Add a concise, human-readable summary line between the filter controls (Row 2) and the table Card that dynamically describes the active filters and sort order. It will read naturally, e.g.:

- "Showing all appointments, sorted by date (newest first)"
- "Showing today's completed appointments at Downtown Studio for Sarah M., sorted by date (newest first)"
- "Showing appointments from Feb 10 -- Feb 18, sorted by date (newest first)"

When a search term is active, it appends: `matching "haircut"`

### Visual Placement

```text
[ Search Bar ]                       [ All | Past | Today | Future | Range ]
[ Status v ]  [ Location v ]  [ Stylist v ]                        [ CSV ]

  Showing today's confirmed appointments at Downtown Studio, sorted by date (newest first)   <-- NEW

+-----------------------------------------------------------------------+
|  [ ] Date   Time   Client   ...                                       |
+-----------------------------------------------------------------------+
```

The line will use `text-sm text-muted-foreground` styling with `font-sans` -- subtle, informational, not visually heavy.

### Technical Details

**File:** `src/components/dashboard/appointments-hub/AppointmentsList.tsx`

1. **Build description string** using a `useMemo` that reads `timePeriod`, `customRange`, `status`, `locationId`, `stylistId`, `search`, and `totalCount`:
   - Time: "all" / "today's" / "past" / "future" / "Feb 10 -- Feb 18" (for custom range)
   - Status: omitted when "all", otherwise appended as adjective (e.g. "completed", "confirmed")
   - Location: resolved from `locations` array by `locationId`, omitted when "all"
   - Stylist: resolved from `stylistOptions` by `stylistId`, omitted when "all"
   - Search: appended as `matching "term"` when present
   - Sort: always ends with `sorted by date (newest first)` (matching the default query order)
   - Count: prefixed with the `totalCount` value, e.g. "Showing 42 past appointments..."

2. **Insert the line** at line 284 (just before the `{/* Table */}` comment), as a simple `<p>` element:
   ```tsx
   <p className="text-sm text-muted-foreground px-1">
     {filterDescription}
   </p>
   ```

No new files. No new dependencies. Single file edit.
