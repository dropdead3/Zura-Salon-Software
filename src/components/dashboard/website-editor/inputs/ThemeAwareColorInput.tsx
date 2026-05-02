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
 *   - Hex text field (with inline `· Source` suffix when value matches a
 *     theme token or in-use color — turns the picker into a documentation
 *     surface so drift is visible at review time without opening anything)
 *   - Optional Clear affordance
 *
 * Inside the Popover, swatch rows + operator macros keep colors cohesive:
 *
 *   1. Theme — semantic CSS-var swatches (Primary / Accent / Foreground…).
 *      Resolves live from `<html>` so swapping themes refreshes the chips.
 *   2. Already in use — colors the operator already configured elsewhere
 *      on this site (See Offer chip, Announcement bar, Hero CTAs).
 *   3. Custom — native `<input type="color">` + EyeDropper button (Chrome /
 *      Edge only; falls back gracefully when the API is missing).
 *   4. Optional `applyToEmpty` macro — surfaced by parent editors when
 *      they have related sibling fields that are still empty (e.g. Hover /
 *      Secondary BG). One click cascades the just-picked color.
 *
 * Active state is computed by normalized hex so picking the "See Offer"
 * swatch and typing the popup's literal hex both light up the same chip
 * AND surface the same `· See Offer` source label.
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
import { Check, Pipette, Sparkles, X } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { cn } from '@/lib/utils';
import {
  readThemeTokenSwatches,
  subscribeToThemeChanges,
  normalizeHex,
  type ThemeTokenSwatch,
} from '@/lib/themeTokenSwatches';
import { useInUseSiteColors } from '@/hooks/useInUseSiteColors';
import { useRecentColorPicks } from '@/hooks/useRecentColorPicks';

/**
 * Optional macro descriptor passed in by parent editors that have related
 * sibling fields. Surfaced as a one-click chip inside the popover.
 *
 * Example (Hero panel, on the Primary CTA Background field):
 *   applyToEmpty={{
 *     label: 'Use for Hover BG and Secondary BG too',
 *     emptyTargetCount: 2,
 *     onApply: (hex) => { setHoverBg(hex); setSecondaryBg(hex); },
 *   }}
 *
 * Parent decides which fields are "empty" — the picker just renders the
 * affordance and triggers the callback with the active hex.
 */
export interface ApplyToEmptyMacro {
  label: string;
  /** Number of sibling fields the macro will fill. Hides chip when 0. */
  emptyTargetCount: number;
  /** Called with the currently-active hex (already validated, `#rrggbb`). */
  onApply: (hex: string) => void;
}

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
  /** Optional macro to cascade the picked color into related empty fields. */
  applyToEmpty?: ApplyToEmptyMacro;
}

// EyeDropper API is Chromium-only (Chrome 95+, Edge 95+). Safari and
// Firefox don't ship it yet — feature-detect at click time so the button
// degrades to a tooltip-only state instead of throwing.
type EyeDropperResult = { sRGBHex: string };
type EyeDropperCtor = new () => { open: () => Promise<EyeDropperResult> };
function getEyeDropper(): EyeDropperCtor | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctor = (window as any).EyeDropper as EyeDropperCtor | undefined;
  return typeof ctor === 'function' ? ctor : null;
}

export function ThemeAwareColorInput({
  label,
  value,
  onChange,
  placeholder = '#000000 (leave blank for auto)',
  allowClear = true,
  applyToEmpty,
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

  // Resolve a human-readable source label for the current value. Theme
  // wins over in-use because token names are more durable / semantic.
  // Returned as a short suffix so the hex remains the leading affordance:
  //   `#a49584 · Primary` not `Primary · #a49584`
  const sourceLabel = useMemo<string | null>(() => {
    if (!normalizedActive) return null;
    const themeHit = themeSwatches.find((s) => s.hex && s.hex === normalizedActive);
    if (themeHit) return themeHit.label;
    const inUseHit = inUseSwatches.find((s) => s.hex === normalizedActive);
    if (inUseHit) return inUseHit.label;
    return null;
  }, [normalizedActive, themeSwatches, inUseSwatches]);

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
  const [eyedropperBusy, setEyedropperBusy] = useState(false);
  const eyeDropperCtor = useMemo(() => getEyeDropper(), []);
  const eyeDropperSupported = !!eyeDropperCtor;

  const { picks: recentPicks, recordPick } = useRecentColorPicks();
  // Recent row should not double-list anything already in Theme or In-Use
  // (those have their own labeled chips; duplicating bloats the popover
  // and obscures the Recent row's purpose: arbitrary custom hexes).
  const inUseHexes = useMemo(
    () => new Set(inUseSwatches.map((s) => s.hex)),
    [inUseSwatches],
  );
  const dedupedRecent = useMemo(
    () =>
      recentPicks.filter(
        (hex) => !themeHexes.has(hex) && !inUseHexes.has(hex),
      ),
    [recentPicks, themeHexes, inUseHexes],
  );

  // Centralized "user picked a custom color" path: records into Recent
  // ring AND fires onChange. Used by hex field, native picker, eyedropper.
  // Theme-token / in-use chip clicks bypass this — they already have
  // their own swatch row and would just bloat Recent.
  const handleCustomPick = (hex: string) => {
    onChange(hex);
    recordPick(hex);
  };

  const handleEyeDropper = async () => {
    if (!eyeDropperCtor) return;
    setEyedropperBusy(true);
    try {
      const dropper = new eyeDropperCtor();
      const result = await dropper.open();
      if (result?.sRGBHex) {
        handleCustomPick(result.sRGBHex);
        setOpen(false);
      }
    } catch {
      // User cancelled (Esc) or page lost focus — silent no-op is the
      // expected UX per the EyeDropper spec.
    } finally {
      setEyedropperBusy(false);
    }
  };

  // Macro chip is only shown when (a) parent supplied the macro, (b) at
  // least one sibling field is empty, and (c) we have a valid hex to apply.
  const showApplyMacro =
    !!applyToEmpty &&
    applyToEmpty.emptyTargetCount > 0 &&
    !!normalizedActive;

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
          live inside the Popover to keep the editor side rail clean. The
          row is items-start so the caption under the trigger swatch
          ("· Primary") doesn't shove the hex field down. */}
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-start gap-1">
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
              title={
                sourceLabel
                  ? `${normalizedActive} · ${sourceLabel}`
                  : 'Pick from theme, in-use, or custom colors'
              }
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

            {/* Recent row — session-scoped ring of custom hexes the operator
                already picked this session (excludes Theme/In-Use to avoid
                duplicate chips). Lets iteration ("warmer red…") skip the
                native picker on the second pass. */}
            {dedupedRecent.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-display uppercase tracking-wider text-[9px] text-muted-foreground/70 block">
                  Recent
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {dedupedRecent.map((hex) => {
                    const active = hex === normalizedActive;
                    return (
                      <SwatchChip
                        key={hex}
                        active={active}
                        title={hex}
                        onClick={() => {
                          // Re-selecting from Recent counts as a custom
                          // pick — recordPick re-orders the ring so the
                          // most-recently-clicked hex moves to the front.
                          handleCustomPick(hex);
                          setOpen(false);
                        }}
                        color={hex}
                      >
                        {hex}
                      </SwatchChip>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom row — native picker + EyeDropper. The eslint doctrine
                allows native `<input type="color">` only inside this file.
                Native picker fires onChange continuously while the operator
                drags the saturation/hue handles; record into Recent only on
                blur (commit) so we don't pollute the ring with intermediate
                hexes from a single picking session. */}
            <div className="space-y-1.5">
              <span className="font-display uppercase tracking-wider text-[9px] text-muted-foreground/70 block">
                Custom
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorPickerValue}
                  onChange={(e) => onChange(e.target.value)}
                  onBlur={(e) => recordPick(e.target.value)}
                  className="h-9 flex-1 rounded-md border border-border cursor-pointer bg-transparent"
                  aria-label="Custom color picker"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-2 gap-1.5"
                  disabled={!eyeDropperSupported || eyedropperBusy}
                  onClick={handleEyeDropper}
                  title={
                    eyeDropperSupported
                      ? 'Sample a color from anywhere on screen'
                      : 'Eyedropper not supported in this browser (try Chrome or Edge)'
                  }
                >
                  <Pipette className="h-3.5 w-3.5" />
                  <span className="text-[11px]">Pick</span>
                </Button>
              </div>
              {!eyeDropperSupported && (
                <span className="block text-[10px] text-muted-foreground/70">
                  Eyedropper requires Chrome or Edge.
                </span>
              )}
            </div>

            {/* Apply-to-empty macro — closes drift one level above per-field
                cohesion. Parent decides what counts as "empty" and which
                fields receive the cascade. */}
            {showApplyMacro && applyToEmpty && (
              <div className="pt-2 border-t border-border/60">
                <button
                  type="button"
                  className={cn(
                    'w-full inline-flex items-center justify-center gap-1.5 rounded-full',
                    'border border-primary/40 bg-primary/10 hover:bg-primary/20',
                    'px-3 h-8 text-[11px] text-foreground transition-colors',
                  )}
                  onClick={() => {
                    if (normalizedActive) {
                      applyToEmpty.onApply(normalizedActive);
                      setOpen(false);
                    }
                  }}
                  title={`Cascade ${normalizedActive} into ${applyToEmpty.emptyTargetCount} empty field${applyToEmpty.emptyTargetCount === 1 ? '' : 's'}`}
                >
                  <Sparkles className="h-3 w-3" />
                  <span className="font-sans">{applyToEmpty.label}</span>
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        {/* Caption directly under the trigger swatch — surfaces the
            cohesion source ("Theme · Accent" / "Primary CTA") at-a-glance
            so reviewers don't need to open the popover to verify drift.
            Reserves a 1-line slot via min-h to prevent layout shift when
            the value resolves vs. clears. */}
        <span
          className="font-sans text-[9px] leading-none text-muted-foreground/80 max-w-[6.5rem] truncate min-h-[10px]"
          title={sourceLabel ? `Matches ${sourceLabel}` : undefined}
        >
          {sourceLabel ?? ''}
        </span>
        </div>

        <div className="relative flex-1">
          <Input
            value={display}
            onChange={(e) => onChange(e.target.value || undefined)}
            // Record into Recent on blur (commit) — not on every keystroke,
            // since partial hexes ("#a4") would pollute the ring. recordPick
            // normalizes + ignores invalid hexes so this is safe.
            onBlur={(e) => recordPick(e.target.value)}
            placeholder={placeholder}
            className="h-8 text-xs font-mono"
            spellCheck={false}
          />
        </div>

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
