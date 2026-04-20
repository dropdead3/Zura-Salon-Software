

## Goal
The applicability filter we shipped only covers the **Library grid**. The same "policy is required, but operator doesn't do that service" logic needs to ripple through every other surface that counts, gates, or nags about required policies — otherwise we get phantom required-work showing up elsewhere (setup wizard progress, dashboard nudges, configurator deep-links, public center expectations, etc.).

## Investigation

Searched the codebase for surfaces that read `recommendation === 'required'` or count required policies. Found these gaps:

### Gap 1: Setup Wizard recommendation list
`recommendedKeysForProfile` in `usePolicyOrgProfile.ts` already filters by `requires_extensions/retail/packages` — **good, no change needed**. ✅

### Gap 2: Required-policy completion gauges elsewhere
The new progress chip ("3 of 7 adopted") only lives on the Library page. If we surface a "Policies setup health" tile in the Command Center, Operator Mode, or Zura Health Engine, those readers must use the **same applicability-filtered count** — otherwise the gauge will say "5 of 12" forever because 7 phantom extension policies live in the denominator.

### Gap 3: Configurator deep-links to non-applicable policies
`PolicyConfiguratorPanel` opens any policy by key (URL `?policy=extension_aftercare_policy`). If an operator who doesn't offer extensions lands on a deep-link (email, training doc, audit), they'll see a Required-flagged configurator with no contextual explanation. Needs an **inline applicability banner**:
> "This policy is for businesses offering extensions. Your profile says you don't — you can still configure it, or [update your profile]."

### Gap 4: Public Client Policy Center
`usePublicOrgPolicies` returns whatever the org has adopted + approved + published. If a profile-misaligned policy was adopted before the profile said "no extensions," it can still appear on the public center. Two options:
- **A**: Hide non-applicable adopted policies from the public center (silent doctrine).
- **B**: Leave them — once adopted + published, the operator made a choice; respect it.

I recommend **B** with a one-time review nudge in the configurator (Gap 3 covers this). Removing already-published policies silently violates the "structure precedes intelligence" doctrine — we don't unpublish on profile change.

### Gap 5: Dashboard nudges / Daily Briefing
If/when Policy OS ever surfaces "X required policies still need adoption" in the Daily Briefing, Command Center, or a notification — it MUST use the applicability-filtered list. Today this surface doesn't exist for policies, but it's a **future-proofing rule** to add to the doctrine.

### Gap 6: Onboarding tasks linked to policy adoption
`onboarding_tasks` table includes policy-related items. Need to verify whether any onboarding task hardcodes "adopt extension_aftercare_policy" — if so, it should be skipped when `offers_extensions = false`. (Investigation step in implementation.)

### Gap 7: Profile-change side effects
When an operator flips `offers_extensions` from true → false in the Setup Wizard:
- Adopted extension policies stay (data preservation)
- Library grid hides them (already done)
- Configurator should surface "no longer applicable" state if visited (Gap 3)
- No automatic unpublish (Gap 4 decision)

When false → true:
- Library re-shows them
- Required count chip recalculates automatically (already correct)
- Setup Wizard recommendations expand (already correct)

No code change needed for the bidirectional flow itself — the filter is reactive. But we need to verify the Wizard prompts the operator: "You now offer extensions — 4 new required policies are recommended. Review them?"

### Gap 8: Audit / compliance reports
If a policy audit report ever counts "required policies adopted vs. total required" for compliance proof, it MUST use the applicability-filtered total. Otherwise an operator who genuinely doesn't need extension policies gets flagged as out-of-compliance forever.

## Proposed changes (this wave)

### Change A: Configurator applicability banner — **Gap 3** (highest leverage)
File: `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` (and/or its drawer wrapper).

Add a quiet inline banner above the policy body when:
- The policy's `requires_*` flag is true
- The org profile says they don't offer that service

Banner text:
> "This policy applies to businesses that offer extensions. Your business profile says you don't currently offer this — you can still configure and adopt it, or [update your profile] if this changed."

Uses `tokens.body` muted styling (not an alert). Link triggers the Setup Wizard step for service offerings.

### Change B: Wizard prompt on profile expansion — **Gap 7**
File: `PolicySetupWizard` (path TBD during implementation).

When the operator changes a `offers_*` flag from `false → true` in the Wizard, surface a final-step note:
> "You now offer extensions. We've added 4 required and 2 recommended policies to your starter set. Review on the next step."

Already-adopted policies stay; new ones are flagged for adoption review.

### Change C: Centralize applicability helper — **Gap 5/8 future-proofing**
Move `isApplicableToProfile` from `Policies.tsx` into `src/hooks/policy/usePolicyOrgProfile.ts` (or a sibling `policyApplicability.ts`). Export as a named utility so any future surface (Command Center tile, audit report, Daily Briefing) uses one source of truth.

Also export a derived hook: `useApplicableRequiredPolicies(orgId)` returning `{ total, adopted, pct, missing[] }` — the canonical "required policies setup health" computation. The Library page's progress chip should switch to this hook so there's never drift.

### Change D: Onboarding task audit — **Gap 6** (investigation + conditional fix)
Search `onboarding_tasks` content for hardcoded references to extension/retail/package policies. If found, add a `requires_*` column to `onboarding_tasks` mirroring `policy_library`, and filter task visibility through the same applicability lens.

If no such tasks exist, document the rule in the Policy OS doctrine and move on.

### Change E: Doctrine entry — **future-proofing**
Add a memory entry: `mem://features/policy-os-applicability-doctrine`:
> Any surface that counts, gates, or nags about required policies MUST filter through `isApplicableToProfile` against `policy_org_profile`. Adopted-but-no-longer-applicable policies are preserved (no auto-unpublish), but the configurator surfaces a soft "no longer applicable" banner.

## Out of scope (defer)
- Auto-unpublish or auto-archive non-applicable adopted policies (Gap 4 — by design)
- New `requires_minors` / `requires_memberships` flags (separate wave; needs library content audit first)
- Public Client Policy Center filtering (Gap 4 — by design)
- Audit/compliance report (Gap 8 — surface doesn't exist yet; doctrine entry covers it)

## Files touched (estimated)
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — applicability banner
- `src/hooks/policy/usePolicyOrgProfile.ts` — extract `isApplicableToProfile` + new `useApplicableRequiredPolicies` hook
- `src/pages/dashboard/admin/Policies.tsx` — switch progress chip to shared hook
- `PolicySetupWizard` (path TBD) — expansion prompt
- `mem://features/policy-os-applicability-doctrine.md` — new doctrine entry
- (Conditional) `onboarding_tasks` content/schema — only if Gap 6 investigation finds hardcoded extension/retail/package tasks

## Recommended sequencing
1. **A + C together** (configurator banner + centralized helper) — biggest UX gap, sets the foundation.
2. **D** (investigation) — quick, may be no-op.
3. **B** (wizard prompt) — polish.
4. **E** (doctrine) — closes the loop so future surfaces inherit the rule.

