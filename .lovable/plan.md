

## Prompt review

Sharp catch — you flagged a copy/context mismatch between the surface (internal staff-facing booking wizard inside `/dashboard/schedule`) and the language ("Visible to your stylist before the appointment" reads like client-facing copy). Sharper next time: tell me whether the notes are meant for the **stylist performing the service** (handoff intel) or the **front desk team** (operational notes) — that distinction shapes the label. I'll assume **stylist handoff** based on the prior wave's stated intent.

## Diagnosis

The notes card was promoted in Wave 22.8 with copy borrowed from a client-facing pattern:

- Label: "Notes for the stylist" — fine, but ambiguous when staff is the author
- Placeholder: "What should your stylist know? Formula notes, client preferences, allergies, special requests..." — uses second-person possessive ("your stylist") which only makes sense if the *client* were typing
- Helper: "Visible to your stylist before the appointment." — same second-person framing; also redundant since the staff user IS the stylist or works alongside them

This is internal staff context. The author is front-desk/staff booking on behalf of a client. The reader is the assigned stylist (and anyone else with appointment access).

## Plan — Wave 22.10: Reframe notes copy for internal staff context

### Behavior

Rewrite the three copy elements to reflect internal staff-to-stylist handoff. Keep the structural promotion (always-visible card, Recommended badge, FileText icon, fill indicator) — only the language changes.

### Copy shifts

| Element | Before | After |
|---|---|---|
| Card label | "Notes for the stylist" | "Appointment notes" |
| Placeholder | "What should your stylist know? Formula notes, client preferences, allergies, special requests..." | "Add context for the stylist — formula details, client preferences, allergies, prep instructions, special requests..." |
| Helper text | "Visible to your stylist before the appointment." | "Internal note — visible to the assigned stylist and staff." |
| Badge | "Recommended" | "Recommended" (unchanged) |

### Why these shifts

- **"Appointment notes"** is neutral, accurate, and doesn't presume author identity. Works whether the author is the stylist booking themselves, a front-desk team member, or a manager.
- **Placeholder** drops second-person ("your stylist") in favor of imperative voice ("Add context for the stylist"). Reinforces that the author is staff writing *for* the stylist, not the client writing *to* the stylist.
- **Helper text** adds the word "Internal" upfront — disambiguates from any client-visible field, and clarifies the reader scope ("assigned stylist and staff") without overpromising visibility rules.

### Files

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — update label, placeholder, and helper text inside the notes card (~3 string changes, no structural changes)

### Acceptance checks

1. Notes card label reads "Appointment notes"
2. Placeholder uses imperative voice and lists internal-relevant context (formula, prefs, allergies, prep, requests)
3. Helper text begins with "Internal note —" and clarifies reader scope
4. No second-person ("your stylist") language remains in the card
5. Recommended badge, icon, fill indicator, and card structure unchanged
6. No regression to `bookingNotes` state or submit flow

### Open question

None — copy fix is unambiguous given the internal-only scoping you confirmed.

### Deferred

- **P2** Audit other booking surfaces (`DockNewBookingSheet`, public `/book/:orgSlug` flow) for the inverse problem — public surfaces should explicitly use *client-authored* framing — trigger: when reviewing public booking surface copy
- **P2** Add a `note_visibility` enum (`internal` | `client_visible`) to `appointment_notes` if/when client-portal note replies become a feature — trigger: when client-facing portal scope is approved

