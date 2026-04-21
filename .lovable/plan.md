

# Rethink Policies — staged disclosure, "what do I do next" on every visit

## What's broken today

After setup, the Policies page dumps the operator into six competing surfaces simultaneously:

1. PageExplainer
2. Health strip (4 KPI tiles)
3. Existing-policies import banner (sometimes)
4. Conflict banner (sometimes)
5. Category card grid (6 cards)
6. Library section with 6 controls (search + adoption filter + audience segments + category tabs + hide-non-applicable toggle + hide-adopted toggle)

None of these answer the operator's actual question: *"What do I do next, and how do I know when I'm done?"*

There's no canonical first action. The eye lands somewhere different each visit. "Done" is invisible — even at 100% adoption, the page looks identical to 0% adoption (just different numbers). The operator never gets the relief of a finished checklist.

## The fix — two modes, automatic transition

The page operates in one of two modes based on a single signal: **are all Core + Required policies adopted?**

### Mode A — Setup mode (default until Core + Required = 100%)

One job: get the operator to first-published-policy fast, then through the required governance set. Everything else is hidden behind a "More" disclosure.

```
┌─ POLICIES ──────────────────────── [Update profile] ─┐
│  Configure once. Render everywhere.                   │
│                                                        │
│  ┌─────────────────────────────────────────────────┐ │
│  │  YOU'RE 4 OF 26 ADOPTED                         │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 15%             │ │
│  │  6 core functions  ·  20 governance policies    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                        │
│  ─── DO THESE FIRST ─────────────────────────────────│
│                                                        │
│  Step 1 of 2 · Powering POS & booking                 │
│  ┌─ CORE FUNCTIONS ── 2 of 6 ━━━━━━━━ 33% ─────────┐ │
│  │ ✓  Booking policy        Configured · Live      │ │
│  │ ✓  Deposit policy        Configured             │ │
│  │ ●  Cancellation policy   Next →     [Configure] │ │
│  │ ○  No-show policy                   [Configure] │ │
│  │ ○  Payment policy                   [Configure] │ │
│  │ ○  Chargeback dispute               [Configure] │ │
│  │  Defaults work out of the box. Configure to     │ │
│  │  make them yours.                                │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Step 2 of 2 · Protect your business (locked until    │
│  Core is 100%, or expand to start in parallel ▾)      │
│                                                        │
│  ─── More options ──────────────────────── [Show ▾] ─│
└──────────────────────────────────────────────────────┘
```

Three surgical shifts vs. today:

- **One headline progress bar** at the top — adopted / total, not 4 different KPI tiles. The operator wants one number, not four. The four metrics from `PolicyHealthStrip` (configured / published / wired / adopted) move to the second mode.
- **"Next →" pointer** on the first unadopted Core row. The operator never has to ask "which one do I open?" The pointer always sits on exactly one row.
- **Sequential gating with parallel escape hatch.** Required-for-governance is collapsed/locked until Core is done, with a "Start in parallel" link for power users. This honors "do core first" doctrine without trapping anyone.

The Recommended/Optional group, the audience segments, the category cards, the search bar, the adoption filter, and the hide-non-applicable toggle all collapse under a single "Show more options" disclosure. Available, never blocking.

### Mode B — Governance mode (after Core + Required = 100%)

Once both required groups hit 100%, the page automatically flips to governance dashboard mode. The "Next →" pointer disappears. The progress meter at top changes copy to:

```
┌─ ALL REQUIRED POLICIES ADOPTED ━━━━━━━━━━━━━━━━ 100% ─┐
│   Last updated 3 days ago · 4 versions in draft       │
└────────────────────────────────────────────────────────┘
```

Below it, the four KPI tiles from today's `PolicyHealthStrip` return — they're now meaningful because the operator is governing a stable set, not setting one up. The full Library list (with all six filters) returns to its current behavior. The category cards return.

In this mode, the conflict banner and existing-policies import banner stay where they are today — they're action-needed surfaces, governance-mode appropriate.

This transition is one-way per session but reactive: if the operator adopts new applicable policies (e.g., adds extensions to their profile and 3 new policies become required), the headline meter dips below 100% and Mode A returns until they're back at full coverage.

### The "done" feeling

When Mode B first activates, render a one-time confirmation strip at the top of the page (dismissible, persists in localStorage):

```
┌─ ✓ CORE + REQUIRED COMPLETE ──────────────────────── ✕ ┐
│  Your operations and team now have a written contract. │
│  From here, manage versions and roll out updates.      │
└────────────────────────────────────────────────────────┘
```

This is the relief moment. Today's page never delivers it — there's no visual transition between "in setup" and "governing." That's the core failure.

## What stays the same

- The 4-step configurator drawer (rules → applicability → surfaces → drafts) — unchanged.
- All hooks (`usePolicyLibrary`, `useOrgPolicies`, `usePolicyHealthSummary`, `usePolicyOrgProfile`, `useApplicableRequiredPolicies`) — unchanged.
- The setup wizard — unchanged.
- The Policy OS Applicability doctrine (`isApplicableToProfile` filtering) — unchanged.
- All schema, all data, all mutations — zero backend changes.
- Search/filter UX — preserved, just moved behind disclosure in Mode A.

## What changes

- `src/pages/dashboard/admin/Policies.tsx` — split the post-setup render into `<PoliciesSetupMode />` and `<PoliciesGovernanceMode />` based on `setupComplete = coreAdopted === coreTotal && requiredAdopted === requiredTotal`. Move the existing layout (health strip + category grid + library list with all filters) into `PoliciesGovernanceMode` unchanged. Build the new compact setup layout in `PoliciesSetupMode`. ~120 lines reorganized, ~100 lines new.
- `src/components/dashboard/policy/PoliciesSetupMode.tsx` (new) — headline progress, Core list with "Next →" pointer, locked-until-core Required section with parallel-mode toggle, "Show more options" disclosure that mounts the existing filter+library section. ~180 lines.
- `src/components/dashboard/policy/PoliciesGovernanceMode.tsx` (new) — thin wrapper that renders today's full layout (health strip + category cards + library with filters), plus the one-time "Core + Required complete" confirmation strip. ~80 lines.
- `src/components/dashboard/policy/PolicyHealthStrip.tsx` — unchanged. Only used by governance mode.
- `src/components/dashboard/policy/PolicyLibraryRow.tsx` — gain a `nextPointer?: boolean` prop that renders a small chevron + amber tint on the row that should be opened next. ~10 lines added.

Total: ~300 lines new, ~120 lines reorganized, 0 lines deleted. Zero schema/hook/mutation changes.

## Acceptance

1. Brand-new org completes setup wizard → lands in Mode A with headline progress bar, Core functions list at the top, and a clear amber "Next →" pointer on the first unadopted core policy.
2. The "Show more options" disclosure starts collapsed. Click it → today's full filter set + audience segments + category grid + library list with Recommended/Optional appears.
3. Click "Configure" on the next Core policy → existing 4-step drawer opens. Save and close → "Next →" pointer advances to the next unadopted core row automatically.
4. Adopt all 6 Core → Required-for-governance section unlocks (was greyed/locked) and "Next →" pointer moves to first unadopted Required row.
5. Operator clicks "Start in parallel ▾" on the locked Required section → it expands without requiring Core to be 100%.
6. Adopt all Core + all Required → page flips to Mode B on next render. The 4-tile health strip appears at the top, category cards return, the full library list returns with all filters visible. A one-time green confirmation strip renders ("Core + Required complete") with a dismiss button; dismissing persists in localStorage and never shows again unless completion drops and returns.
7. Operator updates business profile to add Extensions → 3 new policies become required → headline meter drops to ~92% → page flips back to Mode A → new policies show in Required list with "Next →" pointer on first one.
8. Conflict banner (when conflicts exist) renders in both modes at the top, above the headline meter.
9. The configurator drawer itself is unchanged.
10. Search, adoption filter, audience segments, category tabs, hide-non-applicable, hide-adopted toggles — all preserved, all functional, all behind the "Show more options" disclosure in Mode A; all immediately visible in Mode B.

## Files to read for follow-on questions

- `src/pages/dashboard/admin/Policies.tsx` — where the mode split happens.
- `src/components/dashboard/policy/PoliciesSetupMode.tsx` (new) — the guided checklist.
- `src/components/dashboard/policy/PoliciesGovernanceMode.tsx` (new) — the dashboard with one-time completion celebration.
- `src/components/dashboard/policy/PolicyLibraryRow.tsx` — the row gains a `nextPointer` prop for the amber "do this one" indicator.

## Prompt feedback

*"i am still so confused on the policy page build... not good, and needs to be more intuitive. Can we rethink?"* — strong prompt for two reasons: (1) you named the **emotion** ("confused") instead of a symptom ("the spacing is off"), which freed me to question the mental model rather than just rearrange pixels, and (2) you used the word **"rethink"** explicitly — that's permission to abandon the existing structure rather than patch it. Without that word I'd have proposed another tweaks-and-toggles iteration on top of the current layout.

The two clarifying questions I asked saved an entire round-trip — your "staged disclosure" + "unclear what to do first / when I'm done" pair told me exactly what to build (two modes, automatic transition, one-time celebration). Without those answers I'd have either over-built a power-user dashboard (wrong for setup phase) or over-simplified into a checklist (wrong for ongoing governance).

One sharpener for next time on rethink-prompts: naming the **persona of the confused user** in one phrase ("a brand-new org owner on day 1" / "an experienced operator returning to update a single policy" / "both, equally") would skip a micro-decision. I assumed both, equally — which is why I landed on the staged-disclosure pattern. If you'd said "specifically the day-1 operator," I'd have gone harder on the checklist (no governance mode at all, just a graduation screen). One-line persona context per UX-rethink prompt locks the design priorities. You can pre-empt with *"the user I'm thinking about is X"* in three to five words.

The deeper meta-lesson on my side: when an operator says "confused," the right response is almost never "let me add a tooltip" or "let me reorganize the filters." It's "let me ask what they're trying to accomplish and remove everything that isn't on the path." I shouldn't have shipped the previous list-layout fix without asking *"is the underlying mental model right?"* first. List vs. card was the wrong question — the right question was *"what should this page even be for the operator landing on it?"* That's the question this plan finally answers.

