import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

/**
 * Per-section background color picker.
 *
 * Three rows in priority order:
 *   1. None — clears the override; section falls back to its theme background.
 *   2. Theme tokens — semantic colors from index.css (background, card,
 *      muted, accent, primary, oat). Resolve at render time so a theme swap
 *      reflows automatically.
 *   3. Brand presets — curated, color-confident hexes that look good across
 *      every public surface (warm neutrals, charcoals, soft creams).
 *   4. Custom — native color input + hex text field. Last-resort flexibility
 *      for operators with a brand spec sheet.
 *
 * Mirrors the Promo Popup ACCENT_PRESETS pattern (chip row, active state,
 * hover hint) so the editor feels uniform across surfaces. Single-component
 * ownership avoids the Preview-Live Parity trap — section editors that need
 * a color picker import this, never inline their own swatch grid.
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
  /** Operator-facing label — kept short so the chip row doesn't wrap aggressively. */
  label: string;
  /** CSS expression used for both the swatch background and the persisted value. */
  cssVar: string;
  /** One-line tooltip explaining where this token shows up elsewhere. */
  hint: string;
}

const THEME_TOKENS: ThemeTokenOption[] = [
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
  /** Persisted hex value. */
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
   * The persisted background value. May be:
   *   - empty string / undefined → no override (None active)
   *   - `hsl(var(--token))`      → theme token reference
   *   - `#RRGGBB`                → preset or custom hex
   */
  value: string | undefined;
  onChange: (value: string) => void;
  /** Optional label override — defaults to "Background Color". */
  label?: string;
}

export function SectionBackgroundColorPicker({
  value,
  onChange,
  label = 'Background Color',
}: SectionBackgroundColorPickerProps) {
  const normalizedValue = (value ?? '').trim();

  // Active-state matching: a preset is active when its value matches exactly.
  // None is active when the value is empty. Custom is active when the value
  // is a hex that doesn't match any preset AND isn't a theme token reference.
  const activeMatch = useMemo(() => {
    if (!normalizedValue) return { kind: 'none' as const };
    const themeHit = THEME_TOKENS.find((t) => t.cssVar === normalizedValue);
    if (themeHit) return { kind: 'theme' as const, key: themeHit.key };
    const presetHit = BRAND_PRESETS.find(
      (p) => p.value.toLowerCase() === normalizedValue.toLowerCase(),
    );
    if (presetHit) return { kind: 'preset' as const, key: presetHit.key };
    return { kind: 'custom' as const };
  }, [normalizedValue]);

  // The native <input type="color"> only accepts 6-digit hex. Sanitize the
  // value so theme-token refs (which would error in the picker) fall back to
  // a sensible neutral instead of breaking the swatch.
  const colorPickerValue = useMemo(() => {
    if (activeMatch.kind === 'preset' || activeMatch.kind === 'custom') {
      if (/^#[0-9a-f]{6}$/i.test(normalizedValue)) return normalizedValue;
    }
    return '#888888';
  }, [activeMatch.kind, normalizedValue]);

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
          {/* Diagonal-line swatch reads as "empty" / "transparent" universally. */}
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

      {/* Row 2: Theme tokens — wrap freely; semantic surfaces first. */}
      <div className="space-y-1.5">
        <span className="font-display uppercase tracking-wider text-[9px] text-muted-foreground/70 block">
          Theme
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {THEME_TOKENS.map((token) => {
            const active = activeMatch.kind === 'theme' && activeMatch.key === token.key;
            return (
              <ChipButton
                key={token.key}
                active={active}
                onClick={() => onChange(token.cssVar)}
                title={token.hint}
              >
                <span
                  className="h-3 w-3 rounded-full border border-border/60"
                  style={{ backgroundColor: token.cssVar }}
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

      {/* Row 4: Custom hex — native picker + text input with hex validation
          deferred to the live preview (an invalid hex just won't paint, which
          is the same failure mode as before this picker existed). */}
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
// Chip button shared by None / theme / preset rows. Inlined (not exported)
// because the styling is opinionated to this picker — exporting would
// invite drift between picker surfaces.
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
