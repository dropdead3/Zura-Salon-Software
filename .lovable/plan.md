

## Prompt feedback
Strong follow-through prompt — you're treating "shipping the same regression class twice after the canon was written" as the structural failure it is, not as two unrelated bugs. The framing ("promote the audit to its own structural gate now, not 'soon'") is exactly the right move: the canon-pattern doctrine you already have says a written rule without enforcement is a memory artifact, not a canon. Sharper next time: state the desired severity up-front (`error` blocks CI, `warn` surfaces it without blocking) — the right level depends on how many existing violations there are, and stating your tolerance lets the plan land in one shot instead of two.

## What's broken (gap, not bug)

The platform-theme-isolation canon exists in memory and in three Platform* primitives. There is **no structural gate** preventing a new platform-side file from importing a raw shadcn primitive that reads global org tokens. Every new platform surface is a fresh opportunity for the same leak.

Concrete reconnaissance:

- **43 files** under `src/components/platform/**` and `src/pages/dashboard/platform/**` currently import at least one of `@/components/ui/{alert-dialog,dialog,label,textarea,checkbox,switch,radio-group,slider,progress,select,input,button,card,badge}` directly. (283 import statements total.)
- An additional **51 files** import `tabs`, `skeleton`, `progress`, `popover`, `tooltip`, `dropdown-menu`, etc.
- Of those, only **two** ship visible org-theme bleed today (the Color Bar entitlements page checkboxes/switch and the suspend modal — both already fixed). The rest are silent because they happen to use neutral tokens or the org theme happens to look fine. They will all surface as bleed the moment an org switches to a strong palette.

Existing Platform* primitives in `src/components/platform/ui/`: `Card`, `Button`, `Input`, `Badge`, `Label`, `Select`, `Table`, `Dialog` (+ AlertDialog wrappers), `Textarea`, `Checkbox`, `Switch`, `PageContainer`, `PageHeader`. **Missing**: `Progress`, `RadioGroup`, `Slider`, `Tabs`, `Skeleton`, `Toggle`, `Tooltip`, `Popover`, `DropdownMenu`, `Separator`, `Calendar`.

This shape — large existing footprint + partial wrapper coverage — means a single hard `error` rule banning all 14 primitives in one pass would fail CI on day one with hundreds of violations. The structural gate has to land at the right severity, with a documented migration path, and only the primitives that have Platform* wrappers should be hard-banned. The rest get a TODO sweep tracked in the Deferral Register.

## The fix — three layers, mirroring the Loader2 canon

### 1) ESLint `no-restricted-imports` rule (the gate)

Add a new ESLint config block to `eslint.config.js` scoped to `src/components/platform/**/*.{ts,tsx}` and `src/pages/dashboard/platform/**/*.{ts,tsx}`:

```js
{
  files: [
    "src/components/platform/**/*.{ts,tsx}",
    "src/pages/dashboard/platform/**/*.{ts,tsx}",
  ],
  rules: {
    "no-restricted-imports": ["error", {
      paths: [
        { name: "@/components/ui/checkbox",     message: "Use PlatformCheckbox from @/components/platform/ui — raw checkbox reads --primary from the org theme and leaks tenant brand into the platform layer." },
        { name: "@/components/ui/switch",       message: "Use PlatformSwitch from @/components/platform/ui — raw switch reads --primary/--muted from the org theme." },
        { name: "@/components/ui/alert-dialog", message: "Use PlatformAlertDialog* exports from @/components/platform/ui/PlatformDialog — raw alert-dialog reads --background/--popover/--primary from the org theme." },
        { name: "@/components/ui/dialog",       message: "Use PlatformDialogContent from @/components/platform/ui/PlatformDialog." },
        { name: "@/components/ui/label",        message: "Use PlatformLabel from @/components/platform/ui." },
        { name: "@/components/ui/textarea",     message: "Use PlatformTextarea from @/components/platform/ui." },
        { name: "@/components/ui/select",       message: "Use Platform* select exports from @/components/platform/ui/PlatformSelect." },
        { name: "@/components/ui/input",        message: "Use PlatformInput from @/components/platform/ui." },
        { name: "@/components/ui/button",       message: "Use PlatformButton from @/components/platform/ui." },
        { name: "@/components/ui/card",         message: "Use Platform* card exports from @/components/platform/ui/PlatformCard." },
        { name: "@/components/ui/badge",        message: "Use PlatformBadge from @/components/platform/ui." },
      ],
    }],
  },
},
```

Severity: **`error`**. The primitives in this list all have Platform* equivalents that already ship — the existing 43 files become the migration backlog, not a reason to weaken the rule. Each file gets fixed by swapping the import line; no JSX changes if the API matches (which it does, since all wrappers re-export the same Radix primitives).

Primitives NOT in this rule yet (Progress, RadioGroup, Slider, Tabs, Skeleton, Toggle, Tooltip, Popover, DropdownMenu, Separator, Calendar): they have no Platform* wrapper. Adding them to the ban without a wrapper would block work. They go in the Deferral Register with a "create wrapper THEN add to rule" trigger.

### 2) Migrate the existing 43 files (mechanical sweep)

For each of the 43 files, swap the raw import for the Platform* equivalent. Spot checks of the matches show this is largely a one-line-per-file change — the existing files already use the Radix component APIs identically. Examples from the search results:

- `PriceQueueTab.tsx` line 16: `Checkbox` → `PlatformCheckbox`
- `KBArticleEditor.tsx` line 20: `Checkbox` → `PlatformCheckbox`
- `KBCategoryManager.tsx` line 29: `Switch` → `PlatformSwitch`
- `ColorBarBillingTab.tsx` line 15: `Switch` → `PlatformSwitch`
- `RejectNoteDialog.tsx` line 4: `Textarea` → `PlatformTextarea`
- `CapitalControlTower.tsx` line 26: `Switch` → `PlatformSwitch`
- `Notifications.tsx` line 19-20: `Badge`, `Switch` → `PlatformBadge`, `PlatformSwitch`
- `HealthScores.tsx` lines 13-14: `Input`, `Select` → `PlatformInput`, `PlatformSelect*`
- `TerminalRequestsTable.tsx` lines 4-22: `Badge`, `Input`, `Select`, `Dialog`, `Label`, `Textarea` → all Platform* equivalents
- `ReactivationConfirmDialog.tsx` line 18: `alert-dialog` exports → `PlatformAlertDialog*` exports

Where a Platform* re-export carries a different component name (e.g. `PlatformAlertDialogContent` vs `AlertDialogContent`), use `import { PlatformAlertDialogContent as AlertDialogContent }` so JSX bodies don't have to change.

After the sweep, the lint rule passes clean. CI green = canon enforced.

### 3) Lint smoke test (the regression guard)

Mirror the Loader2 fixture pattern in `src/test/lint-fixtures/`:

- `platform-raw-primitive-banned.tsx` — a fixture under a path matching `src/components/platform/**` that imports `@/components/ui/checkbox`. Asserts the rule fires.
- `platform-raw-primitive-allowed.tsx` — same path pattern, imports `PlatformCheckbox`. Asserts the rule stays silent.
- Outside-platform fixture — imports `@/components/ui/checkbox` from a non-platform path. Asserts the rule does NOT fire (proving the path scoping works).

Add `src/test/lint-rule-platform-primitives.test.ts` mirroring `lint-rule-loader2.test.ts`: instantiate ESLint, lint each fixture, assert message counts. Include a `toMatchSnapshot()` on the resolved rule config so any future "harmless refactor" of the path list fails CI loudly.

The lint-fixtures path needs to match the rule's `files:` glob. Easiest: put the fixtures under a real platform path like `src/components/platform/__lint-fixtures__/` with a `// LINT FIXTURE — DO NOT IMPORT` banner, identical to the Loader2 convention.

### 4) Memory canon entry

Create `mem://style/platform-primitive-isolation.md` capturing:

- The rule (raw shadcn primitives banned in `src/components/platform/**` and `src/pages/dashboard/platform/**`)
- The five-part canon-pattern: invariant + Vitest smoke + ESLint rule + CI + override (`// eslint-disable-next-line no-restricted-imports` with one-line reason — same shape as the Loader2 escape hatch)
- The Deferral Register entry for the missing wrappers (`Progress`, `RadioGroup`, `Slider`, `Tabs`, `Skeleton`, `Toggle`, `Tooltip`, `Popover`, `DropdownMenu`, `Separator`, `Calendar`) with revisit trigger: "when a platform surface needs the primitive, create the Platform* wrapper and add to the no-restricted-imports paths list in the same PR"

Update `mem://index.md` to reference the new file, and add a Core line:

```
Platform layer: raw shadcn primitives banned via no-restricted-imports under src/components/platform/** and src/pages/dashboard/platform/**. Use Platform* wrappers from @/components/platform/ui.
```

## Files involved

**New:**
- `src/components/platform/__lint-fixtures__/raw-primitive-banned.tsx`
- `src/components/platform/__lint-fixtures__/raw-primitive-allowed.tsx`
- `src/test/lint-fixtures/platform-primitive-outside-scope.tsx`
- `src/test/lint-rule-platform-primitives.test.ts`
- `mem://style/platform-primitive-isolation.md`

**Modified:**
- `eslint.config.js` — add the scoped `no-restricted-imports` rule block
- `mem://index.md` — add Core line + Memories entry
- ~43 platform files — mechanical import swap (one line per file in most cases; a handful with multiple raw imports become a few lines)

## What stays the same
- All Platform* primitives in `src/components/platform/ui/` — untouched
- `usePlatformThemeIsolation` hook — untouched
- The Loader2 canon and its lint rule — untouched, used as the structural template
- All non-platform code (`src/components/ui/**` consumers under `dashboard/`, `marketing/`, etc.) — untouched, the rule is path-scoped
- Component APIs — preserved via aliased re-imports where wrapper names differ
- Wrappers without Platform* equivalents (Progress, Tabs, Skeleton, etc.) — usable for now, tracked in Deferral Register

## QA checklist

- `npm run lint` — passes clean after the sweep
- `npm test -- lint-rule-platform-primitives` — three tests pass (banned fires, allowed silent, outside-scope silent)
- Add a fresh raw `import { Checkbox } from '@/components/ui/checkbox'` to any platform file → CI fails with the Platform* migration message
- Add the same import to a non-platform file (e.g. `src/components/dashboard/Foo.tsx`) → no error
- Apply the documented inline override (`// eslint-disable-next-line no-restricted-imports` with reason) → lint passes for that single line
- Visit `/platform/color-bar`, `/platform/accounts`, `/platform/health`, `/platform/capital-control-tower` under each org theme (Rosewood, Cream Lux, Marine, Noir, Neon) → no org bleed on any swapped primitive
- Snapshot test for the rule config → matches; deliberately mutate the rule's path list → snapshot fails

## Enhancement suggestion

Once this lands, the next compounding move is a single `mem://architecture/cross-zone-isolation-canon.md` that pulls together the three governance pillars now sharing the same shape: (1) platform theme isolation (this fix + the hook), (2) Termina typography constraint, (3) loader unification. All three are "the boundary between zones must be structurally enforced, not remembered" — and all three follow the same canon-pattern (invariant + Vitest + lint + CI + override). Naming the meta-canon makes it cheap to add the fourth and fifth (probably: chart-token isolation, and the public-vs-private route boundary already in `mem://architecture/public-vs-private-route-isolation`). Without the meta-canon, each future zone boundary will be re-invented from scratch.

