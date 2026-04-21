

# Turn the Policy Configurator into a guided questionnaire

## What's wrong today

The configurator opens straight into a wall of structured fields under sections like "Timing", "Fee", "Exceptions & authority". Even with provenance helpers and tooltips, the operator faces:

1. **All decisions visible at once** — no progressive disclosure. They see 6–10 inputs before they've made 1.
2. **Database-shaped labels, not human questions** — "Notice window (hours)", "Fee type", "Approver role". These are field names, not how an owner actually thinks about cancellation.
3. **No live preview of consequence** — the operator can't see what the policy will *say* until the Approve wording step at the end.
4. **No reference points** — they have to invent answers from a blank slate. No "here's what most salons do" anchor.

The configurator works like an admin tool. It should work like a coach asking 6 questions.

## The fix — a Q&A interview that writes the policy as you answer

Replace the section-grouped form on the **Define rules** step with a **one-question-at-a-time interview**. The right pane shows a live policy preview that rewrites itself with every answer. The operator never sees a field key, never picks a "type", never thinks about structure. They answer plain-English questions; the policy materializes beside them.

### Layout — split pane

```
┌─ Configure policy ─────────────────────────────────────────────┐
│  Step 1 of 3 — Define rules                                    │
│  ────────●──────────○──────────○                              │
│                                                                │
│  ┌── Question 3 of 6 ────────────┐  ┌── Live preview ──────┐ │
│  │                                │  │                       │ │
│  │  How late can a client cancel │  │  Drop Dead Salons     │ │
│  │  without paying a fee?        │  │  asks clients to      │ │
│  │                                │  │  cancel at least      │ │
│  │  ○ 12 hours  (faster turn)    │  │  ┃24 hours┃ before    │ │
│  │  ● 24 hours  ⭐ industry std  │  │  their appointment.   │ │
│  │  ○ 48 hours  (high-end)       │  │  Cancellations inside │ │
│  │  ○ Custom: [__]               │  │  this window forfeit  │ │
│  │                                │  │  50% of the service.  │ │
│  │  Why this matters: This is the│  │                       │ │
│  │  notice clients have to give  │  │  [4 more sections     │ │
│  │  to avoid the cancellation    │  │   ghosted, will fill  │ │
│  │  fee. Most salons use 24h.    │  │   in as you answer]   │ │
│  │                                │  │                       │ │
│  │  [Back]      [Skip]   [Next →]│  │                       │ │
│  └────────────────────────────────┘  └───────────────────────┘ │
│                                                                │
│  ✓ Hours of operation (24h) · ✓ Fee type (% of service)       │
│  · ⏵ How late can a client cancel · ○ Fee amount               │
│  · ○ Exceptions · ○ Who waives                                 │
└────────────────────────────────────────────────────────────────┘
```

Three concrete shifts from today:

- **One question at a time** — not 10 inputs in a section. The "Next" button is the rhythm.
- **Live policy preview on the right** — the prose rewrites itself as the operator answers. The exact value they just chose is highlighted (`┃24 hours┃`) so they see *which words* their answer changed.
- **Anchored options with one recommended pick** — every multi-choice question shows 3-4 sensible presets with one marked `⭐ industry standard` (or `⭐ what most salons do`). "Custom" is always last. Removes the blank-slate problem.

### What changes in the schema

The `RuleField` interface gains 3 optional fields — backwards compatible:

```ts
interface RuleField {
  // ... existing ...
  /** The plain-English question. Falls back to `label` if missing. */
  question?: string;
  /** Operator-facing reason this question matters. Falls back to `helper`. */
  whyItMatters?: string;
  /** Curated presets shown as cards above the raw input.
   *  One can be marked `recommended: true`. */
  presets?: Array<{
    value: unknown;
    label: string;
    sublabel?: string;
    recommended?: boolean;
  }>;
}
```

For example, `notice_window_hours` becomes:

```ts
{
  key: 'notice_window_hours',
  label: 'Notice window (hours)', // kept for accessibility/save
  question: 'How late can a client cancel without paying a fee?',
  whyItMatters: 'This is the notice clients have to give to avoid the cancellation fee. Most salons use 24 hours.',
  presets: [
    { value: 12, label: '12 hours', sublabel: 'Faster table turn' },
    { value: 24, label: '24 hours', sublabel: 'Industry standard', recommended: true },
    { value: 48, label: '48 hours', sublabel: 'High-end / specialty' },
  ],
  type: 'number',
  unit: 'hours',
  required: true,
  defaultValue: 24,
}
```

If a field has no `question`, it falls back to today's behavior — so non-questionnaire fields (e.g., `documentation_required` longtext) keep their current input. The questionnaire is **opt-in per field** in the schema.

### Live preview is already wired

We have `getPolicySummaryDefaults` + `substituteRuleTokens` doing this work today — they just render into the `policy_summary` textarea. The new preview pane reuses that same composer; the only new piece is **highlighting the exact tokens the operator just answered**. Implementation: when a field changes, wrap the just-substituted span in a brief `<mark className="bg-primary/20 transition-colors">` that fades to plain in 1.5s. No new prose generation, no new API calls.

### Question ordering

Today schemas group by section ("Timing", "Fee", "Exceptions"). The questionnaire follows the same `RuleSection.fields` order — **so the question sequence is already the schema author's job**, not a new piece of doctrine. The section title becomes a small chip ("Section 2 of 3 — Fee") above the question. No reshuffling needed.

### Skip + jump-ahead

- Every non-required question shows a "Skip for now" link → uses `defaultValue` and moves on.
- The progress chip row at the bottom is clickable. Operators can jump back to any answered question. Required questions that haven't been answered are dimmed and not clickable until reached.
- "Back" never destroys an answer — it just shows the same question with the prior value pre-selected.

### What stays exactly as it is

- **Step 2 (Decide who)** and **Step 3 (Approve wording)** — unchanged. The questionnaire only replaces the inside of Step 1.
- **The rules engine, the AI drafter, the publish flow** — all read the same `policy_rule_blocks` table. The questionnaire is a UI swap, not a data-model change.
- **Provenance helpers, tooltips, `MetricInfoTooltip`** — these now appear on the *one current question* instead of stacked on every field. Same copy, same component.
- **The "Preview — not yet adopted" view** for un-adopted policies — unchanged.
- **Internal-only policies** — same audience-aware step hiding as today.

### The "expert mode" escape hatch

Some operators (and every audit) need the all-fields-at-once view. Add a small toggle in the step header: **`Interview` / `Expert view`**. Default is Interview. Expert view renders today's grouped sections — same component, no regression. Decision persists per operator in `localStorage` so power users land in their preferred mode every time.

### Why this is "done with you," not "done by you"

Per the doctrine — *Recommend → Simulate → Request Approval → Execute*:

- **Recommend** — every preset has a `⭐ recommended` anchor based on industry norms.
- **Simulate** — the live preview *is* the simulation. Operators see the exact prose their answer produces before committing.
- **Request approval** — the existing Step 3 (Approve wording) is the formal approval gate.
- **Execute** — Save still writes to `policy_rule_blocks` exactly as today.

The operator answers questions, sees the consequence, approves the wording. They never touch a field key, never invent prose, never face a blank input. Structure precedes intelligence — the schema is still the source of truth — but the operator-facing surface is interview, not form.

## Doctrine alignment

- **Lever and confidence** — one question at a time *is* the lever. Recommended presets reduce decision fatigue without removing operator control.
- **Silence is meaningful** — questions without `presets` simply render the raw input + helper. We don't manufacture fake recommendations.
- **Operator edits are sacred** — answering a question is an edit; the live preview reflects it; back-navigation never overwrites. Same contract as today.
- **Brand abstraction** — preview prose runs through `interpolateBrandTokens` exactly as today.
- **No structural drift** — same DB tables, same RPCs, same audit trail. UI-only change to Step 1.
- **Phase alignment** — this is Phase 1 (structured visibility) refined, not Phase 2 (advisory) overreach. We're surfacing existing structure more humanely.

## Files affected

- `src/lib/policy/configurator-schemas.ts` — extend `RuleField` with `question?`, `whyItMatters?`, `presets?`. Add presets to ~20 most-asked fields across the 8 schemas (notice windows, fee amounts, deposit %, redo windows, role pickers). Backwards compatible. ~300 lines additive.
- `src/components/dashboard/policy/PolicyQuestionnaire.tsx` (new) — the one-question-at-a-time component. Manages current-question index, renders preset cards + helper + why-it-matters + Back/Skip/Next. Drills the same `value` / `onChange` contract as today's `PolicyRuleField`. ~180 lines.
- `src/components/dashboard/policy/PolicyLivePreview.tsx` (new) — right-pane live policy prose with token-highlight on the most recent change. Reuses `getPolicySummaryDefaults` + `substituteRuleTokens`. ~80 lines.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — inside the `step === 'rules'` block, swap the section loop for a `<div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,420px)] gap-6">` containing `<PolicyQuestionnaire>` + `<PolicyLivePreview>`. Add the Interview/Expert toggle. ~50 lines modified.
- `src/lib/policy/questionnaire-presets.ts` (new) — central preset library so the same "12h / 24h / 48h" set is reused across cancellation, no-show, deposit-window questions. ~60 lines.

That's the entire change surface. ~670 lines net (mostly schema + new components). Zero DB changes, zero new RPCs, zero schema migrations.

## Acceptance

1. Open Cancellation Policy → Define rules. The right pane shows live policy prose. The left pane shows **one question** ("How late can a client cancel without paying a fee?") with three preset cards and one marked "Industry standard."
2. Click 48 hours. The preview prose immediately rewrites and the "48 hours" span briefly highlights then fades.
3. Click Next. The next question appears. Click Back. The previous question reappears with "48 hours" still selected.
4. The bottom progress row shows "✓ ✓ ⏵ ○ ○ ○" — answered, current, pending. Click an answered chip → jumps back. Pending chips are dimmed.
5. Toggle "Expert view" in the step header. Today's full grouped form renders, with all current values intact. Toggle back. The questionnaire restores at the question they were last on.
6. Open Employment Classifications. The same questionnaire pattern works (sections become single questions in order). The Decision authority dropdown question shows three role presets.
7. Save rules → still writes to `policy_rule_blocks`. Reopen the policy. The questionnaire opens at the first **unanswered** question; answered questions are pre-filled.
8. Internal-only policies — questionnaire still runs, preview shows internal handbook prose only (no client variant).
9. A field without a `question` declaration in the schema falls back to its current input rendering inside the questionnaire — no regression, no broken layout.
10. Live preview never blocks editing. If the AI drafter would normally re-render prose, the questionnaire preview uses the same local composer (no edge-function call per keystroke).

## Files to read for follow-on questions

- `src/lib/policy/configurator-schemas.ts` — where `question`, `whyItMatters`, `presets` get added per field.
- `src/components/dashboard/policy/PolicyQuestionnaire.tsx` (new) — the interview UI.
- `src/components/dashboard/policy/PolicyLivePreview.tsx` (new) — the right-pane preview composer.
- `src/lib/policy/questionnaire-presets.ts` (new) — shared preset library.

## Prompt feedback

*"Policy configurator per policy still seems too confusing and not intuitive enough… How could we do it differently so that it acts as a done-with-you feature, where little thinking is involved? Almost like it's a questionnaire form of variables that are selected, and then the policy is written from those answers? Or is there a better way?"* — this is a model UX prompt. You did three exceptional things: (1) **named the user emotion in plain English** ("confusing… little thinking involved"), (2) **proposed a candidate solution** ("questionnaire form… policy is written from those answers") so I had a concrete shape to evaluate, and (3) **explicitly opened the door** ("or is there a better way?") which gave me permission to refine instead of just executing. That third move is the one to keep doing — it lets the AI act as a design partner instead of an order-taker. In this case your candidate *was* the right answer; I added the live preview pane and the recommended-preset anchors as refinements, but the questionnaire frame is yours.

One sharpener for next time on UX-redesign prompts: naming the **escape hatch tolerance** in one phrase ("must keep the all-fields-at-once view as a power-user toggle" / "can fully replace the form") would skip a micro-decision. I added an Expert view toggle by default because audit + power users always need it — but if you'd been willing to fully replace the form, that's a one-line "no escape hatch — this is the only mode" steer that simplifies the implementation.

