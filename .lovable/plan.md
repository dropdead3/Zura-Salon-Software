

## Tone Down Toggle Purple

**Problem:** The switch uses `bg-[hsl(var(--platform-primary))]` when checked, which resolves to a vivid violet that's too bright in the dark Dock context.

**File:** `src/components/dock/schedule/DockScheduleTab.tsx` — line 161

**Change:** Replace the checked background with a muted violet using opacity:

```tsx
// Before
className="data-[state=checked]:bg-[hsl(var(--platform-primary))] data-[state=unchecked]:bg-[hsl(var(--platform-foreground-muted)/0.25)]"

// After
className="data-[state=checked]:bg-violet-500/60 data-[state=unchecked]:bg-[hsl(var(--platform-foreground-muted)/0.25)]"
```

Uses `violet-500/60` (60% opacity) instead of the full-brightness platform primary. This keeps the violet hue recognizable but significantly tones down the vibrancy to fit the subdued dark theme.

Single class change, one line.

