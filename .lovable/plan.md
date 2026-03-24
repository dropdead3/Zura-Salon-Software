

## Update Bowl Count Badges — Font, Color, and Visibility Rules

### Problem
The bowl count badges currently use `font-display` (Termina) and violet/purple styling. They also show on all non-terminal appointments. Need to:
1. Switch to `font-sans` (Aeonik Pro)
2. Use light blue ghost for bowls mixed, amber ghost for "No bowls mixed"
3. Only show on active-status appointments, unless `mix_bowl_count > 0`

### Change — `src/components/dock/schedule/DockAppointmentCard.tsx`

Update lines 288-293:

**Visibility logic:** Show badge if appointment is active OR if `mix_bowl_count > 0` (for any status except terminal):
```tsx
{(isActive || (appointment.mix_bowl_count ?? 0) > 0) && !isTerminal && (
```

**Styling:** Replace `font-display tracking-wide uppercase` with `font-sans`, and swap colors based on count:
- `mix_bowl_count > 0`: light blue ghost — `bg-sky-500/15 text-sky-300 border border-sky-400/25`
- `mix_bowl_count === 0`: amber ghost — `bg-amber-500/15 text-amber-300 border border-amber-400/25`

```tsx
<div className={cn(
  "absolute top-5 right-5 px-2.5 py-1 rounded-lg text-[11px] font-sans whitespace-nowrap",
  (appointment.mix_bowl_count ?? 0) > 0
    ? "bg-sky-500/15 text-sky-300 border border-sky-400/25"
    : "bg-amber-500/15 text-amber-300 border border-amber-400/25"
)}>
```

One file, one block updated.

