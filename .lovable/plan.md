

## Add Hover Effect and Right Arrow to Appointment Rows

**What changes:**
Each appointment row in the table will get a subtle hover background color change and a right-pointing chevron arrow that appears on the far right, signaling that the row is clickable and leads to the detail drill-down.

### Technical Details

**File: `src/components/dashboard/appointments-hub/AppointmentsList.tsx`**

1. **Import `ChevronRight`** -- already imported (line 15).

2. **Add a new `TableHead` column** at the end of the header row (after "Created By") -- an empty, narrow column (`w-8`) to reserve space for the arrow.

3. **Update `COL_COUNT`** from 12 to 13.

4. **Add hover class to `TableRow`** -- add `hover:bg-muted/40 transition-colors` to each data row's className (line 346).

5. **Add a new `TableCell` at the end of each data row** containing a `ChevronRight` icon styled with `opacity-0 group-hover:opacity-100 transition-opacity` -- this requires adding `group` to the `TableRow` className so the arrow appears only on hover.

6. **Add matching skeleton and empty-state cells** for the new column to keep column counts aligned.

**Summary of row className:**
```
cn('cursor-pointer group hover:bg-muted/40 transition-colors', isSelected && 'bg-muted/50')
```

**Arrow cell:**
```tsx
<TableCell className="w-8 pr-2">
  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
</TableCell>
```

This is a minimal, UI-only change -- no data or logic changes needed.

