

## Plan: Reorder Zura to first + Add Ember & Noir themes

### Changes

#### 1. `src/hooks/useColorTheme.ts`
- Update `ColorTheme` type: `'zura' | 'cream' | 'rose' | 'sage' | 'ocean' | 'ember' | 'noir'`
- Add `'ember'` and `'noir'` to the validation array and `classList.remove` call
- Move the Zura entry to **first** in the `colorThemes` array
- Add Ember metadata (warm amber/burnt orange swatches) and Noir metadata (pure monochrome swatches)

#### 2. `src/index.css`
Add two new theme blocks after the Zura block:

**Ember** (warm amber/burnt orange):
- Light: warm cream-amber background (`25 30% 94%`), amber primary (`25 80% 50%`), burnt orange accents
- Dark: deep warm brown-black (`20 20% 5%`), amber-orange primary (`25 75% 55%`), warm brown cards/borders

**Noir** (pure monochrome):
- Light: neutral white-gray (`0 0% 96%`), black primary (`0 0% 8%`), gray accents
- Dark: pure black background (`0 0% 4%`), white primary (`0 0% 95%`), neutral gray cards/borders — ultra-minimal, no hue

#### 3. `src/lib/terminal-splash-palettes.ts`
- Add `ember` palette (warm amber gradient stops, orange accent hex)
- Add `noir` palette (pure gray gradient stops, white accent)

#### 4. `src/components/layout/Layout.tsx`
- Add `'theme-ember'` and `'theme-noir'` to the classList removal logic

### Files touched
- `src/hooks/useColorTheme.ts`
- `src/index.css` (~240 new lines for 2 themes)
- `src/lib/terminal-splash-palettes.ts`
- `src/components/layout/Layout.tsx`

