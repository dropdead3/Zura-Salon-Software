

# Improve Table Column Headers: Level Numbers + Icon Swap

## Changes

### 1. Add level number above each level name
Show "Level 1", "Level 2", etc. as a small kicker above the level name in each column header.

```tsx
<div className="flex flex-col items-center gap-2">
  <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground/50">
    Level {idx + 1}
  </span>
  <span className="text-sm font-medium">{level.label}</span>
  ...
</div>
```

### 2. Replace ShieldCheck icon with a more appropriate indicator
The shield icon doesn't communicate "retention monitoring" intuitively. Replace it with a small colored dot indicator — green when retention is active, gray when off. This is cleaner and more semantically clear.

```tsx
// Before: <ShieldCheck className="w-3.5 h-3.5 ..." />
// After: simple status dot
<span className={cn(
  "w-2 h-2 rounded-full",
  retentionActive ? "bg-emerald-500" : "bg-muted-foreground/20"
)} />
```

The tooltip explaining retention status remains unchanged.

## File Modified
- `src/components/dashboard/settings/StylistLevelsEditor.tsx` — column header updates (~lines 700–737)

## No database changes.

