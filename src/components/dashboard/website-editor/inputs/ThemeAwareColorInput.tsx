/**
 * ThemeAwareColorInput
 *
 * Drop-in replacement for the bare `<input type="color"> + hex text field`
 * pattern that used to live in every editor surface (HeroTextColorsEditor,
 * SectionStyleEditor, AnnouncementBarContent, SiteDesignPanel, the custom
 * row of PromotionalPopupEditor).
 *
 * Inline footprint is intentionally tiny:
 *   - Swatch trigger button (opens the Popover)
 *   - Hex text field
 *   - Optional Clear affordance
 *
 * Inside the Popover, three rows of operator-actionable swatches keep
 * colors cohesive across the site:
 *
 *   1. Theme — semantic CSS-var swatches (Primary / Accent / Foreground…).
 *      Resolves live from `<html>` so swapping themes refreshes the chips.
 *   2. Already in use — colors the operator already configured elsewhere
 *      on this site (See Offer chip, Announcement bar, Hero CTAs).
 *   3. Custom — native `<input type="color">`.
 *
 * Active state is computed by normalized hex so picking the "See Offer"
 * swatch and typing the popup's literal hex both light up the same chip.
 *
 * SINGLE-OWNERSHIP DOCTRINE: this is the only place native
 * `<input type="color">` is allowed in `src/components/dashboard/website-editor/**`.
 * A scoped ESLint rule enforces it; the rule's owner-file allowlist points
 * at this file. Don't roll a new picker — extend this one.
 */

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  readThemeTokenSwatches,
  subscribeToThemeChanges,
  normalizeHex,
  type ThemeTokenSwatch,
} from '@/lib/themeTokenSwatches';
import { useInUseSiteColors } from '@/hooks/useInUseSiteColors';

interface ThemeAwareColorInputProps {
  /** Operator-facing label rendered above the picker. */
  label?: string;
  /** Persisted hex string (or empty / undefined to clear). */
  value: string | undefined;
  /** Fired with a `#rrggbb` string, or `undefined` when the operator clears. */
  onChange: (next: string | undefined) => void;
  /** Placeholder for the hex text field. */
  placeholder?: string;
  /** Whether to show the Clear affordance when a value is set. Defaults true. */
  allowClear?: boolean;
}

export function ThemeAwareColorInput({
  label,
  value,
  onChange,
  placeholder = '#000000 (leave blank for auto)',
  allowClear = true,
}: ThemeAwareColorInputProps) {
  const display = (value ?? '').trim();
  const normalizedActive = normalizeHex(display);

  // Theme tokens are read off <html> imperatively; subscribe to attribute
  // changes so swapping the website theme repaints the chip row.
  const [themeSwatches, setThemeSwatches] = useState<ThemeTokenSwatch[]>(
    () => readThemeTokenSwatches(),
  );
  useEffect(() => {
    setThemeSwatches(readThemeTokenSwatches());
    return subscribeToThemeChanges(() => {
      setThemeSwatches(readThemeTokenSwatches());
    });
  }, []);

  const inUseSwatches = useInUseSiteColors();

  // Filter "in use" so we don't double-list a value that's already a theme
  // token swatch — keeps the row tight.
  const themeHexes = useMemo(
    () => new Set(themeSwatches.map((s) => s.hex).filter(Boolean)),
    [themeSwatches],
  );
  const dedupedInUse = useMemo(
    () => inUseSwatches.filter((s) => !themeHexes.has(s.hex)),
    [inUseSwatches, themeHexes],
  );

  // Native <input type="color"> only accepts 6-digit hex. Sanitize so token
  // refs / unset values fall back to a sensible neutral instead of erroring.
  const colorPickerValue = useMemo(() => {
    if (/^#[0-9a-f]{6}$/i.test(display)) return display;
    if (normalizedActive) return normalizedActive;
    return '#888888';
  }, [display, normalizedActive]);

  // Trigger swatch preview color: prefer normalized hex, else neutral.
  const triggerColor = normalizedActive || 'transparent';

  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5" data-testid="theme-aware-color-input">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          {allowClear && display && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="font-sans text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              title="Clear and inherit"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Inline trigger row — swatch button + hex field. All swatch grids
          live inside the Popover to keep the editor side rail clean. */}
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'h-8 w-10 rounded-md border border-border cursor-pointer flex items-center justify-center',
                'hover:border-primary/60 transition-colors relative overflow-hidden',
              )}
              style={{ backgroundColor: triggerColor }}
              aria-label={label ? `${label} swatch picker` : 'Open color picker'}
              title="Pick from theme, in-use, or custom colors"
            >
              {!normalizedActive && (
                <span
                  className="absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,hsl(var(--muted-foreground)/0.4)_45%,hsl(var(--muted-foreground)/0.4)_55%,transparent_55%)]"
                  aria-hidden
                />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-72 p-3 space-y-3 bg-popover"
          >
            {/* Theme swatches */}
            <div className="space-y-1.5">
              <span className="font-display uppercase tracking-wider text-[9px] text-muted-foreground/70 block">
                Theme
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {themeSwatches.map((s) => {
                  const active = !!s.hex && s.hex === normalizedActive;
                  return (
                    <SwatchChip
                      key={s.key}
                      active={active}
                      title={`${s.label} — ${s.hint}${s.hex ? ` (${s.hex})` : ''}`}
                      onClick={() => {
                        if (s.hex) {
                          onChange(s.hex);
                          setOpen(false);
                        }
                      }}
                      color={s.cssVar}
                    >
                      {s.label}
                    </SwatchChip>
                  );
                })}
              </div>
            </div>

            {/* In-use swatches — only render row when something exists. */}
            {dedupedInUse.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-display uppercase tracking-wider text-[9px] text-muted-foreground/70 block">
                  Already in use
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {dedupedInUse.map((s) => {
                    const active = s.hex === normalizedActive;
                    return (
                      <SwatchChip
                        key={s.key}
                        active={active}
                        title={`${s.label} (${s.hex})`}
                        onClick={() => {
                          onChange(s.hex);
                          setOpen(false);
                        }}
                        color={s.hex}
                      >
                        {s.label}
                      </SwatchChip>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom row — native picker. Hex text field stays inline outside
                the popover so operators can type without re-opening. */}
            <div className="space-y-1.5">
              <span className="font-display uppercase tracking-wider text-[9px] text-muted-foreground/70 block">
                Custom
              </span>
              <input
                type="color"
                value={colorPickerValue}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 w-full rounded-md border border-border cursor-pointer bg-transparent"
                aria-label="Custom color picker"
              />
            </div>
          </PopoverContent>
        </Popover>

        <Input
          value={display}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={placeholder}
          className="h-8 text-xs flex-1 font-mono"
          spellCheck={false}
        />

        {allowClear && display && !label && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => onChange(undefined)}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Local primitive ─────────────────────────────────────────────────────
// Chip used by all swatch rows. Inlined (not exported) — exporting would
// invite styling drift across picker surfaces.
function SwatchChip({
  active,
  title,
  onClick,
  color,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  color: string;
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
      <span
        className="h-3 w-3 rounded-full border border-border/60"
        style={{ backgroundColor: color }}
      />
      <span className="font-sans text-[11px]">{children}</span>
      {active && <Check className="h-3 w-3 text-primary" strokeWidth={3} />}
    </button>
  );
}
