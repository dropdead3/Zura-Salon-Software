

# Align Connecting Lines to Circle Centers

## Problem
The current layout uses `flex-col` for each step (circle + label), with the connecting line as a sibling. The line sits at the full height of the step container, so it aligns to the middle of circle+label combined — not the circle center.

## Fix

**File: `BackroomDashboardOverview.tsx`** (lines 112–136)

Restructure the step tracker into **two rows**:

1. **Top row** — circles + connecting lines (all vertically centered via `items-center`)
2. **Bottom row** — labels only, positioned under each circle

```tsx
<div className="mt-2 w-full">
  {/* Row 1: circles + lines */}
  <div className="flex items-center w-full">
    {setupHealth.steps.map((step, i, arr) => (
      <React.Fragment key={step.label}>
        <div className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors',
          step.done ? 'bg-amber-500 text-amber-950' : 'border border-amber-500/40 bg-transparent'
        )}>
          {step.done && <Check className="w-3 h-3" />}
        </div>
        {i < arr.length - 1 && (
          <div className={cn('flex-1 h-px mx-1', step.done ? 'bg-amber-500/60' : 'bg-border/60')} />
        )}
      </React.Fragment>
    ))}
  </div>
  {/* Row 2: labels (hidden when narrow) */}
  <div className="hidden @[600px]:flex w-full mt-1">
    {setupHealth.steps.map((step, i, arr) => (
      <React.Fragment key={step.label}>
        <span className="w-5 text-[10px] text-center font-sans text-muted-foreground whitespace-nowrap shrink-0">
          {step.label}
        </span>
        {i < arr.length - 1 && <div className="flex-1" />}
      </React.Fragment>
    ))}
  </div>
</div>
```

This ensures connecting lines are always vertically centered with the circles, regardless of whether labels are visible.

Single file, one section replacement.

