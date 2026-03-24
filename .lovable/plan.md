

## Add "No color/chemical services" Badge for Non-Chemical Appointments

**Goal:** When an appointment's service doesn't require color/chemical work, show a neutral badge reading "No color/chemical services" instead of the mixing-related badges.

### Change — `src/components/dock/schedule/DockAppointmentCard.tsx`

Update the badge block (lines 288-298) to add a third condition based on the existing `isChemical` prop:

- **If `isChemical` is false** and the appointment is active and non-terminal → show "No color/chemical services" in a neutral ghost style (e.g., `bg-slate-500/15 text-slate-400 border border-slate-400/25`)
- **If `isChemical` is true and `mix_bowl_count > 0`** → existing sky/blue badge
- **If `isChemical` is true and `mix_bowl_count === 0`** → existing amber badge

The visibility condition expands: show badge on active non-terminal cards regardless of chemical status.

```tsx
{isActive && !isTerminal && (
  <div className={cn(
    "absolute top-5 right-5 px-2.5 py-1 rounded-full text-[11px] font-sans whitespace-nowrap",
    !isChemical
      ? "bg-slate-500/15 text-slate-400 border border-slate-400/25"
      : (appointment.mix_bowl_count ?? 0) > 0
        ? "bg-sky-500/15 text-sky-300 border border-sky-400/25"
        : "bg-amber-500/15 text-amber-300 border border-amber-400/25"
  )}>
    {!isChemical
      ? 'No color/chemical services'
      : (appointment.mix_bowl_count ?? 0) === 0
        ? 'No bowls mixed'
        : `${appointment.mix_bowl_count} bowl${appointment.mix_bowl_count === 1 ? '' : 's'} mixed`}
  </div>
)}
{/* Keep showing badge for non-active cards that have bowls mixed */}
{!isActive && !isTerminal && isChemical && (appointment.mix_bowl_count ?? 0) > 0 && (
  <div className="absolute top-5 right-5 px-2.5 py-1 rounded-full text-[11px] font-sans whitespace-nowrap bg-sky-500/15 text-sky-300 border border-sky-400/25">
    {`${appointment.mix_bowl_count} bowl${appointment.mix_bowl_count === 1 ? '' : 's'} mixed`}
  </div>
)}
```

One file, one block updated.

