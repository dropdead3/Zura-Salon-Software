

## Problem

When users change their system color theme (Zura, Cream, Rose, etc.) in Appearance settings, the service category colors (Quick Themes) remain unchanged. Users expect a cohesive brand experience — switching to "Zura" should also update category colors to the purple-toned "Lavender Fields" palette, not leave them on "Ocean Avenue."

## Solution

Create a mapping from dashboard color themes → service category quick themes, and auto-apply the matching category theme whenever the color theme changes.

### 1. Define the color-theme-to-category-theme mapping

**File: `src/hooks/useColorTheme.ts`** — Add an exported constant:

```text
ColorTheme  →  Category Theme Name
─────────────────────────────────────
zura        →  Lavender Fields
cream       →  Golden Hour
rose        →  Rose Garden
sage        →  Coastal Breeze
ocean       →  Ocean Avenue
ember       →  Sunset Bloom
noir        →  Neutral Elegance
```

This maps each system theme to the most aesthetically compatible service category quick theme by name.

### 2. Auto-apply matching category theme on color theme change

**File: `src/components/dashboard/settings/SettingsCategoryDetail.tsx`**

In the Appearance section where `setColorTheme(themeOption.id)` is called (line 590), add logic to also apply the matching service category theme:

- Import `useServiceCategoryThemes` and `useApplyCategoryTheme` from `useCategoryThemes`
- Import the mapping constant
- After `setColorTheme(id)`, look up the mapped category theme name, find it in the loaded themes list, and call `applyTheme.mutate(matchedTheme)`
- Show a toast confirming both changes: "Theme updated — service colors synced to {name}"

### 3. Also sync on website theme activation

**File: `src/components/dashboard/settings/WebsiteSettingsContent.tsx`** (line 490-493)

Same pattern: when a website theme activates and sets a color scheme, also apply the matching category theme.

### Technical details

**Files changed:**
- `src/hooks/useColorTheme.ts` — Add `COLOR_THEME_TO_CATEGORY_MAP` export (~10 lines)
- `src/components/dashboard/settings/SettingsCategoryDetail.tsx` — Import map + hooks, add auto-apply call (~15 lines)
- `src/components/dashboard/settings/WebsiteSettingsContent.tsx` — Same pattern (~10 lines)

**Behavior:**
- Mapping is by theme **name** (string match against `service_category_themes.name`)
- If no matching category theme is found (e.g., custom org deleted it), silently skip — no error
- Existing manually-chosen category themes are overridden (this is intentional — theme sync is the expected UX)
- The sync is immediate and shows a confirmation toast

