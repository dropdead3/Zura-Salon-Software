import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import {
  readThemeTokenSwatches,
  subscribeToThemeChanges,
  normalizeHex,
  type ThemeTokenSwatch,
} from '@/lib/themeTokenSwatches';
import { useWebsiteColorTheme } from '@/hooks/useWebsiteColorTheme';
import { colorThemes } from '@/hooks/useColorTheme';

/**
 * Per-section background color picker.
 *
 * Theme tokens MUST resolve against the WEBSITE theme (cream-lux by default),
 * NOT the dashboard's <html> theme (e.g. theme-zura). This is the same
 * canon enforced by ThemeAwareColorInput — the editor lives in the dashboard
 * but every swatch operators see must represent the public site's palette.
 *
 * Persisted value: theme tokens are saved as `hsl(var(--token))` so a later
 * site-theme swap automatically reflows the section background. Brand
 * presets and custom colors are saved as `#rrggbb` hexes.
 *
 * Active-state matching tolerates BOTH forms (cssVar string OR resolved hex)
 * so legacy values keep their ring after a theme swap.
 *
 * Subscribes to the iframe's `editor-theme-preview` event so the chip dots
 * repaint in the same tick the operator clicks a new theme tile, mirroring
 * ThemeAwareColorInput's behavior.
 */

export type SectionColorTokenKey =
  | 'background'
  | 'card'
  | 'muted'
  | 'secondary'
  | 'accent'
  | 'primary'
  | 'oat'
  | 'foreground';

interface ThemeTokenOption {
  key: SectionColorTokenKey;
  label: string;
  cssVar: string;
  hint: string;
}

const THEME_TOKEN_ORDER: ThemeTokenOption[] = [
  { key: 'background', label: 'Background', cssVar: 'hsl(var(--background))', hint: 'Page background — the calmest surface' },
  { key: 'card',       label: 'Card',       cssVar: 'hsl(var(--card))',       hint: 'Card surface — slight contrast above background' },
  { key: 'muted',      label: 'Muted',      cssVar: 'hsl(var(--muted))',      hint: 'Muted surface — subtle separation' },
  { key: 'secondary',  label: 'Secondary',  cssVar: 'hsl(var(--secondary))',  hint: 'Secondary surface — neutral pairing' },
  { key: 'accent',     label: 'Accent',     cssVar: 'hsl(var(--accent))',     hint: 'Accent surface — soft tint of the brand' },
  { key: 'oat',        label: 'Oat',        cssVar: 'hsl(var(--oat))',        hint: 'Warm taupe — editorial calm' },
  { key: 'primary',    label: 'Primary',    cssVar: 'hsl(var(--primary))',    hint: 'Primary brand color — high attention' },
  { key: 'foreground', label: 'Foreground', cssVar: 'hsl(var(--foreground))', hint: 'Foreground — near-black for dramatic blocks' },
];

interface BrandPresetOption {
  key: string;
  label: string;
  value: string;
  hint: string;
}

const BRAND_PRESETS: BrandPresetOption[] = [
  { key: 'ivory',     label: 'Ivory',     value: '#F8F4EC', hint: 'Soft cream — warm, editorial' },
  { key: 'sand',      label: 'Sand',      value: '#E8DFD0', hint: 'Light beige — muted neutral' },
  { key: 'taupe',     label: 'Taupe',     value: '#A1887F', hint: 'Warm mid-tone — sophisticated' },
  { key: 'graphite',  label: 'Graphite',  value: '#3A3633', hint: 'Deep charcoal — moody luxe' },
  { key: 'onyx',      label: 'Onyx',      value: '#111111', hint: 'Near-black — maximum contrast' },
  { key: 'porcelain', label: 'Porcelain', value: '#FFFFFF', hint: 'Pure white — clean & airy' },
];

interface SectionBackgroundColorPickerProps {
  /**
   * Persisted background value. May be:
   *   - empty / undefined        → no override (None active)
   *   - `hsl(var(--token))`      → theme token reference
   *   - `#RRGGBB`                → preset, custom hex, OR a hex that matches
   *                                a website-theme swatch (still highlights)
   */
  value: string | undefined;
  onChange: (value: string) => void;
  label?: string;
}

export function SectionBackgroundColorPicker({
  value,
  onChange,
  label = 'Background Color',
}: SectionBackgroundColorPickerProps) {
  const normalizedValue = (value ?? '').trim();
  const normalizedActiveHex = normalizeHex(normalizedValue);

  // Resolve theme swatches against the WEBSITE theme — same canon as
  // ThemeAwareColorInput. Subscribes to the iframe's instant-preview event
  // so chip dots repaint in the same tick as the canvas.
  const { theme: websiteTheme } = useWebsiteColorTheme();
  const [previewThemeClass, setPreviewThemeClass] = useState<string | null>(null);
  useEffect(() => {
    const onThemePreview = (e: Event) => {
      const next = (e as CustomEvent).detail?.themeClass;
      if (typeof next === 'string' && next) setPreviewThemeClass(next);
    };
    window.addEventListener('editor-theme-preview', onThemePreview);
    return () => window.removeEventListener('editor-theme-preview', onThemePreview);
  }, []);
  useEffect(() => {
    if (previewThemeClass && previewThemeClass === `theme-${websiteTheme}`) {
      setPreviewThemeClass(null);
    }
  }, [previewThemeClass, websiteTheme]);

  const websiteThemeClass = previewThemeClass ?? `theme-${websiteTheme}`;
  const websiteThemeName = useMemo(
    () => colorThemes.find((t) => `theme-${t.id}` === websiteThemeClass)?.name ?? websiteTheme,
    [websiteThemeClass, websiteTheme],
  );

  const [resolvedSwatches, setResolvedSwatches] = useState<ThemeTokenSwatch[]>(
    () => readThemeTokenSwatches(websiteThemeClass),
  );
  useEffect(() => {
    setResolvedSwatches(readThemeTokenSwatches(websiteThemeClass));
    return subscribeToThemeChanges(() => {
      setResolvedSwatches(readThemeTokenSwatches(websiteThemeClass));
    });
  }, [websiteThemeClass]);

  // Merge our preferred token order with website-theme-resolved hex values.
  // Falls back to the cssVar string for the swatch dot if resolution failed
  // (SSR or pre-mount), which still paints (just against the dashboard theme).
  const themeTokens = useMemo(() => {
    return THEME_TOKEN_ORDER.map((opt) => {
      const resolved = resolvedSwatches.find((s) => s.key === opt.key);
      return {
        ...opt,
        hex: resolved?.hex ?? '',
        swatchColor: resolved?.hex || opt.cssVar,
      };
    });
  }, [resolvedSwatches]);

  // Active-state matching tolerates either form: explicit cssVar string OR
  // the website-theme-resolved hex equivalent. Custom = a hex that matches
  // neither a preset NOR a theme token.
  const activeMatch = useMemo(() => {
    if (!normalizedValue) return { kind: 'none' as const };
    const themeByCssVar = themeTokens.find((t) => t.cssVar === normalizedValue);
    if (themeByCssVar) return { kind: 'theme' as const, key: themeByCssVar.key };
    if (normalizedActiveHex) {
      const themeByHex = themeTokens.find((t) => t.hex && t.hex === normalizedActiveHex);
      if (themeByHex) return { kind: 'theme' as const, key: themeByHex.key };
      const presetHit = BRAND_PRESETS.find(
        (p) => p.value.toLowerCase() === normalizedActiveHex,
      );
      if (presetHit) return { kind: 'preset' as const, key: presetHit.key };
    }
    return { kind: 'custom' as const };
  }, [normalizedValue, normalizedActiveHex, themeTokens]);

  const colorPickerValue = useMemo(() => {
    if (/^#[0-9a-f]{6}$/i.test(normalizedValue)) return normalizedValue;
    if (normalizedActiveHex) return normalizedActiveHex;
    return '#888888';
  }, [normalizedValue, normalizedActiveHex]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-display uppercase tracking-wider text-[10px] text-muted-foreground">
          {label}
        </span>
        {activeMatch.kind !== 'none' && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="font-sans text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            title="Clear the color override and inherit the theme background"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Row 1: None chip — operator-facing affordance for "inherit theme". */}
      <div className="flex flex-wrap items-center gap-1.5">
        <ChipButton
          active={activeMatch.kind === 'none'}
          onClick={() => onChange('')}
          title="No override — section uses the theme's default background"
        >
          <span
            className="h-3 w-3 rounded-full border border-border/60 bg-background"
            style={{
              backgroundImage:
                'linear-gradient(45deg, transparent 45%, hsl(var(--muted-foreground)) 45%, hsl(var(--muted-foreground)) 55%, transparent 55%)',
            }}
          />
          <span className="font-sans text-[11px]">None</span>
        </ChipButton>
      </div>

      {/* Row 2: Theme tokens — resolved against the WEBSITE theme. */}
      <div className="space-y-1.5">
        <span
          className="font-display uppercase tracking-wider text-[9px] text-muted-foreground/70 block"
          title={`Theme: ${websiteThemeName}${previewThemeClass ? ' (previewing)' : ''}`}
        >
          Theme · {websiteThemeName}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {themeTokens.map((token) => {
            const active = activeMatch.kind === 'theme' && activeMatch.key === token.key;
            return (
              <ChipButton
                key={token.key}
                active={active}
                onClick={() => onChange(token.cssVar)}
                title={`${token.hint}${token.hex ? ` (${token.hex})` : ''}`}
              >
                <span
                  className="h-3 w-3 rounded-full border border-border/60"
                  style={{ backgroundColor: token.swatchColor }}
                />
                <span className="font-sans text-[11px]">{token.label}</span>
              </ChipButton>
            );
          })}
        </div>
      </div>

      {/* Row 3: Brand presets — curated hexes that look good on every surface. */}
      <div className="space-y-1.5">
        <span className="font-display uppercase tracking-wider text-[9px] text-muted-foreground/70 block">
          Presets
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {BRAND_PRESETS.map((preset) => {
            const active = activeMatch.kind === 'preset' && activeMatch.key === preset.key;
            return (
              <ChipButton
                key={preset.key}
                active={active}
                onClick={() => onChange(preset.value)}
                title={preset.hint}
              >
                <span
                  className="h-3 w-3 rounded-full border border-border/60"
                  style={{ backgroundColor: preset.value }}
                />
                <span className="font-sans text-[11px]">{preset.label}</span>
              </ChipButton>
            );
          })}
        </div>
      </div>

      {/* Row 4: Custom hex — native picker + text input. */}
      <div className="space-y-1.5">
        <span className="font-display uppercase tracking-wider text-[9px] text-muted-foreground/70 block">
          Custom
        </span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="color"
              value={colorPickerValue}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 w-10 rounded-md border border-border cursor-pointer bg-transparent"
              aria-label="Pick a custom color"
            />
            {activeMatch.kind === 'custom' && (
              <span className="pointer-events-none absolute -top-1 -right-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            )}
          </div>
          <Input
            value={normalizedValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000 or hsl(var(--card))"
            className="h-8 text-xs flex-1 font-mono"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

// ── Local primitive ──────────────────────────────────────────────────────
function ChipButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 h-7 transition-colors',
        active
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border bg-card hover:bg-muted/60 text-muted-foreground',
      )}
    >
      {children}
    </button>
  );
}
