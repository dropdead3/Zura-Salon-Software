import { useEffect, useState } from 'react';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
import { getLastThemeIntegrity } from '@/hooks/useColorTheme';

/**
 * ThemeIntegrityHud — DEV-only fixed-corner inspector.
 *
 * Renders a 1-line diagnostic showing the live theme system state:
 *   - resolved org id
 *   - active theme + source (db | org-cache | generic | intent-lock)
 *   - current <html> theme class
 *   - computed --background HSL
 *
 * Mounted in App.tsx only when import.meta.env.DEV is true.
 *
 * Pure consumer: reads from the module-scoped lastThemeIntegrity ref in
 * useColorTheme.ts. Adds zero hooks to shared resolver hooks.
 */
export function ThemeIntegrityHud() {
  const orgId = useSettingsOrgId();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 750);
    return () => window.clearInterval(id);
  }, []);

  // Touch tick so React keeps re-running; not used directly.
  void tick;

  const last = getLastThemeIntegrity();
  const html = typeof document !== 'undefined' ? document.documentElement : null;
  const themeClass = html
    ? Array.from(html.classList).find((c) => c.startsWith('theme-')) ?? '—'
    : '—';
  const bg = html ? getComputedStyle(html).getPropertyValue('--background').trim() : '';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        zIndex: 2147483647,
        padding: '4px 8px',
        fontSize: 10,
        lineHeight: 1.2,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        background: 'rgba(0,0,0,0.78)',
        color: '#9ef0a8',
        borderRadius: 6,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        maxWidth: '95vw',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      org:{orgId ? orgId.slice(0, 8) : 'none'} · {themeClass} · src:{last?.source ?? '—'} · bg:{bg || '—'}
    </div>
  );
}
