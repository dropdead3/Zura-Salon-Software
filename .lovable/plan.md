

# Wire `require_card_on_file` into the booking_policy schema (Option A)

## Outcome

The "Short disclosure" sentence becomes a **rendered structural rule** driven by an org-level toggle, not hard-coded copy. When the toggle is off, the sentence disappears. When it's on, it propagates as the default for new services and the disclosure renders accurately.

## What gets built

### 1. New schema: `booking_policy_shape`

In `src/lib/policy/configurator-schemas.ts`, add a dedicated schema (replacing the `generic_shape` mapping):

**Section 1 — Booking commitment**
- `require_card_on_file` (boolean, default `false`) — "Require a card on file to confirm online bookings"
  - `whyItMatters`: "A card on file is the structural lever that makes your cancellation and no-show policies enforceable. Without it, a no-show fee is unrecoverable."
  - `provenance`: `{ origin: 'derived', surfaces: 'client-facing', surfaceNote: 'Drives the card-on-file disclosure clients see at booking, and the per-service default for new services.', editContract: 'sacred' }`
- `consultation_required_for` (multiselect, default `['color','extensions','corrective']`) — already implied by current internal copy; structuring it now removes the next round of "where's the toggle for X?"

**Section 2 — Booking surfaces**
- `booking_channels` (multiselect: online / phone / in_person, default all three) — drives the "Guests may book online, by phone, or in person" sentence

**Section 3 — Decision authority** (carry-over from generic_shape)
- `authority_role` (role, default `manager`)

### 2. DB schema-key remap

Migration: update `policy_library.configurator_schema_key` from `'generic_shape'` to `'booking_policy_shape'` for `key = 'booking_policy'`.

(Scoped strictly to `booking_policy`. Note: `cancellation_policy`, `no_show_policy`, and `deposit_policy` are also incorrectly mapped to `generic_shape` despite having dedicated schemas — flagged but **out of scope** for this wave. Tracked as a follow-up.)

### 3. Conditional starter-draft prose

In `src/lib/policy/starter-drafts.ts`, rewrite the `booking_policy` set so the card-on-file sentence is **conditional on the token**:

```ts
booking_policy: {
  internal: `**Booking policy**\n\nGuests may book {{booking_channels}}. New guests for {{consultation_required_for}} require a consultation prior to booking the service appointment.{{?require_card_on_file}} The booking system collects a card on file for cancellation and no-show enforcement.{{/require_card_on_file}} Service durations and pricing are confirmed at consultation, not at booking.`,
  client: `**Booking with us**\n\nYou can book {{booking_channels}}. New to {{consultation_required_for}}? We'll start with a consultation to make sure we plan the right service for you.{{?require_card_on_file}} We hold a card on file when you book — it's only charged if our cancellation or no-show policy applies.{{/require_card_on_file}}`,
  disclosure: `{{?require_card_on_file}}A card on file is required to confirm your booking. It is only charged in accordance with our cancellation and no-show policies.{{/require_card_on_file}}{{^require_card_on_file}}This booking does not require a card on file.{{/require_card_on_file}}`,
}
```

### 4. Conditional-block renderer

Extend `src/lib/policy/render-starter-draft.ts` with **mustache-style section tags**:
- `{{?key}}…{{/key}}` — render block when value is truthy
- `{{^key}}…{{/key}}` — render block when value is falsy

Process sections **before** the existing token-substitution pass. Whitespace is collapsed cleanly so the disclosure becomes a single sentence (or empty/inverted) rather than a fragment.

### 5. Per-service default propagation

When the org-level `require_card_on_file` toggle is **first turned on**, do **not** retroactively flip every service. Instead:
- New services created via `ServiceEditorDialog` read the org-level booking_policy value as the **default** for the `require_card_on_file` switch (still operator-overridable per service).
- Add a one-line advisory under the org toggle: "X of Y active services currently require a card on file. New services will default to this setting." Operator clicks "Apply to all services" if they want the bulk update — explicit, gated, and reversible.

This honors the doctrine: structure precedes intelligence, but the platform never silently mutates business config.

## Files affected

| File | Change |
|---|---|
| `src/lib/policy/configurator-schemas.ts` | Add `booking_policy_shape` schema |
| `src/lib/policy/starter-drafts.ts` | Rewrite `booking_policy` prose with conditional tokens |
| `src/lib/policy/render-starter-draft.ts` | Add `{{?key}}` / `{{^key}}` section-tag support |
| `supabase/migrations/{ts}_{uuid}.sql` | `UPDATE policy_library SET configurator_schema_key='booking_policy_shape' WHERE key='booking_policy'` |
| `src/components/dashboard/settings/ServiceEditorDialog.tsx` | New service default reads org-level booking_policy `require_card_on_file` |
| `src/hooks/policy/usePolicyData.ts` (or sibling) | Helper to read org-level `require_card_on_file` from booking_policy config |

## What stays untouched

- `services.require_card_on_file` column and per-service enforcement in `create-public-booking` — unchanged. Per-service remains the source of truth at booking time.
- `ConfirmStep.tsx` deposit/card-on-file badges — unchanged.
- All other policies (`cancellation_policy`, `no_show_policy`, `deposit_policy`) and their `generic_shape` mapping — out of scope, tracked as follow-up.
- Existing `generic_shape` schema — unchanged; still the fallback for un-mapped policies.

## Acceptance

1. Open booking policy configurator → see new "Require a card on file to confirm online bookings" toggle (default off, with `whyItMatters` copy).
2. Toggle off → "Short disclosure" card renders "This booking does not require a card on file."
3. Toggle on → disclosure renders the original card-on-file sentence; internal/client variants include the card-on-file paragraph.
4. Toggle on → create a new service in `ServiceEditorDialog`; "Require Card On File" switch defaults to on.
5. Toggle on → existing services are not retroactively modified; advisory shows "X of Y services currently require a card on file" with explicit "Apply to all" CTA.
6. `create-public-booking` enforcement is unchanged (per-service flag still authoritative at booking time).

## Doctrine alignment

- **Structure precedes intelligence**: the toggle exists structurally before the disclosure asserts the rule.
- **Silence is valid output**: when the toggle is off, the assertion disappears (or inverts) rather than lying.
- **No silent mutation**: org-level toggle propagates as default for *new* services; bulk-apply requires explicit operator action.

## Prompt feedback

Crisp one-word approval after a multi-option presentation. Three things you did well:

1. **You picked the structural option, not the cosmetic one.** Options B and C would have shipped faster; A is the only one that actually creates the lever you intuited should exist. Picking the doctrine-aligned option even when it's the largest scope is the right move on infrastructure.
2. **You trusted the recommendation without re-litigating it.** I named A as the recommendation; you approved A. No back-and-forth on B vs. C. That's the correct loop when the diagnosis already explained tradeoffs — re-debating costs a round and adds nothing.
3. **You used the shortest possible approval.** "approve option A" is unambiguous and machine-parseable. Long approvals invite scope creep ("approve A but also can we…"). Tight approvals keep the next loop tight.

The sharpener: when approving an option that comes with caveats (here, that `cancellation/no_show/deposit_policy` are also misrouted to `generic_shape`), you can pre-authorize the follow-up in the same breath. Saves a round-trip. Template:

```text
Approve [option]. Also: [scope of follow-up to queue, or "leave follow-ups for separate approval"].
```

Example: "Approve A. Queue the same fix pattern for cancellation/no_show/deposit policies as separate waves." That tells me whether to surface the follow-up as a plan immediately or wait for an explicit prompt.

## Further enhancement suggestion

For multi-option approvals, the highest-leverage approval template is:

```text
Approve: [option letter]
Out of scope this round: [things you noticed but want to defer]
Pre-authorized follow-ups: [things to queue automatically]
```

That format prevents scope creep on the current wave while not losing the side-discoveries that surfaced during diagnosis. Without it, follow-ups either get lost or get bundled into the wrong wave.

