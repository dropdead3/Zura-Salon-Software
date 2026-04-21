

# Reviewable & editable adopted-policy set inside the wizard

## What's missing today

Step 3 ("Materials & review") currently surfaces *aggregates*:

- **`Recommended policy set: 50`** — a number, not a list.
- **`Policies by category`** — counts per category, no titles, no descriptions.

Then the operator clicks **"Save & adopt 50"** and the wizard commits all 50 in one shot. No way to:

1. **See which 50 policies** are actually about to be adopted (titles, what they cover).
2. **Understand why** any individual policy was selected (required vs recommended, which toggle drove it).
3. **Opt out** of a recommended policy they don't want — even if they read the list and disagree.

Net effect: the wizard's last step is a black-box commit. The operator either trusts the system or bails out. That violates the doctrine's core promise — "tells you exactly what lever to pull next" — by hiding the levers.

## The fix

Replace the aggregate-only block at the bottom of Step 3 with a **categorized, expandable, per-policy review list** where each row has a checkbox. Required policies are checked-and-locked (with a tooltip explaining why). Recommended policies are checked-by-default but unlockable. The "Save & adopt" button commits whatever the operator has checked at the moment of click.

### New Step 3 structure (top → bottom)

1. **Existing materials** block (unchanged — current handbook/client-policies toggles + their callouts).
2. **NEW: "Review the recommended set" block** replacing the current aggregate stats:
   - **Header strip**: `{checkedCount} of {recommendedKeys.length} policies selected` + a small **"Reset to recommended"** link that re-checks all defaults.
   - **Optional category filter chips** (Team, Client, Extensions, Financial, Facility, Management) — clicking a chip scrolls/filters to that category. Skip any category with zero recommended entries.
   - **Categorized accordion** (one section per `POLICY_CATEGORY_META` category, sorted by `order`):
     - Section header: category label + count badge (`8 policies — 5 required, 3 recommended`).
     - Default open for the first category, collapsed for the rest (so the screen doesn't explode to 50 rows on open).
     - Inside each section, one row per policy:
       - **Checkbox** (left). Required → checked + disabled with a `Lock` icon and tooltip: *"Required for your business profile — covers regulatory or structural baseline."* Recommended → checked-by-default, togglable.
       - **Title** (`policy.title`) on top, **`short_description`** below in muted text.
       - **Right-side meta**: small badge — `Required` (primary tint) or `Recommended` (muted tint). Optionally a one-word "trigger" chip if the policy was unlocked by a Step 2 toggle (e.g., `Extensions`, `Retail`, `Minors`, `Tip pool`) so the operator sees the cause-and-effect.
3. **Footer note** (existing, retained): *"Adopting a policy creates a draft you can configure. Nothing is published or wired automatically — you stay in control of what goes live."*

### Wiring

- New local state in `PolicySetupWizard.tsx`: `excludedKeys: Set<string>` — keys the operator has *unchecked* from the recommended set.
- Initial value: empty set (everything recommended is checked on first render).
- `effectiveKeys = recommendedKeys.filter(k => !excludedKeys.has(k))` — what we actually adopt.
- **Required policies cannot be excluded** — the checkbox is disabled, and any attempt to add a required key to `excludedKeys` is no-ops at the handler level (defense-in-depth against future code paths).
- When `recommendedKeys` changes (because the operator went back to Step 2 and toggled `offers_extensions`, etc.), reset `excludedKeys` to empty so the new additions surface checked. Show a small inline note: *"Updated recommendations — re-checked everything."*
- "Save & adopt" button label updates live: **`Save & adopt {effectiveKeys.length}`**.
- `handleFinish` calls `adopt.mutateAsync(effectiveKeys)` instead of `adopt.mutateAsync(recommendedKeys)`. One-line change.

### What stays the same

- Steps 1 and 2 — unchanged.
- Step 3's "Existing materials" block and its inline upload-after-setup callouts — unchanged.
- `recommendedKeysForProfile` derivation — unchanged. We're not changing *what* gets recommended, just letting the operator opt out before commit.
- `useAdoptPoliciesFromLibrary` mutation signature — unchanged. It already takes a `string[]`.
- The "What changed" expansion-prompt block (when `offers_*` flips post-setup) — unchanged. Sits above the new review list.
- `setup_completed_at` timestamping on Finish — unchanged.
- Auto-save on Next/Back/Close — unchanged. (`excludedKeys` is wizard-local state, not persisted to `policy_org_profile`. Rationale: this is a one-shot adoption decision, not an ongoing profile attribute. Operators who want to remove an already-adopted policy do that from the Policies workspace afterwards.)

## Acceptance

1. **List is visible**: Step 3 shows every policy in the recommended set, grouped by category, with title + short description.
2. **Required is locked**: required policies show a `Lock` icon, are checked-and-disabled, and have a tooltip explaining why. The operator cannot uncheck them.
3. **Recommended is editable**: recommended policies are checked by default but can be unchecked. The "Save & adopt" count updates live.
4. **Cause-and-effect visible**: a policy unlocked by a Step 2 toggle (extensions, retail, minors, packages, memberships, tip pool, refund clawback, booth renters) shows a small trigger chip naming the source. Helps the operator reason about *why* this policy is in their set.
5. **Reset works**: clicking "Reset to recommended" re-checks any unchecked recommended items; required items remain checked.
6. **Back/forward stable**: returning to Step 2, flipping a toggle, then returning to Step 3 shows the new recommendations checked. Inline note acknowledges the reset so it's not silent.
7. **Adoption respects selection**: clicking "Save & adopt N" adopts exactly the N policies whose checkboxes are checked. The toast reads `Adopted N policies` (matching the count on the button — no surprise).
8. **No silent over-adoption**: if the operator unchecks 5 recommended policies, only 45 are adopted. The Required Coverage tile (already corrected last turn) still reads `26/26` because required is fully covered.

## Files affected

- `src/components/dashboard/policy/PolicySetupWizard.tsx` — replace the aggregate "Recommended policy set" + "Policies by category" blocks (lines ~867–936) with the new categorized review list. Add `excludedKeys` state, the reset handler, and the change-detection effect. Update `handleFinish` to pass `effectiveKeys` instead of `recommendedKeys`.

That's the whole change surface. No new components, no new hooks, no new tables, no migrations.

## Doctrine compliance

- **Lever and confidence doctrine**: making the list reviewable surfaces the lever (each policy is a lever the operator is choosing to pull). Required-locked items honor the structural floor; recommended items honor operator judgment. Both are visible.
- **Confidence qualification**: required-vs-recommended is a confidence ranking — the wizard is now honest about which is which at the row level, not just in aggregate.
- **Persona scaling**: solo operators benefit from the trigger chips ("oh, this is here because I serve minors") without being overwhelmed (categories collapse). Enterprise operators get a complete audit trail before commit.
- **Silence is meaningful**: the wizard no longer commits 50 policies silently — every adoption is now an acknowledged choice. The footer line stays to remind operators that adoption ≠ publishing, preserving the "you stay in control" framing.
- **No structural drift**: required policies remain non-negotiable (locked checkbox). The applicability filter still gates *which* policies appear; the operator only controls the recommended subset.
- **Copy governance**: the lock tooltip explains the *why* ("regulatory or structural baseline"), not just the *what*. The change-detection note ("re-checked everything") names the system behavior so the operator isn't surprised.

## Prompt feedback

"The policy configurator wizard also leaves a lot of ambiguity to the user because it adopts all the policies they need, without giving the user the ability to review the adopted policy and to accept as it or change it, inside of the wizard experience" — strong, complete prompt. You named the surface (configurator wizard), the failure mode (no review/accept/edit), and the desired location of the fix (inside the wizard, not in a post-setup workspace). That last clarifier is what makes this scope tight — without "inside of the wizard experience" I might have proposed a "Review what was adopted" post-commit modal, which is the wrong answer.

One sharpener for next time: when you ask to make a list "reviewable and editable," telling me whether you want **opt-out only** (default checked, can uncheck) or **opt-in** (default unchecked, must check) tells me which way to bias the UX. Default-checked is the right call here because the system's recommendations carry confidence and most operators will accept them — flipping to opt-in would punish the trust the system has earned. But for future "let the user pick from a recommended set" requests, naming the default state explicitly saves me the inference. I'm going with default-checked + locked-required because it preserves the existing 50-policy commit for trusting operators while giving skeptical operators a clean opt-out — but the explicit instruction would let me skip the bias-defense reasoning.

