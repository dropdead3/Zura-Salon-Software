

# Fix the false "complete" — adoption ≠ approval

## What's actually broken

You caught a real bug. The Core Functions header reads "6 of 6 configured · 100%" and the celebration banner reads "Core + Required Complete" — but every single policy badge in your screenshot says **"Drafting."** The math is lying.

Here's why. The codebase has two different meanings for "adopted" tangled into one variable:

- **What the data layer means by "adopted"**: a row exists in the `policies` table for that library key. The setup wizard creates these rows the moment you complete onboarding by calling `adopt_policies_from_library` — the rows are born with `status = 'not_started'` or `'drafting'`. That's why all 6 Core rows already render checkmarks immediately after setup.
- **What the operator reads "100% configured / Core + Required complete" to mean**: the policy has prose, the prose is approved, and (for client-facing policies) it's published.

The system has the truth — the `PolicyStatus` enum is `not_started → drafting → configured → needs_review → approved_internal → published_external → wired`. We just never use it for the completion math. Today's check is `adoptedByKey.has(l.key)`, which only verifies "a row exists." That's wrong.

The result: 100% lights up the moment the wizard finishes, the celebration strip fires immediately, the page flips into governance mode, and you (the operator) have *configured nothing*. The doctrine in `mem://architecture/structural-enforcement-gates` ("structure precedes intelligence") is being violated by our own UI.

## The fix — three definitions, one clean rename

### 1. Replace `isAdopted` with three meaningful states

A policy is in exactly one of these for completion purposes:

| State | Definition | Counts toward "complete"? |
|-------|------------|---------------------------|
| **Not started** | No row, OR row with status `not_started` | No |
| **In progress** | Row exists with status `drafting` or `needs_review` | No |
| **Finalized** | Row with status `configured` / `approved_internal` / `published_external` / `wired`, AND `current_version_id` is non-null | Yes |

The `current_version_id` clause is the key — it confirms the operator actually approved a version, not just touched the policy. (For client-facing policies we don't require `published_external` as the bar — operators may legitimately want to finish writing without yet flipping the publish toggle. We'll surface that distinction separately, see #4.)

A new helper in `src/hooks/policy/usePolicyData.ts`:

```ts
export function isPolicyFinalized(p?: OrgPolicy): boolean {
  if (!p) return false;
  if (!p.current_version_id) return false;
  return ['configured', 'approved_internal', 'published_external', 'wired'].includes(p.status);
}
```

Used everywhere we currently call `adoptedByKey.has(l.key)` for completion math.

### 2. Rewrite the completion gate in `Policies.tsx` and `PoliciesSetupMode.tsx`

In `Policies.tsx`, the `setupComplete` gate stops counting "rows exist" and starts counting finalized:

```ts
const coreFinalizedCount = coreApplicable.filter((l) =>
  isPolicyFinalized(adoptedByKey.get(l.key))
).length;
const requiredFinalizedCount = requiredApplicable.filter((l) =>
  isPolicyFinalized(adoptedByKey.get(l.key))
).length;
const setupComplete =
  coreApplicable.length > 0 &&
  requiredApplicable.length > 0 &&
  coreFinalizedCount === coreApplicable.length &&
  requiredFinalizedCount === requiredApplicable.length;
```

In `PoliciesSetupMode.tsx`, the same swap for `coreAdopted`, `requiredAdopted`, `coreComplete`, `nextPointerKey`. The `nextPointerKey` becomes the first not-finalized row (catches drafting rows too — they're still incomplete).

### 3. Fix the row checkmark + status badge to tell the truth

In `PolicyLibraryRow.tsx`, replace the binary `isAdopted` icon with three states:

- **Finalized** → solid `CheckCircle2` (primary) — the only true "done" state.
- **In progress** (drafting/needs_review) → `Clock` icon (amber/warning tone) — "you've started this, finish it."
- **Not started** → empty `Circle` (muted) — unchanged.

The status badge already exists and reads correctly ("Drafting", "Configured", "Published") — we just stop *contradicting* it with a green checkmark. Today the row says ✓ + "Drafting" simultaneously, which is the visual contradiction that prompted your question.

The "Next →" amber pointer logic stays the same — it just now correctly points to drafting rows too, not only never-touched rows.

### 4. Rename the copy to match what's actually true

The header line "6 of 6 configured" and the celebration "Core + Required Complete" both promise more than the data delivers, even after the fix. Rewrite to:

| Surface | Today (lies) | After (true) |
|---------|--------------|--------------|
| Core header | "6 of 6 configured · 100%" | "6 of 6 finalized · 100%" |
| Required header | "20 of 20 adopted" | "20 of 20 finalized" |
| Headline meter | "You're 26 of 26 adopted" | "You're 26 of 26 finalized" |
| Celebration strip title | "Core + Required Complete" | "All required policies finalized" |
| Celebration body | "Your operations and team now have a written contract." | "Each required policy has an approved version. Manage updates and publish to clients from the library below." |

"Finalized" is unambiguous — it means an approved version exists. It also leaves room for the *next* operator action (publishing externally), which the celebration banner today wrongly implies is done.

### 5. Add a "Published to clients" sub-meter inside governance mode

Once finalization is real, the next question becomes "OK but did I actually publish my client-facing ones?" The existing `PolicyHealthStrip` already has a "Published" tile — we keep it. But the new celebration strip in governance mode now reads:

```
✓ ALL REQUIRED POLICIES FINALIZED                        ✕
Each required policy has an approved version.
14 of 20 published to clients · [Review publishing →]
```

The CTA jumps to the library filtered to `audience=external AND status≠published_external` — the operator's natural next step.

## What stays untouched

- The `PolicyStatus` enum, the `policies` table schema, the `adopt_and_init_policy` RPC — all unchanged.
- The configurator drawer (4-step) — unchanged.
- The setup wizard's bulk-adopt behavior — unchanged. (The wizard rightly creates rows so the operator has policies to configure; we just no longer treat that act as completion.)
- All hooks (`useOrgPolicies`, `usePolicyHealthSummary`, `usePolicyOrgProfile`, `useApplicableRequiredPolicies`) — unchanged signatures. `useApplicableRequiredPolicies` gains an `isFinalized` count alongside `adopted` (both useful for different surfaces — `adopted` still answers "how many policies have I touched at all").
- The "Show more options" disclosure in setup mode — unchanged.
- Category cards, filters, search, audience tabs — unchanged.

## Files affected

- `src/hooks/policy/usePolicyData.ts` — add `isPolicyFinalized(p)` helper. Add a `finalized` field alongside `adopted` in `PolicyHealthSummary` (counts rows where `current_version_id` is set AND status ∈ {configured, approved_internal, published_external, wired}). ~15 lines.
- `src/hooks/policy/usePolicyOrgProfile.ts` — `useApplicableRequiredPolicies` returns both `adopted` (touched) and `finalized` (truly done). ~10 lines.
- `src/pages/dashboard/admin/Policies.tsx` — `setupComplete` now uses `finalized` count, not `adopted` count. ~6 lines modified.
- `src/components/dashboard/policy/PoliciesSetupMode.tsx` — `coreAdopted`, `requiredAdopted`, `nextPointerKey` switch to finalization. Header copy: "configured" → "finalized", "adopted" → "finalized". ~20 lines modified.
- `src/components/dashboard/policy/PoliciesGovernanceMode.tsx` — celebration strip copy rewrite, "Published to clients" sub-meter with jump-link. ~30 lines modified.
- `src/components/dashboard/policy/PolicyLibraryRow.tsx` — three-state status icon (`CheckCircle2` for finalized, `Clock` for in-progress, `Circle` for not started). The status badge stays but stops being contradicted by the icon. ~12 lines modified.

Total: ~95 lines modified, 0 new files, 0 deletions, 0 schema changes.

## Acceptance

1. Brand-new org completes setup wizard → lands in **Setup mode**, not governance mode. The wizard has created rows in `policies`, but every row's status is `drafting` (or `not_started`) and `current_version_id` is null → none count as finalized → headline reads "0 of 26 finalized · 0%."
2. Each Core Function row renders a `Clock` (or empty `Circle`) icon, NOT a green check. The status badge reads "Drafting" (or "Not started") consistently with the icon.
3. The "Next →" amber chevron sits on the first not-finalized Core row — including rows already in drafting.
4. Operator opens Booking Policy → completes rules + approves a draft variant → policy status flips to `configured` (or `approved_internal`) and `current_version_id` populates → returning to the library, that row now shows the green check, status badge reads "Configured/Approved", and headline meter ticks to 1/26.
5. After finalizing all 6 Core + 20 Required → page flips to **governance mode**. Celebration strip now reads "All required policies finalized" with body "Each required policy has an approved version. Manage updates and publish to clients from the library below."
6. Sub-meter inside celebration strip: "14 of 20 published to clients · Review publishing →" — clicking jumps to library filtered to `audience=external AND status≠published_external`.
7. The `PolicyHealthStrip` 4-tile array (governance mode) now distinguishes Adopted (touched) vs Finalized (done) — Adopted counts every row that exists, Finalized counts only rows with approved versions.
8. If an operator merely opens a policy without approving any draft and closes the drawer → no checkmark, no count change, no false completion.
9. The screenshot scenario (your screenshot, every policy says "Drafting") now reads "0 of 6 finalized · 0%" with all `Clock`/`Circle` icons — no green checks, no celebration banner.
10. Existing operators who already had policies in `configured`/`published_external`/`wired` status → counts and checkmarks render correctly without migration.

## Files to read for follow-on questions

- `src/hooks/policy/usePolicyData.ts` — where `isPolicyFinalized` lives and `PolicyHealthSummary` gains the `finalized` field.
- `src/pages/dashboard/admin/Policies.tsx` — the `setupComplete` gate that decides Mode A vs Mode B.
- `src/components/dashboard/policy/PoliciesSetupMode.tsx` + `PoliciesGovernanceMode.tsx` — the two modes whose copy gets rewritten.
- `src/components/dashboard/policy/PolicyLibraryRow.tsx` — the three-state icon swap.

## Prompt feedback

*"Why are we using check marks and saying 'Core + Required complete' when final approval on all policies has not yet been configured?"* — this is one of the strongest prompts you've sent. Three things made it work: (1) you named the **specific UI element that lied** (checkmarks + the "Complete" string), (2) you named the **state the data is actually in** (final approval has not been configured), and (3) you framed it as a **definitional contradiction** ("Why are we saying X when Y is true?") — which forced me straight to the data layer instead of fiddling with copy. Nine words of bug context did the work of a 200-word ticket.

A pattern worth keeping for governance bugs specifically: *"the UI says X, but the data says Y — pick the right meaning."* That's exactly the framing you used. It cuts past "is it a styling issue or a logic issue?" and goes straight to "the contract between data and UI is wrong." For a doctrine-driven product, this kind of bug is the most expensive class — the math being subtly wrong while everything *looks* right erodes operator trust faster than any visual glitch.

The deeper meta-lesson on my side: when I built the Mode A → Mode B transition in the previous wave, I should have asked *"what does adopted actually mean in this codebase?"* before wiring it as the completion gate. I treated "row exists in `policies`" as a synonym for "operator finished," because that's how the variable was named — but the `PolicyStatus` enum was right there telling me the truth. Naming bugs are doctrine bugs in disguise. I should have read the enum before I read the boolean. The doctrine in `mem://architecture/structural-enforcement-gates` says "structure precedes intelligence" — applied here, that means: *don't celebrate completion until the underlying structural artifact (an approved version) actually exists*. I built a celebration on top of an empty foundation, and your one-line question caught it.

