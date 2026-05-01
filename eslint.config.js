import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Doctrine arrays + scope-helper builders live in eslint.helpers.js so this
// file stays focused on flat-config block composition. See that module for
// the source of truth for `no-restricted-syntax` selectors and
// `no-restricted-imports` paths.
//
// HARD RULE: every file-scoped no-restricted-* block in this file MUST be
// built via `defineScopedDoctrine()` / `defineScopedImportDoctrine()`.
// Raw `"no-restricted-syntax": [` / `"no-restricted-imports": [` keys
// outside a helper call are banned by `src/test/lint-config-helper-usage.test.ts`
// — flat-config replacement semantics silently drop entries from the
// consolidated arrays otherwise.
import {
  CONSOLIDATED_RESTRICTED_SYNTAX,
  defineScopedDoctrine,
  defineScopedImportDoctrine,
} from "./eslint.helpers.js";


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
