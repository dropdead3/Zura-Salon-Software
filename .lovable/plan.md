

# Disambiguate "Adopted 26/26" vs the 50 they actually adopted

## What's confusing

The KPI tile reads **"Adopted 26/26 — of required for your business"**, but the operator just hit "Save and adopt" and got a toast saying **"Adopted 50 policies."** Two numbers, both true, but the tile reads as if 24 policies vanished.

The reason both numbers are correct:

- **50** = total policies they adopted (required + recommended + auto-applicable optionals).
- **26** = the *required* subset that applies to their declared business profile.

The KPI denominator is intentionally narrow — it's measuring **structural completeness against the required floor**, not total library coverage. That's the right metric to gate "are you compliant?" off. But the label **"Adopted"** with no qualifier reads as "total adopted across your library," which is the wrong mental model.

Net effect: an operator who completed setup perfectly looks at the strip and thinks *"why does it only show 26 when I just adopted 50?"* — which is the exact opposite of the reassurance the strip should provide.

## The fix

Two surgical copy changes to `PolicyHealthStrip.tsx`. Pure copy, zero logic.

### Edit 1 — Rename the tile label

**Before:** `Adopted`
**After:** `Required coverage`

"Required coverage" tells the operator at a glance that this tile measures *the required subset*, not total policies. It also pairs cleanly with the "26/26" ratio (coverage is naturally a ratio metric).

### Edit 2 — Sharpen the sub-line

**Before:** `of required for your business`
**After:** `required policies adopted (you have N total in your library)`

Where `N` is the total count of adopted policies, pulled from `useOrgPolicies().length` (already imported indirectly via the existing hook chain — we'd add a direct read in the strip component).

The shape:
- **"required policies adopted"** — clarifies the 26/26 is a required-subset ratio, not a total.
- **"(you have N total in your library)"** — names the bigger number explicitly so the operator's "but I adopted 50" instinct is answered inline, not contradicted.

So the tile now reads:

> **REQUIRED COVERAGE**
> **26/26**
> required policies adopted (you have 50 total in your library)

Both numbers visible. Both make sense. No mental math.

## What stays the same

- The other three tiles (Rule sets defined, Live to clients, Wired to surfaces) — unchanged.
- `useApplicableRequiredPolicies` hook — unchanged. Its semantics (required-floor coverage) are correct; only the label was misleading.
- The KPI tile layout, icon, container styling — unchanged.
- The toast on "Save and adopt" — unchanged. "Adopted 50 policies" is accurate.

## Files affected

- `src/components/dashboard/policy/PolicyHealthStrip.tsx` — label string, sub-line string, one new hook call (`useOrgPolicies()`) to read the total adopted count.

That's the entire change surface. No new components, no new hooks, no token changes.

## Acceptance

1. The first tile reads **"Required coverage 26/26 — required policies adopted (you have 50 total in your library)"** for an operator who's adopted all required policies plus extras.
2. For an operator with partial coverage (e.g., 18/26 required, 32 total), the tile reads **"Required coverage 18/26 — required policies adopted (you have 32 total in your library)"**.
3. For an operator with zero adoption, the tile reads **"Required coverage 0/0 — required policies adopted (you have 0 total in your library)"** without crashing on the empty state.
4. No changes to the other three tiles or any other surface that consumes `useApplicableRequiredPolicies`.

## Doctrine compliance

- **Copy governance**: advisory-first, structured. The label names the metric ("Required coverage") instead of the action ("Adopted"), which removes the action/measurement confusion at the root.
- **Silence is meaningful → naming is meaningful**: the bug here was that the label *under-named* what the metric measured. Adding "Required coverage" makes the strip honest about its scope.
- **Persona scaling**: a solo operator and an enterprise operator both benefit — the solo operator no longer worries they lost 24 policies, and the enterprise operator gets a cleaner audit-ready label ("Required coverage" reads to a compliance reviewer the way "Adopted" doesn't).
- **Applicability doctrine intact**: the underlying `isApplicableToProfile` filter and the required-only denominator stay — that's the right metric, it just needed a label that matches its scope.

## Prompt feedback

"I saved and adopted 50. But this only shows I adopted 26 required policies. That's a bit confusing to the user." — strong prompt. You named the surface, the contradiction (50 in toast vs 26 in tile), and the user's likely misread, all in one sentence. The screenshot showed me exactly which tile and exactly what copy was misleading. I didn't have to guess scope.

One sharpener for next time: when two numbers in your UI disagree and you call it "confusing," telling me whether you want to **fix the label** (make the smaller number's scope explicit), **fix the math** (change what the tile measures), or **show both** (add the bigger number alongside) tells me which doctrine to optimize for. I went with **fix the label + show both** because the underlying math is correct and audit-meaningful (required-coverage is the right gate to reason against), but a one-line steer like "the math is right, just clarify it" or "the math is wrong" would save me the inference. For this one I'm confident — but for future "two numbers don't match" reports, that distinction is the fastest path to the right fix.

