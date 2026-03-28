

## Problem

The Zura Insights panel in light mode is too washed out. The wizard intent cards, insight cards, and summary strip all blend into the white `bg-card` background due to insufficient fill contrast and depth.

## Plan

**File: `src/components/dashboard/AIInsightsDrawer.tsx`**

### 1. Severity card backgrounds — more visible tint fills
Increase from `/[0.08]` to `/[0.12]`:
- `info: 'border-l-blue-500/60 bg-blue-500/[0.12]'`
- `warning: 'border-l-amber-500/60 bg-amber-500/[0.12]'`
- `critical: 'border-l-red-500/60 bg-red-500/[0.12]'`

### 2. Insight card shadow — add subtle depth
Line 238: Add `shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]` for lifted appearance:
```
'rounded-xl border-l-[3px] border border-border/70 p-3.5 transition-colors shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]'
```

### 3. Wizard intent cards — visible fill on non-empty cards
Line 464: Change `bg-card` to `bg-muted/30` and add subtle shadow:
```
'border-border/70 bg-muted/30 hover:bg-accent/50 hover:border-foreground/30 hover:shadow-md cursor-pointer'
```

### 4. Summary strip — stronger background
Line 790: Increase from `bg-muted/60` to `bg-muted/80`:
```
<div className="flex items-center gap-3 rounded-lg bg-muted/80 px-3.5 py-2.5">
```

### 5. Panel container — subtle shadow for depth
Line 716: Add a soft shadow to the outer panel:
```
<div className="w-full rounded-xl border border-border/60 bg-card shadow-[0_2px_8px_0_rgba(0,0,0,0.06)] overflow-hidden">
```

These changes add visible fill differentiation and depth in light mode. Dark mode impact is minimal since `muted` and severity colors already contrast well against dark backgrounds.

