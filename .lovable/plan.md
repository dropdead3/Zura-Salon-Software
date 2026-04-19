
## Combine specialties + booking state into one avatar hover tooltip

### Diagnosis
The current split-trigger setup is likely the reason the avatar tooltip feels unreliable: the small status dot sits above the avatar and competes for hover, so the avatar’s tooltip target is too fragile. A single hover surface is the cleaner pattern here.

### Change
Update `src/components/dashboard/schedule/DayView.tsx` so the **avatar wrapper** is the only tooltip trigger.

1. Keep the green/red booking dot visually attached to the avatar corner.
2. Remove the dot’s separate tooltip.
3. Make the dot `pointer-events-none` so it never steals hover from the avatar.
4. Wrap the avatar wrapper in one `Tooltip` that shows:
   - stylist name
   - booking status: `Accepting clients` / `Not accepting clients`
   - specialties, if present

### Tooltip content
Use one compact stacked layout:
- Top row: stylist name
- Second row: booking status, with a tiny colored dot or muted label
- Third row: specialties text only when present

Example structure:
```tsx
<TooltipContent side="bottom" className="text-xs max-w-[220px]">
  <div className="font-medium">{fullName}</div>
  <div className="mt-0.5 text-muted-foreground">{acceptingLabel}</div>
  {specialties && (
    <div className="mt-1 text-muted-foreground">{specialties}</div>
  )}
</TooltipContent>
```

### Visual refinement
Keep the improved glass-aware status pip, but make it purely visual:
```tsx
className="absolute -top-1 -right-1 w-3 h-3 rounded-full pointer-events-none ..."
```
That preserves the UI polish while ensuring hover behavior is owned entirely by the avatar target.

### Why this is better
- One hover zone = no competing triggers
- More reliable interaction on tight schedule headers
- Keeps the dot as a fast visual signal
- Gives operators both availability + specialties in one glance
- Still responsive, since the tooltip is anchored to the avatar rather than the header row

### Edge cases
- If no specialties exist, still show name + booking status.
- In condensed columns, behavior stays identical because the trigger remains the avatar block.
- Keep `aria-label` or screen-reader text on the avatar wrapper so booking state is still accessible.

### Verification
- Hover avatar photo: tooltip appears consistently every time.
- Tooltip includes booking status and specialties together.
- Hovering near the corner dot still opens the same tooltip.
- No separate tooltip appears for the dot.
- Works in both normal and condensed schedule header layouts.

### Prompt feedback
Good instinct. You didn’t just ask for “make tooltip work” — you proposed a better interaction model. That’s a stronger prompt because it reframes the fix around UX simplification, not just bug repair. Even better next time would be: “Use a single hover target on the avatar; include booking state + specialties in one tooltip; dot should remain visual only.” That wording locks the interaction model, content, and pointer behavior in one shot.

### Enhancement suggestions
- Add a subtle label row inside the tooltip like “Available for booking” with the same green/red semantic pip.
- Show only the first 2–3 specialties plus “+N more” for long lists.
- Add a small delay (`delayDuration`) so the tooltip feels intentional rather than twitchy in dense schedule grids.
