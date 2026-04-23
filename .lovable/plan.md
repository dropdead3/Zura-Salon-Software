

# Reorder themes + rename Bone → Cream Lux

## Final order (11 visible + Marine appended)

1. Zura
2. **Cream Lux** (renamed from Bone)
3. Neon
4. Rosewood
5. Rose Gold
6. Peach
7. Cognac
8. Jade
9. Sage
10. Matrix
11. Noir
12. Marine *(kept, appended at end)*

This order is applied wherever themes are rendered: the Settings color picker, the Kiosk theme picker, the Website settings preview grid.

## Rename: `bone` → `cream-lux` (full rename)

Per your decision, the rename goes deep — TypeScript key, CSS class, display label, and a legacy migration so any existing user/org on `bone` auto-upgrades silently to `cream-lux` on next load.

### TypeScript changes

**`src/hooks/useColorTheme.ts`**
- `ColorTheme` union: replace `'bone'` with `'cream-lux'`
- `ALL_THEMES` array: reordered + renamed
- `LEGACY_THEME_MIGRATION` map: add `bone: 'cream-lux'` (and keep existing `cream: 'cream-lux'`, retargeted from old `bone`)
- `colorThemes` metadata array: reordered, with the renamed entry:
  ```ts
  { id: 'cream-lux', name: 'Cream Lux', description: 'Cool desert gray & oat', ... }
  ```
- `COLOR_THEME_TO_CATEGORY_MAP`: replace `bone` key with `cream-lux`
- `applyTheme()` legacy class strip list: add `'theme-bone'` to the removal set
- Default fallback in `getLocalTheme()`: still returns `'zura'` (unchanged)

### CSS changes (`src/index.css`)

5 selectors to rewrite:
- Line 79: `.theme-bone` → `.theme-cream-lux`
- Line 241: `.dark.theme-bone` → `.dark.theme-cream-lux`
- Line 2896: `html.theme-bone body::before` → `html.theme-cream-lux body::before`
- Line 2927: `html.theme-bone` (mesh gradient block) → `html.theme-cream-lux`
- Line 3025: `html.dark.theme-bone` (mesh gradient dark) → `html.dark.theme-cream-lux`

Palette values themselves are untouched — same near-neutral oat tones, just a new selector name.

### Other files touched

- **`src/components/layout/Layout.tsx`** — `DASHBOARD_THEME_CLASSES` array: replace `'theme-bone'` with `'theme-cream-lux'`. Default theme application in marketing layout (`root.classList.add('theme-bone')`) → `root.classList.add('theme-cream-lux')`. Add `'theme-bone'` to a legacy-strip list so any leftover class on `documentElement` is removed before apply.
- **`src/components/dashboard/settings/WebsiteSettingsContent.tsx`** — `validSchemes` array: add `'cream-lux'`, keep `'bone'` for legacy. `LEGACY_MAP`: add `bone: 'cream-lux'`.
- **`src/components/dashboard/settings/EmailBrandingSettings.tsx`** — `THEME_ACCENT_DEFAULTS` map: replace `bone` key with `cream-lux` (same hex `#A8763A`).
- **`src/components/dashboard/settings/KioskLocationSettingsForm.tsx`** — useState defaults `'bone'` → `'cream-lux'`.
- **`src/components/kiosk/KioskSettingsDialog.tsx`** — useState default `'bone'` → `'cream-lux'`.
- **`src/components/dashboard/settings/terminal/S710CheckoutSimulator.tsx`** — three function param defaults `colorTheme = 'bone'` → `colorTheme = 'cream-lux'`.
- **`src/lib/terminal-splash-palettes.ts`** — `terminalPalettes` object: rename `bone:` key to `'cream-lux':`. Fallback in `getTerminalPalette()`: `terminalPalettes.bone` → `terminalPalettes['cream-lux']`.

### Migration safety net

Three-layer fallback ensures no user sees a broken theme:

1. **Local storage migration**: `migrateLegacyTheme('bone')` returns `'cream-lux'`, then re-persists.
2. **DB migration**: When the DB row holds `bone`, the existing rewrite logic in `useColorTheme` (lines 137–140) fires and writes back `cream-lux` transparently.
3. **CSS class strip**: `applyTheme()` strips `.theme-bone` before adding `.theme-cream-lux`, so no double-class state.

No SQL migration needed — the org-level `site_settings` row is rewritten on next load by any user who visits.

## Files touched (summary)

| File | Change |
|---|---|
| `src/hooks/useColorTheme.ts` | Type, arrays, metadata, migration map |
| `src/index.css` | 5 CSS selectors |
| `src/components/layout/Layout.tsx` | Class array + default apply |
| `src/components/dashboard/settings/WebsiteSettingsContent.tsx` | Valid schemes + legacy map |
| `src/components/dashboard/settings/EmailBrandingSettings.tsx` | Accent defaults map |
| `src/components/dashboard/settings/KioskLocationSettingsForm.tsx` | useState default |
| `src/components/kiosk/KioskSettingsDialog.tsx` | useState default |
| `src/components/dashboard/settings/terminal/S710CheckoutSimulator.tsx` | 3 param defaults |
| `src/lib/terminal-splash-palettes.ts` | Palette key rename |

## Acceptance

1. The theme picker on `/dashboard/admin/settings` renders themes in the exact order: Zura, Cream Lux, Neon, Rosewood, Rose Gold, Peach, Cognac, Jade, Sage, Matrix, Noir, Marine.
2. The renamed theme appears as **"Cream Lux"** with the same description, swatches, and visual identity it had as Bone.
3. Selecting Cream Lux applies `.theme-cream-lux` class and pulls the same near-neutral oat palette as before.
4. Existing users/orgs whose stored value is `bone` are auto-migrated to `cream-lux` on next page load — no broken state, no flash of wrong theme.
5. Marine is still selectable, just appears last in the list.
6. Kiosk theme picker, Website settings color scheme dropdown, and Terminal splash simulator all use the new key + ordering.
7. No grep hits for the literal string `'bone'` or `"bone"` remain in the codebase except inside `LEGACY_THEME_MIGRATION` and the `validSchemes` legacy allowlist (intentional, for migration).
8. Build passes. No TypeScript errors.

## Out of scope

- Adding new themes.
- Changing palette values for any theme (Cream Lux keeps Bone's exact HSL tokens — this is a rename only).
- Reordering themes in the database service-category map (pure UI/picker order change).
- A SQL migration to rewrite all `bone` rows in bulk — the lazy in-app migration is sufficient and zero-risk.
- Changing the marketing site's default light theme behavior (still applies the renamed class via the same mechanism).

## Prompt feedback

Crisp request — three things you did right:

1. **You gave the explicit final order in one line.** No ambiguity, no "roughly", no "something like" — just the sequence. That removes 90% of the back-and-forth.
2. **You named the rename target precisely** ("rename to Cream Lux and all its code base"). The "and all its code base" phrase is the key — it tells me to chase every reference, not just the display label, which is exactly the trap that creates half-renamed orphans.
3. **You combined two related changes into one request.** Reordering and renaming touch the same surface area, so doing them together avoids two passes through the same files.

Sharpener: when reordering a list, calling out **what's missing** is the highest-leverage addition. Template:

```text
Reorder [list] to: [explicit order]. 
[Item X] is intentionally [excluded / appended / replaced].
```

Example:
```text
Reorder themes to: Zura, Cream Lux, Neon, Rosewood, Rose Gold, Peach, Cognac, Jade, Sage, Matrix, Noir.
Marine is intentionally appended at the end.
```

The **"intentionally [disposition]"** clause is the underused construct on reorder prompts — without it I have to interrupt with a clarifying question (which I just did re: Marine), costing you a round-trip. Naming the disposition of the omitted item upfront would have saved that.

