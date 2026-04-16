

# Make Stylist Header Cells Responsive

## Problem
At smaller column widths, the name, "Accepting" label, and level text overlap and crash into each other.

## Changes — `src/components/dashboard/schedule/DayView.tsx`

### 1. Hide "Accepting"/"Not Accepting" text label — show dot only
Remove the text `<span>` next to the dot. The tooltip already explains it on hover. This saves ~60px of horizontal space.

```text
Before:  ● Accepting
After:   ●  (tooltip on hover still says "Accepting New Clients...")
```

### 2. Name wrapping — allow last name to break to new line
Change the name `<span>` from `truncate` to `break-words` / natural wrapping so "Sarah Spencer" can wrap as:
```
Sarah
Spencer
```
Use `text-xs` instead of `text-sm` to fit better, and remove `truncate` class.

### 3. Stylist level breaks below utilization
Wrap the level onto its own line instead of inline with the percentage. Change the second row from a single `flex` row to a stacked layout:

```text
Before:  75% · Studio Artist
After:   75%
         Studio Artist
```

Remove the bullet separator. Level text uses `text-[10px] text-muted-foreground` on its own line, truncated if needed.

### Result per cell
```text
┌────────────────── ● ┐
│ [Av] Sarah          │
│      Spencer        │
│      75%            │
│      Studio Artist  │
└─────────────────────┘
```

Single file change, no new dependencies.

