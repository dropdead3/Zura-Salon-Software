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
export const CONSOLIDATED_RESTRICTED_SYNTAX = [
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

// ──────────────────────────────────────────────────────────────────────
// Consolidated `no-restricted-imports` paths — single source of truth.
// ──────────────────────────────────────────────────────────────────────
// Mirrors CONSOLIDATED_RESTRICTED_SYNTAX. Today only Platform Primitive
// Isolation populates this list — every entry is a raw shadcn primitive
// that has a Platform* equivalent in src/components/platform/ui/.
//
// Why this exists even with one consumer: the same flat-config replacement
// footgun that motivated CONSOLIDATED_RESTRICTED_SYNTAX applies to
// `no-restricted-imports`. The moment a SECOND scoped block needs to
// add `no-restricted-imports` paths (e.g. wizard-only API client ban,
// dock-only Acaia SDK ban), the platform paths would be silently dropped
// from any file matched by both blocks. Hoisting now removes that risk.
//
// To add a new globally-banned import: push to PLATFORM_PRIMITIVE_PATHS
// (or define a new array if it's a different doctrine) and use
// `defineScopedImportDoctrine()`.
const PLATFORM_PRIMITIVE_PATHS = [
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
];

/**
 * Symmetric counterpart of `defineScopedDoctrine` for `no-restricted-imports`.
 *
 * Usage:
 *   defineScopedImportDoctrine({
 *     files: ["src/components/platform/**\/*.{ts,tsx}"],
 *     basePaths: PLATFORM_PRIMITIVE_PATHS, // defaults to PLATFORM_PRIMITIVE_PATHS
 *     extraPaths: [{ name, message }, ...], // appended scope-specific bans
 *   })
 *
 * Closes the second half of the flat-config replacement surface (the
 * first half being `no-restricted-syntax`). Even with a single consumer
 * today, callers MUST go through this helper so future doctrines compose
 * cleanly. Pair every new scope with an assertion in
 * `src/test/lint-config-resolution.test.ts`.
 */
function defineScopedImportDoctrine({
  files,
  ignores,
  basePaths = PLATFORM_PRIMITIVE_PATHS,
  extraPaths = [],
}) {
  return {
    files,
    ...(ignores ? { ignores } : {}),
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [...basePaths, ...extraPaths] },
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
  {
    // Site Settings Event Ownership canon — applies CONSOLIDATED_RESTRICTED_SYNTAX
    // (defined at top of file) to most source files. The doctrines bundled
    // in there are: Loader2 governance, UnsavedChangesDialog, Site Settings
    // Event Ownership, Dirty-State Compare, and Hero Overlay Rename.
    //
    // FLAT-CONFIG REPLACEMENT WARNING:
    //   ESLint flat config REPLACES (does not merge) `no-restricted-syntax`
    //   options when two blocks both match a file. Any scope-specific
    //   override (hero, platform, wizard) MUST go through the
    //   `defineScopedDoctrine()` helper — it concatenates
    //   CONSOLIDATED_RESTRICTED_SYNTAX with the scope's extra selectors so
    //   nothing is silently dropped. The meta-test
    //   `src/test/lint-config-resolution.test.ts` asserts every doctrine
    //   selector survives in the resolved config for representative files.
    //
    // Per-file ignore semantics (e.g. the Site Settings rule must not fire
    // inside siteSettingsDraft.ts) are handled by `eslint-disable-next-line`
    // overrides at the call site, not by splitting the rule across blocks.
    //
    // Pairs with: src/test/lint-rule-site-settings-event.test.ts
    files: ["**/*.{ts,tsx}"],
    ignores: [
      // NOTE: do NOT ignore `src/lib/siteSettingsDraft.ts` here — the
      // owning module suppresses each dispatch with an inline
      // `eslint-disable-next-line no-restricted-syntax` comment instead.
      // NOTE: do NOT ignore `src/test/lint-fixtures/**` here — the
      // smoke tests use ESLint's `ignore: false` option to bypass the
      // top-level exclusion. Re-listing the fixtures path here would
      // silently drop this rule from the fixture's resolved config.
      // Vitest tests may legitimately simulate the event for unit coverage.
      "src/**/__tests__/**",
      "src/test/**/*.test.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": ["error", ...CONSOLIDATED_RESTRICTED_SYNTAX],
    },
  },
  // ─────────────────────────────────────────────────────────────────────
  // Hero Alignment Canon — hero-files-only override.
  // Built via defineScopedDoctrine() so the consolidated 5 selectors stay
  // in sync automatically and the hero-specific selectors append cleanly.
  //
  // Pairs with:
  //   - src/test/lint-rule-hero-alignment.test.ts
  //   - src/test/lint-rule-hero-notes-shared.test.ts
  //   - src/components/home/HeroNotes.test.tsx
  //
  // Override: `// eslint-disable-next-line no-restricted-syntax
  // -- <reason>` for the rare cross-axis-only `items-center` that
  // genuinely doesn't relate to hero content alignment, OR inside
  // HeroNotes.tsx itself (the canonical owner of the inline JSX).
  // ─────────────────────────────────────────────────────────────────────
  defineScopedDoctrine({
    files: [
      "src/components/home/Hero*.{ts,tsx}",
      "src/components/home/HeroSection.tsx",
      "src/components/home/HeroSlideRotator.tsx",
      "src/components/home/HeroNotes.tsx",
      "src/components/dashboard/website-editor/previews/HeroSectionPreview.tsx",
      // Lint fixtures live outside the real hero tree; include them
      // explicitly so the smoke tests (which use `ignore: false`) see
      // the rule applied. Top-level `ignores` keeps `npm run lint`
      // from picking these up.
      "src/test/lint-fixtures/hero-alignment-*.tsx",
      "src/test/lint-fixtures/hero-notes-*.tsx",
    ],
    extraSelectors: [
      {
        // Hero-specific: ban hardcoded items-center|start|end inside cn()
        // calls that don't reference `alignment.*`. Routes horizontal
        // placement through resolveHeroAlignment.
        selector: "CallExpression[callee.name='cn']:has(Literal[value=/(^| )items-(center|start|end)( |$)/]):not(:has(MemberExpression[object.name='alignment']))",
        message: "Hero files must route horizontal placement through `alignment.notes` / `alignment.cta` / `alignment.ctaRow` / `alignment.headline` (from resolveHeroAlignment). Hardcoded `items-center|start|end` inside `cn()` was the root cause of the May 2026 hero-notes alignment regression — the literal silently overrode the operator's content_alignment choice.",
      },
      {
        // Hero shared-component canon: ban inline <p> JSX rendering
        // `consultation_note_line1` or `consultation_note_line2` outside
        // of HeroNotes.tsx itself. Forces every new hero variant
        // (announcement bar, seasonal hero, slide rotator, etc.) to
        // import the shared component instead of re-typing the JSX —
        // which is what allowed the alignment regression to ship past
        // the editor preview test.
        //
        // Override: `// eslint-disable-next-line no-restricted-syntax
        // -- <reason>` only inside HeroNotes.tsx itself (the canonical
        // owner) — every other hero file should import it.
        //
        // Pairs with: src/test/lint-rule-hero-notes-shared.test.ts
        selector: "JSXElement[openingElement.name.name='p']:has(MemberExpression[property.name=/^consultation_note_line[12]$/])",
        message: "Inline `<p>{config.consultation_note_lineN}</p>` JSX is forbidden in hero files. Import and render <HeroNotes config={config} contentAlignment={...} /> from @/components/home/HeroNotes — it is the canonical owner of consultation-note rendering, alignment routing, and preview-vs-live parity. Inline siblings re-introduce the May 2026 alignment drift.",
      },
    ],
  }),
  // ─────────────────────────────────────────────────────────────────────
  // Platform Primitive Isolation gate. Banning raw shadcn primitives in
  // the platform layer prevents org-theme tokens (--primary, --background,
  // --muted, etc.) from bleeding into platform admin surfaces. Every
  // primitive in PLATFORM_PRIMITIVE_PATHS has a Platform* equivalent in
  // src/components/platform/ui/ that reads --platform-* tokens instead.
  //
  // Built via defineScopedImportDoctrine() — even though it's the only
  // consumer of `no-restricted-imports` today, going through the helper
  // means a future second scoped import block (wizard-only API ban,
  // dock-only SDK ban, etc.) cannot silently shadow these paths via
  // flat-config replacement. Pair with src/test/lint-config-resolution.test.ts.
  //
  // Migration override (use sparingly, with a one-line reason):
  //   // eslint-disable-next-line no-restricted-imports -- <reason>
  //
  // Primitives without Platform* wrappers yet (Progress, RadioGroup,
  // Slider, Tabs, Skeleton, Toggle, Tooltip, Popover, DropdownMenu,
  // Separator, Calendar) are tracked in mem://style/platform-primitive-
  // isolation.md Deferral Register: create the wrapper, then add the
  // path to PLATFORM_PRIMITIVE_PATHS in the same change.
  //
  // Note: lint fixtures are excluded at the top-level `ignores` so
  // `npm run lint` skips them while explicit ESLint API calls in the
  // smoke test (src/test/lint-rule-platform-primitives.test.ts) still
  // see them and assert the rule fires.
  // ─────────────────────────────────────────────────────────────────────
  defineScopedImportDoctrine({
    files: [
      "src/components/platform/**/*.{ts,tsx}",
      "src/pages/dashboard/platform/**/*.{ts,tsx}",
    ],
  }),
);
