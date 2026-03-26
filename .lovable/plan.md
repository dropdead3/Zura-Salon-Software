

## Move "X added" Badge to Bowl Header

### Change

Move the product count badge (e.g., "5 added") from the picker panel breadcrumb area (line ~604) up into the bowl header row (line ~751), placing it after the weight/cost badge and before the delete/collapse controls.

### File: `AllowanceCalculatorDialog.tsx`

**1. Bowl header (line ~747–751)** — Add the added-count badge after the weight/cost badge:

```tsx
<div className="flex items-center gap-2">
  {/* Icon + label */}
  {bowl.lines.length > 0 && (
    <Badge variant="secondary" className="text-xs px-2 py-0.5">
      {Math.round(bowlWeight)}g · ${bowlCost.toFixed(2)}
    </Badge>
  )}
  {bowl.lines.length > 0 && (
    <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
      {bowl.lines.length} added
    </Badge>
  )}
</div>
```

**2. Picker panel (line ~604–608)** — Remove the `addedCount` badge from the breadcrumb row so it doesn't appear in two places.

| File | Change |
|------|--------|
| `AllowanceCalculatorDialog.tsx` | Add count badge to bowl header, remove from picker breadcrumb |

