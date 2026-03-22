

## Fix: Remove All-Caps from Status Group Labels

**Problem:** The status labels ("ACTIVE", "SCHEDULED", "COMPLETED") use `uppercase` class, but with Aeonik font the rule is normal capitalization only.

**File:** `src/components/dock/schedule/DockScheduleTab.tsx`

**Change — line 240:** Remove `uppercase` from the status label's className:

```tsx
// Before
<span className="text-sm font-medium tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">

// After
<span className="text-sm font-medium tracking-wide text-[hsl(var(--platform-foreground-muted))]">
```

Labels will then render as "Active", "Scheduled", "Completed" — standard capitalization as passed from the data.

Single class removal, one line.

