// ──────────────────────────────────────────────────────────────────────
// eslint.helpers.js — source of truth for ESLint doctrine arrays and the
// scope-helper builders. Kept out of eslint.config.js so the flat-config
// surface stays scannable in <100 lines and so codemod scripts /
// custom linters can import the same arrays without pulling in
// tseslint + plugin transitive deps.
//
// Exports:
//   - CONSOLIDATED_RESTRICTED_SYNTAX  (no-restricted-syntax doctrine array)
//   - PLATFORM_PRIMITIVE_PATHS         (no-restricted-imports doctrine array)
//   - defineScopedDoctrine             (scoped no-restricted-syntax block builder)
//   - defineScopedImportDoctrine       (scoped no-restricted-imports block builder)
//
// Doctrine: every file-scoped no-restricted-* block in eslint.config.js
// MUST go through the scope helpers. Raw `"no-restricted-syntax": [` /
// `"no-restricted-imports": [` keys outside a defineScoped*Doctrine call
// are banned by the meta-test src/test/lint-config-helper-usage.test.ts.
// ──────────────────────────────────────────────────────────────────────

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
/**
 * Build a `no-restricted-syntax` entry that enforces the CustomEvent
 * Ownership canon: a single dispatcher module owns one named event, and
 * every other site that constructs `new CustomEvent('<name>', ...)` is
 * banned. Pair every entry with (a) a sole-dispatcher module that uses an
 * inline `eslint-disable-next-line no-restricted-syntax` to perform the
 * actual dispatch, (b) a banned fixture under src/test/lint-fixtures/, and
 * (c) an assertion in src/test/lint-config-resolution.test.ts.
 *
 * Templates: src/lib/siteSettingsDraft.ts (site-settings-draft-write),
 *            src/lib/promoPopupPreviewReset.ts (promo-popup-preview-{reset,state}).
 *
 * Usage:
 *   defineEventOwnershipSelector({
 *     event: 'my-event',
 *     owner: 'src/lib/myEventOwner.ts',
 *     dispatcher: 'dispatchMyEvent()',          // optional helper hint
 *     rationale: 'centralizes payload shape',   // optional, appended to message
 *   })
 */
export function defineEventOwnershipSelector({ event, owner, dispatcher, rationale }) {
  if (!event || !owner) {
    throw new Error("defineEventOwnershipSelector requires { event, owner }.");
  }
  const dispatcherHint = dispatcher
    ? `Use \`${dispatcher}\` from that module instead of inlining a CustomEvent`
    : `Add the dispatch inside ${owner} instead of inlining a CustomEvent`;
  const tail = rationale ? ` — ${rationale}.` : ".";
  return {
    selector: `NewExpression[callee.name='CustomEvent']:has(Literal[value='${event}'])`,
    message: `The \`${event}\` event is owned exclusively by ${owner}. ${dispatcherHint}${tail}`,
  };
}

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
  defineEventOwnershipSelector({
    event: "site-settings-draft-write",
    owner: "src/lib/siteSettingsDraft.ts",
    rationale: "empty-detail dispatches from helpers like triggerPreviewRefresh() caused the May 2026 promo-popup snap-back regression; if you need this event from a new write path, add the dispatch inside siteSettingsDraft.ts",
  }),
  defineEventOwnershipSelector({
    event: "promo-popup-preview-reset",
    owner: "src/lib/promoPopupPreviewReset.ts",
    dispatcher: "dispatchPromoPopupPreviewReset()",
    rationale: "the helper centralizes the payload shape and keeps the editor in lockstep with the popup listener",
  }),
  defineEventOwnershipSelector({
    event: "promo-popup-preview-state",
    owner: "src/lib/promoPopupPreviewReset.ts",
    dispatcher: "dispatchPromoPopupPreviewState(phase)",
    rationale: "the popup is the sole dispatcher and the editor the sole consumer; inlining a CustomEvent breaks the typed phase union and the last-phase replay cache",
  }),
  defineEventOwnershipSelector({
    event: "editor-section-hover",
    owner: "src/lib/editorSectionHover.ts",
    dispatcher: "dispatchEditorSectionHover({ sectionId })",
    rationale: "sidebar→canvas hover bridge depends on a single typed payload shape; inlining the CustomEvent risks string drift between dispatcher and the LivePreviewPanel forwarder",
  }),
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
export function defineScopedDoctrine({ files, ignores, extraSelectors = [] }) {
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
export const PLATFORM_PRIMITIVE_PATHS = [
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
export function defineScopedImportDoctrine({
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

