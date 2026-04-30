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
      // Loader2 governance — ban Loader2 JSX outside button-like ancestors.
      // Doctrine: <DashboardLoader /> for sections, <BootLuxeLoader /> for
      // boot/Suspense gates, <Loader2 /> only inside <Button>, <button>, or
      // any component whose name ends in `Button` / `IconButton`.
      // TODO(wave-2): promote severity from 'warn' to 'error' once the
      // Wave 2 Loader2 sweep clears existing leaks (~150 call sites).
      // Trigger: `grep -rn 'Loader2' src/` returns only button-context hits.
      // Tracked in mem://architecture/visibility-contracts.md Deferral Register.
      "no-restricted-syntax": [
        "warn",
        {
          // Flag <Loader2 /> usages NOT nested inside a Button-like ancestor.
          // The two `:not(... descendant ...)` clauses exclude Loader2 elements
          // that appear inside <button>, <Button>, or any <*Button> JSX.
          // Note: do NOT add `:not(:has(JSXElement))` — esquery's `:has()`
          // walks the whole subtree and false-negatives self-closing Loader2.
          selector: "JSXElement[openingElement.name.name='Loader2']:not(JSXElement[openingElement.name.name=/Button$/] JSXElement[openingElement.name.name='Loader2']):not(JSXElement[openingElement.name.name='button'] JSXElement[openingElement.name.name='Loader2'])",
          message: "Loader2 is restricted to inline button spinners. Use <DashboardLoader /> for sections, <BootLuxeLoader /> for boot/Suspense gates. If this IS a button-internal spinner that the lint rule misclassified, add `// eslint-disable-next-line no-restricted-syntax` with a one-line reason.",
        },
        {
          // UnsavedChangesDialog canon — ban ad-hoc "Unsaved changes" titles
          // inside AlertDialogTitle. Once the canonical <UnsavedChangesDialog />
          // exists (src/components/ui/unsaved-changes-dialog.tsx), forking it
          // ad-hoc means future copy/UX tweaks leave call sites diverged.
          // Aligns with Canon Pattern (mem://architecture/canon-pattern).
          //
          // Override: if you genuinely need a custom navigate-away dialog
          // (e.g. with extra fields), add `// eslint-disable-next-line
          // no-restricted-syntax -- <reason>` and document why the canonical
          // component doesn't fit.
          selector: "JSXElement[openingElement.name.name='AlertDialogTitle'] > JSXText[value=/^\\s*Unsaved changes\\s*$/i]",
          message: "Use <UnsavedChangesDialog /> from @/components/ui/unsaved-changes-dialog instead of forking the navigate-away pattern. Pair with useUnsavedChangesGuard for the state machine.",
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
