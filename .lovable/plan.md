

## Reduce Header Title-to-Date Spacing

**Problem:** The grid layout introduced for button alignment added `gap-y-1` between rows, which combined with the heading's line-height creates excessive vertical space between "TODAY'S APPOINTMENTS" and "Sunday, March 22".

### Change — `src/components/dock/schedule/DockScheduleTab.tsx`

**Line 194:** Change `gap-y-1` to `gap-y-0` to eliminate the inter-row gap:
```tsx
className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-0 px-5 pt-8 pb-5 border-b border-[hsl(var(--platform-border)/0.15)]"
```

**Line 204:** Remove the `mt-0.5` from the date paragraph since the gap is now tighter:
```tsx
<p className="col-start-1 text-base text-[hsl(var(--platform-foreground-muted))]">
```

One file, two class tweaks.

