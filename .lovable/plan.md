

## Prompt review

Good instinct — periodic audit passes prevent technical debt from compounding. However, "any gaps, errors, bugs and enhancements" is too broad to action well. A 50K-line codebase will surface hundreds of findings at that scope, and without ranking criteria the audit becomes noise.

**Better framing for next time:** anchor audits to a specific axis with a leverage marker. Examples:
- "Audit for P0/P1 bugs blocking user flows" (correctness)
- "Audit recent waves (6-9) for regressions or doctrinal drift" (consistency)
- "Audit for security/RLS gaps in newly-touched tables" (risk)
- "Audit for the top 5 highest-leverage enhancements given current adopter count" (forward motion)

Each produces a tighter, more decision-ready output. I'll structure this audit using all four axes in parallel, with explicit ranking, so you get the breadth you asked for without losing actionability.

## Plan — Wave 10: Multi-Axis Audit Pass

**Read-only this wave.** Output is a ranked findings register, not code changes. Each finding gets a leverage marker + recommended wave assignment so you can approve them individually.

### Phase 1: Baseline health checks *(leverage: catches regressions before they become incidents)*

1. **Lint baseline delta** — re-run mental grep against `DEBUG_LOG.md` baseline (1199 problems, 1100 errors). Has Wave 1-9 work moved the needle? Sample 3-4 recently-touched files for new lint introductions.
2. **Test suite scope** — `DEBUG_LOG.md` shows `2 files, 7 tests`. Catalog what's tested vs what's been added since Wave 3 (Visibility Contract bus, audit hook, 10 adopter components). Identify highest-risk untested surfaces.
3. **Build artifact check** — review `code--read_console_logs` and dev-server log for current warnings/errors.

### Phase 2: Doctrinal consistency sweep *(leverage: locks in waves 4-9 doctrine before drift)*

4. **Visibility Contract adopter audit** — re-grep all 10 adopters against the Wave 8 taxonomy. Verify:
   - Reasons are kebab-case from canonical taxonomy
   - Payloads contain actual numbers (not booleans)
   - Source strings match component names in kebab-case
5. **Deferral Register status check** — for each Wave 9 deferral (ESLint rule, devtool panel, audit-comment grep), check whether the trigger condition has cleared since documentation.
6. **Memory/code drift** — spot-check 2-3 high-traffic memory files (e.g., `mem://architecture/visibility-contracts.md`, `mem://tech-decisions/high-concurrency-scalability.md`) against actual code patterns.

### Phase 3: Bug & gap reconnaissance *(leverage: surfaces P0/P1 issues invisible from preview)*

7. **`DEBUG_LOG.md` open queue review** — Waves 2-5 in the "Next Debug Queue" section were never executed:
   - Wave 2: silent data fallbacks in points services
   - Wave 3: loading/error UI in `ManagementHub`, `Stats`, leaderboard
   - Wave 4 (debug doc): route-level lazy loading
   - Wave 5 (debug doc): expanded permission guard tests
   Confirm whether these are still valid or superseded.
8. **High-traffic surface inspection** — read `App.tsx`, `OrganizationContext.tsx`, `AuthContext.tsx` for any TODO/FIXME, suspicious `as any` casts, or auth race patterns.
9. **Edge function smoke check** — list `supabase/functions/` directory; flag any function without a corresponding test or with stale `deno.lock` issues per the troubleshooting context.

### Phase 4: Enhancement candidates *(leverage: forward motion options ranked by ROI)*

10. **Top 5 enhancements** identified during phases 1-3, each with:
    - Leverage marker
    - Doctrinal anchor (which doctrine it serves)
    - Estimated scope
    - Deferral trigger if not chosen now

## Output format

A single ranked findings register with this structure:

```
## P0 (block ship)
- [finding] · [leverage] · [recommended wave]

## P1 (ship-blocking within 3 waves)
- ...

## P2 (enhancement candidates, defer-trackable)
- ...

## Confirmed clean (no action)
- ...
```

Each finding includes file path(s) so the next wave can act mechanically.

## Acceptance checks

1. All 4 phases executed; no phase skipped silently
2. Each finding has a P0/P1/P2 ranking with explicit leverage marker
3. Memory/code drift findings cite both the memory file and the code file
4. Open `DEBUG_LOG.md` queue items are explicitly resolved (still valid / superseded / done)
5. Top 5 enhancement candidates each carry a deferral trigger condition
6. Output fits in one register — no separate documents
7. No code changes this wave — pure research output

## Files to read (read-only)

- `DEBUG_LOG.md` (full)
- `mem://architecture/visibility-contracts.md`, `mem://index.md`
- `src/App.tsx`, `src/contexts/AuthContext.tsx`, `src/contexts/OrganizationContext.tsx`
- `src/components/auth/ProtectedRoute.tsx` and its test file
- All 10 Visibility Contract adopter components (re-verify post-Wave 8)
- `src/lib/dev/visibility-contract-bus.ts`, `src/hooks/dev/useVisibilityContractAudit.ts`
- `supabase/functions/` directory listing
- Dev-server log tail (`/tmp/dev-server-logs/dev-server.log`)
- `code--read_console_logs` for runtime errors

## Deferred (carried forward with trigger conditions)

- ESLint taxonomy rule — **trigger: 3rd domain adopts the bus** (unchanged from Wave 9)
- `VisibilityContractAuditPanel` UI — **trigger: ≥1 non-color-bar adopter** (unchanged)
- CI audit-comment grep — **trigger: 3rd undocumented audit query** (unchanged)
- Acting on any P1/P2 finding from this audit — **trigger: explicit approval per-finding next wave**

