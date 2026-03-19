

# Move "Stations & Hardware" to Last in Configuration

## Change

**File: `src/pages/dashboard/admin/BackroomSettings.tsx`** — lines 93-94

Swap the order of "Stations & Hardware" and "Formula Assistance" so Stations is last in the configuration group.

**From:**
```
stations → formula
```

**To:**
```
formula → stations
```

Single two-line swap, no other changes needed.

