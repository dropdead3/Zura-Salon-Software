

## Adjust Sales Overview Column Widths

### Current Layout
The Sales Overview card uses a 3-column grid where the left column spans 2 of 3 columns (66%) and the right spans 1 (33%).

### Change
Switch from `xl:grid-cols-3` to a custom 5-column grid so the left takes 2/5 (40%) and the right takes 3/5 (60%):

**File: `src/components/dashboard/AggregateSalesCard.tsx` (line 566-568)**

```
// Before
<div className="grid xl:grid-cols-3 gap-6 mb-6">
  <div className="xl:col-span-2">

// After
<div className="grid xl:grid-cols-5 gap-6 mb-6">
  <div className="xl:col-span-2">
```

The right sidebar column (currently implicit `col-span-1`) will need `xl:col-span-3` added to its container.

This is a two-line class change -- no logic or layout restructuring needed.
