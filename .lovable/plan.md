

## Problem

Zura's brand identity uses violet/purple gradients (visible on the marketing site: `bg-slate-950`, violet-500/purple-500 accents). But the dashboard has no matching theme — only cream, rose, sage, and ocean. New accounts default to cream, which doesn't match the brand at all.

## Plan

### 1. Add a "Zura" color theme (violet/purple)

**File: `src/index.css`** — Add two new theme blocks after the ocean theme:

**Light mode (`.theme-zura`):**
- Background: soft lavender wash (~`260 25% 95%`)
- Cards: slightly elevated lavender (`260 20% 97%`)
- Primary: rich violet (`270 70% 55%`)
- Accents, borders, sidebar: violet-tinted neutrals
- Consistent with the platform admin light theme palette already defined

**Dark mode (`.dark.theme-zura`):**
- Background: deep slate matching marketing site (`230 25% 5%` — near `slate-950`)
- Cards: dark navy-slate (`230 20% 10%`)
- Primary: violet (`270 75% 60%`)
- Accents: violet-washed darks
- Muted/borders: slate-blue tones matching the marketing page aesthetic
- This should feel like using the marketing site as a dashboard

### 2. Register the theme in the type system and metadata

**File: `src/hooks/useColorTheme.ts`:**
- Add `'zura'` to the `ColorTheme` union type
- Add it to the validation array
- Add theme metadata entry with violet/purple preview swatches
- **Change the default** from `'cream'` to `'zura'` (line 8, initial state)

### 3. Update theme application logic

**File: `src/hooks/useColorTheme.ts`:**
- Add `'theme-zura'` to the `classList.remove()` call

### 4. Add terminal splash palette for Zura theme

**File: `src/lib/terminal-splash-palettes.ts`:**
- Add a `zura` entry with violet gradient stops and purple accent colors

### 5. Wire into appearance settings UI

**File: `src/components/dashboard/settings/SettingsCategoryDetail.tsx`:**
- No changes needed — it already maps over `colorThemes` array dynamically

### Technical details

**Files changed:**
- `src/index.css` — ~120 new lines for `.theme-zura` light + `.dark.theme-zura` dark
- `src/hooks/useColorTheme.ts` — type union, default, metadata, classList
- `src/lib/terminal-splash-palettes.ts` — new palette entry

**Dark mode color mapping (marketing site → dashboard theme):**

| Marketing site | Dashboard `.dark.theme-zura` |
|---|---|
| `bg-slate-950` (~`222 47% 5%`) | `--background: 230 25% 5%` |
| `bg-violet-500/10` card glass | `--card: 230 20% 10%` |
| `text-white` | `--foreground: 240 20% 95%` |
| `violet-500` (`270 75% 60%`) | `--primary: 270 75% 60%` |
| `violet-500/20` borders | `--border: 240 15% 20%` |
| violet/purple gradients | `--accent: 270 30% 20%` |

**Default change:** New users (no localStorage) will get `'zura'` instead of `'cream'`. Existing users keep their saved preference.

