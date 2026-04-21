

# Reframe the Policy Configurator as a 4-step linear flow

## What's broken today

The current configurator opens with **5 tabs side-by-side**: `Rules`, `Applicability`, `Surfaces`, `Drafts`, `Client acknowledgments`. The labels are platform-internal jargon (what's "Applicability"? what's a "Surface"?), the tabs imply equal weight even though the flow is actually sequential, and there's no signal of *progress* — operator can't tell what they've finished, what's next, or whether the policy is ready to go live. The Rules tab even says *"After saving rules, define applicability and surfaces in the next tabs"* — admitting the flow is sequential while presenting it as parallel.

## The new model — a 4-step stepper, operator-outcome labels

Replace the tabs with a horizontal **numbered stepper** at the top of the configurator body. Each step is a verb the operator is performing, in the order they should be performed. The acknowledgments view becomes a secondary panel (not a step), since it's a read-only audit log — not part of configuring the policy.

```
┌─ 1 ────────── 2 ────────── 3 ────────── 4 ──────────┐
│ Define rules  Decide who   Choose where  Approve     │
│ ●            ○             ○             wording     │
│                                          ○           │
└──────────────────────────────────────────────────────┘
```

Step labels (final, operator-outcome):

1. **Define rules** — what the policy says (current Rules tab)
2. **Decide who** — who it applies to (current Applicability tab)
3. **Choose where it shows** — where it renders (current Surfaces tab; auto-skipped for internal-only policies)
4. **Approve wording** — sign off on draft prose (current Drafts tab)

A separate `View acknowledgments` link surfaces in the panel header (not in the stepper) when there are historical client signatures to review.

### Stepper behavior

- **Click any step to jump.** Operator can skip ahead to review what's there. We don't block navigation — only progress visualization.
- **Step states**: `complete` (green check), `current` (filled circle, primary color), `upcoming` (hollow circle, muted), `skipped` (dashed circle — used when Step 3 is auto-hidden for internal-only policies).
- **Numbers re-flow when steps are hidden.** Internal-only policies show steps 1, 2, 3 (not 1, 2, ~~3~~, 4). The skip is invisible to the operator.
- **Connector lines between steps** turn solid + primary as each step completes; muted/dashed when upcoming.

### Completion signals (deterministic)

Each step's `complete` state is computed from data the panel already has:

| Step | Marked complete when |
|---|---|
| 1. Define rules | All `required` schema fields have non-empty values *and* `save_policy_rule_blocks` has succeeded at least once for this version (i.e., `data.blocks.length > 0`) |
| 2. Decide who | `applicabilityRows.length > 0` for this version (any saved scope row counts — relevance manifest already gates which rows are seeded) |
| 3. Choose where | `surfaceRows.filter(s => s.enabled).length > 0` (at least one surface mapping enabled) |
| 4. Approve wording | `variantsData.some(v => v.approved)` for this policy |

Doctrine: silence is meaningful. We don't show progress percentages or congratulatory toasts — just a check mark when the step is structurally done.

### Per-step CTA — "Save and continue →"

Each step ends with a single primary CTA that **saves and advances to the next step**. The CTA copy is per-step, never generic:

| Step | Footer CTA |
|---|---|
| 1. Define rules | `Save rules and continue →` (advances to step 2) |
| 2. Decide who | `Save scope and continue →` (advances to step 3, or to step 4 if step 3 is skipped) |
| 3. Choose where | `Save surfaces and continue →` (advances to step 4) |
| 4. Approve wording | `Approve wording →` (currently triggers the existing approve flow inside `PolicyDraftWorkspace`) |

A secondary `← Back` link sits to the left of the CTA on steps 2-4. There is no global "Save" button — saves are step-scoped, matching what the operator sees.

### Step header — "What this step is for"

Each step renders a **one-sentence purpose** under the step label, replacing the current orphaned descriptions inside the schema body. Example:

```
Step 1 of 4 — Define rules
The structured decisions that make this policy concrete. AI drafting later
turns these into prose; it cannot invent rules.
```

```
Step 2 of 4 — Decide who
Pick the team members and clients this policy governs. Defaults are
pre-filled from your business profile.
```

These sentences live in a single per-step `STEP_META` object — easy to edit, no scattered copy.

### Header — keep the existing context block

The "policy title + audience banner + version history link + adopt-and-configure preview" block above the stepper is unchanged. We're only restructuring the flow body. The audience banner already explains *internal vs external* in plain terms — that's the doctrinal frame the stepper sits inside.

The acknowledgments tab moves to a `View client acknowledgments (12)` link in the header, next to `Version history`. Same `PolicyAcknowledgmentsPanel` opens in the existing `PremiumFloatingPanel` drawer — no new component.

## What stays the same

- All four underlying editor components (`PolicyRuleField`, `PolicyApplicabilityEditor`, `PolicySurfaceEditor`, `PolicyDraftWorkspace`) — unchanged.
- `PolicyAcknowledgmentsPanel` — unchanged, just relocated to a drawer instead of a tab.
- `PolicyAudienceBanner`, `PolicyVersionHistoryPanel`, archive/reactivate footer — unchanged.
- All hooks (`usePolicyConfiguratorData`, `useSavePolicyRuleBlocks`, `usePolicyApplicability`, etc.) — unchanged.
- The "Adopt and configure" gate for un-adopted policies — unchanged. Stepper only renders post-adoption.
- DB schema, RPCs, RLS — zero changes.
- Internal-only audience clamping (already wired) — kept; just expressed by hiding step 3 instead of hiding a tab.
- `Save and continue` → next-tab navigation we just shipped — kept; now generalized across all 4 steps.

## Files affected

- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — replace `<Tabs>` block with `<PolicyConfiguratorStepper>` + per-step content. Move acknowledgments to a header link + `PremiumFloatingPanel`. ~80 lines changed (mostly deletions of tab markup + small additions for stepper wiring).
- `src/components/dashboard/policy/PolicyConfiguratorStepper.tsx` (new) — the visual stepper component (numbered circles, connector lines, click-to-jump, complete/current/upcoming/skipped states). ~120 lines.
- `src/lib/policy/configurator-steps.ts` (new) — `STEP_META` array (id, label, purpose-sentence, footer-CTA, completion predicate). ~60 lines. Single source of truth for step labels and copy.

That's the entire change surface. No DB changes, no new RPCs, no new tokens.

## Acceptance

1. Opening Employment Classifications shows a 4-step horizontal stepper above the editor body. Step 1 is current, the other 3 are upcoming. The acknowledgments tab is gone — a `View client acknowledgments` link is absent (no acks for this internal policy).
2. Opening Pet Policy (external + has client acks) shows the same 4-step stepper, plus a `View client acknowledgments` link next to `Version history`. Clicking the link opens the existing acknowledgments panel in a drawer.
3. Opening any internal-only policy shows steps 1, 2, 3 (re-numbered) — step 3 reads `Approve wording`, not `Choose where it shows`. No visible "skipped step 3" placeholder.
4. After saving rules on step 1, the stepper advances to step 2 *and* step 1 turns to a green check.
5. Operator can click any step circle to jump to that step's editor — even backwards. No blocking.
6. Step labels read `Define rules`, `Decide who`, `Choose where it shows`, `Approve wording`. No occurrences of `Applicability`, `Surfaces`, or `Rules` (as a tab label) anywhere in the configurator body.
7. Each step's footer CTA is named for its action (`Save rules and continue`, `Save scope and continue`, `Save surfaces and continue`, `Approve wording`). The generic `Save and continue` text is removed.
8. Each step header includes a one-sentence purpose statement explaining what the operator does on this step.
9. The "Adopt and configure" preview shown before adoption is unchanged.
10. The footer (archive/reactivate, Close) is unchanged.

## Doctrine compliance

- **Lever and confidence**: each step represents one decision the operator is making. Sequencing them visually surfaces the *one primary lever* per step.
- **Structure precedes intelligence**: AI drafting (step 4) is gated by structure (steps 1-3). The stepper makes that gate visible — operator can't approve wording before rules are defined.
- **Silence is meaningful**: no progress percentages, no toast spam. Step turns green when structurally complete, otherwise stays neutral.
- **Operator edits are sacred**: clicking back to a completed step doesn't reset its data. Saved values persist exactly as they were.
- **Persona scaling**: solo operators (internal-only policies) see 3 steps, not 4. Multi-location enterprise policies see all 4. Same component, complexity scales with audience.
- **Brand abstraction**: copy uses neutral verbs (`Define`, `Decide`, `Choose`, `Approve`). No tenant references.
- **No structural drift**: zero DB changes, zero new RPCs. Pure UI restructure of an existing flow.
- **Drawer canon**: acknowledgments panel already uses `PremiumFloatingPanel` — relocating it to a drawer respects the established canon.

## Files to read for follow-on questions

- `src/lib/policy/configurator-steps.ts` (new) — single source of truth for step labels, copy, and completion predicates.
- `src/components/dashboard/policy/PolicyConfiguratorStepper.tsx` (new) — the stepper UI.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — the consumer.

## Prompt feedback

*"I'm really not understanding the interface and utility of the policy configurator and the 3 tabs set up for it. We need to rethink how this is presented and used."* — strong meta-prompt. You did three things well: (1) named the symptom at the **interface level** (not "fix this button" but "I don't understand the interface"), (2) named the **specific surface** (the configurator), (3) explicitly invited a rethink rather than a patch (`We need to rethink how this is presented and used`). That third move opened the door to a structural reframe instead of incremental tweaks — exactly the right altitude when the problem is comprehension, not bugs. Naming it as 3 tabs (it's actually up to 5) was a small inaccuracy but didn't change the diagnosis — the comprehension problem is the same whether it's 3 or 5.

One sharpener for next time: when you ask for a UX rethink, naming **who you're rethinking for** (first-time configuring operator vs. returning operator editing one field vs. enterprise admin reviewing 47 policies) tells me which optimization to pick. I asked you the flow-model question because the answer differs sharply by user mode — first-timers benefit from steppers, returners benefit from scrollable pages. You picked stepper, which tells me you're optimizing for *first-time setup confidence*. For a future "rethink this surface" prompt, naming the **primary user mode you're optimizing for** in one line ("solo operator setting up their first policy" / "enterprise admin reviewing 30 policies a week") would let me skip the clarifying question and go straight to the plan.

