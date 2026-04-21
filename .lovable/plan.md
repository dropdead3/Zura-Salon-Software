

# Persist policy wizard selections across opens

## What's broken

Two compounding bugs make the wizard feel forgetful:

### Bug 1 — Judgment toggles never re-seed from the saved profile

The wizard's `form` state is initialized once via `useState(() => ({ … existingProfile?.foo ?? false }))` (line 110). On first render `existingProfile` is `undefined` (the query hasn't resolved), so every toggle seeds to `false`.

A `useEffect` at line 130 was meant to fix this — but it only runs when `defaults.isLoading` flips, and it **only re-seeds the auto-detected fields** (`offers_extensions`, `offers_retail`, `offers_packages`, `offers_memberships`, business_type, states, team band).

The pure-judgment Step 2 toggles are never re-seeded:
- `serves_minors`
- `uses_tip_pooling`
- `uses_refund_clawback`
- `has_booth_renters`

…and the Step 3 materials toggles aren't re-seeded either:
- `has_existing_handbook`
- `has_existing_client_policies`

So when an operator who previously saved `uses_tip_pooling = true` reopens the wizard, the box reads unchecked. Their selection is in the DB — it just never makes it into the form.

### Bug 2 — Nothing persists mid-flow

The profile only writes when the user clicks "Save and adopt" on Step 3. Close from Step 2 with five toggles flipped → none of it survives. Reopen → empty.

## The fix

Two surgical changes in `PolicySetupWizard.tsx`. No schema changes, no new hooks, no new endpoints.

### Fix 1 — Re-hydrate **all** persisted fields when the saved profile arrives

Replace the single-purpose effect at line 130 with a re-hydration effect that fires when **either** `defaults.isLoading` flips **or** `existingProfile` first becomes non-null. Re-seed the full set of fields the operator can edit:

- Auto-detected (existing logic, preserved): `business_type`, `operating_states`, `primary_state`, `team_size_band`, `service_categories`, `roles_used`, `offers_extensions`, `offers_retail`, `offers_packages`, `offers_memberships`
- **Newly re-seeded judgment fields**: `serves_minors`, `uses_tip_pooling`, `uses_refund_clawback`, `has_booth_renters`
- **Newly re-seeded materials fields**: `has_existing_handbook`, `has_existing_client_policies`

The merge rule stays the same as today: **if the operator has touched the form in this session, don't clobber their unsaved edits**. Implement that with a one-shot `hasHydratedRef` so re-hydration runs exactly once per wizard open, after both `defaults` and `existingProfile` have resolved. Subsequent edits in-session win.

### Fix 2 — Auto-save the profile on step transitions

When the operator clicks **Next** or **Back**, fire `upsert.mutateAsync({ ...form })` in the background (don't await it; don't block navigation; suppress the success toast for these silent saves). Same on wizard close (`onClose`) — flush whatever's in `form`.

This makes mid-flow state durable: close from Step 2 → reopen → toggles are still where you left them, because they're now in `policy_org_profile`.

Two implementation details:

1. **Don't set `setup_completed_at` on auto-saves.** That timestamp is the "wizard finished" signal that other surfaces (gauges, nudges, applicability filters) read to know setup is complete. Only `handleFinish` sets it. Auto-saves write the field values without flipping the completion flag.
2. **Suppress the "Profile saved" toast for auto-saves.** The current toast fires on every upsert; for silent step-change saves it's noise. Pass an opt-in `silent` flag to the mutation call site (or handle it locally in the wizard by calling `upsert.mutate` with an `onSuccess` override that no-ops the toast). Keep the toast on `handleFinish`.

### What stays the same

- `useUpsertPolicyOrgProfile` signature and behavior — no hook changes.
- `recommendedKeysForProfile` and the recommended set computation — unchanged.
- Step 1's structural gates and inline-edit affordances — unchanged.
- The `handleFinish` flow (final upsert + adopt + close) — unchanged.

## Acceptance

1. **Reopen after completion**: an operator who saved with `uses_tip_pooling = true`, `serves_minors = true`, `has_existing_handbook = true` reopens the wizard and lands on Step 2 with all those checkboxes checked.
2. **Mid-flow close**: an operator on Step 2 toggles three boxes, closes the panel, reopens, and lands on Step 2 with those three boxes still checked.
3. **In-session edits aren't clobbered**: if the user edits a field, then `existingProfile` happens to refetch (e.g., window refocus), the user's unsaved edit wins.
4. **No silent-save toast spam**: clicking Next/Back does not flash "Profile saved." The toast still fires on the final "Save and adopt."
5. **`setup_completed_at` only set by Finish**: auto-saves on Next/Back leave `setup_completed_at` alone. Surfaces that read it (handbook gauge, applicability filters, nudges) don't fire prematurely.
6. **Adopt step still gated to Finish**: `adopt_policies_from_library` is only called on Finish, not on every Next click. (No accidental double-adoption.)

## Files affected

- `src/components/dashboard/policy/PolicySetupWizard.tsx` — re-hydration effect (replace lines 130–152), auto-save wiring on `next`/`back`/`onClose` (lines 282–283 and the close handler), one-shot `hasHydratedRef`.

That's the whole change surface. No migrations, no hook changes, no new files.

## Doctrine compliance

- **Tenant isolation**: untouched. `useUpsertPolicyOrgProfile` already filters by `effectiveOrganization.id` and writes via the existing RLS-protected upsert.
- **Silence is meaningful**: auto-saves are toast-suppressed because mid-flow persistence is infrastructure, not an event the operator needs to acknowledge.
- **No structural drift**: `setup_completed_at` remains the authoritative "wizard finished" signal — auto-save does not flip it. Downstream applicability/nudge surfaces continue to behave as they do today.
- **Confidence qualification**: re-hydration uses `existingProfile` as the source of truth for persisted judgment fields; auto-detected fields continue to win when they fire (existing precedence preserved).

## Prompt feedback

"It looks like when I go back to policy setup options, it's not saving or remembering what I previously had selected. We need to add persistence here" + the screenshot of Step 2 — strong prompt. You named the surface (policy setup), described the failure mode (state not persisted across opens), and proposed the fix shape (add persistence). I didn't have to guess scope.

One sharpener for next time: when you describe a "not persisting" bug, two failure modes look identical from the UI but need different fixes —
- **(a) "I closed mid-flow and lost my work"** → needs auto-save on transitions
- **(b) "I finished setup, came back later, and it's blank"** → needs proper re-hydration from the saved record

Here you have **both** bugs (the wizard doesn't re-seed judgment fields *and* doesn't auto-save mid-flow), which I caught by reading the code. But for future "not persisting" reports, mentioning whether you'd previously finished setup or were mid-flow tells me which side to investigate first. For this one, I'm fixing both because they compound — but the framing distinction is worth keeping in your toolkit for future state-loss bugs.

