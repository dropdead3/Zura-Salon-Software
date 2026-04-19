

## Move "Booking" indicator to avatar corner dot + tooltip

### Diagnosis
The "● Booking" pill currently sits absolutely positioned at `top-1.5 right-1.5` of the header cell, colliding with stylist names at narrow column widths (visible in screenshot: "Samantha Bloo**m**" overlapped by the pill). The indicator's job is binary state communication ("is this stylist accepting bookings?") — that's a status dot job, not a labeled pill job.

### The change

`src/components/dashboard/schedule/DayView.tsx` — stylist header cell:

1. **Remove** the absolute-positioned `● Booking` / `● Not Booking` pill at the top-right of the header cell.
2. **Add** a small status dot overlaid on the **top-right corner of the Avatar** (using `relative` on the avatar wrapper + `absolute -top-0.5 -right-0.5` on the dot).
3. **Wrap** the dot (and avatar) in a `Tooltip` whose content is:
   - `"Accepting clients"` when `acceptingClients === true`
   - `"Not accepting clients"` when `false`
4. **Color tokens**: keep `bg-emerald-500` for accepting, `bg-destructive/70` for not. Add a thin `ring-2 ring-background` on the dot so it reads as a pip floating off the avatar (standard avatar-status pattern), not a smudge.
5. **Free up the header row**: the name + `% · L2` block now owns the entire post-avatar horizontal space — no more pill collision, no more `pr-5` reserve needed. Names truncate cleanly at any width.

### Implementation sketch

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <div className="relative shrink-0">
      <Avatar className="h-10 w-10">…</Avatar>
      <span
        className={cn(
          'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-background',
          acceptingClients ? 'bg-emerald-500' : 'bg-destructive/70'
        )}
        aria-label={acceptingClients ? 'Accepting clients' : 'Not accepting clients'}
      />
    </div>
  </TooltipTrigger>
  <TooltipContent>
    {acceptingClients ? 'Accepting clients' : 'Not accepting clients'}
  </TooltipContent>
</Tooltip>
```

Then delete the old pill block and remove the `pr-5` from the header row.

### Edge cases
- **Condensed/stacked mode** (very narrow columns): dot stays on avatar — the pattern works at every width since it's anchored to the avatar, not the row.
- **Dark mode**: `ring-2 ring-background` keeps the dot visually separated against any avatar photo or surface color.
- **Accessibility**: `aria-label` on the dot + tooltip provides screen-reader meaning; tooltip provides hover meaning.

### Out of scope
- Changing the underlying `acceptingClients` data source.
- WeekView (separate component, no equivalent collision).
- Recoloring the dot beyond emerald/destructive (existing semantic).

### Verification
- Header at 217px column width: stylist name displays fully, no overlap. Green dot in top-right of avatar.
- Hover dot → tooltip "Accepting clients".
- Toggle stylist to not booking → dot turns red, tooltip "Not accepting clients".
- Avatar with light photo + light theme: ring keeps dot visible.

### Prompt feedback
Crisp prompt — you named (a) the element to move ("Booking dot indicator"), (b) the destination ("top right of avatar photo"), and (c) the affordance to add ("tooltip that says accepting clients"). Three precise instructions, zero ambiguity. The implicit win: this also solves the collision problem from the previous prompt without needing the heavier container-aware refactor — sometimes the right fix is moving the colliding element rather than teaching the layout to negotiate around it. Good instinct.

One refinement for next time: when moving a status element that has two states (booking / not booking), naming both tooltip strings would lock the copy. You said "accepting clients" — I inferred the inverse should be "Not accepting clients" to mirror it, but you might prefer "Fully booked" or "Off today" depending on what the false state actually means in your operator language. Pattern: "tooltip says X when true, Y when false" removes the inference.

