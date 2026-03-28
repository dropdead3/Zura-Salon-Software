

## Problem

The Zura Insights panel in light mode lacks sufficient contrast. Severity-tinted insight cards, wizard intent cards, the summary strip, and borders all use very low opacity values (5-50%) that are nearly invisible against the light `bg-card` background.

## Plan

**File: `src/components/dashboard/AIInsightsDrawer.tsx`**

### 1. Severity card backgrounds (lines 156-160)
Increase tint opacity from `/5` to `/10` for visible differentiation:
```
info:     'border-l-blue-500/60 bg-blue-500/[0.08]'
warning:  'border-l-amber-500/60 bg-amber-500/[0.08]'  
critical: 'border-l-red-500/60 bg-red-500/[0.08]'
```

### 2. Insight card border (line 238)
Strengthen border from `border-border/50` to `border-border/70`:
```
'rounded-xl border-l-[3px] border border-border/70 p-3.5 transition-colors shadow-sm'
```

### 3. Wizard intent card borders (line 464)
Strengthen from `border-border/50` to `border-border/70`, and hover border from `hover:border-foreground/20` to `hover:border-foreground/30`:
```
'border-border/70 bg-card hover:bg-accent/40 hover:border-foreground/30 hover:shadow-sm cursor-pointer'
```

### 4. Summary strip background (line 790)
Increase from `bg-muted/40` to `bg-muted/60`:
```
<div className="flex items-center gap-3 rounded-lg bg-muted/60 px-3.5 py-2.5">
```

### 5. Panel outer border (line 716)
Strengthen from `border-border/40` to `border-border/60`:
```
<div className="w-full rounded-xl border border-border/60 bg-card overflow-hidden">
```

### 6. Divider line below header (line 717)
Strengthen from `via-border/40` to `via-border/60`:
```
<div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
```

These are all opacity bumps — no structural changes. The dark mode appearance remains virtually unchanged since the base colors already have adequate contrast there.

