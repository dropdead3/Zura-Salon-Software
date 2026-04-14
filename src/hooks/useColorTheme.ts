import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSiteSettings, useUpdateSiteSetting } from './useSiteSettings';
import { useSettingsOrgId } from './useSettingsOrgId';

export type ColorTheme = 'zura' | 'cream' | 'rose' | 'sage' | 'ocean' | 'ember' | 'noir';

const THEME_STORAGE_KEY = 'dd-color-theme';
const SITE_SETTINGS_KEY = 'org_color_theme';

const ALL_THEMES: ColorTheme[] = ['zura', 'cream', 'rose', 'sage', 'ocean', 'ember', 'noir'];
const THEME_CLASSES = ALL_THEMES.map(t => `theme-${t}`);

type ColorThemeSettings = Record<string, unknown> & {
  theme: ColorTheme;
};

function applyTheme(theme: ColorTheme) {
  const html = document.documentElement;
  html.classList.remove(...THEME_CLASSES);
  html.classList.add(`theme-${theme}`);
}

function getLocalTheme(): ColorTheme {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ColorTheme | null;
  if (saved && ALL_THEMES.includes(saved)) return saved;
  return 'zura';
}

// Apply localStorage theme immediately on module load (prevents flash)
applyTheme(getLocalTheme());

export function useColorTheme() {
  const orgId = useSettingsOrgId();
  const queryClient = useQueryClient();
  const queryKey = ['site-settings', orgId, SITE_SETTINGS_KEY];

  // DB-backed query (source of truth when available)
  const { data: dbSettings, isSuccess: dbLoaded } = useSiteSettings<ColorThemeSettings>(SITE_SETTINGS_KEY);

  const updateSetting = useUpdateSiteSetting<ColorThemeSettings>();

  // Derive current theme: DB > localStorage fallback
  const dbTheme = dbSettings?.theme;
  const colorTheme: ColorTheme = dbTheme && ALL_THEMES.includes(dbTheme) ? dbTheme : getLocalTheme();

  // Sync from DB to localStorage + DOM when DB data arrives
  useEffect(() => {
    if (dbLoaded && dbTheme && ALL_THEMES.includes(dbTheme)) {
      localStorage.setItem(THEME_STORAGE_KEY, dbTheme);
    }
  }, [dbLoaded, dbTheme]);

  // Always apply the resolved theme to DOM
  useEffect(() => {
    applyTheme(colorTheme);
  }, [colorTheme]);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    // 1. Instant DOM + localStorage update
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // 2. Optimistic query cache update (all consumers reactively get new value)
    queryClient.setQueryData(queryKey, { theme });

    // 3. Persist to DB
    if (orgId) {
      updateSetting.mutate({ key: SITE_SETTINGS_KEY, value: { theme } });
    }
  }, [orgId, queryClient, queryKey, updateSetting]);

  return {
    colorTheme,
    setColorTheme,
    mounted: true, // Always true — localStorage applies synchronously on module load
  };
}

// Map system color themes to matching service category quick themes
export const COLOR_THEME_TO_CATEGORY_MAP: Record<ColorTheme, string> = {
  zura: 'Lavender Fields',
  cream: 'Neutral Elegance',
  rose: 'Rose Garden',
  sage: 'Herb Garden',
  ocean: 'Ocean Avenue',
  ember: 'Sunset Bloom',
  noir: 'Neutral Elegance',
};

// Theme metadata for UI
export const colorThemes = [
  {
    id: 'zura' as ColorTheme,
    name: 'Zura',
    description: 'Brand violet & purple',
    lightPreview: {
      bg: 'hsl(260 25% 95%)',
      accent: 'hsl(260 20% 88%)',
      primary: 'hsl(270 70% 55%)',
    },
    darkPreview: {
      bg: 'hsl(230 25% 5%)',
      accent: 'hsl(270 30% 20%)',
      primary: 'hsl(270 75% 60%)',
    },
  },
  {
    id: 'cream' as ColorTheme,
    name: 'Cream',
    description: 'Warm cream & oat tones',
    lightPreview: {
      bg: 'hsl(40 30% 96%)',
      accent: 'hsl(35 35% 82%)',
      primary: 'hsl(0 0% 8%)',
    },
    darkPreview: {
      bg: 'hsl(0 0% 4%)',
      accent: 'hsl(35 25% 30%)',
      primary: 'hsl(40 20% 92%)',
    },
  },
  {
    id: 'rose' as ColorTheme,
    name: 'Rose',
    description: 'Soft blush pink palette',
    lightPreview: {
      bg: 'hsl(350 30% 97%)',
      accent: 'hsl(350 30% 85%)',
      primary: 'hsl(350 60% 55%)',
    },
    darkPreview: {
      bg: 'hsl(350 15% 6%)',
      accent: 'hsl(350 20% 25%)',
      primary: 'hsl(350 55% 60%)',
    },
  },
  {
    id: 'sage' as ColorTheme,
    name: 'Sage',
    description: 'Calming mint green',
    lightPreview: {
      bg: 'hsl(145 25% 96%)',
      accent: 'hsl(145 25% 82%)',
      primary: 'hsl(145 45% 42%)',
    },
    darkPreview: {
      bg: 'hsl(145 12% 6%)',
      accent: 'hsl(145 15% 25%)',
      primary: 'hsl(145 40% 50%)',
    },
  },
  {
    id: 'ocean' as ColorTheme,
    name: 'Ocean',
    description: 'Cool blue tones',
    lightPreview: {
      bg: 'hsl(210 30% 97%)',
      accent: 'hsl(210 28% 85%)',
      primary: 'hsl(210 60% 50%)',
    },
    darkPreview: {
      bg: 'hsl(210 15% 6%)',
      accent: 'hsl(210 18% 25%)',
      primary: 'hsl(210 55% 55%)',
    },
  },
  {
    id: 'ember' as ColorTheme,
    name: 'Ember',
    description: 'Warm amber & burnt orange',
    lightPreview: {
      bg: 'hsl(25 30% 94%)',
      accent: 'hsl(25 25% 85%)',
      primary: 'hsl(25 80% 50%)',
    },
    darkPreview: {
      bg: 'hsl(20 20% 5%)',
      accent: 'hsl(20 25% 18%)',
      primary: 'hsl(25 75% 55%)',
    },
  },
  {
    id: 'noir' as ColorTheme,
    name: 'Noir',
    description: 'Pure monochrome minimal',
    lightPreview: {
      bg: 'hsl(0 0% 96%)',
      accent: 'hsl(0 0% 88%)',
      primary: 'hsl(0 0% 8%)',
    },
    darkPreview: {
      bg: 'hsl(0 0% 4%)',
      accent: 'hsl(0 0% 15%)',
      primary: 'hsl(0 0% 95%)',
    },
  },
];
