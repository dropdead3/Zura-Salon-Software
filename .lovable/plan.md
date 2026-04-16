

# Enlarge Stylist Profile Photos & Names in Schedule Column Headers

## Change — `src/components/dashboard/schedule/DayView.tsx`

### 1. Avatar size (line 628)
Increase from `h-8 w-8` to `h-10 w-10`:

```
'h-8 w-8 shrink-0' → 'h-10 w-10 shrink-0'
```

### 2. Name text in normal/medium layout (line 672)
Increase from `text-xs` to `text-sm`:

```
<span className="text-xs font-medium leading-tight truncate">
→
<span className="text-sm font-medium leading-tight truncate">
```

### 3. Name text in condensed layout (line 652)
Increase from `text-[11px]` to `text-xs`:

```
<span className="text-[11px] font-medium leading-tight">
→
<span className="text-xs font-medium leading-tight">
```

Three class changes, one file. Avatar goes from 32px → 40px; names bump up one size step in both layout modes.

