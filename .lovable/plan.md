

## Goal
Close the last three applicability gaps:
1. **PolicyHealthStrip "Adopted" KPI** — switch denominator to applicability-filtered required count so the health strip stops over-reporting.
2. **Wizard services step "Why hidden?" affordance** — quietly show how many policies each `offers_*` toggle hides/unlocks the moment the operator changes it.
3. **Library content audit** — add a `requires_minors` flag (mirrors the existing `serves_minors` profile flag) so future minor-consent policies inherit the same applicability lens.

## Investigation summary

### Gap 1: PolicyHealthStrip is showing inflated denominators
`usePolicyHealthSummary` (`usePolicyData.ts:199`) filters `library.recommendation === 'required' || 'recommended'` but **does not filter by profile applicability**. So a solo stylist who doesn't offer extensions sees `total_recommended` include 10 phantom extension policies — the "Adopted: 3/22" tile is structurally dishonest.

The Library page's progress chip already uses `useApplicableRequiredPolicies()` — but `PolicyHealthStrip` (rendered above it on the same page) still uses raw `summary.total_recommended`. Same view, two different denominators. Drift.

### Gap 2: Wizard services step has no live "what changes" feedback
The wizard already detects `false → true` flips (`expansionFlips`) and shows a "What changed" panel on the **review step**. But operators get **no feedback on the services step itself** when they toggle a flag off — they don't know that unchecking `offers_extensions` will hide 10 policies until two screens later (or never, if they don't reach review).

The current helper text is static (`"Unlocks extension-specific policy set (10 policies)"`) — it doesn't reflect their current state or the delta their toggle creates.

### Gap 3: Library content audit — minor-consent gap
Audited the seed migration:
- Only one explicit minor reference: `booking_policy` mentions "minors" in its description but is `required` for everyone (correct — booking rules apply to all orgs).
- `package_membership_policy` correctly uses `requires_packages` (note: `offers_memberships` profile flag exists but maps to the same library column today — acceptable for now).
- **No dedicated minor-consent policy exists yet**, but `serves_minors` is a profile flag and minor-consent policies are a known future addition (guardian consent, photo release for minors, etc.).
- **No `requires_minors` column on `policy_library`** — adding it now (with default `false`) preserves current behavior and unblocks future minor-specific policies without a second migration.

Same audit found `offers_memberships` profile flag has no library column either, but no membership-only policies exist in the seed yet — defer.

## Changes

### Change A: PolicyHealthStrip uses applicability-filtered counts
**File**: `src/components/dashboard/policy/PolicyHealthStrip.tsx`

- Change `Props` to no longer require the full `summary` for the Adopted tile's denominator. Instead, the strip itself calls `useApplicableRequiredPolicies()` internally for the Adopted tile.
- Keep `summary` prop for `configured/published/wired` tiles (those are not denominator-driven by required count — they show absolute counts of what's set up).
- Adopted tile selector becomes: `${applicable.adopted}/${applicable.total}` with subtitle `"of required for your business"` (was `"of recommended"` — more accurate, more reassuring).
- No change to `usePolicyHealthSummary` itself (other surfaces may still want the raw count for a "library coverage" gauge later).

**Why this scope**: the other three tiles (configured/published/wired) count *adopted* policies that have advanced through workflow stages — applicability filtering doesn't change their meaning. Only "Adopted X of Y" carries a denominator that needs profile-awareness.

### Change B: Live "Why hidden?" delta on services step
**File**: `src/components/dashboard/policy/PolicySetupWizard.tsx`

Replace the static helper string with a reactive count derived from `library` + `existingProfile` + `form` for each `offers_*` row:

- For each toggle, compute `currentMatched` (library entries that match the flag's `requires_*` column) — count required + recommended.
- Render a quiet inline helper that reflects the **current state of the toggle**:
  - When **off**: `"Hides 10 policies (8 required + 2 recommended) from your library"`
  - When **on**: `"10 policies active in your library"`
  - Color: muted by default; switches to `text-foreground` when state differs from `existingProfile` (visual cue that "you just changed this — here's what it means").
- Apply only to the three columns that actually exist on `policy_library` today: `offers_extensions`, `offers_retail`, `offers_packages`. The two flags without library columns yet (`offers_memberships`, `serves_minors`) keep their static helper but get a small `(coming soon)` label so we set the right expectation.

This satisfies the "silence vs. signal" doctrine — the count only appears when there's actual content gated on the flag.

### Change C: Add `requires_minors` column to `policy_library`
**Migration** (new file in `supabase/migrations/`):

```sql
ALTER TABLE public.policy_library
  ADD COLUMN IF NOT EXISTS requires_minors BOOLEAN NOT NULL DEFAULT false;
```

**Then update**:
- `src/hooks/policy/usePolicyOrgProfile.ts`:
  - `isApplicableToProfile` — add `if (entry.requires_minors && !profile.serves_minors) return false;`
  - `applicabilityReason` — add minors branch returning `{ service: 'minors', label: 'minors (under 18)' }`.
  - Update the `Pick<PolicyLibraryEntry, ...>` types to include `requires_minors`.
- `src/hooks/policy/usePolicyData.ts` `PolicyLibraryEntry` type — add `requires_minors: boolean`.
- `src/components/dashboard/policy/PolicySetupWizard.tsx` `expansionFlips` — extend the `flags` array with a `serves_minors` entry filtering on `requires_minors`.

No seed data change — no minor-specific policies exist yet, so the column is dormant infrastructure ready for the next library content wave.

### Change D: Doctrine memory update
Append to `mem://features/policy-os-applicability-doctrine.md`:
- Note that `requires_minors` joins `requires_extensions/retail/packages` as the fourth applicability dimension.
- Reaffirm: any new `offers_*` profile flag must ship paired with its `requires_*` library column **and** a branch in `isApplicableToProfile`/`applicabilityReason`/`expansionFlips`. Three places — checked together.

## Out of scope
- No `requires_memberships` column (profile flag exists but no library content gates on it; defer until a membership-only policy is authored).
- No new minor-specific seed policies (separate content wave).
- No change to `usePolicyHealthSummary` shape — other pages may consume it.
- No public center filtering changes — adopted policies still publish regardless of current profile (Wave 28.11.x decision stands).

## Files touched
- `src/components/dashboard/policy/PolicyHealthStrip.tsx` — applicability-filtered Adopted tile
- `src/components/dashboard/policy/PolicySetupWizard.tsx` — live delta helpers + minors expansion flip
- `src/hooks/policy/usePolicyOrgProfile.ts` — `requires_minors` branch in `isApplicableToProfile` + `applicabilityReason`
- `src/hooks/policy/usePolicyData.ts` — `PolicyLibraryEntry` type extension
- `supabase/migrations/{new}.sql` — add `requires_minors` column with safe default
- `mem://features/policy-os-applicability-doctrine.md` — fourth dimension + paired-shipping rule

## Sequencing
1. Migration first (column + default) so type regen has a target.
2. Hooks (`isApplicableToProfile`, `useApplicableRequiredPolicies`) inherit `requires_minors`.
3. PolicyHealthStrip swap (smallest UI change, biggest honesty payoff).
4. Wizard live deltas (highest UX leverage).
5. Doctrine memory close.

