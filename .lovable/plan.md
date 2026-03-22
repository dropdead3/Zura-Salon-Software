

## Fix: Toggle "Off" State Too Bright

**Problem:** The Switch unchecked state uses `bg-muted` which resolves to a bright white/light color in the Dock's dark theme context.

**File:** `src/components/dock/schedule/DockScheduleTab.tsx` (line 152)

**Fix:** Add a `data-[state=unchecked]` override to use a subtle dark gray matching the Dock palette:

```tsx
className="data-[state=checked]:bg-[hsl(var(--platform-primary))] data-[state=unchecked]:bg-[hsl(var(--platform-foreground-muted)/0.25)]"
```

Single class addition — the unchecked track becomes a dim gray that's visible but not eye-catching.

