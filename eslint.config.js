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
      // Severity is `warn` until the Wave 2 sweep clears existing leaks;
      // promote to `error` after the sweep lands.
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
      ],
    },
  },
);
