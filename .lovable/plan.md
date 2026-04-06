

# Settings Cards: Fixed Size, Centered Layout, No Chevron

## Changes

**File:** `src/pages/dashboard/admin/Settings.tsx`

### 1. Remove ChevronRight arrow
Delete lines 210-212 (the `ChevronRight` icon rendered in non-edit mode). Remove `ChevronRight` from imports.

### 2. Fixed card size
Add a fixed height to each Card (e.g. `h-[140px]`) so all cards are identical size regardless of title length.

### 3. Center-align icon and title vertically
Replace the current `CardHeader` + `CardContent` split layout with a single centered layout:
- Remove `CardHeader` and `CardContent` wrappers
- Use a single `flex flex-col items-center justify-center h-full gap-3` container
- Icon box centered, title centered below it
- The `MetricInfoTooltip` stays absolute top-right

```tsx
<Card className={cn("transition-all relative h-[140px]", ...)}>
  <MetricInfoTooltip ... className="absolute top-3 right-3 w-4 h-4" />
  {/* edit mode grip stays absolute top-right */}
  <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
    <div className={tokens.card.iconBox}>
      <Icon className={tokens.card.icon} />
    </div>
    <span className={tokens.card.title}>{category.label}</span>
  </div>
</Card>
```

**1 file changed. No database changes.**

