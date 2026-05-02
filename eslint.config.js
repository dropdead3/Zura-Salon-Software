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
  defineScopedDoctrine,
  defineScopedImportDoctrine,
  HERO_ALIGNMENT_OVERLAY_PATHS,
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
  // ─────────────────────────────────────────────────────────────────────
  // Global doctrine block — applies CONSOLIDATED_RESTRICTED_SYNTAX
  // (Loader2, UnsavedChangesDialog, Site Settings event, Dirty-State
  // Compare, Hero Overlay Rename) to almost every source file.
  //
  // Built via defineScopedDoctrine() (with no extraSelectors) for
  // doctrinal symmetry with the scoped blocks below — the helper-usage
  // meta-test (src/test/lint-config-helper-usage.test.ts) bans raw
  // `"no-restricted-syntax": [...]` literals in this file specifically
  // to prevent a future author from re-opening the flat-config
  // replacement footgun.
  //
  // Per-file ignore semantics (e.g. the Site Settings rule must not fire
  // inside siteSettingsDraft.ts) are handled by `eslint-disable-next-line`
  // overrides at the call site, not by splitting the rule across blocks.
  //
  // Pairs with: src/test/lint-rule-site-settings-event.test.ts
  // ─────────────────────────────────────────────────────────────────────
  defineScopedDoctrine({
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
  }),
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
      "src/components/home/HeroSlideRotator.tsx",
      "src/components/home/HeroNotes.tsx",
      "src/components/home/HeroScrollIndicator.tsx",
      "src/components/home/HeroEyebrow.tsx",
      "src/components/home/HeroRotatingWord.tsx",
      "src/components/home/HeroSectionRoot.tsx",
      "src/components/dashboard/website-editor/previews/HeroSectionPreview.tsx",
      // Lint fixtures live outside the real hero tree; include them
      // explicitly so the smoke tests (which use `ignore: false`) see
      // the rule applied. Top-level `ignores` keeps `npm run lint`
      // from picking these up.
      "src/test/lint-fixtures/hero-alignment-*.tsx",
      "src/test/lint-fixtures/hero-notes-*.tsx",
      "src/test/lint-fixtures/hero-scroll-indicator-*.tsx",
      "src/test/lint-fixtures/hero-eyebrow-*.tsx",
      "src/test/lint-fixtures/hero-rotating-word-*.tsx",
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
      {
        // Hero scroll-indicator parity canon: ban inline <motion.button> in
        // hero files outside HeroScrollIndicator.tsx itself. The May 2026
        // bug shipped because the slide rotator never rendered a scroll
        // affordance at all — a future hero variant (parallax hero,
        // seasonal hero) could re-introduce the same drift by hand-rolling
        // its own scroll cue with motion.button instead of importing the
        // shared component. This rule blocks that at authoring time.
        //
        // Why motion.button (not aria-label match): esquery cannot match
        // strings inside JSXExpressionContainer template literals reliably,
        // and no other hero file uses `motion.button` for any purpose.
        // Banning the construct keeps the canonical-owner pattern simple
        // and matches the HeroNotes precedent.
        //
        // Override: `// eslint-disable-next-line no-restricted-syntax
        // -- <reason>` only inside HeroScrollIndicator.tsx (the canonical
        // owner). Every other hero file imports it.
        //
        // Pairs with: src/test/lint-rule-hero-scroll-indicator.test.ts
        selector: "JSXOpeningElement[name.type='JSXMemberExpression'][name.object.name='motion'][name.property.name='button']",
        message: "Inline `<motion.button>` JSX is forbidden in hero files. Import and render <HeroScrollIndicator show={...} text={...} onMedia={...} /> from @/components/home/HeroScrollIndicator — it is the canonical owner of the scroll affordance and guarantees preview-vs-live parity. Hand-rolled scroll cues caused the May 2026 missing-indicator regression in the slide rotator.",
      },
      {
        // Hero eyebrow parity canon: ban inline <Eyebrow> JSX in hero
        // files outside HeroEyebrow.tsx itself. Pre-extraction the eyebrow
        // shipped in three subtly different shapes across HeroSection,
        // HeroSlideRotator, and HeroSectionPreview — exactly the divergence
        // pattern that allowed the May 2026 hero-notes alignment regression
        // to ship past the existing preview test. Slides now own
        // `eyebrow` + `show_eyebrow` per slide, multiplying the drift
        // surface; pre-empt by forcing every hero variant through the
        // shared component.
        //
        // Override: `// eslint-disable-next-line no-restricted-syntax
        // -- <reason>` only inside HeroEyebrow.tsx (the canonical owner).
        // Every other hero file imports it.
        //
        // Pairs with: src/test/lint-rule-hero-eyebrow-shared.test.ts
        selector: "JSXOpeningElement[name.name='Eyebrow']",
        message: "Inline `<Eyebrow>` JSX is forbidden in hero files. Import and render <HeroEyebrow show={...} text={...} editable={isPreview} fieldPath={...} /> from @/components/home/HeroEyebrow — it is the canonical owner of hero eyebrow rendering, editable/static branching, and preview-vs-live parity. Inline siblings re-introduce the divergence pattern that drove the May 2026 hero-notes regression.",
      },
      {
        // Hero rotating-word parity canon: ban inline <motion.span> in hero
        // files outside HeroRotatingWord.tsx itself. The rotating headline
        // word disappeared TWICE during hero refactors because nothing
        // forced the three render sites (HeroSection, HeroSlideRotator,
        // HeroSectionPreview) through a shared component. This rule blocks
        // hand-rolled motion.span at authoring time so a future hero
        // variant cannot drop the affordance silently.
        //
        // Override: `// eslint-disable-next-line no-restricted-syntax
        // -- <reason>` only inside HeroRotatingWord.tsx (the canonical
        // owner). Every other hero file imports it.
        //
        // Pairs with: src/test/lint-rule-hero-rotating-word.test.ts
        selector: "JSXOpeningElement[name.type='JSXMemberExpression'][name.object.name='motion'][name.property.name='span']",
        message: "Inline `<motion.span>` JSX is forbidden in hero files. Import and render <HeroRotatingWord show={...} words={...} index={...} /> from @/components/home/HeroRotatingWord — it is the canonical owner of the rotating headline word and guarantees preview-vs-live parity. Hand-rolled rotating spans caused the rotating word to vanish during the May 2026 slide-rotator refactor.",
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
  // ─────────────────────────────────────────────────────────────────────
  // FocalPointPicker Isolation canon — codifies the November 2026 hero
  // editor consolidation: the standalone <FocalPointPicker> component is
  // owned exclusively by MediaUploadInput, which renders it as an
  // overlay on top of the upload tile. Stacking a second focal preview
  // beneath the upload thumbnail (the pre-consolidation pattern) wastes
  // vertical space, duplicates the image preview, and re-introduces the
  // "two thumbnails for one image" UX regression.
  //
  // Allowed sites:
  //   - src/components/dashboard/website-editor/inputs/FocalPointPicker.tsx
  //     (the component definition itself)
  //   - src/components/dashboard/website-editor/inputs/MediaUploadInput.tsx
  //     (the canonical consumer that renders it as an overlay)
  //
  // If a future surface genuinely needs a focal picker without an
  // upload tile (e.g. an AI-suggested crop dialog operating on an
  // already-uploaded asset), extend MediaUploadInput's `focal` prop OR
  // factor a hookless <FocalOverlay> primitive — do NOT re-import
  // <FocalPointPicker> directly. Override:
  //   // eslint-disable-next-line no-restricted-syntax -- <reason>
  //
  // Pairs with: src/test/lint-config-resolution.test.ts (asserts the
  // selector survives flat-config resolution on a representative
  // website-editor file).
  // ─────────────────────────────────────────────────────────────────────
  defineScopedDoctrine({
    files: [
      // Scoped strictly to the website-editor tree — focal pickers are
      // an editor concern, not a runtime/consumer concern. Broadening to
      // src/components/home/** would shadow the hero canon block via
      // flat-config replacement (verified by the meta-test).
      "src/components/dashboard/website-editor/**/*.{ts,tsx}",
      // Lint fixture lives outside the real editor tree; include it
      // explicitly so the meta-test (which uses `ignore: false`) sees
      // the rule applied. Top-level `ignores` keeps `npm run lint`
      // from picking it up.
      "src/test/lint-fixtures/focal-point-picker-banned.tsx",
    ],
    ignores: [
      // The component itself defines & exports FocalPointPicker.
      "src/components/dashboard/website-editor/inputs/FocalPointPicker.tsx",
      // The canonical consumer renders it as an overlay inside the
      // consolidated upload tile.
      "src/components/dashboard/website-editor/inputs/MediaUploadInput.tsx",
    ],
    extraSelectors: [
      {
        // Ban JSX usage — covers the actual mounted-component case.
        selector: "JSXOpeningElement[name.name='FocalPointPicker']",
        message: "Inline <FocalPointPicker> usage is forbidden outside MediaUploadInput.tsx. Wire focal control through the consolidated <MediaUploadInput focal={{ x, y, onChange, onReset, enabled }} /> overlay instead — stacking a separate focal preview under the upload tile re-introduces the duplicate-thumbnail UX regression that the November 2026 consolidation removed.",
      },
      {
        // Ban named import — catches the case where someone imports it
        // for a non-JSX use (HOC wrap, indirection through a wrapper
        // component, etc.). `no-restricted-imports` would need a path
        // entry, but this picker has no separate import path; the
        // selector form keeps the doctrine self-contained in one block.
        selector: "ImportSpecifier[imported.name='FocalPointPicker']",
        message: "Importing FocalPointPicker outside MediaUploadInput.tsx is forbidden. The component is owned exclusively by the consolidated upload tile — use <MediaUploadInput focal={{ ... }} /> instead. If you need a focal picker without an upload tile, extend MediaUploadInput's focal prop or factor a hookless <FocalOverlay> primitive rather than re-importing this component.",
      },
    ],
  }),
  // ─────────────────────────────────────────────────────────────────────
  // Global Overlay Stability — bans @/lib/heroAlignmentSignal imports
  // from any file under src/components/** whose name contains Fab,
  // Popup, Overlay, or Widget. Codifies the November 2026 PromotionalPopup
  // FAB regression: the FAB shifted from bottom-6 to bottom-24 on slide
  // change because it subscribed to hero alignment, and operators read
  // the positional drift as a bug. The contract for global overlays is
  // anchor + z-layer, never section-level layout state.
  //
  // Why a separate scoped block (and not a global ban): the alignment
  // signal lib has legitimate future consumers inside the hero subtree
  // (e.g. an alignment-aware reading-progress bar inside the hero). A
  // global ban would over-reach. Scoping by file-name pattern matches
  // exactly the surface the memory rule calls out.
  //
  // Override: `// eslint-disable-next-line no-restricted-imports
  // -- <reason>` if a future overlay genuinely needs alignment-aware
  // behavior — but prefer routing through a hero-subtree wrapper first.
  //
  // Pairs with:
  //   - src/test/lint-fixtures/hero-alignment-signal-overlay-banned.tsx
  //   - src/test/lint-rule-hero-alignment-signal-overlay.test.ts
  //   - src/test/lint-config-resolution.test.ts (resolution assertion)
  //   - mem://style/global-overlay-stability
  // ─────────────────────────────────────────────────────────────────────
  defineScopedImportDoctrine({
    files: [
      "src/components/**/*Fab*.{ts,tsx}",
      "src/components/**/*Popup*.{ts,tsx}",
      "src/components/**/*Overlay*.{ts,tsx}",
      "src/components/**/*Widget*.{ts,tsx}",
      // Lint fixture lives outside src/components/**; include explicitly
      // so the smoke / resolution tests (which use `ignore: false`) see
      // the rule applied.
      "src/test/lint-fixtures/hero-alignment-signal-overlay-banned.tsx",
    ],
    ignores: [
      // Test files for the popup itself shouldn't be subject to a runtime
      // import ban — they only assert behavior, not subscribe to signals.
      "**/*.test.{ts,tsx}",
    ],
    basePaths: HERO_ALIGNMENT_OVERLAY_PATHS,
    extraPaths: [],
  }),
  // ─────────────────────────────────────────────────────────────────────
  // ThemeAwareColorInput single-ownership doctrine — bans raw native
  // `<input type="color">` JSX inside the website-editor tree. Codifies the
  // May 2026 "color picker drift" finding: the editor had four ad-hoc
  // native color inputs (HeroTextColorsEditor, SectionStyleEditor,
  // AnnouncementBarContent, SiteDesignPanel + the custom row in
  // PromotionalPopupEditor), and operators couldn't pick "the same color
  // as the See Offer chip" without eyedropping the live preview. The
  // canonical `<ThemeAwareColorInput>` surfaces theme tokens + colors
  // already in use elsewhere on the site, then falls through to a native
  // picker — adopt it everywhere, never hand-roll a new swatch grid.
  //
  // Override (only legitimate consumers):
  //   - src/components/dashboard/website-editor/inputs/ThemeAwareColorInput.tsx
  //   - src/components/dashboard/website-editor/inputs/SectionBackgroundColorPicker.tsx
  //     (the per-section background picker shipped before this canon and
  //      uses the same swatch UX; harmless to keep its native input).
  //
  // Backed by:
  //   - mem://style/theme-aware-color-input
  //   - src/test/lint-fixtures/theme-aware-color-input-banned.tsx
  //   - src/test/lint-config-resolution.test.ts
  // ─────────────────────────────────────────────────────────────────────
  defineScopedDoctrine({
    files: [
      "src/components/dashboard/website-editor/**/*.{ts,tsx}",
      "src/test/lint-fixtures/theme-aware-color-input-banned.tsx",
    ],
    ignores: [
      "src/components/dashboard/website-editor/inputs/ThemeAwareColorInput.tsx",
      "src/components/dashboard/website-editor/inputs/SectionBackgroundColorPicker.tsx",
    ],
    extraSelectors: [
      {
        selector: "JSXOpeningElement[name.name='input'] > JSXAttribute[name.name='type'][value.value='color']",
        message: "Native <input type=\"color\"> is forbidden inside the website-editor tree. Use <ThemeAwareColorInput value onChange label /> from '@/components/dashboard/website-editor/inputs/ThemeAwareColorInput' instead — it surfaces theme tokens and colors already used elsewhere on the site, so operators can match the See Offer chip / theme primary in one click.",
      },
    ],
  }),

  // ─────────────────────────────────────────────────────────────────────
  // Container-Aware Responsiveness — bans viewport-driven 2-column grids
  // inside the website-editor tree. The editor sidebar is a NARROW
  // container regardless of viewport width; `sm:` (640px) snaps to
  // 2 columns and crowds paired fields. Use container queries
  // (@container md:grid-cols-2) or stack vertically instead.
  //
  // Trap history (May 2026): the promo popup editor shipped 3
  // `sm:grid-cols-2` rows that crushed labels in the sidebar; fixed by
  // stacking, this doctrine prevents the next contributor from
  // reintroducing the pattern.
  //
  // Backed by:
  //   - mem://style/container-aware-responsiveness
  //   - src/test/lint-fixtures/website-editor-viewport-grid-banned.tsx
  //   - src/test/lint-config-resolution.test.ts
  // ─────────────────────────────────────────────────────────────────────
  defineScopedDoctrine({
    files: [
      "src/components/dashboard/website-editor/**/*.{ts,tsx}",
      "src/test/lint-fixtures/website-editor-viewport-grid-banned.tsx",
    ],
    extraSelectors: [
      {
        // Banned: `sm:grid-cols-{2..9}` and `md:grid-cols-{2..9}`. Both
        // breakpoints (640px / 768px) trigger off the VIEWPORT, not the
        // editor sidebar — which stays narrow even on a 27" monitor. The
        // result is multi-column grids crushed into the sidebar
        // (May 2026: PopupAnalyticsCard funnel tiles rendered as 5×80px
        // single-character columns; promo editor field rows crowded at
        // 2-up). `lg:` (1024px) is allowed because at that viewport the
        // sidebar is itself wide enough to host real columns.
        selector: "Literal[value=/\\b(sm|md):grid-cols-[2-9]\\b/]",
        message: "Viewport-driven multi-column grids (`sm:grid-cols-N` / `md:grid-cols-N`) are banned inside the website-editor tree — the sidebar is a narrow container at every viewport, so `sm:` (640px) and `md:` (768px) crush paired fields and analytics tiles. Stack vertically (`grid grid-cols-1 gap-3`) or use container-width measurement (`useContainerWidth` + a ladder, see PopupAnalyticsCard.tsx). Doctrine: mem://style/container-aware-responsiveness.",
      },
      {
        selector: "TemplateElement[value.raw=/\\b(sm|md):grid-cols-[2-9]\\b/]",
        message: "Viewport-driven multi-column grids (`sm:grid-cols-N` / `md:grid-cols-N`) are banned inside the website-editor tree — the sidebar is a narrow container at every viewport, so `sm:` (640px) and `md:` (768px) crush paired fields and analytics tiles. Stack vertically (`grid grid-cols-1 gap-3`) or use container-width measurement (`useContainerWidth` + a ladder, see PopupAnalyticsCard.tsx). Doctrine: mem://style/container-aware-responsiveness.",
      },
    ],
  }),
);
