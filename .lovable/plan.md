

# Add "Configured" Badge to Criteria Comparison Table Column Headers

## Problem

The column headers in the Criteria Comparison Table show each level's number, name, and an "Edit" button — but no indication of whether the level has been fully configured. Admins must switch to the roadmap view to see configuration status.

## Fix

Add a small badge below each level name in the table header showing "Configured" (green) or "Incomplete" (amber), using the existing `isConfigured` property already available on each level object.

### Technical Change

**File: `src/components/dashboard/settings/StylistLevelsEditor.tsx` (~lines 966-981)**

Insert a status badge between the level name and the Edit button inside the column header `div`. Logic:

```
{level.isConfigured ? (
  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
    Configured
  </span>
) : (
  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
    Incomplete
  </span>
)}
```

This reuses the same `level.isConfigured` flag that already drives the roadmap badges and the manual toggle — no new data fetching or logic needed.

## Scope
- Single file: `StylistLevelsEditor.tsx`
- ~6 lines added
- No database changes

