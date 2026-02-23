

## Fix Filter Dropdowns: Auto-Width and Background Fill

### Problem
1. Filter select triggers have hardcoded widths (`w-[140px]`, `w-[130px]`, `w-[160px]`) causing content truncation (visible in screenshot: "All..." instead of full label)
2. Filters lack the subtle dark background fill that the search bar has, making them less visually prominent

### Changes

#### 1. Add a new `input.filter` token to `src/lib/design-tokens.ts`
- Add `filter: 'bg-muted/50 border-border/60'` alongside the existing `input.search` token
- This ensures all filter dropdowns share the same visual treatment as the search bar

#### 2. Update `src/components/dashboard/appointments-hub/AppointmentsList.tsx`
- Remove fixed widths from all four `SelectTrigger` components (`w-[140px]`, `w-[130px]`, `w-[160px]`)
- Replace with `w-auto` so triggers size to fit their content naturally
- Apply `tokens.input.filter` classes to each `SelectTrigger` for the muted background fill

### Technical Detail

**design-tokens.ts** -- new token:
```ts
input: {
  search: 'bg-muted/50 border-border/60',
  filter: 'bg-muted/50 border-border/60',
},
```

**AppointmentsList.tsx** -- each SelectTrigger changes from:
```tsx
<SelectTrigger className="w-[140px]">
```
to:
```tsx
<SelectTrigger className={cn("w-auto", tokens.input.filter)}>
```

This applies to all four filter selects: Date Range, Status, Location, and Stylist.

