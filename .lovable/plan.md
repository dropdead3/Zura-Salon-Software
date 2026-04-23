
# Fix the real remaining theme bug: stale inline CSS variables are outranking the active theme class

## What’s actually happening

Your correction was strong and useful: you didn’t just say “it still looks off,” you pointed to a concrete contradiction — **Matrix / Jade / Orchid is selected, but the UI is still rendering bone-like surfaces**. That pushes this out of “palette tuning” and into **theme ownership / CSS precedence**.

The earlier `Layout.tsx` fix addressed one writer of `theme-bone`, but there is a second, stronger failure mode still in play:

- The session replay shows the root class changing to `theme-matrix`.
- The screenshot still shows bone-like `--background`, `--primary`, and border values.
- In CSS, that only happens if **inline CSS custom properties on `document.documentElement`** are overriding the class-based theme tokens.

Inline `style="--background: ...; --primary: ..."` wins over `.theme-matrix { --background: ... }`.

## Root cause

`ThemeInitializer.tsx` applies `custom_theme` and `custom_typography` overrides to `<html>` via inline CSS variables, but it does **not reconcile stale overrides correctly**.

### Current bug in `ThemeInitializer`
When `loadCustomTheme()` runs on org-dashboard routes:

- If `custom_theme` exists, it applies `--background`, `--primary`, etc. inline.
- If later the backend returns `null` / empty values, it **does not clear previously applied inline theme vars first**.
- It then replaces `appliedVarsRef.current` with a new empty array, losing the ability to clean up the stale vars afterward.

That means old bone-like inline tokens can remain stuck on `<html>` and keep overriding every selected theme, even when the active class is `theme-jade`, `theme-matrix`, or `theme-orchid`.

## Why this matches your screenshot

The screenshot shows:

- Theme picker swatches are correct
- Selected theme state is correct
- Actual dashboard chrome still uses bone-like values

That combination means:
- the **selection logic is working**
- the **class switch is likely working**
- the **resolved CSS vars are being overridden elsewhere**

Given the current codebase, the strongest match is stale inline vars from the custom theme / typography pipeline.

## The fix

## 1) Make `ThemeInitializer` fully reconcile overrides on every load

**File:** `src/components/ThemeInitializer.tsx`

Replace the current “apply if present” behavior with a strict reconcile flow:

1. Build a canonical allowlist of org-level inline override keys
   - theme color keys from the custom theme system
   - typography keys from the typography system
2. Before applying anything new, remove all previously managed inline overrides
3. If the backend returns overrides, apply only those
4. If the backend returns no overrides, leave none applied

### Structural change
Instead of only tracking “what I just applied this time,” `ThemeInitializer` should always do:

```ts
clearManagedOrgOverrideVars();
applyCurrentServerOverrides();
appliedVarsRef.current = currentlyAppliedKeys;
```

That guarantees stale bone tokens cannot survive a theme change, a reset-to-default, or a session transition.

## 2) Use a canonical override-key registry instead of ad hoc cleanup

**Files:**
- `src/components/ThemeInitializer.tsx`
- `src/hooks/useCustomTheme.ts`
- `src/hooks/useTypographyTheme.ts`

Right now the custom theme keys and typography keys live in separate places. The cleanup logic should not guess.

Implementation approach:
- Export the editable color token keys from `useCustomTheme.ts`
- Export the typography token keys from `useTypographyTheme.ts`
- In `ThemeInitializer.tsx`, compose them into one `MANAGED_ORG_OVERRIDE_KEYS` list
- Clear only those keys, not every `--*` var

This keeps cleanup precise:
- removes stale org theme overrides
- preserves unrelated vars like `--god-mode-offset`
- does not touch platform-scoped vars

## 3) Clear stale inline theme vars even when no custom theme exists

**File:** `src/components/ThemeInitializer.tsx`

Add the missing branch:

- If `custom_theme` is null and `custom_typography` is null, explicitly clear managed org override vars.

This is the missing “reset to stylesheet defaults” path.

## 4) Keep class-based theme selection as the source of truth for built-in themes

**File:** `src/hooks/useColorTheme.ts`

No architecture rewrite needed, but this file remains the owner of the active built-in theme class.

Optional defense-in-depth:
- after `applyTheme(theme)`, do not clear all inline vars here
- let `ThemeInitializer` own override cleanup so responsibilities stay separated:
  - `useColorTheme` = class owner
  - `ThemeInitializer` = inline override reconciler

That avoids breaking legitimate saved custom themes.

## Files to modify

- **`src/components/ThemeInitializer.tsx`**
  - add canonical managed-key cleanup
  - clear stale overrides before applying new ones
  - clear overrides when backend returns none
- **`src/hooks/useCustomTheme.ts`**
  - export the editable theme token key list for shared cleanup
- **`src/hooks/useTypographyTheme.ts`**
  - export the typography token key list for shared cleanup

## Verification

1. Select **Matrix** in light mode:
   - page background, cards, borders, and primary accents should shift to Matrix tokens
   - selected card outline/check should no longer stay bone/tan
2. Repeat for **Jade** and **Orchid**
3. Toggle between Bone → Matrix → Orchid → Jade
   - each should immediately repaint with its own tokens
4. Reload the settings page
   - chosen theme should still render correctly
   - no bone inheritance unless Bone is actually selected
5. Reset any custom theme overrides to default
   - built-in themes should still render correctly afterward

## Why this is the right fix

The remaining bug is no longer “wrong class applied.”  
It is “correct class applied, but **higher-precedence inline vars still win**.”

That is why the UI can say Matrix while the page still looks Bone.

## Out of scope

- Re-tuning HSL palette values
- Changing the theme picker UI
- Reworking public-site theming again
- Adding a full canon for theme-writer ownership in this pass

## Prompt feedback

What you did well:
- You corrected the diagnosis directly instead of accepting a vague visual explanation.
- You used screenshots to show **selected state vs rendered state**, which is exactly how to expose precedence bugs.

Even sharper framing next time:
- The highest-signal version would be:  
  “Matrix is selected, but the page background, border, and primary accent are still bone-like. So the class/state is changing, but computed tokens are not.”

That phrasing tells the AI to inspect **state → class → computed variable precedence** instead of palette values.

## Enhancement suggestions after this fix

1. **Add a theme-integrity debug surface**
   - small dev-only panel showing:
     - current `<html>` theme class
     - whether `.dark` is active
     - current computed values for `--background`, `--primary`, `--border`
     - whether those values come from inline style vs stylesheet  
   This would make future theme bugs diagnosable in seconds.

2. **Add a canon for stale inline override cleanup**
   - assert that when `custom_theme` is null, managed org override keys are not left inline on `<html>`
   - this prevents the exact “class changed but bone vars remain” regression from coming back
