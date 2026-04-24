import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSiteSettings, useUpdateSiteSetting } from './useSiteSettings';
import { useSettingsOrgId } from './useSettingsOrgId';
import { useThemeAuthority } from './useThemeAuthority';

export type ColorTheme =
  | 'zura'
  | 'cream-lux'
  | 'neon'
  | 'rosewood'
  | 'orchid'
  | 'peach'
  | 'cognac'
  | 'jade'
  | 'sage'
  | 'matrix'
  | 'noir'
  | 'marine';

const THEME_STORAGE_KEY_BASE = 'dd-color-theme';
const LEGACY_GLOBAL_KEY = 'dd-color-theme';
const SITE_SETTINGS_KEY = 'org_color_theme';
const CLEAR_CUSTOM_THEME_EVENT = 'dashboard-theme:clear-custom-overrides';

/**
 * Theme Governance: localStorage is now keyed per-org so switching orgs
 * in the same browser doesn't briefly paint the previous org's brand.
 * The legacy global key is read once for migration only.
 */
function themeStorageKeyFor(orgId: string | null | undefined): string {
  return orgId ? `${THEME_STORAGE_KEY_BASE}:${orgId}` : THEME_STORAGE_KEY_BASE;
}

// Canonical display order: Zura, Cream Lux, Neon, Rosewood, Rose Gold,
// Peach, Cognac, Jade, Sage, Matrix, Noir, Marine (appended).
const ALL_THEMES: ColorTheme[] = [
  'zura',
  'cream-lux',
  'neon',
  'rosewood',
  'orchid',
  'peach',
  'cognac',
  'jade',
  'sage',
  'matrix',
  'noir',
  'marine',
];
const THEME_CLASSES = ALL_THEMES.map(t => `theme-${t}`);

// Migration map for renamed theme keys (legacy → current)
const LEGACY_THEME_MIGRATION: Record<string, ColorTheme> = {
  bone: 'cream-lux',
  cream: 'cream-lux',
  rose: 'rosewood',
  ocean: 'marine',
  ember: 'cognac',
  prism: 'orchid',
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

const THEME_OVERRIDE_KEYS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-strong',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'oat',
  'oat-foreground',
  'gold',
  'gold-foreground',
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'destructive',
  'destructive-foreground',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'border',
  'input',
  'ring',
  'sidebar-background',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  'card-inner',
  'card-inner-deep',
] as const;

function clearInlineThemeOverrides() {
  const html = document.documentElement;
  THEME_OVERRIDE_KEYS.forEach((key) => {
    html.style.removeProperty(`--${key}`);
  });
}

function clearCustomThemeSources() {
  clearInlineThemeOverrides();
  window.dispatchEvent(new CustomEvent(CLEAR_CUSTOM_THEME_EVENT));
}

function applyTheme(theme: ColorTheme) {
  const html = document.documentElement;
  // Strip current + legacy theme classes before applying the new one
  html.classList.remove(
    ...THEME_CLASSES,
    'theme-bone',
    'theme-cream',
    'theme-rose',
    'theme-ocean',
    'theme-ember',
    'theme-prism',
  );
  html.classList.add(`theme-${theme}`);
}

/**
 * Read the cached theme for an org (or the legacy global key as a one-time
 * fallback during migration). Used at module load and on org switch to
 * avoid a flash before the DB query resolves.
 */
function getLocalTheme(orgId?: string | null): ColorTheme {
  // Prefer org-scoped key
  const orgKey = themeStorageKeyFor(orgId);
  const orgSaved = orgId ? localStorage.getItem(orgKey) : null;
  const orgMigrated = migrateLegacyTheme(orgSaved);
  if (orgMigrated) {
    if (orgSaved !== orgMigrated) {
      try { localStorage.setItem(orgKey, orgMigrated); } catch { /* ignore */ }
    }
    return orgMigrated;
  }

  // Fallback: legacy global key (pre-migration). Don't promote to org-key
  // here — that happens once the DB resolves, to avoid leaking another
  // org's brand into a fresh org cache.
  const legacySaved = localStorage.getItem(LEGACY_GLOBAL_KEY);
  const legacyMigrated = migrateLegacyTheme(legacySaved);
  if (legacyMigrated) return legacyMigrated;

  return 'zura';
}

// Apply localStorage theme immediately on module load (prevents flash).
// At module load we don't know the orgId yet, so we use the legacy global
// key purely as an early hint. The hook will reconcile once orgId resolves.
applyTheme(getLocalTheme(null));

export function useColorTheme() {
  const orgId = useSettingsOrgId();
  const queryClient = useQueryClient();
  const queryKey = ['site-settings', orgId, SITE_SETTINGS_KEY];
  const { canEditOrgTheme } = useThemeAuthority();

  // DB-backed query (source of truth when available)
  const { data: dbSettings, isSuccess: dbLoaded } = useSiteSettings<ColorThemeSettings>(SITE_SETTINGS_KEY);

  const updateSetting = useUpdateSiteSetting<ColorThemeSettings>();

  // Derive current theme: DB > org-scoped localStorage fallback, with legacy migration
  const dbTheme = migrateLegacyTheme(dbSettings?.theme as string | undefined);
  const colorTheme: ColorTheme = dbTheme ?? getLocalTheme(orgId);

  // Sync from DB to org-scoped localStorage + DOM when DB data arrives
  useEffect(() => {
    if (dbLoaded && dbTheme && orgId) {
      const orgKey = themeStorageKeyFor(orgId);
      localStorage.setItem(orgKey, dbTheme);

      // If the DB row still holds a legacy key, transparently rewrite it
      // (only the owner is allowed to write — silent no-op otherwise)
      const raw = dbSettings?.theme as string | undefined;
      if (raw && raw !== dbTheme && canEditOrgTheme) {
        updateSetting.mutate({ key: SITE_SETTINGS_KEY, value: { theme: dbTheme } });
      }
    }
  }, [dbLoaded, dbTheme, dbSettings?.theme, orgId, updateSetting, canEditOrgTheme]);

  // Always apply the resolved theme to DOM
  useEffect(() => {
    applyTheme(colorTheme);
  }, [colorTheme]);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    // Owner gate (mirror of RLS policy on site_settings theme keys)
    if (!canEditOrgTheme) {
      toast.error('Only the Account Owner can change the organization theme.');
      return;
    }

    // 1. Instant DOM + org-scoped localStorage update
    clearCustomThemeSources();
    applyTheme(theme);
    if (orgId) {
      localStorage.setItem(themeStorageKeyFor(orgId), theme);
    }

    // 2. Optimistic query cache update (all consumers reactively get new value)
    queryClient.setQueryData(queryKey, { theme });

    // 3. Persist to DB (org-scoped, owner-gated by RLS)
    if (orgId) {
      updateSetting.mutate({ key: SITE_SETTINGS_KEY, value: { theme } });
    }
  }, [orgId, queryClient, queryKey, updateSetting, canEditOrgTheme]);

  return {
    colorTheme,
    setColorTheme,
    canEditOrgTheme,
    mounted: true, // Always true — localStorage applies synchronously on module load
  };
}

// Map system color themes to matching service category quick themes
export const COLOR_THEME_TO_CATEGORY_MAP: Record<ColorTheme, string> = {
  zura: 'Lavender Fields',
  'cream-lux': 'Neutral Elegance',
  rosewood: 'Rose Garden',
  sage: 'Herb Garden',
  jade: 'Herb Garden',
  marine: 'Ocean Avenue',
  cognac: 'Sunset Bloom',
  noir: 'Neutral Elegance',
  neon: 'Rose Garden',
  matrix: 'Herb Garden',
  peach: 'Sunset Bloom',
  orchid: 'Lavender Fields',
};

// Theme metadata for UI — order matches ALL_THEMES (display order in pickers)
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
    id: 'cream-lux' as ColorTheme,
    name: 'Cream Lux',
    description: 'Cool desert gray & oat',
    lightPreview: {
      bg: 'hsl(35 12% 93%)',
      accent: 'hsl(30 15% 88%)',
      primary: 'hsl(30 14% 55%)',
    },
    darkPreview: {
      bg: 'hsl(30 12% 6%)',
      accent: 'hsl(30 14% 22%)',
      primary: 'hsl(30 16% 65%)',
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
    id: 'orchid' as ColorTheme,
    name: 'Rose Gold',
    description: 'Champagne gold & dusty rose',
    lightPreview: {
      bg: 'hsl(40 30% 97%)',
      accent: 'hsl(345 38% 72%)',
      primary: 'hsl(38 55% 58%)',
    },
    darkPreview: {
      bg: 'hsl(30 18% 6%)',
      accent: 'hsl(345 32% 58%)',
      primary: 'hsl(38 65% 64%)',
    },
  },
  {
    id: 'peach' as ColorTheme,
    name: 'Peach',
    description: 'Coral peach & warm cream',
    lightPreview: {
      bg: 'hsl(25 50% 96%)',
      accent: 'hsl(18 50% 88%)',
      primary: 'hsl(18 75% 58%)',
    },
    darkPreview: {
      bg: 'hsl(18 25% 6%)',
      accent: 'hsl(18 22% 16%)',
      primary: 'hsl(18 85% 65%)',
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
    id: 'jade' as ColorTheme,
    name: 'Jade',
    description: 'Deep teal jewel & gold',
    lightPreview: {
      bg: 'hsl(180 20% 95%)',
      accent: 'hsl(178 25% 85%)',
      primary: 'hsl(175 65% 32%)',
    },
    darkPreview: {
      bg: 'hsl(180 35% 6%)',
      accent: 'hsl(178 30% 16%)',
      primary: 'hsl(172 70% 45%)',
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
    id: 'matrix' as ColorTheme,
    name: 'Matrix',
    description: 'Neon emerald on deep navy',
    lightPreview: {
      bg: 'hsl(220 30% 96%)',
      accent: 'hsl(145 35% 88%)',
      primary: 'hsl(145 75% 32%)',
    },
    darkPreview: {
      bg: 'hsl(220 50% 5%)',
      accent: 'hsl(145 40% 14%)',
      primary: 'hsl(145 90% 50%)',
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
    id: 'marine' as ColorTheme,
    name: 'Marine',
    description: 'Deep navy & gold',
    lightPreview: {
      bg: 'hsl(218 35% 97%)',
      accent: 'hsl(218 60% 92%)',
      primary: 'hsl(218 100% 56%)',
    },
    darkPreview: {
      bg: 'hsl(220 50% 7%)',
      accent: 'hsl(220 45% 11%)',
      primary: 'hsl(218 100% 65%)',
    },
  },
];
