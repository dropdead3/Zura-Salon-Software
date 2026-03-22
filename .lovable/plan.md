

## Show Staff Name in Schedule Header

**File:** `src/components/dock/schedule/DockScheduleTab.tsx`

**Change:** Replace the static "Schedule" heading with `"{displayName}'s Appointments Today"` using `staff.displayName` from the existing `staff` prop.

**Line 72-77** — Update header:
```tsx
<h1 className="font-display text-2xl tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
  {staff.displayName}'s Appointments Today
</h1>
<p className="text-sm text-[hsl(var(--platform-foreground-muted))] mt-0.5">
  {today}
</p>
```

Single line change, no new imports needed — `staff` is already a prop with `displayName`.

