

# Switch Overview Sub-Tabs to Standard Toggle Style

## Problem
The three sub-tabs (Command Center, Analytics, AI Intelligence) use the underline-style `SubTabsList`/`SubTabsTrigger` variant, but the rest of the platform uses the pill/toggle style (`TabsList`/`TabsTrigger`). This creates visual inconsistency.

## Changes

### `BackroomDashboardOverview.tsx` (lines 15, 231-241)

1. **Import swap**: Replace `SubTabsList, SubTabsTrigger` with `TabsList, TabsTrigger`
2. **Component swap**: Replace the three sub-tab components accordingly
3. **Icon sizing**: Bump icons from `w-3.5 h-3.5` to `w-4 h-4` for consistency with the standard trigger size

```tsx
// Before
<SubTabsList>
  <SubTabsTrigger value="command-center" ...>

// After
<TabsList>
  <TabsTrigger value="command-center" ...>
```

### Files to edit
1. `src/components/dashboard/backroom-settings/BackroomDashboardOverview.tsx` — import + 6-line template swap

