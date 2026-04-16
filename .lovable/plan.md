

# Width-Based Short Label Selection for Appointment Cards

## Problem
The current logic `(size === 'medium' || showStylistBadge) ? badge.shortLabel : badge.label` ties the short/full label decision to **card height** (`size`). A tall card in a narrow WeekView column shows "Completed" while a short card shows "Done" — inconsistent within the same column width. The user wants **card width** (determined by column count/view type) to drive the decision.

## Approach
`showStylistBadge` already correlates perfectly with narrow columns (WeekView = multi-column = narrow). In DayView, column width depends on how many stylists are visible. Rather than measuring pixels, we can pass a `columnCount` or `isNarrowColumn` prop from the parent views:

- **WeekView**: Always narrow → always short labels
- **DayView with ≥3 stylists**: Narrow columns → short labels  
- **DayView with 1-2 stylists**: Wide columns → full labels
- **AgendaView**: Always wide → full labels

## Changes

### 1. `AppointmentCardContent.tsx` — Replace height-based logic with width-based prop

Add an optional `useShortLabels?: boolean` prop to `AppointmentCardContentProps`. Change the label selection line from:

```tsx
const statusLabel = (size === 'medium' || showStylistBadge) ? badge.shortLabel : badge.label;
```

to:

```tsx
const statusLabel = useShortLabels ? badge.shortLabel : badge.label;
```

### 2. `WeekView.tsx` — Pass `useShortLabels={true}`

WeekView columns are always narrow, so always use short labels.

### 3. `DayView.tsx` — Pass `useShortLabels` based on visible stylist count

Determine column count from the filtered stylists array. Pass `useShortLabels={filteredStylists.length >= 3}` (3+ columns = narrow enough to warrant short labels).

### 4. `AgendaView.tsx` — Pass `useShortLabels={false}` (or omit, default is `false`)

Agenda always has full width — keep full labels.

### Files Modified
1. `src/components/dashboard/schedule/AppointmentCardContent.tsx` — add `useShortLabels` prop, update label logic
2. `src/components/dashboard/schedule/WeekView.tsx` — pass `useShortLabels={true}`
3. `src/components/dashboard/schedule/DayView.tsx` — pass `useShortLabels` based on stylist count
4. `src/components/dashboard/schedule/AgendaView.tsx` — no change (default `false`)

