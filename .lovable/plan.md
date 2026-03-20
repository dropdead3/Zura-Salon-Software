

## Fix Assistant Label Font Inconsistency

The "ASSISTANT" label on line 960 uses `font-display tracking-wider uppercase` (Termina), while all other detail row labels (Location, Stylist, Date, Duration) use the default font (Aeonik) via `DetailRow` on line 1102.

### Change

In `src/components/dock/schedule/DockNewBookingSheet.tsx`, line 960:

**Remove** `font-display tracking-wider uppercase` from the Assistant label's class string so it matches the `DetailRow` label style exactly:

```
// Before (line 960)
"text-[10px] text-[hsl(var(--platform-foreground-muted)/0.6)] font-display tracking-wider uppercase"

// After
"text-[10px] text-[hsl(var(--platform-foreground-muted)/0.6)]"
```

Single line change, single file.

