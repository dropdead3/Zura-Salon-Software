## Root cause

The autofill normalization in `src/index.css` (~line 3170) sets:

```css
-webkit-text-fill-color: currentColor !important;
```

`currentColor` resolves against the input's own computed `color`, not the surrounding theme wrapper. Because the base `<Input>` primitive does not declare its own `color`, it falls back to Chrome's UA default for form controls (black) — so autofilled text paints black even on the dark login surface where the wrapper has `text-white`.

Compounding this: `-webkit-text-fill-color` always wins over `color` for autofilled inputs, so a `text-white` className on the input has no effect on autofilled text.

## Fix

Replace `currentColor` with the theme-aware foreground token so autofilled text follows the active theme automatically:

```css
-webkit-text-fill-color: hsl(var(--foreground)) !important;
caret-color: hsl(var(--foreground)) !important;
```

`--foreground` is already defined per theme (white in dark mode, near-black in light mode) and updates reactively when the theme switches. This means:

- Login (dark) → autofilled text = white ✅
- Light-mode dashboard form → autofilled text = near-black ✅
- Theme switch → autofilled text re-paints automatically ✅

This is the canonical fix because it removes the dependency on cascade resolution and pins autofill text to the same token every other piece of UI text uses.

## Files to change

1. **`src/index.css`** (~line 3170)
   - Replace `-webkit-text-fill-color: currentColor !important` with `-webkit-text-fill-color: hsl(var(--foreground)) !important`
   - Replace `caret-color: currentColor !important` with `caret-color: hsl(var(--foreground)) !important`

2. **`mem://style/input-shape-canon.md`**
   - Update the autofill normalization section to document why `currentColor` is banned and `--foreground` is required.
   - Add this to the anti-patterns list: "Using `currentColor` in `-webkit-text-fill-color` — autofill resolves it to UA defaults, not the surrounding theme."

## Acceptance criteria

- On `/login` in dark mode: Chrome autofills `email`/`password` → text is white and clearly visible against the dark input.
- Switching to a light-mode org theme on a form with autofill → text is dark/foreground-colored, not white-on-white.
- The pill input shape and fill-tone focus behavior remain unchanged (this is a color-only change, no geometry or focus interaction touched).
- No regression on Safari (which uses the same `:-webkit-autofill` selector path).

## Why this won't flip again

The previous three rounds on this surface all failed because each fix targeted a *different layer* (the primitive className, the autofill mask, the global focus outline) without addressing the actual color resolution. Pinning to `--foreground` aligns autofill with the same token system that drives every other text surface — the next theme change (Cream, Rose, Ocean, etc.) will automatically pick up the right autofill color without any further work.

## Enhancement suggestions

1. **Visual regression QA on theme switch** — the canon memory should call out a test case: autofill an input in dark mode, switch to a light theme, confirm autofill text re-paints to the new foreground color.
2. **Stylelint rule (deferred)** — when the deferred input-shape lint rule lands, also ban `currentColor` inside `-webkit-text-fill-color` declarations. That's the leverage marker that prevents this from ever recurring.
