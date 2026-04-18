

## Loader infrastructure — three test/governance hardening items

### 1. Selector snapshot test (regression insurance)
Add a snapshot assertion for the resolved `no-restricted-syntax` rule config so any future "harmless refactor" of the selector string fails CI loudly instead of silently neutering enforcement.

**Implementation:**
- Extend `src/test/lint-rule-loader2.test.ts` with a third test: `it('selector config matches snapshot', ...)`.
- Resolve via `eslint.calculateConfigForFile('src/components/ui/BootLuxeLoader.tsx')` (any real file under the rule).
- Assert: `expect(config.rules['no-restricted-syntax']).toMatchSnapshot()`.
- Snapshot lives at `src/test/__snapshots__/lint-rule-loader2.test.ts.snap` — committed, reviewed on change.

**Why this catches the bug we hit:** the original `:not(:has(JSXElement))` clause was syntactically valid but semantically wrong. A snapshot would have flagged that the selector changed and forced a human review.

### 2. Escape-hatch fixture (documented override is tested)
Add a third fixture proving `// eslint-disable-next-line no-restricted-syntax` actually silences the rule as documented. Otherwise the doctrine's escape hatch is unverified.

**Implementation:**
- Create `src/test/lint-fixtures/loader2-escape-hatch.tsx`:
  ```tsx
  import { Loader2 } from 'lucide-react';
  export function EscapeHatchLoader() {
    return (
      <div>
        {/* eslint-disable-next-line no-restricted-syntax -- TEST: verify inline override works */}
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }
  ```
- Add a fourth test: lint this file, assert zero `no-restricted-syntax` messages.
- Note: the file-level `/* eslint-disable */` in `loader2-allowed.tsx` is too broad to test the inline directive specifically — this fixture uses ONLY the inline form.

### 3. Wave 2 sweep + promote rule to `error` (deferred, gated)
The `warn`-level rule today is enforcement theater — real `Loader2` leaks slip through CI as warnings. Promotion to `error` requires the Wave 2 sweep to land first (~150+ existing usages would otherwise red-flood CI on first commit).

**This wave (now):**
- Add a `// TODO(wave-2): promote to 'error' after sweep` comment above the rule severity in `eslint.config.js` so the deferral is discoverable in-code, not just in a memory file.
- Register the deferral in `mem://architecture/visibility-contracts.md` Deferral Register (per the existing Core rule on deferred infrastructure requiring a revisit trigger).
  - Trigger condition: "Wave 2 Loader2 sweep complete and `grep -rn 'Loader2' src/` returns only button-context hits."

**Next plan (separate):** the Wave 2 sweep itself — audit table, replacements, then the one-line promotion.

### Sequencing
1. **Now:** ship #1 (snapshot) + #2 (escape-hatch fixture) + the deferral marker from #3. All zero-risk, pure infrastructure.
2. **Wave 2 plan:** the actual sweep + promotion. Already on the docket — this just records the gate.

### Files touched
- `src/test/lint-rule-loader2.test.ts` (extend)
- `src/test/lint-fixtures/loader2-escape-hatch.tsx` (new)
- `src/test/__snapshots__/lint-rule-loader2.test.ts.snap` (auto-generated on first run)
- `eslint.config.js` (add TODO comment above severity)
- `mem://architecture/visibility-contracts.md` (Deferral Register entry)

### Out of scope
- No Wave 2 sweep execution.
- No actual promotion to `error` (gated on sweep).
- No changes to loader runtime, cooldown, fade, or primitives.

### Verification
- After #1: run `vitest run src/test/lint-rule-loader2.test.ts` → 4 tests pass, snapshot file created. Manually tweak the selector → snapshot test fails. Restore → passes.
- After #2: escape-hatch fixture lints clean (0 errors). Remove the inline directive in a scratch edit → lint produces 1 error. Restore → 0 errors.
- After #3: `grep -n "TODO(wave-2)" eslint.config.js` returns the marker; Deferral Register has the entry with explicit trigger.

### Prompt feedback
Sharp prompt — three suggestions that each close a *different* gap in the prior wave: regression detection (#1), undocumented behavior assertion (#2), enforcement reality vs. theater (#3). The pattern of "what we shipped is technically true but operationally hollow until X" is exactly the right post-ship critique frame.

One refinement: when stacking suggestions where one is gated on prior work (the `error` promotion needs Wave 2), call out the dependency explicitly ("#3 needs sweep first"). I inferred it, but explicit gating prevents me from misordering — and forces you to think about whether the gate is real or just inertia. In this case it's real (~150 existing leaks), so the gate stands.

