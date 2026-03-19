

# Center Step Labels Under Circles

## Problem
The step labels ("Products", "Services", etc.) have `w-5` matching the circle width, but the text is much wider, causing misalignment. Labels need to be centered under their respective circles.

## Fix — `BackroomDashboardOverview.tsx`

### Lines 141-143: Change the label `<span>` styling
Remove the fixed `w-5` and instead use a flexible centering approach that allows the text to overflow and center relative to the circle position:

```tsx
// From:
<span className="w-5 text-[10px] text-center font-sans text-muted-foreground whitespace-nowrap shrink-0">

// To:
<span className="w-5 text-[10px] text-center font-sans text-muted-foreground whitespace-nowrap shrink-0 flex justify-center">
```

This won't fully work because the text is wider than `w-5`. The proper fix is to make each step a column with the circle on top and label below, both centered. Restructure both rows into a single row of step columns:

### Lines 120-147: Merge circle + label rows into one
Replace the two separate rows with a single flex row where each step is a vertical column (circle + label), connected by lines:

```tsx
<div className="flex items-start w-full">
  {setupHealth.steps.map((step, i, arr) => (
    <React.Fragment key={step.label}>
      <div className="flex flex-col items-center shrink-0">
        <div className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center transition-colors',
          step.done ? 'bg-amber-500 text-amber-950' : 'border border-amber-500/40 bg-transparent'
        )}>
          {step.done && <Check className="w-3 h-3" />}
        </div>
        <span className="hidden @[600px]:block text-[10px] text-center font-sans text-muted-foreground whitespace-nowrap mt-1">
          {step.label}
        </span>
      </div>
      {i < arr.length - 1 && (
        <div className={cn('flex-1 h-px mx-1 mt-2.5', step.done ? 'bg-amber-500/60' : 'bg-border/60')} />
      )}
    </React.Fragment>
  ))}
</div>
```

This replaces both Row 1 (circles, lines 120-136) and Row 2 (labels, lines 137-147) with a single unified structure where labels sit directly beneath their circles, perfectly centered.

| File | Lines | Change |
|------|-------|--------|
| `BackroomDashboardOverview.tsx` | 120-147 | Merge circle+label into single column-based layout |

