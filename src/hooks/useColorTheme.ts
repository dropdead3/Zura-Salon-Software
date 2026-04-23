import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSiteSettings, useUpdateSiteSetting } from './useSiteSettings';
import { useSettingsOrgId } from './useSettingsOrgId';

export type ColorTheme = 'zura' | 'bone' | 'rosewood' | 'sage' | 'marine' | 'cognac' | 'noir' | 'neon';

const THEME_STORAGE_KEY = 'dd-color-theme';
const SITE_SETTINGS_KEY = 'org_color_theme';

const ALL_THEMES: ColorTheme[] = ['zura', 'bone', 'rosewood', 'sage', 'marine', 'cognac', 'noir', 'neon'];
const THEME_CLASSES = ALL_THEMES.map(t => `theme-${t}`);

// Migration map for renamed theme keys (legacy → current)
const LEGACY_THEME_MIGRATION: Record<string, ColorTheme> = {
  cream: 'bone',
  rose: 'rosewood',
  ocean: 'marine',
  ember: 'cognac',
};

function migrateLegacyTheme(value: string | null | undefined): ColorTheme | null {
  if (!value) return null;
  if (LEGACY_THEME_MIGRATION[value]) return LEGACY_THEME_MIGRATION[value];
  if ((ALL_THEMES as string[]).includes(value)) return value as ColorTheme;
  return null;
}

type ColorThemeSettings = Record<string, unknown> & {
  theme: ColorTheme;
};

function applyTheme(theme: ColorTheme) {
  const html = document.documentElement;
  // Also strip any legacy theme classes that may still be on the element
  html.classList.remove(...THEME_CLASSES, 'theme-cream', 'theme-rose', 'theme-ocean', 'theme-ember');
  html.classList.add(`theme-${theme}`);
}

function getLocalTheme(): ColorTheme {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  const migrated = migrateLegacyTheme(saved);
  if (migrated) {
    // Persist the migrated value so we don't pay this cost again
    if (saved !== migrated) {
      try { localStorage.setItem(THEME_STORAGE_KEY, migrated); } catch { /* ignore */ }
    }
    return migrated;
  }
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

  // Derive current theme: DB > localStorage fallback, with legacy migration
  const dbTheme = migrateLegacyTheme(dbSettings?.theme as string | undefined);
  const colorTheme: ColorTheme = dbTheme ?? getLocalTheme();

  // Sync from DB to localStorage + DOM when DB data arrives
  useEffect(() => {
    if (dbLoaded && dbTheme) {
      localStorage.setItem(THEME_STORAGE_KEY, dbTheme);

      // If the DB row still holds a legacy key, transparently rewrite it
      const raw = dbSettings?.theme as string | undefined;
      if (raw && raw !== dbTheme && orgId) {
        updateSetting.mutate({ key: SITE_SETTINGS_KEY, value: { theme: dbTheme } });
      }
    }
  }, [dbLoaded, dbTheme, dbSettings?.theme, orgId, updateSetting]);

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
  bone: 'Neutral Elegance',
  rosewood: 'Rose Garden',
  sage: 'Herb Garden',
  marine: 'Ocean Avenue',
  cognac: 'Sunset Bloom',
  noir: 'Neutral Elegance',
  neon: 'Rose Garden',
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
    id: 'bone' as ColorTheme,
    name: 'Bone',
    description: 'Soft desert tan & sand',
    lightPreview: {
      bg: 'hsl(40 25% 92%)',
      accent: 'hsl(38 22% 80%)',
      primary: 'hsl(38 32% 58%)',
    },
    darkPreview: {
      bg: 'hsl(30 12% 6%)',
      accent: 'hsl(30 18% 22%)',
      primary: 'hsl(38 38% 65%)',
    },
  },
  {
    id: 'rosewood' as ColorTheme,
    name: 'Rosewood',
    description: 'Rich rose & burgundy',
    lightPreview: {
      bg: 'hsl(350 22% 95%)',
      accent: 'hsl(350 25% 85%)',
      primary: 'hsl(345 55% 42%)',
    },
    darkPreview: {
      bg: 'hsl(345 18% 6%)',
      accent: 'hsl(345 22% 22%)',
      primary: 'hsl(345 60% 58%)',
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
    id: 'marine' as ColorTheme,
    name: 'Marine',
    description: 'Deep navy & gold',
    lightPreview: {
      bg: 'hsl(218 22% 95%)',
      accent: 'hsl(218 25% 84%)',
      primary: 'hsl(220 90% 52%)',
    },
    darkPreview: {
      bg: 'hsl(218 25% 6%)',
      accent: 'hsl(218 22% 22%)',
      primary: 'hsl(220 92% 62%)',
    },
  },
  {
    id: 'cognac' as ColorTheme,
    name: 'Cognac',
    description: 'Bourbon amber & leather',
    lightPreview: {
      bg: 'hsl(28 25% 93%)',
      accent: 'hsl(28 22% 82%)',
      primary: 'hsl(28 70% 42%)',
    },
    darkPreview: {
      bg: 'hsl(24 18% 6%)',
      accent: 'hsl(28 22% 20%)',
      primary: 'hsl(28 70% 52%)',
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
  {
    id: 'neon' as ColorTheme,
    name: 'Neon',
    description: 'Hot pink & black',
    lightPreview: {
      bg: 'hsl(330 15% 97%)',
      accent: 'hsl(330 35% 90%)',
      primary: 'hsl(330 95% 55%)',
    },
    darkPreview: {
      bg: 'hsl(0 0% 4%)',
      accent: 'hsl(330 25% 18%)',
      primary: 'hsl(330 95% 60%)',
    },
  },
];
