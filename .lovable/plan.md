

## Loader infrastructure hardening — three enhancements

### 1. Lint rule: ban `Loader2` outside `<Button>` children
Add a custom ESLint rule (or `no-restricted-syntax` config) that flags any `Loader2` JSX usage **not** nested inside a `<Button>`, `<button>`, or component name matching `/Button$/`. This converts the doctrine into infrastructure — future `Loader2` leaks fail CI before merge.

**Implementation:**
- Extend `eslint.config.js` with a `no-restricted-syntax` rule targeting `JSXElement[openingElement.name.name='Loader2']` with an AST ancestor check.
- Allowlist: direct child of Button, button, or any component ending in `Button` / `IconButton`.
- Severity: `error`. Message: `"Loader2 is restricted to inline button spinners. Use <DashboardLoader /> for sections, <BootLuxeLoader /> for boot/Suspense gates."`
- Add an inline escape hatch (`// eslint-disable-next-line` with required comment explaining why) for the rare exception.

**Risk:** existing Wave 2 leaks (~150+) will all flash red until swept. Mitigation: ship the rule as `warn` first, do Wave 2 sweep, then promote to `error`.

### 2. Loader cooldown — 200ms delay before render
Wrap `DashboardLoader` and `BootLuxeLoader` with a `useDelayedRender(200)` hook. If the parent stops loading before 200ms elapses, no loader ever paints. Fast queries (the majority) become flicker-free; only genuinely slow loads (>200ms) trigger the visual.

**Implementation:**
- Create `src/hooks/useDelayedRender.ts` — `useEffect` + `setTimeout(setVisible(true), delay)`, cleanup on unmount.
- Apply inside `DashboardLoader` and `BootLuxeLoader` at the top: `if (!visible) return null;`.
- Make delay overridable via prop (`delay?: number`, default `200`). Pass `delay={0}` for cases where instant feedback is required (rare — e.g. user-triggered "Refreshing…" actions).

**Why 200ms:** below the human flicker-perception threshold (~250ms). Aligns with Nielsen's response-time research — anything resolving under 200ms feels instant, and showing a loader for it actively degrades perceived performance.

### 3. Wave 2 sweep — single approved batch with grep audit
Run a comprehensive audit and ship all replacements in one approved wave so the leak closes permanently rather than dripping over weeks.

**Audit step (read-only, before plan execution):**
- `grep -rn "Loader2" src/` — full inventory.
- Categorize each hit: (a) inline button spinner [keep], (b) section/page loader [replace with `DashboardLoader`], (c) tiny inline indicator inside a chip/badge [keep], (d) ambiguous [flag for review].
- Also grep direct primitive imports: `LuxeLoader`, `ZuraLoader`, `SpinnerLoader`, `DotsLoader`, `BarLoader` outside `DashboardLoader.tsx` and the loaders barrel itself.
- Produce a categorized table in the next plan: file path, line, category, proposed action.

**Sweep execution (after audit approval):**
- Replace category (b) with `<DashboardLoader />` + appropriate `fullPage` / `fillParent` prop.
- Replace direct primitive imports with `<DashboardLoader />`.
- Leave (a) and (c) untouched.
- Promote ESLint rule from `warn` to `error` as the final commit in the wave.

### Sequencing
1. **Now:** Ship hooks (cooldown) + ESLint rule as `warn` — zero behavior risk, immediate flicker reduction.
2. **Next plan:** Audit results table for Wave 2 sweep approval.
3. **Wave 2:** Execute sweep, promote rule to `error`.

### Out of scope
- No changes to loader primitive internals (LuxeLoader, ZuraLoader rendering).
- No changes to skeleton mode behavior.
- No retroactive changes to `Loader2` instances confirmed as inline button spinners.

### Verification
- After step 1: schedule load shows zero loader on fast cached navs, single `BootLuxeLoader` on cold loads.
- After step 3: `grep "Loader2" src/` returns only button-context hits; ESLint passes with rule at `error`.

### Prompt feedback
Strong prompt — three concrete, well-scoped enhancements with clear infrastructure thinking (lint = enforcement, cooldown = perception, sweep = closure). Each one has a different mechanism (compile-time, runtime, audit) which is exactly the right layered defense pattern.

One refinement for next time: when proposing multi-part enhancements, signal sequencing intent ("ship 1+2 now, gate 3 on audit" vs "all three in one wave"). I inferred the right sequence here, but explicit ordering removes ambiguity and lets me push back if the order has a hidden dependency.

