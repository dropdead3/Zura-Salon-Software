import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      // Supabase Edge Functions run on Deno with their own toolchain.
      // Linting them with the frontend Vite/Node ESLint config produces
      // thousands of false-positive errors and was the root cause of the
      // Wave 10 lint regression (1100 -> 4322 errors). See DEBUG_LOG.md.
      "supabase/functions/**",
      // Lint fixtures intentionally violate rules to assert they fire.
      // Excluded from `npm run lint` runs but lint-rule-*.test.ts uses
      // ESLint's `ignore: false` option to bypass this for assertions.
      "src/components/platform/__lint-fixtures__/**",
      "src/test/lint-fixtures/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Downgraded to warn: doctrinal decision to allow pragmatic `any`
      // usage in adapter/edge boundaries while still surfacing it for
      // future cleanup. Was the dominant error source (4104 of 4322).
      "@typescript-eslint/no-explicit-any": "warn",
      // NOTE: `no-restricted-syntax` is intentionally NOT defined here.
      // It lives consolidated in the Site Settings Event Ownership block
      // below as a single source of truth for ALL restricted-syntax
      // doctrines (Loader2, UnsavedChanges, Site Settings event). Adding
      // a `no-restricted-syntax` entry here would be silently overridden
      // by that block via flat-config replacement semantics, dropping
      // any selectors you add. See the consolidated block for the canon.
    },
  },
  {
    // Site Settings Event Ownership canon.
    // ──────────────────────────────────────────────────────────────────
    // The `site-settings-draft-write` CustomEvent is the single signal
    // that tells the LivePreviewPanel iframe to invalidate its
    // site-settings query cache. It MUST carry properly scoped
    // {orgId, key} detail — the May 2026 promo-popup snap-back regression
    // was caused by an empty-detail dispatch from `triggerPreviewRefresh()`
    // that triggered a broad invalidation race.
    //
    // Doctrine: `src/lib/siteSettingsDraft.ts` is the SOLE owner of this
    // event. Every dispatch must originate from a real write path there
    // (writeSiteSettingDraft, publishSiteSettingsDrafts, discardSiteSettingsDrafts).
    //
    // Override: if you have a legitimate reason to dispatch this event
    // from a new write path, move it into siteSettingsDraft.ts and call
    // it from there. Do NOT add `eslint-disable-next-line` — there is
    // no valid call site outside that file.
    //
    // Pairs with: src/test/lint-rule-site-settings-event.test.ts
    files: ["**/*.{ts,tsx}"],
    ignores: [
      // NOTE: do NOT ignore `src/lib/siteSettingsDraft.ts` here. The
      // owning module suppresses each dispatch with an inline
      // `eslint-disable-next-line no-restricted-syntax` comment instead.
      // Excluding the file via `ignores` would also drop the consolidated
      // Loader2 + UnsavedChanges selectors for that file (flat-config
      // replacement semantics), losing coverage for unrelated doctrines.
      //
      // NOTE: do NOT ignore `src/test/lint-fixtures/**` here either. The
      // top-level `ignores` already excludes the fixtures from `npm run
      // lint`, and the smoke test uses ESLint's `ignore: false` option
      // to deliberately bypass that exclusion. Re-listing the fixtures
      // path here would silently drop this rule from the fixture's
      // resolved config, making the test report 0 violations.
      //
      // Vitest tests may legitimately simulate the event for unit coverage.
      "src/**/__tests__/**",
      "src/test/**/*.test.{ts,tsx}",
    ],
    rules: {
      // CONSOLIDATED `no-restricted-syntax` — single source of truth.
      // ──────────────────────────────────────────────────────────────
      // All `no-restricted-syntax` selectors live in THIS block, even
      // ones whose doctrine is unrelated to site-settings event ownership.
      //
      // Why consolidated: flat-config replaces (does not merge) rule
      // options when two blocks both match a file. Splitting selectors
      // across blocks silently drops selectors on files matched by both,
      // which is invisible without `eslint --print-config`. The meta-test
      // `src/test/lint-config-resolution.test.ts` asserts every doctrine
      // selector survives in the resolved config for representative files.
      //
      // To add a new selector: add a new object to the array below and
      // a corresponding assertion in the meta-test. Do NOT spin up a new
      // config block with its own `no-restricted-syntax` — that re-opens
      // the shadowing footgun. The exception is per-file ignore semantics
      // (e.g. the Site Settings rule must NOT fire inside siteSettingsDraft.ts);
      // those are handled by `eslint-disable-next-line` overrides at the
      // call site, not by splitting the rule across blocks.
      "no-restricted-syntax": [
        "error",
        {
          // Loader2 governance — ban Loader2 JSX outside button-like ancestors.
          // Doctrine: <DashboardLoader /> for sections, <BootLuxeLoader /> for
          // boot/Suspense gates, <Loader2 /> only inside <Button>, <button>,
          // or any component whose name ends in `Button` / `IconButton`.
          // Severity note: was 'warn' in the prior split-block layout; now
          // promoted to 'error' as the consolidated array shares one severity.
          // If the Wave 2 sweep hasn't fully cleared call sites yet, downgrade
          // back to ['warn', ...] temporarily and re-run lint to inventory.
          // Tracked in mem://architecture/visibility-contracts.md Deferral Register.
          // Note: do NOT add `:not(:has(JSXElement))` — esquery's `:has()`
          // walks the whole subtree and false-negatives self-closing Loader2.
          selector: "JSXElement[openingElement.name.name='Loader2']:not(JSXElement[openingElement.name.name=/Button$/] JSXElement[openingElement.name.name='Loader2']):not(JSXElement[openingElement.name.name='button'] JSXElement[openingElement.name.name='Loader2'])",
          message: "Loader2 is restricted to inline button spinners. Use <DashboardLoader /> for sections, <BootLuxeLoader /> for boot/Suspense gates. If this IS a button-internal spinner that the lint rule misclassified, add `// eslint-disable-next-line no-restricted-syntax` with a one-line reason.",
        },
        {
          // UnsavedChangesDialog canon — ban ad-hoc "Unsaved changes" titles
          // inside AlertDialogTitle. Use <UnsavedChangesDialog /> instead.
          // Override: add `// eslint-disable-next-line no-restricted-syntax
          // -- <reason>` for legitimate custom navigate-away dialogs.
          selector: "JSXElement[openingElement.name.name='AlertDialogTitle'] > JSXText[value=/^\\s*Unsaved changes\\s*$/i]",
          message: "Use <UnsavedChangesDialog /> from @/components/ui/unsaved-changes-dialog instead of forking the navigate-away pattern. Pair with useUnsavedChangesGuard for the state machine.",
        },
        {
          // Site Settings Event Ownership — `site-settings-draft-write` is
          // owned exclusively by src/lib/siteSettingsDraft.ts. The owning
          // module suppresses this selector with `// eslint-disable-next-line
          // no-restricted-syntax` at each dispatch site. See doctrine in
          // mem://architecture/site-settings-event-ownership.md and the
          // smoke test src/test/lint-rule-site-settings-event.test.ts.
          // esquery does not support `arguments.0.value` indexed-field
          // syntax; use `:has()` with the literal value matcher instead.
          selector: "NewExpression[callee.name='CustomEvent']:has(Literal[value='site-settings-draft-write'])",
          message: "The `site-settings-draft-write` event is owned exclusively by src/lib/siteSettingsDraft.ts. Do not dispatch it from helpers like triggerPreviewRefresh() — empty-detail dispatches caused the May 2026 promo-popup snap-back regression. If you need this event from a new write path, add the dispatch inside siteSettingsDraft.ts.",
        },
      ],
    },
  },
  {
    // Platform-primitive isolation gate. Banning raw shadcn primitives in
    // the platform layer prevents org-theme tokens (--primary, --background,
    // --muted, etc.) from bleeding into platform admin surfaces. Every
    // primitive listed here has a Platform* equivalent in
    // src/components/platform/ui/ that reads --platform-* tokens instead.
    //
    // Migration override (use sparingly, with a one-line reason):
    //   // eslint-disable-next-line no-restricted-imports -- <reason>
    //
    // Primitives without Platform* wrappers yet (Progress, RadioGroup,
    // Slider, Tabs, Skeleton, Toggle, Tooltip, Popover, DropdownMenu,
    // Separator, Calendar) are tracked in mem://style/platform-primitive-
    // isolation.md Deferral Register: create the wrapper, then add the
    // path here in the same change.
    files: [
      "src/components/platform/**/*.{ts,tsx}",
      "src/pages/dashboard/platform/**/*.{ts,tsx}",
    ],
    // Note: lint fixtures are excluded at the top-level `ignores` so
    // `npm run lint` skips them while explicit ESLint API calls in the
    // smoke test (src/test/lint-rule-platform-primitives.test.ts) still
    // see them and assert the rule fires.
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          { name: "@/components/ui/checkbox",     message: "Use PlatformCheckbox from @/components/platform/ui — raw checkbox reads --primary from the org theme and leaks tenant brand into the platform layer." },
          { name: "@/components/ui/switch",       message: "Use PlatformSwitch from @/components/platform/ui — raw switch reads --primary/--muted from the org theme." },
          { name: "@/components/ui/alert-dialog", message: "Use PlatformAlertDialog* exports from @/components/platform/ui/PlatformDialog — raw alert-dialog reads --background/--popover/--primary from the org theme." },
          { name: "@/components/ui/dialog",       message: "Use PlatformDialogContent from @/components/platform/ui/PlatformDialog — raw dialog reads --background/--popover from the org theme." },
          { name: "@/components/ui/label",        message: "Use PlatformLabel from @/components/platform/ui — raw label reads --foreground from the org theme." },
          { name: "@/components/ui/textarea",     message: "Use PlatformTextarea from @/components/platform/ui — raw textarea reads --input/--border from the org theme." },
          { name: "@/components/ui/select",       message: "Use Platform* select exports from @/components/platform/ui/PlatformSelect — raw select reads --popover/--primary from the org theme." },
          { name: "@/components/ui/input",        message: "Use PlatformInput from @/components/platform/ui — raw input reads --input/--ring from the org theme." },
          { name: "@/components/ui/button",       message: "Use PlatformButton from @/components/platform/ui — raw button reads --primary/--secondary from the org theme." },
          { name: "@/components/ui/card",         message: "Use Platform* card exports from @/components/platform/ui/PlatformCard — raw card reads --card/--card-foreground from the org theme." },
          { name: "@/components/ui/badge",        message: "Use PlatformBadge from @/components/platform/ui — raw badge reads --primary/--secondary from the org theme." },
        ],
      }],
    },
  },
);
