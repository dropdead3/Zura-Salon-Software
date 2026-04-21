

# Audit: What's missing / redundant on Step 2 (Business model)

Short answer: **yes — two gaps and one redundancy worth fixing.** None are urgent bugs; all are structural clarity wins.

## 1. Redundant: "packages or memberships" vs "ongoing memberships"

Rows 3 and 4 currently read:

- "We sell packages or memberships" → `offers_packages`
- "We offer ongoing memberships" → `offers_memberships` (shows "(coming soon)")

The first row already says "or memberships." The second row then asks about memberships again, but is marked "coming soon" and has no library attached. For the operator this reads as: *"Didn't I just answer that?"*

**Fix:** Either

- **(a) Merge** — drop `offers_memberships` for now, let `offers_packages` carry both until the membership-specific library ships. Relabel to just "We sell packages" to make the distinction meaningful when `offers_memberships` returns.
- **(b) Sharpen** — rename `offers_packages` → "We sell prepaid packages (series of services)" and keep `offers_memberships` → "We sell recurring memberships (monthly/annual)". Different legal surfaces (expiration vs auto-renewal/cancellation), so once memberships ships they *should* be separate.

Recommendation: **(b)** long-term, **(a)** until the membership library exists. Today's UI is the worst of both — two rows, one dead.

## 2. Missing: compensation-aware toggles

The applicability engine (`usePolicyOrgProfile.ts` lines 187–256) already gates policies on:

- `uses_tip_pooling` → `requires_tip_pooling`
- `uses_refund_clawback` → `requires_refund_clawback`

But Step 2 never asks the operator about either. So any tip-pooling or clawback policy is silently excluded, even for salons that practice them. This is a real data gap: the wizard promises "drives which policies apply" but skips two drivers.

**Fix:** Add two rows:

- "We pool tips across the team" → `uses_tip_pooling`
- "We claw back commission on refunds" → `uses_refund_clawback`

Both are judgment calls {{PLATFORM_NAME}} can't infer from POS data — exactly the shape of toggles Step 2 was built for.

## 3. Missing: independent-contractor / booth-rental toggle

Many salons run a hybrid W2 + 1099 model, which changes a large swath of handbook policy (benefits, scheduling, chemical liability, supplies ownership). There's no row for it. Either:

- "We have booth renters or 1099 contractors" → `has_contractors`

Or defer to Step 4 (Compensation) in the org onboarding and read it through. Either is fine — just not silent.

## 4. Not missing but worth naming

Things I checked and confirmed are **already handled elsewhere** — don't re-add here:

- **Location count / multi-location** → read from org context, no toggle needed.
- **State/jurisdiction** → read from org address (drives state-specific clauses).
- **Service-under-18 vs minors-as-clients** → `serves_minors` already covers both paths.

## Acceptance

1. The "ongoing memberships (coming soon)" row either merges with the packages row or gets a distinct, non-overlapping label.
2. Step 2 includes tip-pooling and refund-clawback toggles so the applicability engine receives all its inputs.
3. Contractor/booth-rental is either a Step 2 toggle or explicitly sourced from Step 4 Compensation.
4. No toggle on Step 2 is "coming soon" — silence-doctrine: ship the row when the library ships.

## Files that would change

- `src/components/dashboard/policy/PolicySetupWizard.tsx` — row list (lines 605–640), `flagImpacts` registry (line 179), form state defaults.
- `src/hooks/policy/usePolicyProfileDefaults.ts` — detected flags + reasons.
- `src/hooks/policy/usePolicyOrgProfile.ts` — already has the applicability branches; may need DB column for `uses_tip_pooling` / `uses_refund_clawback` if not present.
- Possibly a migration on `policy_org_profile` to add the two new columns.

## Prompt feedback

"Is there anything missing from here?" — open-ended prompts like this are great for a *review-mode* answer, but they burn more round-trips than a scoped one. I had to inspect the wizard, the applicability engine, and the detection hook to give a grounded reply. A five-word sharpener would narrow it fast:

- "Missing **toggles** only?" → skips copy critique.
- "Any **redundancy** here?" → skips gap analysis.
- "Does this **cover our compensation model**?" → directs me straight to the tip-pooling / clawback gap.

The "anything missing" frame tends to invite a list; if you want a *ranked* answer ("what's the one thing I'd fix first"), say so — I'll return a single recommendation instead of three. Also: if you have a specific user who got confused on this screen, quoting their reaction ("my manager asked why there are two membership rows") tells me which gap is real vs theoretical.

