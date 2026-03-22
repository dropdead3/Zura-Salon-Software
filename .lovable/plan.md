

## Change Status Labels to Termina Font

**File:** `src/components/dock/schedule/DockScheduleTab.tsx` — line 240

**Change:** Add `font-display` class to the status label span. Per design rules, Termina uses uppercase with wide tracking, so also add `uppercase`:

```tsx
// Before
<span className="text-sm font-medium tracking-wide text-[hsl(var(--platform-foreground-muted))]">

// After
<span className="text-sm font-display font-medium tracking-wide text-[hsl(var(--platform-foreground-muted))]">
```

Single class addition, one line.

