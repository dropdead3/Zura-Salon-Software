import { useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSiteSettings, useUpdateSiteSetting } from './useSiteSettings';
import { useSettingsOrgId } from './useSettingsOrgId';

export type ColorTheme = 'zura' | 'bone' | 'rosewood' | 'sage' | 'jade' | 'marine' | 'cognac' | 'noir' | 'neon' | 'matrix' | 'peach' | 'orchid';

// Generic key — used only as a pre-paint hint on index.html before any org
// context is known. Once an org resolves, an org-scoped key takes over.
const GENERIC_THEME_STORAGE_KEY = 'dd-color-theme';
const SITE_SETTINGS_KEY = 'org_color_theme';

function orgScopedKey(orgId: string): string {
  return `dd-color-theme:${orgId}`;
}

function slugScopedKey(slug: string): string {
  return `dd-color-theme:slug:${slug}`;
}

/** Parse the current org slug from the URL (matches the pre-paint script). */
function currentSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.pathname.match(/^\/org\/([^/]+)/);
  return m?.[1] ?? null;
}

export const ALL_THEMES: ColorTheme[] = ['zura', 'bone', 'rosewood', 'sage', 'jade', 'marine', 'cognac', 'noir', 'neon', 'matrix', 'peach', 'orchid'];
const THEME_CLASSES = ALL_THEMES.map(t => `theme-${t}`);

// Migration map for renamed theme keys (legacy → current)
const LEGACY_THEME_MIGRATION: Record<string, ColorTheme> = {
  cream: 'bone',
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

function applyTheme(theme: ColorTheme, orgId?: string | null) {
  const html = document.documentElement;
  // Skip DOM mutation if already correct — avoids needless reflow + class churn.
  const targetClass = `theme-${theme}`;
  const alreadyApplied =
    html.classList.contains(targetClass) &&
    !THEME_CLASSES.some((c) => c !== targetClass && html.classList.contains(c));
  if (!alreadyApplied) {
    html.classList.remove(...THEME_CLASSES, 'theme-cream', 'theme-rose', 'theme-ocean', 'theme-ember', 'theme-prism');
    html.classList.add(targetClass);
  }
  // Side-channel writes:
  //  - org-scoped key (authoritative per org once orgId is known)
  //  - slug-scoped key (pre-paint hint for index.html on next hard load)
  //  - generic key (legacy fallback hint)
  try {
    if (orgId) localStorage.setItem(orgScopedKey(orgId), theme);
    const slug = currentSlugFromUrl();
    if (slug) localStorage.setItem(slugScopedKey(slug), theme);
    localStorage.setItem(GENERIC_THEME_STORAGE_KEY, theme);
  } catch { /* ignore */ }
}

function readOrgLocalTheme(orgId: string | undefined): ColorTheme | null {
  if (!orgId) return null;
  try {
    return migrateLegacyTheme(localStorage.getItem(orgScopedKey(orgId)));
  } catch {
    return null;
  }
}

function readGenericLocalTheme(): ColorTheme {
  try {
    const saved = localStorage.getItem(GENERIC_THEME_STORAGE_KEY);
    return migrateLegacyTheme(saved) ?? 'zura';
  } catch {
    return 'zura';
  }
}

// Apply generic localStorage theme immediately on module load (prevents flash
// before any org context resolves). Once an org loads, it will override.
applyTheme(readGenericLocalTheme());

// Optimistic intent lock window (ms). During this window after a user click,
// the DOM-sync effect will refuse to revert <html> back to a stale DB value
// that disagrees with the user's most recent intent.
const OPTIMISTIC_INTENT_LOCK_MS = 3000;

// Track the user's most recent theme click across hook instances. This is
// module-scoped on purpose: multiple `useColorTheme` consumers (settings
// picker + DashboardLayout) need to share the same intent so a competing
// in-flight refetch in instance B can't undo a click made in instance A.
const lastUserIntent: { theme: ColorTheme | null; orgId: string | null; at: number } = {
  theme: null,
  orgId: null,
  at: 0,
};

// Self-heal latch: only attempt the one-shot DB repair once per (org, session)
// so we don't spam writes if the DB legitimately holds 'bone'.
const selfHealLatchedFor = new Set<string>();

const isDev =
  typeof import.meta !== 'undefined' &&
  typeof (import.meta as { env?: { DEV?: boolean } }).env?.DEV === 'boolean'
    ? (import.meta as { env: { DEV: boolean } }).env.DEV
    : false;

// Module-scoped snapshot of the most recent integrity state. Read by the
// dev-only `ThemeIntegrityHud` so the resolver hook stays effect/ref-free.
type ThemeIntegritySnapshot = {
  orgId: string | null;
  source: 'db' | 'org-cache' | 'generic' | 'intent-lock' | 'pre-paint-fix';
  theme: ColorTheme;
  at: number;
};
let lastThemeIntegrity: ThemeIntegritySnapshot | null = null;

export function getLastThemeIntegrity(): ThemeIntegritySnapshot | null {
  return lastThemeIntegrity;
}

function logThemeIntegrity(
  orgId: string | undefined | null,
  source: ThemeIntegritySnapshot['source'],
  theme: ColorTheme,
) {
  lastThemeIntegrity = { orgId: orgId ?? null, source, theme, at: Date.now() };
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.debug('[theme]', {
    orgId: orgId ?? null,
    source,
    theme,
    htmlClass: document.documentElement.className,
  });
}

export function useColorTheme() {
  const orgId = useSettingsOrgId();
  const queryClient = useQueryClient();
  const queryKey = ['site-settings', orgId, SITE_SETTINGS_KEY];

  // DB-backed query (source of truth when available)
  const { data: dbSettings, isSuccess: dbLoaded, isLoading: dbLoading } =
    useSiteSettings<ColorThemeSettings>(SITE_SETTINGS_KEY);

  const updateSetting = useUpdateSiteSetting<ColorThemeSettings>();

  // Resolve theme. Strict ownership rules:
  //  1. If DB has resolved with a value, DB wins.
  //  2. Else if we have an orgId, use the org-scoped local cache (never the
  //     generic cache — that's another org's leftover).
  //  3. Else (no org context yet) fall back to the generic pre-paint hint.
  const dbTheme = migrateLegacyTheme(dbSettings?.theme as string | undefined);
  let colorTheme: ColorTheme;
  let resolvedSource: 'db' | 'org-cache' | 'generic';
  if (dbTheme) {
    colorTheme = dbTheme;
    resolvedSource = 'db';
  } else if (orgId) {
    colorTheme = readOrgLocalTheme(orgId) ?? 'zura';
    resolvedSource = 'org-cache';
  } else {
    colorTheme = readGenericLocalTheme();
    resolvedSource = 'generic';
  }

  // Latch so legacy-key migration runs at most once per (org, session).
  const migrationLatchedFor = useRef<string | null>(null);

  // When DB resolves, persist to org-scoped local cache and run one-time
  // legacy migration if needed.
  useEffect(() => {
    if (!dbLoaded || !dbTheme || !orgId) return;
    try { localStorage.setItem(orgScopedKey(orgId), dbTheme); } catch { /* ignore */ }

    if (migrationLatchedFor.current === orgId) return;
    const raw = dbSettings?.theme as string | undefined;
    if (raw && raw in LEGACY_THEME_MIGRATION && raw !== dbTheme) {
      migrationLatchedFor.current = orgId;
      updateSetting.mutate({ key: SITE_SETTINGS_KEY, value: { theme: dbTheme } });
    } else {
      migrationLatchedFor.current = orgId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbLoaded, dbTheme, dbSettings?.theme, orgId]);

  // One-shot DB self-heal: if the DB resolved to 'bone' but the org-scoped
  // local cache already holds a different (user-chosen) theme, the previous
  // click(s) never reached the DB. Repair once per (org, session).
  useEffect(() => {
    if (!dbLoaded || !orgId) return;
    if (selfHealLatchedFor.has(orgId)) return;
    const localChoice = readOrgLocalTheme(orgId);
    if (dbTheme === 'bone' && localChoice && localChoice !== 'bone') {
      selfHealLatchedFor.add(orgId);
      if (isDev) {
        // eslint-disable-next-line no-console
        console.debug('[theme] self-heal', { orgId, dbTheme, localChoice });
      }
      queryClient.setQueryData(queryKey, { theme: localChoice });
      updateSetting.mutate({ key: SITE_SETTINGS_KEY, value: { theme: localChoice } });
    } else {
      selfHealLatchedFor.add(orgId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbLoaded, dbTheme, orgId]);

  // Apply the resolved theme to DOM SYNCHRONOUSLY before paint. Use
  // useLayoutEffect so the class swap happens in the same commit phase as
  // the React render — this bridges the gap between the index.html
  // pre-paint script (which can only guess based on URL slug) and the
  // first DB-resolved render (which knows the authoritative theme).
  // Honor the optimistic intent lock so an in-flight refetch can't revert
  // <html> back to the prior DB value within the lock window.
  useLayoutEffect(() => {
    const intent = lastUserIntent;
    const now = Date.now();
    const lockActive =
      intent.theme !== null &&
      intent.orgId === (orgId ?? null) &&
      now - intent.at < OPTIMISTIC_INTENT_LOCK_MS;

    if (lockActive && colorTheme !== intent.theme) {
      // Stale resolution lost the race against the user's recent click.
      // Re-pin the DOM and cache to the user's intent and bail.
      applyTheme(intent.theme as ColorTheme, orgId);
      queryClient.setQueryData(queryKey, { theme: intent.theme });
      logThemeIntegrity(orgId, 'intent-lock', intent.theme as ColorTheme);
      return;
    }

    applyTheme(colorTheme, orgId);
    logThemeIntegrity(orgId, resolvedSource, colorTheme);
  }, [colorTheme, orgId, resolvedSource, queryClient, queryKey]);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    // 0. Record user intent so the DOM-sync effect won't revert this click
    // when a stale in-flight refetch resolves.
    lastUserIntent.theme = theme;
    lastUserIntent.orgId = orgId ?? null;
    lastUserIntent.at = Date.now();

    // 1. Instant DOM + scoped localStorage update
    applyTheme(theme, orgId);

    // 2. Cancel any in-flight refetch that could resolve with the prior value
    //    and overwrite our optimistic cache write.
    queryClient.cancelQueries({ queryKey });

    // 3. Optimistic query cache update (all consumers reactively get new value)
    queryClient.setQueryData(queryKey, { theme });

    // 4. Persist to DB — skip if DB already matches (no-op guard).
    if (orgId && theme !== dbTheme) {
      updateSetting.mutate(
        { key: SITE_SETTINGS_KEY, value: { theme } },
        {
          onSuccess: () => {
            // Re-confirm cache to the user's intent in case any concurrent
            // refetch landed between steps 3 and the PATCH completion.
            queryClient.setQueryData(queryKey, { theme });
          },
        },
      );
    }
  }, [orgId, queryClient, queryKey, updateSetting, dbTheme]);

  return {
    colorTheme,
    setColorTheme,
    // `mounted` is true when either the DB has resolved OR we have an org-scoped
    // local cache to trust. While the DB is still loading and there's no org
    // cache, hold off on rendering "selected" UI to avoid showing the wrong
    // card during org switches / God Mode.
    mounted: dbLoaded || (!!orgId && !!readOrgLocalTheme(orgId)) || (!orgId && !dbLoading),
  };
}

// Map system color themes to matching service category quick themes
export const COLOR_THEME_TO_CATEGORY_MAP: Record<ColorTheme, string> = {
  zura: 'Lavender Fields',
  bone: 'Neutral Elegance',
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

// Theme metadata for UI
export const colorThemes = [
  {
    id: 'zura' as ColorTheme,
    name: 'Zura',
    description: 'Brand violet & purple',
    lightPreview: {
      bg: 'hsl(265 45% 93%)',
      accent: 'hsl(265 45% 84%)',
      primary: 'hsl(270 75% 52%)',
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
    id: 'rosewood' as ColorTheme,
    name: 'Rosewood',
    description: 'Rich rose & burgundy',
    lightPreview: {
      bg: 'hsl(350 45% 93%)',
      accent: 'hsl(350 45% 84%)',
      primary: 'hsl(345 60% 46%)',
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
      bg: 'hsl(145 32% 92%)',
      accent: 'hsl(145 32% 82%)',
      primary: 'hsl(145 50% 38%)',
    },
    darkPreview: {
      bg: 'hsl(145 12% 6%)',
      accent: 'hsl(145 15% 25%)',
      primary: 'hsl(145 40% 50%)',
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
    id: 'marine' as ColorTheme,
    name: 'Marine',
    description: 'Deep navy & gold',
    lightPreview: {
      bg: 'hsl(218 55% 94%)',
      accent: 'hsl(218 65% 86%)',
      primary: 'hsl(218 100% 52%)',
    },
    darkPreview: {
      bg: 'hsl(220 50% 7%)',
      accent: 'hsl(220 45% 11%)',
      primary: 'hsl(218 100% 65%)',
    },
  },
  {
    id: 'cognac' as ColorTheme,
    name: 'Cognac',
    description: 'Bourbon amber & leather',
    lightPreview: {
      bg: 'hsl(28 50% 91%)',
      accent: 'hsl(28 50% 80%)',
      primary: 'hsl(28 75% 40%)',
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
      bg: 'hsl(0 0% 92%)',
      accent: 'hsl(0 0% 80%)',
      primary: 'hsl(0 0% 6%)',
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
      bg: 'hsl(330 55% 94%)',
      accent: 'hsl(330 60% 84%)',
      primary: 'hsl(330 95% 52%)',
    },
    darkPreview: {
      bg: 'hsl(0 0% 4%)',
      accent: 'hsl(330 25% 18%)',
      primary: 'hsl(330 95% 60%)',
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
    id: 'peach' as ColorTheme,
    name: 'Peach',
    description: 'Coral peach & warm cream',
    lightPreview: {
      bg: 'hsl(22 75% 92%)',
      accent: 'hsl(18 70% 82%)',
      primary: 'hsl(18 80% 55%)',
    },
    darkPreview: {
      bg: 'hsl(18 25% 6%)',
      accent: 'hsl(18 22% 16%)',
      primary: 'hsl(18 85% 65%)',
    },
  },
  {
    id: 'orchid' as ColorTheme,
    name: 'Orchid',
    description: 'Premium magenta & violet jewel',
    lightPreview: {
      bg: 'hsl(280 30% 97%)',
      accent: 'hsl(285 35% 90%)',
      primary: 'hsl(290 75% 55%)',
    },
    darkPreview: {
      bg: 'hsl(265 35% 5%)',
      accent: 'hsl(285 30% 16%)',
      primary: 'hsl(290 90% 65%)',
    },
  },
];
