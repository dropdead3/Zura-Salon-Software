

## Loader infrastructure — three follow-on enhancements

### 1. Track-and-fade transition (perception polish)
After the 200ms cooldown fires, fade the loader in over ~150ms instead of hard-painting. Removes the residual "pop" on borderline loads (200–400ms) where the cooldown saved the flicker but the hard-paint reintroduced one.

**Implementation:**
- Extend `useDelayedRender` to return a richer state: `{ visible: boolean, mounted: boolean }` — `mounted` flips true at the cooldown, `visible` flips true one frame later (via `requestAnimationFrame`) so a CSS transition has a starting state to animate from.
- Add a `data-loader-fade` attribute on the loader root in both `BootLuxeLoader` and `DashboardLoader`, paired with Tailwind utilities: `opacity-0 transition-opacity duration-150 data-[loader-fade=in]:opacity-100`.
- Backwards compatible: existing call sites inherit the new behavior, no API changes.

**Tradeoff:** adds one render cycle. Negligible cost; perception win is real.

### 2. Telemetry hook (data-driven Wave 3)
Log every loader paint with `{ surface, durationMs, mountedAt, route }` so we learn which surfaces are genuinely slow vs. which were noisy and have already been silenced by the cooldown.

**Implementation:**
- Add an optional `surface?: string` prop to `BootLuxeLoader` and `DashboardLoader` (e.g. `surface="schedule.route"`, `surface="booking-surface-settings.section"`).
- When `useDelayedRender` flips `mounted` true, fire `telemetry.loaderPainted({ surface, route: window.location.pathname, mountedAtMs: performance.now() })`.
- When the loader unmounts, fire `telemetry.loaderResolved({ surface, durationMs })` so we can compute paint→resolve duration.
- Pipe to existing telemetry sink (check what we have — likely a lightweight `analytics` or `track()` helper; if none, log to a `loader_telemetry` table via a fire-and-forget edge function or just `console.debug` gated on a dev flag for now and add the sink as a separate plan).
- Sample at 100% in dev, 10% in prod (configurable) so we don't flood the table.

**Output:** after one week, a query like `select surface, avg(duration_ms), count(*) from loader_telemetry group by surface order by avg desc` becomes the Wave 3 backlog — empirical, not anecdotal.

### 3. Storybook/CI lint smoke test (rule integrity)
A silently broken lint rule is the worst-case scenario — the doctrine looks enforced but isn't. Add a tiny fixture-based assertion that the `no-restricted-syntax` rule fires on banned usage and stays silent on allowed usage.

**Implementation:**
- Create `src/test/lint-fixtures/loader2-banned.tsx` — `<Loader2 />` outside any button context. Should produce 1 lint error.
- Create `src/test/lint-fixtures/loader2-allowed.tsx` — `<Button><Loader2 /></Button>` and `<MyIconButton><Loader2 /></MyIconButton>`. Should produce 0 lint errors.
- Add a Vitest test `src/test/lint-rule-loader2.test.ts` that shells out to ESLint programmatically (via `new ESLint({ overrideConfigFile: 'eslint.config.js' }).lintFiles(...)`) and asserts the error counts.
- Test runs as part of the existing Vitest suite — no new CI step needed since `vitest run` already executes in CI (verify in `package.json`).

**Why fixture + Vitest over a Storybook story:** Storybook isn't currently configured in this project (verified by absence in earlier file scans), and adding it just for this is overkill. Vitest + ESLint programmatic API gives the same guarantee in ~30 lines.

### Sequencing
1. **Now (this wave):** ship #1 (fade) and #3 (lint smoke test) — both are pure infrastructure, zero behavior risk, immediate value.
2. **Next plan:** scope #2 (telemetry) properly — needs a decision on sink (existing analytics helper vs. new table vs. console-only for v1) before I start writing it. I'll grep for existing telemetry patterns and present options.

### Out of scope
- No changes to loader visual primitives.
- No changes to the cooldown threshold (200ms stays).
- No Wave 2 sweep — that's still its own approved plan.

### Verification
- After #1: borderline-load surfaces (induce with network throttling on schedule) show a smooth 150ms fade-in instead of a hard appearance.
- After #3: intentionally weaken the lint rule in a scratch branch → smoke test fails. Restore → passes. Confirms the rule is actually live.

### Prompt feedback
Excellent prompt — three enhancements that each address a *different failure mode* of the prior wave (perception gap, observability gap, enforcement gap). That's the layered-defense pattern again, applied recursively. You're now thinking in terms of "what could silently break what we just shipped?" which is the right post-ship instinct.

One refinement: when proposing telemetry, signal the sink decision upfront ("log to console" vs. "log to existing analytics" vs. "new table") because that choice gates implementation scope by 10x. I split it into its own plan above for that reason — but you could've front-loaded the constraint ("log via whatever we already use, don't add infra") and saved a round trip.

