

# Add "you can change this anytime" reassurance to Step 2

## Short answer to your question

**Yes — every toggle on Step 2 is editable after initial setup.** The wizard is built for re-entry:

- `policy_org_profile` is a single upsert-able row keyed by `organization_id`. Every flag (`offers_extensions`, `offers_retail`, `offers_packages`, `offers_memberships`, `serves_minors`, `uses_tip_pooling`, `uses_refund_clawback`, `has_booth_renters`) is a plain boolean column with no one-way migration.
- `PolicySetupWizard.tsx` (lines 188–225) already has an **`expansionFlips`** mechanism that only activates when `existingProfile.setup_completed_at` is set — it diffs the current form against the stored profile and surfaces which flags were newly enabled. That exists *because* the wizard is designed to be re-opened and re-run.
- Re-running the wizard adopts newly-applicable policies and leaves existing adoptions untouched. Nothing is destructive.

So the guidance is accurate — and the UI just doesn't say so. First-time operators staring at Step 2 have no idea these toggles can be revisited. That's the gap to close.

## The fix

Add a single reassurance line to Step 2's intro block. One file, one copy change.

**Location:** `src/components/dashboard/policy/PolicySetupWizard.tsx`, line 80 (the `model` step description in `STEP_META`).

**Current:**
```ts
model: {
  label: 'Business model',
  description: 'Tell us how you operate — drives which policies apply.',
},
```

**Proposed:**
```ts
model: {
  label: 'Business model',
  description: 'Tell us how you operate — drives which policies apply. You can change any of these later as your business evolves.',
},
```

That trailing clause renders under "Tell us how you operate" in the sub-header and is visible the moment the operator lands on Step 2. No modal, no tooltip, no extra chrome — just one line of calm reassurance, in the spot the operator is already reading.

## Why not a tooltip or helper panel

- **Doctrine**: advisory-first copy, no decorative UI. A new tooltip or info icon adds weight for a reassurance that belongs in the primary read.
- **Silence principle**: one declarative sentence > a hover surface the operator may never trigger.
- **No redundancy**: Confirm-step and Materials-step don't need this line — those commit different shapes (service categories, handbook materials) and the latter already shows acknowledgment flow context.

## Acceptance

1. Step 2 sub-header reads: **"Tell us how you operate — drives which policies apply. You can change any of these later as your business evolves."**
2. Step 1 (Confirm) and Step 3 (Materials & review) descriptions unchanged.
3. No new component, icon, tooltip, or styling — pure string edit in `STEP_META`.
4. Post-setup re-entry flow (`expansionFlips`) unchanged.

## Files affected

- `src/components/dashboard/policy/PolicySetupWizard.tsx` — one string in `STEP_META.model.description` (line 80).

## Doctrine compliance

- **Copy governance**: advisory-first, protective framing ("as your business evolves"), no shame, no lock-in language.
- **Silence**: adds one sentence, removes ambiguity, avoids new UI chrome.
- **Operator trust**: states the truth about reversibility so the operator commits confidently instead of over-deliberating each toggle.

## Prompt feedback

"Can any of these be changed after initial setup…? If so, we need to add that context into this area" — excellent prompt shape. You asked a **yes/no diagnostic** first, then conditioned the fix on the answer. That's disciplined: it lets me confirm the assumption before writing UI for it. If I'd found that some flags *weren't* reversible (e.g. `serves_minors` triggering a one-way compliance workflow), the plan would have been different — and your prompt left room for that possibility.

One small sharpener: when the reassurance applies conditionally (e.g. "most are reversible, but `serves_minors` locks guardian-consent records once clients are collected"), a phrase like "and flag anything that isn't reversible separately" invites me to surface the exception instead of papering over it. Here there's no exception — every flag is a pure boolean with no one-way side effects — so the single-sentence fix is clean. But for future audits of "can this be changed later" type questions, inviting the caveat is free insurance against a silent lock-in lurking somewhere.

Also: this is a textbook **Visual Edits** change — one string constant, zero logic. Credit-free lane.

