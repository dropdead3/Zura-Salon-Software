

## Prompt review

Sharp ask — names the element ("Appointment Notes card"), the destination ("underneath services, above stylist"), and is unambiguous. Sharper next time: tell me whether the relocation is for **scan order** (operator's eye should hit notes before assigning the stylist, since notes often inform stylist choice) or **information density** (group "what's happening" with "what to know" before "who's doing it"). Both lead to the same fix here, but the *why* would let me also flag whether the Stylist Notes pattern in `DockNewBookingSheet` deserves the same reorder. I'll assume the operational logic: notes inform stylist assignment, so they should sit immediately after the service list.

## Diagnosis

In `QuickBookingPopover.tsx` confirm step (`step === 'confirm'`), the current vertical order is:

```
1. Client header card           (L2205)
2. Location / Date / Duration   (L2220)
3. Services                     (L2249–2285)
4. Stylist                      (L2286–2303)
5. Estimated Product Cost       (L2304)
6. Redo / Adjustment            (L2348)
7. Appointment Notes  ← here    (L2497–2519)
8. Request Assistant Coverage   (L2521)
```

The Notes card was dropped at the end of the confirm stack in Wave 22.8 because it was previously a hidden toggle. Now that it's a primary input, its position should reflect operational scan order: **see what's being booked → write context for it → see who's assigned**.

## Plan — Wave 22.11: Reorder Notes between Services and Stylist

### Behavior

Move the entire Notes card block (L2497–2519, ~23 lines) to slot in between the Services block (ends L2285) and the Stylist block (starts L2286). New vertical order on the confirm step:

```
1. Client header
2. Location / Date / Duration
3. Services
4. Appointment Notes        ← moved here
5. Stylist
6. Estimated Product Cost
7. Redo / Adjustment
8. Request Assistant Coverage
```

### Fix shape

In `src/components/dashboard/schedule/QuickBookingPopover.tsx`:

1. **Cut** the Notes card div (L2497–2519) — the entire `{/* Stylist Notes — always visible, operationally critical */}` block including its wrapping `<div className="rounded-lg border border-border/60 p-3 space-y-2">`
2. **Update the comment** to `{/* Appointment Notes — internal staff context */}` to match the post-Wave 22.10 framing
3. **Paste** it immediately after the Services block's closing `</div>` (after L2285) and before the Stylist `<div>` opens (L2286)
4. Keep all internal markup (FileText icon, Recommended badge, textarea, helper text) **unchanged** — copy, sizing, fill indicator, and behavior are correct as-is

No state, prop, or submit-flow changes. Pure DOM reordering.

### Acceptance checks

1. On the confirm step, the Notes card renders directly below the Services list and directly above the Stylist card
2. Card visual weight, copy ("Appointment notes" / "Internal note —" / "Recommended" badge) is unchanged
3. `bookingNotes` state still binds correctly and submits with the booking
4. Estimated Product Cost, Redo/Adjustment, and Request Assistant Coverage remain in their current positions below the Stylist card
5. No regression on the inline fill indicator (icon turns primary when notes typed)
6. No orphan comment or stray div from the cut

### Files

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — relocate the Notes card (~23-line move, no other changes)

### Open question

None — pure structural reorder.

### Deferred

- **P2** Apply the same Services → Notes → Stylist scan order to `DockNewBookingSheet` confirm step — trigger: when Dock booking surface is reviewed for parity with the schedule popover
- **P2** Persist last-used notes per client and surface a "Use last notes" suggestion above the textarea — trigger: when staff repeatedly retype similar handoff notes for returning clients
- **P3** Make the Notes card slot configurable via a tenant-level "confirm step layout" setting if multi-org feedback diverges on optimal scan order — trigger: only if 2+ orgs request different orderings

