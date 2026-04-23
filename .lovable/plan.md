

# Rename Prism → **Orchid** (premium magenta-violet jewel)

## Diagnosis

The current Prism theme is visually strong as a **monochrome magenta-violet jewel-tone**, but the name "Prism" promised a multi-color rainbow it doesn't deliver. Two clean options:
1. Force Prism into actual rainbow (chrome split, gradient swatch — already done partially, still feels off-brand)
2. **Rename to honor what it actually is** — a premium hot-pink/purple jewel theme

You picked option 2. Smart call — the look is good, the label was wrong.

### Naming differentiation

Existing pink/purple-adjacent themes:

| Theme | Hue | Register | Reads as |
|---|---|---|---|
| Zura | 270° | Brand violet | Corporate violet/purple |
| Neon | 330° | Hot pink on black | Loud cyberpunk magenta |
| Prism (current) | 290° | Magenta-violet jewel | Premium iridescent purple-pink |

Hue 290° sits squarely between Zura's violet and Neon's hot pink — closer to **orchid / fuchsia jewel-tone**. The right name is **Orchid** (premium floral magenta-purple, evokes Hermès / Tom Ford / luxury beauty register).

Alternative names considered: Fuchsia (too literal/loud), Plum (too dark/fruit), Mulberry (too rustic), Iris (too soft). **Orchid** lands the jewel-luxury register.

## What changes

### Single concept

**Rename `prism` theme key + label to `orchid`** with copy that reflects its actual identity ("Premium magenta-violet jewel"). Revert the rainbow chart spectrum to a cohesive monochrome series so the theme reads consistent end-to-end. Revert the picker swatch gradient override and sidebar-primary cyan split — those were workarounds for a multi-color promise we're no longer making.

### 1. `src/hooks/useColorTheme.ts`

- Replace `'prism'` with `'orchid'` in `ColorTheme` union and `ALL_THEMES` array
- Add `prism: 'orchid'` to `LEGACY_THEME_MIGRATION` so any user already on Prism transparently migrates
- Update `COLOR_THEME_TO_CATEGORY_MAP`: `orchid: 'Lavender Fields'` (closest match)
- Update `colorThemes` entry:

```ts
{
  id: 'orchid' as ColorTheme,
  name: 'Orchid',
  description: 'Premium magenta & violet jewel',
  // previews unchanged from current Prism values
}
```

### 2. `src/index.css`

- Rename `.theme-prism` → `.theme-orchid` and `.dark.theme-prism` → `.dark.theme-orchid`
- Restore monochrome chart series (currently rainbow):

| Token | Was (rainbow) | Becomes (cohesive magenta family) |
|---|---|---|
| `--chart-1` | `290 75% 55%` (magenta) | unchanged — primary anchor |
| `--chart-2` | `200 80% 50%` (cyan) | `270 65% 55%` (violet) |
| `--chart-3` | `145 65% 45%` (green) | `310 60% 55%` (pink-magenta) |
| `--chart-4` | `42 90% 55%` (gold) | `42 75% 50%` (gold accent — keep, every theme has gold chart-4) |
| `--chart-5` | `15 85% 58%` (coral) | `260 55% 50%` (deep purple) |

Same shift in dark mode (proportionally brightened). Result: monochrome magenta-violet-purple family with gold accent — matches every other premium theme (Marine, Bone, Jade pattern).

- Revert `--sidebar-primary` from cyan (`200°`) back to magenta (`290°`) in both light + dark — the cyan split was only justified by the rainbow promise.

### 3. `src/components/dashboard/settings/SettingsCategoryDetail.tsx`, `KioskSettingsDialog.tsx`, `KioskLocationSettingsForm.tsx`

- Remove the conditional gradient swatch override for `themeOption.id === 'prism'`. Orchid renders as a normal three-square swatch like every other theme.

### 4. `src/lib/terminal-splash-palettes.ts`

- Rename `prism` key → `orchid`. Hex values unchanged (already a single magenta glow on indigo gradient — fits the new name perfectly).

### 5. `src/components/dashboard/settings/EmailBrandingSettings.tsx`

- Rename `prism: '#C43EFF'` → `orchid: '#C43EFF'`. Hex unchanged.

### 6. Migration safety

The `LEGACY_THEME_MIGRATION` map already handles renames transparently (it migrated `cream → bone`, `rose → rosewood`, etc.). Adding `prism: 'orchid'` means:
- Anyone with `prism` in localStorage → migrated on next load
- Anyone with `prism` in `site_settings` → transparently rewritten on next mount via the existing legacy-rewrite flow in `useColorTheme.ts` lines 76–79

Zero user-visible disruption.

## Acceptance

1. Theme picker now shows **12 themes**, with **Orchid** in the slot Prism used to occupy (last position).
2. Orchid renders as standard three-square swatch (no gradient override) — magenta primary square is the visible identifier.
3. Selecting Orchid: chrome reads as **cohesive magenta-violet jewel** — sidebar primary, buttons, focus rings, and chart-1 all in the magenta-violet family. Charts use a 4-stop violet→magenta→pink series + gold chart-4 (matches Marine/Bone/Jade pattern).
4. Light + dark mode both render cleanly.
5. Existing users on Prism are silently migrated — no theme reset, no flash.
6. Terminal splash for Orchid renders identical to current Prism splash (single magenta glow).
7. No regression on other 11 themes.

## What stays untouched

- Visual appearance of the theme — same hues, same chrome, same primary anchor (`290°` magenta)
- All 11 other themes
- Theme picker layout, persistence, migration flow (we extend it, don't change it)
- Gold accent system (chart-4)

## Out of scope

- Building a separate genuinely-multi-color theme (deferred — can revisit if you want a rainbow theme later, but it'd need a new name like "Spectrum" and likely structural work on the primary token)
- Renaming any other theme
- Adjusting the magenta hue itself

## Doctrine alignment

- **Brand abstraction:** "Orchid" is evocative-neutral, no tenant association. Matches floral/jewel naming pattern of Sage, Jade, Rosewood, Cognac.
- **Calm executive UX:** monochrome chart series restores cohesion — no more cyan/green/yellow chart bars in a magenta-themed dashboard.
- **Differentiation discipline:** Orchid (290° jewel-magenta) sits cleanly between Zura (270° brand violet) and Neon (330° hot pink), occupying the orchid/fuchsia jewel band neither covers.

## Prompt feedback

Strong, decisive prompt — three things you did right:

1. **You gave a verdict before a request** ("this monochrome prism theme is nice"). Naming what's working *first* told me not to redesign the colors — only the framing/label needs to change. Saved a "should I rebuild it" round-trip.
2. **You named the new identity ("hot pink/purple")** — that's the *register* anchor that lets me name it precisely. Without that, "rename Prism" leaves the name space wide open (Magenta? Fuchsia? Plum?). The hue-pair locked the band.
3. **You used "keep it as a new"** — the word "keep" signals preservation (don't redesign), and "new" signals rebrand (don't keep the old name). Two words doing four words of work.

Sharpener: naming the **adjacencies you want to avoid** would have removed my one remaining decision (which name to pick). "Hot pink/purple — distinct from Neon (already hot pink) and Zura (already purple)" would have pointed me directly at the orchid/fuchsia band. Template:

```text
Verdict: keep / change / rebrand [feature]
New identity: [hue + register, e.g. "premium hot pink/purple jewel"]
Differentiate from: [adjacent existing names — "not Neon, not Zura"]
```

Three lines, zero ambiguity. The **"distinct from X and Y"** field is especially high-leverage on rename prompts because the failure mode is *naming-collision* (calling it "Magenta" when Neon is already magenta, or "Violet" when Zura is already violet). You hit the band right but a name like "Magenta" or "Pink" would have created a confusing duplicate-by-feel even with a different hue.

## Further enhancement suggestion

For **rebrand-existing-thing** prompts specifically, the highest-leverage frame is a one-line spec:

```text
Rebrand [old name] → [new identity], distinct from [adjacent existing names]. Keep [what works]. Drop [what doesn't].
```

Example that would have collapsed this into a single iteration with zero design exploration:

```text
Rebrand Prism → premium hot pink/purple jewel, distinct from Neon and Zura. Keep current monochrome look. Drop the rainbow ambition.
```

Single sentence, four constraints (new identity, differentiation, preserve, remove). The **"Keep / Drop"** pairing is the underused construct on rebrands — most rebrand prompts only say "rename" and leave me to guess whether the *visuals* should change too. You implied "keep the visuals" with "this monochrome prism theme is nice" but explicit "Keep / Drop" lines remove all ambiguity in one beat.

