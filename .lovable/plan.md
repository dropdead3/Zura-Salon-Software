

## Two parallel tracks: loader leak fix (urgent) + test hardening (nice-to-have)

The user reports the **Z disco loader (ZuraLoader)** still appears during schedule load despite the unification work. That's the priority — the test refinements are secondary.

### Track A — Hunt down the remaining ZuraLoader leak (PRIORITY)

The unified loader chain says: `BootLuxeLoader` for boot/Suspense/auth, `DashboardLoader` for in-app sections. `ZuraLoader` should ONLY appear if a platform admin explicitly selected "zura" in `useLoaderConfig`. Yet the user sees it on schedule load.

Three possible root causes — investigation needed before plan execution:

1. **Direct `<ZuraLoader />` import** somewhere in the schedule load path (route shell, ProtectedRoute, OrganizationContext bootstrap, schedule route component, or a child mounted during load). Bypasses the unified chain entirely.
2. **`useLoaderConfig` defaulting wrong** — if `branding.loader_style` resolves to `'zura'` for this org's platform branding, then `DashboardLoader` is correctly rendering Zura per config. Either (a) the branding is genuinely set to zura and that's a config issue, or (b) there's a fallback path that picks zura when branding hasn't loaded yet.
3. **Stacking sequence** — `BootLuxeLoader` paints during auth/Suspense, then `DashboardLoader` mounts with zura config, and the user perceives both as "two different loaders" even though both are correct.

**Investigation plan (read-only, before execution plan):**
- `grep -rn "ZuraLoader" src/` — find every direct import outside `DashboardLoader.tsx` and the loaders barrel.
- `grep -rn "from '@/components/ui/ZuraLoader'" src/` — direct primitive imports.
- Read schedule route entry, `ProtectedRoute`, `OrganizationContext`, and any Suspense boundary in the schedule load chain.
- Check `usePlatformBranding` to see what `loader_style` returns when branding hasn't loaded yet (likely undefined → falls through to `'luxe'` default, but verify).
- Verify the schedule page's loading skeletons aren't using `ZuraLoader` directly.

**Execution plan (after investigation):**
- Replace any direct `ZuraLoader` imports in the schedule load path with `DashboardLoader` (which respects branding config and defaults to luxe).
- If `useLoaderConfig` has a race where `branding.loader_style` momentarily returns `'zura'` before the real value loads, force a luxe fallback during the unloaded state.
- Confirm only one loader element renders from cold-load to first paint.

### Track B — Test refinements (after Track A lands)

#### B1. Isolate selector in snapshot
Change `expect(config.rules['no-restricted-syntax']).toMatchSnapshot()` to `expect(config.rules['no-restricted-syntax'][1].selector).toMatchSnapshot()`. Severity change in Wave 2 won't trigger noisy diff; only selector regressions will.

Update `src/test/__snapshots__/lint-rule-loader2.test.ts.snap` accordingly (regenerate by deleting the existing snapshot block).

#### B2. Negative escape-hatch test
Create `src/test/lint-fixtures/loader2-wrong-disable.tsx`:
```tsx
import { Loader2 } from 'lucide-react';
export function WrongDisableLoader() {
  return (
    <div>
      {/* eslint-disable-next-line @typescript-eslint/no-unused-vars -- wrong rule name */}
      <Loader2 className="w-4 h-4 animate-spin" />
    </div>
  );
}
```
Add a fifth test asserting the `no-restricted-syntax` violation **still fires** despite the unrelated disable comment. Confirms ESLint's directive is rule-scoped.

#### B3. CODEOWNERS gate on snapshot file
Add to `.github/CODEOWNERS` (create if absent):
```
src/test/__snapshots__/lint-rule-loader2.test.ts.snap @<user-handle>
eslint.config.js @<user-handle>
```
**Blocker:** I don't know the user's GitHub handle or whether CODEOWNERS is already in use. Will need to ask before writing.

### Sequencing
1. **Now (Track A only):** investigate + fix the ZuraLoader leak. This is the visible regression.
2. **Next plan (Track B):** test refinements — bundle B1 + B2; defer B3 pending CODEOWNERS clarification.

### Out of scope for this plan
- Wave 2 sweep itself (still its own future plan).
- Any change to loader visual primitives or cooldown timing.
- Telemetry hook (still deferred).

### Verification
- Track A: cold-reload `/org/drop-dead-salons/dashboard/schedule` with throttled network. Only one loader element appears from auth gate through first paint. No Z disco grid unless platform branding explicitly selects "zura".
- Track B (next plan): snapshot file shows only the selector string. Negative fixture produces 1 lint error. CODEOWNERS file requires review on snapshot changes.

### Prompt feedback
Strong prompt — three sharp test refinements PLUS a critical bug report bundled together. The bundling is fine here because the bug is in the *same domain* (loaders) the test refinements protect. But for future prompts: when a user-visible regression and infrastructure polish land in the same message, lead with the regression so I prioritize correctly. You did this implicitly by putting the loader complaint last (most recent = most important), but explicit framing ("priority: still seeing Z loader. also: three test polish ideas") makes the ordering unambiguous and prevents me from spending the first half of the plan on snapshots while the visible bug sits.

