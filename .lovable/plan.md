

## Goal
Close the last applicability drift surfaces:
1. **Per-category coverage drift** — `usePolicyHealthSummary.by_category` ignores profile applicability, so `PolicyCategoryCard` ("Extensions: 0/10") still shows phantom totals for operators who don't offer that service.
2. **Hidden-chip legibility** — the "Hiding N policies" banner doesn't tell operators *which* services are causing the hiding. One-glance breakdown by reason.
3. **Author drift guard** — a dev-time linter for `policy_library` content rules so future content waves can't ship a `requires_minors=true` policy that wasn't actually authored as a minors policy.

## Investigation summary

### Gap 1: `by_category` denominator drift
`usePolicyHealthSummary` (lines 199-218) computes `by_category[cat].total` from `recommendedLibrary` with **no profile filter**. The "By category" grid on the Policies page renders `Extensions 0/10` even for solo stylists who don't offer extensions — same dishonesty pattern we just fixed in PolicyHealthStrip. Numerator (`adoptedCount`) is fine because adopted policies always belong to the operator.

The Extensions category is the loudest case, but the same drift applies anywhere a category is dominated by gated policies (future minors-heavy or membership-heavy categories).

### Gap 2: Hidden-chip is opaque
Current copy: `"Hiding 10 policies that don't apply to your business profile."`

Operators with `serves_minors=false` AND `offers_extensions=false` see one number with no breakdown. Doesn't help them confirm "yes, that matches what I told you" — they have to trust the count blindly.

`applicabilityReason` (added last wave) already returns `{ service, label }` per entry — perfect input. We just need to group/count.

### Gap 3: Linter scope
Dev-time only — never runs in prod. Two reasonable homes:
- **A**: A vitest test (`src/__tests__/policy-library-content.test.ts`) that fetches the library and asserts content rules.
- **B**: A standalone script (`scripts/lint-policy-library.ts`) invoked on demand.

I recommend **A** — it runs in the existing test pipeline (no new infra), fails CI on author drift, and lives next to the doctrine it enforces. No DB CHECK constraints (forbidden by doctrine for time/content-validation logic).

Rules to assert (extensible):
- `requires_minors=true` → must be `category='client'` AND `why_it_matters` must contain "minor", "guardian", or "under 18" (case-insensitive).
- `requires_extensions=true` → must be `category='extensions'` (already true today; lock it in).
- `requires_retail=true` → audience may be `internal`, `external`, or `both`; no category lock (retail can sit in `client` or `financial`).
- `requires_packages=true` → must mention "package", "membership", or "subscription" in title or `why_it_matters`.
- One blanket rule: any entry with **two or more** `requires_*` flags set is structurally suspicious — an authoring drift signal — and must include an explanatory comment in `why_it_matters` mentioning both services.

## Changes

### Change A: Profile-aware `by_category` totals
**File**: `src/hooks/policy/usePolicyData.ts`

Two-step refactor — preserve the existing function signature, add an optional profile-aware mode:

1. Modify `usePolicyHealthSummary` to accept `usePolicyOrgProfile()` internally. (No props change — it already pulls from React Query; adding one more query keeps the API stable.)
2. Filter `recommendedLibrary` through `isApplicableToProfile(l, profile)` *before* the `by_category` reduction.
3. Also filter `total_recommended` for consistency with the strip — this is the same logic the strip already does via `useApplicableRequiredPolicies()`, but now the summary itself is honest so any future consumer (audit reports, Command Center tile) inherits it.

Edge cases:
- Profile not yet loaded → fall back to unfiltered library (silence over wrong number — matches `isApplicableToProfile`'s null-profile contract).
- Profile says no flags set → all policies remain (correct — no service constraints means no filtering).

`adopted` count stays unchanged (already accurate — operator chose what to adopt).

### Change B: Reason-grouped hidden chip
**File**: `src/pages/dashboard/admin/Policies.tsx` (lines 220-234, the hidden banner block)

Replace the existing single-sentence chip with grouped breakdown:

```text
Hiding 10 policies: 8 extensions · 2 minors. Edit profile
```

Implementation:
- Inside the existing `hiddenByProfile` memo derivation, also compute `hiddenByReason: Record<service, count>` using `applicabilityReason(l, profile).service` as the key.
- Render service segments as small inline chips separated by `·` middle dots. Each segment uses `font-sans text-xs text-foreground/80` (slightly stronger than the surrounding muted copy so the breakdown reads as the data point).
- Keep "Edit profile" button intact.
- If only one reason exists, drop the colon segment ("Hiding 8 extensions policies. Edit profile") — silence over redundancy.

No new icons (keep it text-first; matches the calm UX doctrine). Service labels come from `applicabilityReason().label` so they stay in sync with future flags.

### Change C: Library content linter
**New file**: `src/__tests__/policy-library-content.test.ts`

Vitest suite that:
1. Reads the library via the public `usePolicyLibrary` query path (or a direct `supabase.from('policy_library').select('*')` in a test wrapper — TBD on confirming test infra; the project may already have a Supabase test client).
2. Iterates entries and asserts the rules listed in Gap 3 investigation.
3. Each violation produces a precise failure message: `[lib:extension_aftercare_policy] requires_minors=true but category='extensions' (expected 'client')`.

Single source of truth for the rule table — exported as `POLICY_LIBRARY_LINT_RULES` so it can later be reused by:
- A pre-seed script when content waves add new rows
- An admin-side dev-only badge on the Library page (out of scope for this wave, but designed into the API)

Rules table (concrete starting set):

| Rule ID | Trigger | Assertion |
|---|---|---|
| `minors-category` | `requires_minors=true` | `category === 'client'` |
| `minors-rationale` | `requires_minors=true` | `why_it_matters` matches `/minor\|guardian\|under 18/i` |
| `extensions-category` | `requires_extensions=true` | `category === 'extensions'` |
| `packages-rationale` | `requires_packages=true` | `title` or `why_it_matters` mentions "package", "membership", or "subscription" |
| `multi-flag-rationale` | 2+ `requires_*` flags | `why_it_matters` is non-null and >40 chars |

Today the suite passes on the seed (no `requires_minors` rows yet, all `requires_extensions` rows are in `extensions` category). It exists as a tripwire — first failing assertion will be when someone seeds a misclassified policy in a future content wave.

### Change D: Doctrine memory append
**File**: `mem://features/policy-os-applicability-doctrine.md`

Append the linter rule to the doctrine — make it explicit that:
- Content rules live in `POLICY_LIBRARY_LINT_RULES` (single source).
- Adding a new `requires_*` flag now has a **fourth** paired-shipping requirement: a linter rule entry. So new flag = profile column + library column + applicability branch + lint rule. Four places, checked together.

## Out of scope (defer)
- Admin-side surfacing of lint failures (dev-only test is enough until content waves restart).
- Per-category "applicable" badge on `PolicyCategoryCard` itself (totals will silently self-correct after Change A — no UI change needed).
- Migrating the lint rules into a SQL trigger (doctrine forbids time/content CHECK constraints; tests are the right home).
- New `requires_memberships` column — same defer as last wave; no library content gates on it yet.

## Files touched
- `src/hooks/policy/usePolicyData.ts` — `usePolicyHealthSummary` profile-aware filter for `by_category` and `total_recommended`
- `src/pages/dashboard/admin/Policies.tsx` — reason-grouped hidden chip (lines 113-116 memo extension, lines 220-234 banner JSX)
- `src/__tests__/policy-library-content.test.ts` — new linter suite + exported `POLICY_LIBRARY_LINT_RULES`
- `mem://features/policy-os-applicability-doctrine.md` — append linter as the fourth paired-shipping anchor

## Sequencing
1. **A** first — biggest honesty fix, smallest surface area, unblocks the whole "By category" grid.
2. **B** — quick UX layer over A's accurate data.
3. **C + D** together — close the doctrine loop. Tests confirm the existing seed is clean before the suite ships, so first run is green.

