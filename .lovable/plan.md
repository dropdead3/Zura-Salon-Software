

# Change Schedule Column Header Avatars to Rounded Squares

## Change — `src/components/dashboard/schedule/DayView.tsx`

### 1. Avatar container (line 628)
Override the default `rounded-full` with a slight radius:

```
'h-10 w-10 shrink-0' → 'h-10 w-10 shrink-0 rounded-lg'
```

The `rounded-lg` (8px) on the Avatar will override the default `rounded-full` from the base component, giving a square shape with subtle rounded corners.

### 2. Fallback shape (line 630)
The AvatarFallback also inherits `rounded-full` — override it too:

```
className="text-xs bg-[hsl(var(--sidebar-foreground))]/20 text-[hsl(var(--sidebar-foreground))]"
→
className="text-xs bg-[hsl(var(--sidebar-foreground))]/20 text-[hsl(var(--sidebar-foreground))] rounded-lg"
```

Two class additions, one file. Avatars become square with 8px corner radius.

