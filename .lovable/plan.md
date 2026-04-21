

# Decompress the Questionnaire UI

## What's wrong in the screenshot

Looking at your screenshot at 1300px viewport, six concrete failures:

1. **Ghost line behind the header** — "Step 1 of 5 — Define rules" is half-rendered behind the header description. Z-index / margin collision between `PolicyConfiguratorStepper` and the page-context block above it.
2. **The question textarea is squeezed** — `who_it_applies_to` is a longtext field that forces a 4-line `<textarea>`, but it's living inside a column that's only ~46% of the panel width. The text wraps into 3 awkward lines mid-sentence ("Drop Dead / Salons. Manager-level…").
3. **The PREFILLED helper sits *below* the input** — pushing the Back/Skip/Next row way down. The provenance line should be lateral (right of the input on wide viewports) so the input gets its full height/width.
4. **The Live Preview is unreadable** — pinned to a `minmax(0,420px)` column, the prose breaks every 4-5 words ("Drop Dead Salons / employs team / members in the / following…"). Reads like a poem, not policy prose.
5. **The progress chip row competes with navigation** — three chips stack into two visual rows directly under the Back/Skip/Next buttons. Operator's eye doesn't know which row to act on.
6. **The whole left card has `p-5` inside a panel that already has its own padding** — double-quilted whitespace eats horizontal real estate.

The questionnaire frame is right. The container math is wrong.

## The fix — five surgical layout changes

### 1. Remove the wrapper card around the questionnaire

Today: `<div className="rounded-xl border border-border bg-card p-5"> <PolicyQuestionnaire/> </div>`
Change to: `<PolicyQuestionnaire/>` directly — the questionnaire already controls its own internal spacing. Removing the outer card returns ~40px of horizontal real estate per side and removes the visual "card-in-a-card-in-a-drawer" stacking.

### 2. Re-balance the split — preview gets more, input gets max-width

Today: `grid-cols-[1fr_minmax(0,420px)]` — the input column is variable (squeezed), the preview is capped at 420px.
Change to: `grid-cols-[minmax(0,1fr)_minmax(360px,520px)]` AND drop the right pane entirely below `lg` (already does). On a 1300px viewport with the panel at ~960px usable width, that yields ~440px input column + ~480px preview column. The preview prose breaks at a comfortable ~70 characters per line instead of the current ~28.

Below `lg` (mobile/tablet), the live preview moves to a **collapsed drawer pinned to the bottom** with a "Preview policy" trigger (no inline stacking that pushes the form off-screen). Reuses the existing `Sheet` primitive.

### 3. Promote provenance + prefilled helper to the right of the input

Today: `PolicyRuleField` renders the input full-width and stacks the `PREFILLED` helper underneath it.
Change in the questionnaire context only: when the field has provenance (`prefilled` / `internal-only` / `surfaces-on`), render the input at `max-w-[640px]` and float the helper as a **right-side column at `w-[200px]`** on `xl+` viewports. On smaller viewports, keep today's stacked behavior. The helper becomes a *side note*, not a bottom-stack push.

For longtext fields specifically: the `<textarea>` gets `min-h-[160px]` (today it's `min-h-[100px]` which forced the awkward 4-line wrap). With more height, the prose flows naturally and the operator can see the full prefilled text without scrolling inside the input.

### 4. Split the navigation row from the progress chips

Today: nav buttons + progress chips render in the same vertical block, separated only by `pt-3 border-t`.
Change to:
- **Nav row stays where it is** (Back / Skip / Next) — primary action, always visible at the same eye-level.
- **Progress chips move to the top of the questionnaire**, replacing today's "Section 1 of 1 · Question 2 of 3" text label. Render as a horizontal scroll strip with the current question marked. This collapses two chrome rows into one and puts orientation at the top where the operator's eye lands first.

Layout result, top to bottom:
```
[Progress strip — chips, current highlighted]
[Big plain-English question + why-this-matters card]
[Anchored presets grid (when present)]
[Input + provenance side-note (right column on xl+)]
[Back ←——— Skip · Next] (single row, no chips below)
```

### 5. Fix the ghost line + decompress the whole step container

The "Step 1 of 5" ghost in your screenshot is the stepper's text bleeding through because the panel description above it has no `mb-*` and the stepper has no `mt-*`. Fix:
- The configurator panel's outer wrapper changes from `space-y-6` to `space-y-8` between major blocks (header → stepper → step content).
- The header context block gets an explicit `pb-2` so the stepper's chip background never overlaps it.
- Inside the rules step, swap `space-y-6` for `space-y-8` between the mode toggle and the questionnaire/preview grid.

Net visual breathing room: the step content moves down ~16px, the description text fully clears the stepper, and the questionnaire+preview grid has visible margin from the controls above it.

### Bonus: collapse the "Why this matters" card on small viewports

Today the why-this-matters card is always rendered as a full-width muted box with the Sparkles icon. On `<lg` viewports, this stacks above the question and pushes presets below the fold. Change: on `<lg`, the why-this-matters becomes a `<Disclosure>` ("Why this matters →") that expands inline. Same content, less first-paint weight on tablet/mobile.

## What stays untouched

- The questionnaire's data contract — `values`, `onChange`, `onComplete` — unchanged.
- The schema shape (`question`, `whyItMatters`, `presets`) — unchanged.
- The Live Preview composer logic, token highlighting, `substituteWithHighlight` — unchanged.
- The Interview / Expert toggle — unchanged.
- Save behavior, version blocks, all hooks — unchanged.

This is **purely a layout pass on the inside of Step 1**. Zero schema work, zero new components, zero new state.

## Files affected

- `src/components/dashboard/policy/PolicyQuestionnaire.tsx` — move progress chips to top, increase question heading scale, add `xl+` two-column input/helper hint slot, raise textarea min-height. ~40 lines modified.
- `src/components/dashboard/policy/PolicyLivePreview.tsx` — relax `min-h`, increase line-height (`leading-7`), tighten internal padding to `p-6`. On `<lg`, render as a bottom sheet trigger instead of inline. ~25 lines modified.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — remove the wrapper card around `<PolicyQuestionnaire>`, change grid to `minmax(0,1fr)_minmax(360px,520px)`, swap `space-y-6` for `space-y-8` at the right insertion points, add `pb-2` to header context. ~15 lines modified.
- `src/components/dashboard/policy/PolicyRuleField.tsx` — accept an optional `helperPlacement?: 'inline' | 'side'` prop. When `'side'` (passed by the questionnaire), the prefilled provenance helper renders in a right-side column slot rather than below the input. Backwards compatible — Expert view passes nothing, behavior unchanged. ~20 lines additive.

Total: ~100 lines modified, 0 lines added in new files. Zero DB / RPC / schema changes.

## Visual result (after)

```
┌─ Configure policy ─────────────────────────────────────────────────────┐
│  Define the structured rules. AI drafting will render these into prose │
│  later — it cannot invent rules.                                       │
│                                                                         │
│  ●─────○─────○─────○─────○                              [Interview ▾] │
│                                                                         │
│  ┌─ Question 2 of 3 ─────────────────────────┐  ┌─ Live preview ─────┐│
│  │ ● ✓ Policy summary  ● ⏵ Who it applies to │  │ Updates as you     ││
│  │ ○ Who approves exceptions                  │  │ answer             ││
│  │                                             │  │                    ││
│  │ Who does this policy apply to?             │  │ Drop Dead Salons   ││
│  │                                             │  │ employs team       ││
│  │ ┌─ Why this matters ──────────────────┐    │  │ members in the     ││
│  │ │ ⚡ Internal-only — appears in the   │    │  │ following          ││
│  │ │ printable handbook, not on the      │    │  │ classifications:   ││
│  │ │ public site.                         │    │  │ full-time          ││
│  │ └─────────────────────────────────────┘    │  │ employees,         ││
│  │                                             │  │ part-time          ││
│  │ ┌─────────────────────────────┐ ┌───────┐ │  │ employees, and     ││
│  │ │ All team members and,       │ │ PRE-  │ │  │ (where applicable) ││
│  │ │ where the policy involves   │ │ FILLED│ │  │ booth-rental       ││
│  │ │ guest interactions, all     │ │       │ │  │ contractors…       ││
│  │ │ clients of Drop Dead        │ │ Edits │ │  │                    ││
│  │ │ Salons. Manager-level       │ │ here  │ │  │                    ││
│  │ │ exceptions follow the docu- │ │ over- │ │  │                    ││
│  │ │ mented authority chain.     │ │ ride  │ │  │                    ││
│  │ └─────────────────────────────┘ └───────┘ │  │                    ││
│  │                                             │  │                    ││
│  │ [< Back]                  [Skip]  [Next →]│  │                    ││
│  └─────────────────────────────────────────────┘  └────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

Compare to your screenshot: textarea is wide enough to read, preview lines break at sentence cadence, provenance helper is a side note instead of a bottom-stack push, progress chips live at the top where they orient, no ghost text behind the header.

## Acceptance

1. Open Employment Classifications at 1300px viewport. The "Step 1 of 5" line no longer ghosts behind the description.
2. The question textarea on `who_it_applies_to` renders at full reading width (~640px max) with the PREFILLED helper as a slim right column on `xl+` viewports.
3. The live preview prose breaks at ~70 characters per line, not 28. No more poem-like line breaks.
4. Progress chips are at the *top* of the question card, not stacked under the navigation row.
5. The Back / Skip / Next row sits directly under the input — single visual row, no chips competing.
6. Resize to 768px (tablet). The preview pane becomes a bottom-sheet trigger ("Preview policy") instead of stacking inline. The questionnaire takes the full width.
7. Toggle to Expert view. Today's grouped form renders unchanged — no regressions, no spacing drift.
8. Resize to 1536px+ (large desktop). Preview pane caps at 520px, input column expands to fill — preview never gets so wide that prose breaks at >85 characters.
9. Cancellation, Deposit, all currently-cleaned schemas — same layout, same breathing room, no per-policy adjustments needed.

## Files to read for follow-on questions

- `src/components/dashboard/policy/PolicyQuestionnaire.tsx` — the interview component with the new top-progress + side-helper layout.
- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — the new grid math for the questionnaire/preview split.
- `src/components/dashboard/policy/PolicyRuleField.tsx` — the new `helperPlacement` prop.

## Prompt feedback

*"Before we extend to the remaining schemas, we need to improve this UI layout since it's too condensed."* — clean, surgical prompt. You did three things well: (1) **named the priority** ("before we extend") which prevented me from doing both at once and shipping a sloppy double-pass, (2) **named the symptom in plain English** ("too condensed") which is exactly the right level of abstraction — you didn't prescribe "make it wider" or "use 3 columns", you named the *user feeling*, and (3) **paired the prompt with a screenshot of the actual broken state**, which let me identify six concrete failures instead of guessing. The screenshot was load-bearing here — without it I would have proposed generic spacing tweaks.

One sharpener for next time on layout-fix prompts: naming the **viewport you're testing at** in one phrase ("at my current 1300px desktop" / "this is what it looks like on iPad") would skip a micro-decision. I assumed your screenshot was your primary working viewport (correct: 1300px from the client state) and designed the breakpoints around it — but if you're regularly using a 1024px tablet or a 1920px ultrawide, the breakpoint targets shift. One line of viewport context per layout prompt locks the design priorities.

