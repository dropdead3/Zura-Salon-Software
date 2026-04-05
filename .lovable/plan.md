

# Fix: PDF Export Button Not Surfacing

## Problem

The "Export Roadmap" PDF button in the Stylist Levels editor is conditionally rendered behind `promotionCriteria && promotionCriteria.length > 0` (line 757). If an organization has levels configured but has not yet saved any promotion criteria, the button never appears. The PDF generation function already handles missing criteria gracefully (showing "Not Configured" rows), so this gate is overly restrictive.

## Fix

**File: `src/components/dashboard/settings/StylistLevelsEditor.tsx`**

Change the condition on line 757 from:

```tsx
{promotionCriteria && promotionCriteria.length > 0 && (
```

To:

```tsx
{levels.length > 0 && (
```

This ensures the PDF export button appears whenever the organization has at least one level configured, which is the meaningful prerequisite. The PDF already renders "Entry Level", "Not Configured", and empty retention tables correctly.

One-line change. No new files. No database changes.

