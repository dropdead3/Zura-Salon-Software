

## Goal
Three small governance + discoverability improvements:
1. **CI lint step** — add `bun run lint` alongside `bun run test` so style/import drift fails the build.
2. **Doctrine promotion** — move the policies-applicability rule into the Core section of `mem://index.md` so it's applied every loop without discovery.
3. **Dev-only lint surface** — a platform-admin-gated `/dashboard/_internal/policy-lint` page that runs `runPolicyLibraryLint` against live seed and renders failures inline.

## Investigation

### Gap 1: CI workflow
Current `.github/workflows/test.yml` runs `bun install --frozen-lockfile` + `bun run test`. Adding a `lint` step is a one-line addition. Decision: run lint **after** test so a green test still surfaces style drift in the same CI run (vs `&&` short-circuit). Use `continue-on-error: false` (default) — drift is drift.

One subtlety: `eslint .` may flag pre-existing warnings in the codebase that aren't related to this wave. Need to verify locally that `bun run lint` is currently clean. If it's not, the CI step would immediately fail on unrelated debt — bad first impression. **Mitigation**: I'll inspect `package.json` and check if there's an existing lint baseline, but won't fix unrelated lint debt in this wave. If lint is currently dirty, I'll either (a) defer the CI wiring with a note, or (b) add `--max-warnings 0` only after a separate cleanup pass. Plan assumes lint is clean; if not, will surface and ask.

### Gap 2: Index promotion
Current `mem://index.md` has the doctrine listed only in `Memories`:
> `[Policy OS Applicability](mem://features/policy-os-applicability-doctrine) — Required-policy counters/gauges/nudges must filter through isApplicableToProfile against policy_org_profile`

The Core section already holds one-liner rules applied to every action. The applicability doctrine now has a four-anchor paired-shipping rule (profile column + library column + applicability branch + lint rule) that should fire on every new `requires_*` flag. Promoting it to Core is correct.

Core line proposal (under ~150 chars):
> Policy applicability: new `requires_*` flags ship paired across 4 anchors — library column + isApplicableToProfile + wizard helper + lint rule.

Keep the Memories entry for the deeper context.

### Gap 3: Dev-only lint surface
**Route**: `/dashboard/_internal/policy-lint` — matches existing internal-tooling convention (`/dashboard/_internal/spatial-audit` per Core memory).

**Gating**: Platform admins only. Use `requireAnyPlatformRole` on `ProtectedRoute` (per `src/components/auth/ProtectedRoute.tsx`) — same pattern as other internal tools. Org-level admins should NOT see this; it's content-author / dev tooling.

**Implementation**:
- New page `src/pages/dashboard/_internal/PolicyLintPage.tsx`.
- Fetches `policy_library` rows directly via supabase client (RLS-safe; platform admin bypasses).
- Calls `runPolicyLibraryLint(rows)` from `src/lib/policy/lint-rules.ts`.
- Renders:
  - Header: row count + pass/fail summary tile
  - If clean: empty-state ("All N library entries pass lint rules. Last checked HH:MM.")
  - If failures: grouped by rule ID, each failure shown as a row with `[lib:key] (rule-id) message` — monospace for machine readability
- "Re-run" button to refetch and re-lint without page reload.

**Route registration**: Add to the existing `_internal` route group in `App.tsx` (or wherever the spatial audit route lives — will check).

**Doctrine link**: Add a `<Link>` from the page back to the doctrine memory file path as a comment / dev note, so future devs can find the rule definitions.

**Out of scope**: 
- No mutation surfaces (read-only lint runner).
- No notification integration (silence over noise — this is a discovery surface, not an alert source).
- No scheduled runs (CI handles automation; this is for ad-hoc inspection).

## Changes

### Change A: CI lint step
**File**: `.github/workflows/test.yml`
- Add `- run: bun run lint` after the existing `bun run test` step.
- Quick local check first that lint is currently clean; if dirty, defer with a note rather than red-CI on first push.

### Change B: Index promotion
**File**: `mem://index.md`
- Append one Core line for policy applicability four-anchor rule (under 150 chars).
- Leave Memories entry intact (deeper context).

### Change C: Internal lint page + route
**New file**: `src/pages/dashboard/_internal/PolicyLintPage.tsx`
- Tanstack Query fetch of `policy_library` rows.
- Calls `runPolicyLibraryLint`.
- Renders summary tile + failure list.
- Re-run button via `queryClient.invalidateQueries`.
- Uses `DashboardPageHeader` per UI canon, `tokens.empty.*` for clean state, `tokens.loading.*` for fetch.

**File edit**: route registration (location TBD — likely `src/App.tsx` or a route fragment file; will inspect).
- Wrap with `<ProtectedRoute requireAnyPlatformRole>`.

## Files touched
- `.github/workflows/test.yml` — add lint step (conditional on lint cleanliness)
- `mem://index.md` — promote applicability doctrine to Core
- `src/pages/dashboard/_internal/PolicyLintPage.tsx` — new internal lint surface
- `src/App.tsx` (or equivalent route file) — register route gated to platform admins

## Sequencing
1. **B** first — pure memory write, instantly applies to next loop.
2. **C** — new page + route; biggest surface but isolated.
3. **A** last — verify lint cleanliness before wiring CI; defer if dirty.

