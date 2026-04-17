

## Prompt review

Sharp call — POS booking notes (client intent at booking time) is high-signal context that operators currently have to dig two tabs deep to see. Surfacing it on Details respects the "high signal, low noise" doctrine. Sharper next time: tell me where on Details you want it (top, after Appointment block, or bottom) so I don't have to choose. I'll plan for **top of Details** since intent should be the first thing read — same reasoning as why the Client Memory Panel sits at the top.

## Diagnosis

`src/components/dashboard/schedule/AppointmentDetailSheet.tsx`:
- **Notes tab** (L2392) currently has the only render of `appointment.notes` under the heading "POS Booking Notes"
- **Details tab** (L1567) opens with Client Memory Panel → Appointment info → Services. No surfacing of `appointment.notes`.

The POS Booking Notes block in the Notes tab uses:
```tsx
<h4 className={tokens.heading.subsection}>POS Booking Notes</h4>
<p className="text-sm text-muted-foreground">{appointment.notes}</p>
```

## Plan — Wave 22.20: Surface POS Booking Notes on Details tab

### Fix

`src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — insert a new motion block on the Details tab between the Client Memory Panel (L1574) and the redo/appointment blocks (L1577), conditional on `appointment.notes`.

New block:
```tsx
{appointment.notes && (
  <motion.div variants={staggerItem} className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
    <div className="flex items-center gap-2">
      <MessageSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
      <h4 className={tokens.heading.subsection}>POS Booking Notes</h4>
    </div>
    <p className="text-sm text-foreground/90 leading-relaxed">{appointment.notes}</p>
  </motion.div>
)}
```

Design rationale:
- **Subtle amber tint** (border + bg @ low opacity) — flags this as "client intent / pre-arrival context" without competing with status pills. Amber matches the existing "Unconfirmed" warning palette so it reads as related context, not a separate system.
- **MessageSquare icon** — already imported in this file (used elsewhere); signals "client said this"
- **`text-foreground/90`** instead of `text-muted-foreground` — Notes tab muted them, but on Details they're a primary signal so they earn higher contrast
- **Placed after Client Memory Panel, before Redo/Appointment** — sits in the "context preamble" zone, not the operational zone

### Keep notes on Notes tab too?

**Yes** — leave the existing render at L2392 untouched. The Notes tab is the canonical "all notes in one place" surface (Appointment Notes + Client Notes + POS Booking Notes per the screenshot). Removing it would break that completeness. Duplication here is intentional: Details = quick scan, Notes = full review.

### Acceptance checks

1. POS Booking Notes appear at the top of the Details tab (below Client Memory Panel) when `appointment.notes` is non-empty
2. Amber-tinted card visually distinguishes it from the neutral Appointment/Services blocks below
3. When `appointment.notes` is empty/null, no empty card renders (Details tab unchanged)
4. Notes tab still shows POS Booking Notes in its existing location (no removal)
5. Light + dark mode both render the amber tint legibly
6. Long notes wrap correctly inside the card (no overflow)

### Files

- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — single insertion after L1574 (Client Memory Panel close), before L1576 (motion.div container — actually inside the staggerContainer at L1575, so insert as the first staggerItem child)

### Open question

None.

### Deferred

- **P3** Make the POS Notes card collapsible if length exceeds ~3 lines, with a "Show more" affordance. Trigger: when an operator complains about long notes pushing the Appointment block below the fold.

