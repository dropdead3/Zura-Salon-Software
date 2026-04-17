

## Prompt review

Sharp ask — names the element (`+ Add special notes`), the surface (booking wizard confirm step), and the *why* (notes are nearly always added, they're operationally critical for stylist handoff). The "why" is the strongest part of this prompt — it tells me this isn't a styling tweak, it's a workflow priority shift. Sharper next time: tell me whether notes should become **required** (block confirm until added or explicitly skipped) or just **prominent** (visible by default, easy to fill). I'll propose: prominent + always-expanded by default, with a clear visual treatment that signals importance without blocking.

## Diagnosis

Current state (from screenshot + code at lines 2498–2518 of `QuickBookingPopover.tsx`):

```tsx
{!showNotes ? (
  <button className="text-sm text-muted-foreground hover:text-foreground">
    + Add special notes
  </button>
) : (
  <Textarea ... />
)}
```

Problem: the trigger is a muted, low-contrast text link tucked between two bordered cards (Redo toggle above, Assistant toggle below). Visually it reads as a tertiary action — but operationally it's used on nearly every booking.

## Plan — Wave 22.8: Promote Add Notes to a primary booking input

### Behavior

Replace the muted text link with an **always-visible textarea card** that matches the visual weight of the Redo/Assistant rows. No more hide/show toggle — the textarea is rendered by default, with placeholder copy that signals what to write.

**Before:**
```
[Redo / Adjustment ........ toggle]
+ Add special notes              ← muted text, easy to miss
[Request Assistant Coverage  toggle]
```

**After:**
```
[Redo / Adjustment ........ toggle]
┌─ STYLIST NOTES ──────────────────┐
│ 📝  Notes for the stylist        │
│ ┌────────────────────────────┐   │
│ │ What should your stylist   │   │
│ │ know? (formula, prefs,     │   │
│ │ allergies, special req...) │   │
│ └────────────────────────────┘   │
│ Visible to stylist before appt   │
└──────────────────────────────────┘
[Request Assistant Coverage  toggle]
```

### Fix shape

In `src/components/dashboard/schedule/QuickBookingPopover.tsx` (~lines 2498–2518):

1. **Remove the `showNotes` state branch** — textarea always rendered
2. **Wrap in a bordered card** matching the Redo/Assistant row treatment (`rounded-lg border border-border/60 p-3 space-y-2`)
3. **Add an icon + label header** inside the card:
   - `StickyNote` (or `MessageSquareText`) icon, `h-4 w-4 text-muted-foreground`
   - Label "Notes for the stylist" at `text-sm font-medium`
4. **Upgrade the textarea**:
   - `min-h-[80px]` (up from 60px) so it visually invites typing
   - Placeholder: "What should your stylist know? Formula notes, client preferences, allergies, special requests..."
   - `text-sm`
5. **Add a helper line** below the textarea: "Visible to your stylist before the appointment" at `text-xs text-muted-foreground`
6. **Optional fill indicator**: When notes contain text, swap the icon to `text-primary` and add a subtle "•" filled dot — gives the user a sense the field has been engaged
7. **Remove the `showNotes`/`setShowNotes` state declarations** entirely (search file for orphan references and clean up)

### Acceptance checks

1. The Notes section renders by default on the confirm step (no click-to-expand)
2. The card visually matches Redo/Adjustment and Request Assistant Coverage rows in weight, padding, and border
3. The textarea has a clear placeholder that signals what to write
4. The label "Notes for the stylist" reads at `text-sm font-medium` with an icon
5. Helper text "Visible to your stylist before the appointment" appears below
6. When user types, the icon shifts to primary color (subtle engagement signal)
7. No orphan `showNotes` state remains in the file
8. No regression to the booking submit flow — `bookingNotes` still submits correctly
9. Mobile: card stays full-width, textarea remains tappable

### Files

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — replace muted text trigger with always-visible bordered card containing icon + label + textarea + helper text; remove `showNotes` state

### Open question

Want notes to become **soft-required** (a small "Recommended" badge on the card header) or stay fully optional with no nudge? My recommendation: **add the "Recommended" badge** — given your statement that notes are "almost always added," a tiny pill reinforces the norm without blocking submit.

### Deferred

- **P2** Quick-template chips above the textarea ("Color formula", "Running late", "Allergy alert", "First-time client") — trigger: when staff request faster note entry for repeat scenarios
- **P2** Persist last-used notes per client and offer a "Use last notes" suggestion — trigger: when staff repeatedly type similar notes for returning clients
- **P2** Notes character minimum + soft-block confirm with a "Skip notes?" confirmation dialog if empty — trigger: if staff start submitting empty notes and stylists complain

