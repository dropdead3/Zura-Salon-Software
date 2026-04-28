import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface DashboardThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
}

const DashboardThemeContext = createContext<DashboardThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'dashboard-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    }
    return 'light';
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return systemTheme;
    }
    return theme;
  }, [theme, systemTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    // Clear any inline background set by the pre-paint init script
    // so stylesheet tokens take over once React is mounted.
    root.style.backgroundColor = '';
  }, [resolvedTheme]);

  // Track whether we're applying a remote (server-fetched) value so we don't
  // immediately echo it back as a write.
  const isApplyingRemoteRef = useRef(false);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  // Fetch the per-user preference after auth resolves and apply it.
  useEffect(() => {
    let cancelled = false;

    const loadFromServer = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data, error } = await supabase
          .from('user_preferences')
          .select('dashboard_theme')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error || cancelled) return;
        const value = (data as { dashboard_theme?: string } | null)?.dashboard_theme;
        if (value === 'light' || value === 'dark' || value === 'system') {
          isApplyingRemoteRef.current = true;
          setThemeState(value);
          localStorage.setItem(STORAGE_KEY, value);
        }
      } catch {
        /* ignore */
      }
    };

    loadFromServer();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadFromServer();
      } else if (event === 'SIGNED_OUT') {
        // Reset to neutral default so the next user on a shared device
        // doesn't inherit the previous user's mode.
        isApplyingRemoteRef.current = true;
        setThemeState('system');
        localStorage.setItem(STORAGE_KEY, 'system');
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Persist user-driven changes to user_preferences. Skip:
  //   1. The initial mount — otherwise the (possibly stale) localStorage
  //      value would clobber the authoritative DB value before
  //      loadFromServer() has a chance to read it.
  //   2. Writes that originated from a remote fetch (echo prevention).
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        await supabase
          .from('user_preferences')
          .upsert(
            { user_id: user.id, dashboard_theme: theme, updated_at: new Date().toISOString() } as never,
            { onConflict: 'user_id' }
          );
      } catch {
        /* silent — local change still applies, next write resyncs */
      }
    })();

    return () => { cancelled = true; };
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    resolvedTheme,
  }), [theme, resolvedTheme]);

  return (
    <DashboardThemeContext.Provider value={value}>
      {children}
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const context = useContext(DashboardThemeContext);
  if (context === undefined) {
    throw new Error('useDashboardTheme must be used within a DashboardThemeProvider');
  }
  return context;
}
