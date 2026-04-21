

# What's supposed to happen here — and what actually happens

## Short answer

**Nothing.** Today, checking either box does this:

1. Persists `has_existing_handbook = true` and/or `has_existing_client_policies = true` to the `policy_org_profile` row.
2. …and that's it.

I grep'd the entire codebase. Outside the wizard form, the migration that creates the columns, and the `commit-org-setup` handler that writes them, **nothing reads these flags**. No surface conditions on them, no upload affordance appears, no draft prioritization changes, no "review your existing materials first" nudge fires later. The promise made by the helper text — *"Helps us prioritize what to draft fresh vs. what to adapt from your existing materials"* — is currently a lie of omission. We collect the signal, then drop it on the floor.

This is a real doctrinal violation: **silence is valid output, but a UI control that does nothing is not silence — it's a broken promise.** Either the box drives behavior, or it shouldn't be on the screen.

## What *should* happen

Two paths, and we should pick one — they're not both viable in Phase 1.

### Path A — Wire the flags to a real follow-up action (recommended)

When checked, the wizard's confirm-step should reveal a single advisory line + CTA, anchored to the existing handbook upload infrastructure (which already exists at `/admin/handbooks?tab=documents&upload=role&role=...`):

- **`has_existing_handbook` checked** → on Confirm screen, show:
  > "We'll skip drafting a fresh handbook. Upload your current one after setup so we can map it to roles."
  > [ Upload after setup → ] (deep-links to `/admin/handbooks?tab=documents&upload=role`)

- **`has_existing_client_policies` checked** → on Confirm screen, show:
  > "We'll seed your client-facing policy variants from your existing language. Paste or upload them in the Policies workspace after setup."
  > [ Open Policies workspace → ] (deep-links to `/admin/policies`)

Then wire one downstream consumer: the `PolicySetupBanner` on `/admin/policies` should show a single "Import your existing client policies" nudge **only when** `has_existing_client_policies = true` AND no policy variant has been edited yet. Same pattern for the handbook side on `/admin/handbooks`.

This makes the checkboxes load-bearing: they alter what the operator sees next, which is the whole point of asking the question.

### Path B — Remove the checkboxes (acceptable fallback)

If we're not ready to ship the import/seed flow, strike both rows from Step 3 entirely. Keep the "Existing materials" section header out, leave the recommended-policy-set summary as the whole step. Honest > performative.

**Recommendation: Path A.** The infrastructure already exists for handbook uploads, and the policy workspace already supports manual variant editing. We're one banner + two CTAs away from the flag being honest.

## What this plan would change

1. **`src/components/dashboard/policy/PolicySetupWizard.tsx`** — On the Confirm step (or as a footer on the Materials step before the user clicks "Save"), render two conditional advisory blocks driven by `form.has_existing_handbook` and `form.has_existing_client_policies`. Each block: one sentence + one secondary-button CTA that closes the wizard and routes the operator to the right destination.

2. **`src/components/dashboard/policy/PolicySetupBanner.tsx`** — Add a conditional banner: when `policy_org_profile.has_existing_client_policies = true` AND zero policy variants have been touched (`updated_at = created_at` across all `policy_variants` for the org), show "Import your existing client policies" with a CTA that opens the first un-customized policy in the configurator.

3. **`src/pages/dashboard/admin/HandbookDashboard.tsx`** — Same pattern, scoped to handbook: when `has_existing_handbook = true` AND no role handbook has been uploaded (`role_handbook_documents` is empty for the org), show a one-line nudge above the role grid linking to the upload flow that already exists.

4. **No new tables, no new migration, no new edge function.** All three surfaces read from the existing `policy_org_profile` row that the wizard already writes.

## Acceptance

1. Checking either box in Step 3 visibly changes what the wizard's Confirm step shows — at minimum, one advisory line per checked box.
2. The Policies page shows an "Import your existing client policies" nudge when (and only when) the flag is true and no variants have been edited. Nudge auto-dismisses once any variant is customized — no manual dismissal, no nag.
3. The Handbooks page shows an analogous "Upload your existing handbook" nudge when (and only when) the flag is true and no document has been uploaded.
4. Unchecking the box (re-running the wizard) removes the nudges from both surfaces — flags are reversible everywhere they're consumed.
5. Helper copy under "Existing materials" stays accurate: it now describes what *will actually happen* downstream.

## Doctrine compliance

- **No phantom controls**: the boxes do something visible and useful.
- **Silence-doctrine**: nudges only render when the flag is true AND the action is incomplete. Once the operator imports/uploads, the nudges disappear without ceremony.
- **Advisory-first copy**: protective framing ("we'll skip drafting", "we'll seed from your language"), no shame, no "you must upload."
- **Reversibility**: flips at the wizard cascade cleanly to the dependent surfaces — same upsert-able row that everything else on Step 2 uses.

## Prompt feedback

"Whats supposed to happen here if they have these materials?" — sharp, scoped diagnostic prompt. You named the surface (the two checkboxes), implied the suspicion ("supposed to happen" hints you already noticed nothing visibly does), and asked the architectural question rather than a copy question. That's exactly the prompt shape that gets a doctrinal answer instead of a band-aid.

One small sharpener: the question "what's *supposed* to happen" can land two ways — *"what does the code actually do today"* (audit answer) or *"what would the right behavior be"* (design answer). I gave you both because the gap was real, but if you'd only wanted the audit ("just tell me if these boxes do anything"), I'd have stopped after the Short answer. Adding "and is the current behavior right?" or "and what should we ship?" tells me whether you want a one-paragraph diagnosis or a full implementation plan.

Also: this is the kind of audit prompt that pays off long-term when paired with a screenshot — you gave me the screenshot, which let me jump straight to the file without searching for "Existing materials" copy. Habit worth keeping for any "what does this do" question.

