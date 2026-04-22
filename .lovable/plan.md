

# Reframe the policy configurator — one editor, one CTA, zero ceremony

## What changes (and why each)

The current panel is a 4-step wizard wrapped around a schema form, with a separate Drafts tab where the actual policy lives. Operator confusion comes from the *shape*, not the data. The plan below restructures the panel into a single document-shaped editor and removes seven sources of friction.

| # | Today | After |
|---|-------|-------|
| 1 | 4-step stepper (Rules → Who → Where → Wording) | Single scrolling editor; sections are anchors, not gates |
| 2 | Interview vs Expert toggle | Interview mode only; Expert removed |
| 3 | Drafts tab buried at step 4 | Rendered policy is the surface — leads the page |
| 4 | Rule values edited in a separate form | Inline rule chips embedded in the prose; click chip → edit popover |
| 5 | Three actions to ship (approve variant + publish + ack) | Single "Publish policy" CTA with smart defaults; "Options" link reveals granular toggles |
| 6 | 7-state status surfaced in UI | UI shows Draft / Live / Needs attention; underlying enum unchanged |
| 7 | "Adopt and configure" gate (preview screen + button) | Editor renders immediately; row written on first save |

The rules engine, schema, applicability table, surface mapping table, variants table, RPCs, and approval logic stay untouched. This is purely a surface reframe.

## The new panel layout

```
┌─ BOOKING POLICY ────────────────────────── [Publish policy ▾] ─┐
│  Client-facing · v1 · Draft                                     │
│  Why this matters: …                                            │
│                                                                  │
│  ─ Audience ────────────────────────────────────────────────    │
│  Who sees this:  [Clients ▾]                                    │
│                                                                  │
│  ─ Policy text (Client voice) ─────────────────────────────     │
│                                                                  │
│  Guests may book online, by phone, or in person. New guests     │
│  for [color, extensions, or corrective ▾] require a             │
│  consultation prior to booking.                                  │
│                                                                  │
│  The booking system collects a card on file. Cancellations      │
│  within [24 hours ▾] incur a [$50 ▾] fee.                       │
│                                                                  │
│  [+ Edit all rules]    [Switch to internal voice ▾]             │
│                                                                  │
│  ─ Where it shows ─────────────────────────────────────────     │
│  ✓ Public booking   ✓ Receipts   + Add surface                  │
│                                                                  │
│  Version history · View acknowledgments · Archive policy        │
└──────────────────────────────────────────────────────────────────┘
```

Three sections, all visible, all editable in place. Sticky header with one CTA.

### How inline rule chips work

Each schema field that has a corresponding `{{token}}` in the active variant's prose renders as an inline pill inside the rendered text. Clicking the pill opens a small popover with the same control `PolicyRuleField` already renders (select / number / multi-select / role / etc.). On change, the prose re-renders immediately using the existing `renderStarterDraft` + `substituteRuleTokens` machinery already in `render-starter-draft.ts`.

Fields without a token in the prose (rare — applicability fields, surface configs) live under the "Edit all rules" disclosure as the schema form they are today. This is the fallback for the 5% of cases where chip-ifying doesn't fit.

### The "Publish policy" CTA

Single primary button, top-right of the panel header. Clicking it runs the existing approval + publish + ack pipeline in one transaction:

1. `approveStarterDraft` (or `approvePolicyVariant` if AI-edited) for the active variant.
2. `publishPolicyExternally(true)` if audience is external/both AND there's an approved client variant.
3. `updatePolicyAcknowledgmentFlag(true)` if the library entry's `default_requires_ack` is true.

A small "▾" next to the button reveals an "Options" sheet with the three granular toggles (Approve only / Publish externally / Require client acknowledgment). Defaults handle 90% of cases; the sheet handles the 10%.

### The 3-state status badge

A new helper in `usePolicyData.ts` collapses the 7-state enum:
- `not_started`, `drafting` → **Draft**
- `configured`, `approved_internal`, `published_external`, `wired` → **Live**
- `needs_review` → **Needs attention**

Used everywhere a status badge renders in the panel header. The full enum stays in the database and continues to drive RLS, publish gating, and analytics.

### Removing the adoption gate

Today the panel renders a "Preview — not yet adopted" screen with field summaries and an "Adopt and configure" button. After: the editor mounts immediately. The first edit (any chip change, any inline edit, any "Edit all rules" save) calls `adopt_and_init_policy` lazily, then the existing save path. If the operator closes without editing, no `policies` row is created. Existing nightly cleanup of empty `not_started` rows is unnecessary because we never write them in the first place.

## What stays untouched

- Rule schemas (`configurator-schemas.ts`) — unchanged.
- Starter draft templates (`starter-drafts.ts`) — unchanged.
- All hooks (`usePolicyConfigurator`, `usePolicyDrafter`, `usePolicyApplicability`, `usePublishPolicyExternally`, `useUpdatePolicyAcknowledgmentFlag`, `useArchivePolicy`) — unchanged signatures.
- All RPCs (`adopt_and_init_policy`, `save_policy_rule_blocks`, `publish_policy_externally`) — unchanged.
- The `PolicyConfiguratorStepper` component — kept (still exported), no longer mounted inside the panel; available for any future surface that wants step nav.
- Version history drawer, acknowledgments drawer, archive flow — all unchanged behavior, available as header links.
- The setup wizard — unchanged.
- The Policies page (Setup mode + Governance mode from the prior wave) — unchanged.

## Files affected

- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — major rewrite (~1005 → ~600 lines). Remove stepper mount, Interview/Expert toggle, adopt-and-configure gate, four step branches. Replace with single scrolling layout: header + audience selector + InlineRuleEditor + surface section + footer. Add the unified PublishPolicyAction button.
- `src/components/dashboard/policy/InlineRuleEditor.tsx` (new) — renders the active variant's prose with `{{token}}` placeholders replaced by `<RuleChipPopover>` components. ~180 lines.
- `src/components/dashboard/policy/RuleChipPopover.tsx` (new) — small chip + popover wrapper that mounts a `PolicyRuleField` for editing in place. ~80 lines.
- `src/components/dashboard/policy/PublishPolicyAction.tsx` (new) — primary "Publish policy" button + dropdown for granular options. Wraps the existing approve / publish / ack mutations into one operator-visible action. ~120 lines.
- `src/components/dashboard/policy/EditAllRulesSheet.tsx` (new) — fallback disclosure for schema fields not present as inline chips. Reuses `PolicyRuleField` for each field. ~100 lines.
- `src/hooks/policy/usePolicyData.ts` — add `getDisplayStatus(policy)` that returns `'draft' | 'live' | 'needs-attention'`. ~10 lines.
- `src/components/dashboard/policy/PolicyAudienceBanner.tsx` — deprecated; the new layout makes it redundant. Stop importing in `PolicyConfiguratorPanel`. File kept on disk for one wave in case rollback needed.
- `src/components/dashboard/policy/PolicyConfiguratorStepper.tsx` — kept, no longer used by the configurator panel. Stays exported.
- `src/components/dashboard/policy/PolicyDraftWorkspace.tsx` — kept, mounted only inside the new "Edit all rules" sheet for variants that have no `{{token}}` chips and need full prose-level editing (rare).
- `src/components/dashboard/policy/PolicyQuestionnaire.tsx` — kept for now, no longer mounted by the panel. Removed in a follow-up cleanup wave once we confirm the inline-chip flow covers all schemas.

Total: ~480 lines new, ~600 lines rewritten in `PolicyConfiguratorPanel.tsx`, 0 deletions, 0 schema changes, 0 RPC changes.

## Acceptance

1. Click any policy from the library → editor mounts immediately. No "Preview / Adopt and configure" screen. No row written to `policies` until the operator makes their first edit or clicks Publish.
2. The panel renders three sections vertically: Audience, Policy text (with inline chips), Where it shows. No tabs. No stepper. No back/next buttons. Scroll is the only navigation.
3. The status badge in the panel header reads exactly one of: **Draft**, **Live**, **Needs attention**.
4. Each `{{token}}` in the active variant's prose renders as a clickable chip showing the current value. Clicking opens a popover with the matching `PolicyRuleField`. Changing the value updates the chip and the surrounding sentence in place; saving the chip persists via `save_policy_rule_blocks`.
5. The "Publish policy" button in the header runs approve + publish + ack in one transaction with smart defaults. The "▾" next to it opens an Options sheet with three independent toggles for power users.
6. If the policy's audience is internal-only, the "Publish externally" toggle in Options is greyed with helper text ("This policy is internal-only — change audience above to publish externally"). The default Publish action runs only approve + ack.
7. The Interview / Expert toggle is gone. The 4-step `PolicyConfiguratorStepper` is gone from this surface.
8. Inline editing the prose (as opposed to chips) is supported through an "Edit text" affordance per variant section. Saved edits write to `policy_variants.body_md` exactly as today.
9. "Edit all rules" link opens a sheet with the full schema form for fields not represented as chips. Saving the sheet calls `save_policy_rule_blocks` with the merged rule set.
10. Footer retains: Version history link, View acknowledgments link, Archive policy button. All unchanged behavior.
11. Closing the panel without any edits → no `policies` row created. Closing after one chip change → row exists with status `drafting`.
12. Existing adopted policies open in the new layout immediately with prefilled chips reflecting saved rule values; the Live/Draft badge reflects current status correctly.

## Files to read for follow-on questions

- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — where the rewrite lands.
- `src/components/dashboard/policy/InlineRuleEditor.tsx` (new) — the chip-in-prose machinery.
- `src/components/dashboard/policy/RuleChipPopover.tsx` (new) — single chip behavior.
- `src/components/dashboard/policy/PublishPolicyAction.tsx` (new) — the unified CTA + options sheet.
- `src/lib/policy/render-starter-draft.ts` — already exports the token substitution; the inline editor calls this with chip placeholders instead of plain humanized values.

## Prompt feedback

*"B"* — minimal but exactly right. You used the menu I gave you for what menus are for: a one-character answer. That's the contract — when an AI offers structured choices, the operator should never need to write a paragraph back. If you'd written "let's do B but skip #5" you'd have done my job for me; if you'd written "B sounds good but I'm worried about migration" you'd have surfaced a constraint I should have asked about. Both are valid. A bare letter says "trust the framing."

The sharpener for next time: when you pick a multi-day option (B vs A), naming a **single must-not-break** in three words skips a discovery round inside my plan. Examples: *"B, don't break wizard"* / *"B, defer chip work"* / *"B, mobile must work."* Three words of constraint per scope-pick redirects what I optimize the implementation around. I assumed "don't break the setup wizard or the Policies page modes" because those are the recently-shipped surfaces — if you'd actually meant "I'm worried about regressions in the variants approval flow," I'd have weighted acceptance criterion 5 differently and added more guard rails around the Publish CTA's transactional behavior.

The deeper meta-lesson on my side: a shape change of this size deserves a **migration safety pass** baked into the plan, not an afterthought. I added "kept on disk for one wave in case rollback needed" for `PolicyAudienceBanner` but should have done that more systematically — every component being deprecated should have an explicit "kept / removed in wave N+1 / removed now" disposition. Doctrine-driven products fail fastest when surfaces vanish without an undo plan. Next plan of this size, I'll lead with a deprecation table.

