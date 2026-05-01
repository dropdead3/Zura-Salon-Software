import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// ──────────────────────────────────────────────────────────────────────
// Consolidated `no-restricted-syntax` doctrines — single source of truth.
// ──────────────────────────────────────────────────────────────────────
// Flat config REPLACES (does not merge) rule options when two blocks both
// match a file. To safely scope a doctrine to a subset of files (e.g. hero,
// platform, wizard) without dropping the global selectors, use
// `defineScopedDoctrine({ files, ignores, extraSelectors })` below — it
// imports CONSOLIDATED_RESTRICTED_SYNTAX and appends scope-specific entries.
//
// To add a new global selector: push to CONSOLIDATED_RESTRICTED_SYNTAX and
// extend `src/test/lint-config-resolution.test.ts`. Do NOT spin up a new
// config block with its own `no-restricted-syntax`.
const CONSOLIDATED_RESTRICTED_SYNTAX = [
  {
    // Loader2 governance — see consolidated block doc below.
    selector: "JSXElement[openingElement.name.name='Loader2']:not(JSXElement[openingElement.name.name=/Button$/] JSXElement[openingElement.name.name='Loader2']):not(JSXElement[openingElement.name.name='button'] JSXElement[openingElement.name.name='Loader2'])",
    message: "Loader2 is restricted to inline button spinners. Use <DashboardLoader /> for sections, <BootLuxeLoader /> for boot/Suspense gates. If this IS a button-internal spinner that the lint rule misclassified, add `// eslint-disable-next-line no-restricted-syntax` with a one-line reason.",
  },
  {
    selector: "JSXElement[openingElement.name.name='AlertDialogTitle'] > JSXText[value=/^\\s*Unsaved changes\\s*$/i]",
    message: "Use <UnsavedChangesDialog /> from @/components/ui/unsaved-changes-dialog instead of forking the navigate-away pattern. Pair with useUnsavedChangesGuard for the state machine.",
  },
  {
    selector: "NewExpression[callee.name='CustomEvent']:has(Literal[value='site-settings-draft-write'])",
    message: "The `site-settings-draft-write` event is owned exclusively by src/lib/siteSettingsDraft.ts. Do not dispatch it from helpers like triggerPreviewRefresh() — empty-detail dispatches caused the May 2026 promo-popup snap-back regression. If you need this event from a new write path, add the dispatch inside siteSettingsDraft.ts.",
  },
  {
    selector: "BinaryExpression[operator=/^[!=]==$/][left.type='CallExpression'][left.callee.object.name='JSON'][left.callee.property.name='stringify'][right.type='CallExpression'][right.callee.object.name='JSON'][right.callee.property.name='stringify']",
    message: "Brittle dirty-state check: JSON.stringify is key-order sensitive and reports false positives after save round-trips. Use `useDirtyState(local, server)` from @/hooks/useDirtyState (preferred for editors) or `isStructurallyEqual` from @/lib/stableStringify.",
  },
  {
    selector: "Literal[value=/^(Overlay (Darkness|Lightness)|Background Scrim)$/]",
    message: "Use the canonical hero overlay labels: 'Image Wash' (flat tint, replaces 'Overlay Darkness/Lightness') and 'Text-area Scrim' (gradient/vignette, replaces 'Background Scrim'). Renamed to disambiguate the two layers — see HeroBackground.tsx two-layer contract.",
  },
];

/**
 * Build a flat-config block that scopes a doctrine to a subset of files
 * WITHOUT dropping the global `CONSOLIDATED_RESTRICTED_SYNTAX` selectors.
 *
 * Usage:
 *   defineScopedDoctrine({
 *     files: ["src/components/home/Hero*.{ts,tsx}"],
 *     ignores: [],                       // optional
 *     extraSelectors: [{ selector, message }, ...],
 *   })
 *
 * The helper concatenates `CONSOLIDATED_RESTRICTED_SYNTAX` with the
 * scope-specific selectors so the resolved config keeps every doctrine
 * active. Pair every new scope with an assertion in
 * `src/test/lint-config-resolution.test.ts`.
 */
function defineScopedDoctrine({ files, ignores, extraSelectors = [] }) {
  return {
    files,
    ...(ignores ? { ignores } : {}),
    rules: {
      "no-restricted-syntax": [
        "error",
        ...CONSOLIDATED_RESTRICTED_SYNTAX,
        ...extraSelectors,
      ],
    },
  };
}

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
__INSERTION_MARKER__
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
