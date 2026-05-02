/**
 * PromotionalPopupEditor — colocated internals.
 *
 * These are the pure helpers, layout primitives, char counters, swatch
 * mocks, and date/contrast utilities that previously lived inline at the
 * bottom of `PromotionalPopupEditor.tsx`. Lifting them out drops the
 * editor file from 1814 → ~1300 lines and isolates the truly pure
 * (no-DB / no-routing / no-orchestrator-state) surfaces so Wave 2's
 * sub-tab IA refactor only has to think about the editor body itself.
 *
 * Pure refactor — zero behavior change. Imports are the only thing that
 * moved. If you find yourself wanting to add hooks/router/DB calls here,
 * stop and ship the helper somewhere stateful — `internals/` is for the
 * leaves, not the orchestrator.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Gift, ChevronRight, Sparkles, Clock, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useWebsitePrimaryColor } from '@/hooks/useWebsitePrimaryColor';
import { readableForegroundFor, bestTextContrast } from '@/lib/color-contrast';
import { getEyebrowIcon } from '@/lib/eyebrow-icons';
import { useDismissedSuggestion } from '@/hooks/useDismissedSuggestion';
import type {
  PromotionalPopupSettings,
  PopupSurface,
  EyebrowIcon,
} from '@/hooks/usePromotionalPopup';

// ─── Surface options ───
export const SURFACE_OPTIONS: { value: PopupSurface; label: string; description: string }[] = [
  { value: 'home', label: 'Home page', description: 'Show on the homepage only' },
  { value: 'services', label: 'Services pages', description: 'Show on service detail pages' },
  { value: 'booking', label: 'Booking surface', description: 'Show on the public booking flow' },
  { value: 'all-public', label: 'Every public page', description: 'Show site-wide (overrides others)' },
];

// ─── Accent presets ───
// Curated accent presets so operators can match brand intent without hex
// guessing. `value === undefined` resolves to the org's theme primary at render
// time. `key` is persisted alongside `accentColor` so the active chip stays
// highlighted even after a theme change shifts the underlying hex.
export const ACCENT_PRESETS: {
  key: string;
  label: string;
  value: string | undefined;
  swatch: string;
  hint: string;
}[] = [
  { key: 'house', label: 'House Default', value: undefined, swatch: 'hsl(var(--primary))', hint: 'Inherit your site theme primary' },
  { key: 'high-contrast', label: 'High Contrast', value: '#111111', swatch: '#111111', hint: 'Near-black — maximum attention' },
  { key: 'soft-neutral', label: 'Soft Neutral', value: '#A1887F', swatch: '#A1887F', hint: 'Warm taupe — editorial calm' },
];

// ─── Per-appearance ceilings ───
//
// Modal + corner-card render the headline as multi-line display copy (no
// `truncate` / no `line-clamp` in PromoBody) — it wraps freely up to ~2 lines
// before it starts visually crowding the CTA row. We size these ceilings for
// "comfortable two-line max" rather than "fits on one line", so a natural
// 35-char headline like "Free Haircut with Any Color Service" doesn't trip a
// scary destructive counter when in fact it lays out fine.
//
// Banner is the only layout that hard-truncates (single-line `truncate`),
// so its ceiling stays tight.
export const HEADLINE_CEILINGS: Record<PromotionalPopupSettings['appearance'], number> = {
  modal: 60,
  banner: 32,
  'corner-card': 50,
};

// Body is rendered as multi-line copy. The card/modal layouts truncate around
// line 3 (~140 chars at default leading); banner is single-line and tighter.
export const BODY_CEILINGS: Record<PromotionalPopupSettings['appearance'], number> = {
  modal: 160,
  banner: 80,
  'corner-card': 140,
};

// Legal/disclaimer ceiling — single global limit. Conservative default that
// matches what most legal teams ask for in compact promo surfaces.
export const DISCLAIMER_CEILING = 200;

// ─── Overflow detection ───
// Single source of truth for save-time overflow detection. Mirrors the
// ceilings the live counters render so a field flagged as destructive in the
// UI also blocks Save with a confirmation toast — and vice versa.
export type OverflowFinding = { field: 'headline' | 'body' | 'disclaimer'; message: string };

export function collectOverflows(data: PromotionalPopupSettings): OverflowFinding[] {
  const findings: OverflowFinding[] = [];
  const layout = data.appearance === 'corner-card' ? 'corner card' : data.appearance;
  // Banner truly hard-truncates (single-line `truncate`). Modal + corner-card
  // wrap to two+ lines and start crowding the CTA — annoying but not silent
  // data loss. Distinct verbs so operators read the correct severity.
  const verb = data.appearance === 'banner' ? 'truncate' : 'wrap past the safe limit';

  const headlineCeiling = HEADLINE_CEILINGS[data.appearance];
  if (data.headline.length > headlineCeiling) {
    findings.push({
      field: 'headline',
      message: `Headline (${data.headline.length}/${headlineCeiling}) will ${verb} on ${layout}.`,
    });
  }

  const bodyCeiling = BODY_CEILINGS[data.appearance];
  if (data.body.length > bodyCeiling) {
    findings.push({
      field: 'body',
      message: `Body (${data.body.length}/${bodyCeiling}) will ${verb} on ${layout}.`,
    });
  }

  const disclaimerLen = (data.disclaimer ?? '').length;
  if (disclaimerLen > DISCLAIMER_CEILING) {
    findings.push({
      field: 'disclaimer',
      message: `Disclaimer (${disclaimerLen}/${DISCLAIMER_CEILING}) exceeds the legal-copy limit.`,
    });
  }

  return findings;
}

// ─── Time-aware eyebrow suggestion ───
// When `endsAt` falls within the next 72h, surface a one-tap chip that swaps
// eyebrow copy to a urgency-tied phrase. Stays a *suggestion* — never
// auto-edits — so the operator owns the final copy.
//
// Live countdown: re-evaluates every 60s so a lingering operator sees
// "Ends in 3 days" tick down to "Ends tomorrow" without a refresh.
// Dismissal: persisted per-`endsAt` so deliberate ignore doesn't nag.
export function EyebrowUrgencySuggestion({
  endsAt,
  currentEyebrow,
  onApply,
}: {
  endsAt: string | null | undefined;
  currentEyebrow: string | undefined;
  onApply: (text: string, icon: EyebrowIcon) => void;
}) {
  const { dismissed, dismiss } = useDismissedSuggestion(endsAt ?? null);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (!endsAt || dismissed) return null;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;

  const msLeft = end.getTime() - Date.now();
  if (msLeft <= 0 || msLeft > 72 * 60 * 60 * 1000) return null;

  const hoursLeft = Math.round(msLeft / (60 * 60 * 1000));
  const suggestion =
    hoursLeft <= 12
      ? 'Ends today'
      : hoursLeft <= 36
        ? 'Ends tomorrow'
        : `Ends in ${Math.round(hoursLeft / 24)} days`;

  if ((currentEyebrow ?? '').trim().toLowerCase() === suggestion.toLowerCase()) {
    return null;
  }

  return (
    <div className="mt-1.5 inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onApply(suggestion, 'clock')}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-primary/[0.04] px-2.5 py-1 text-[11px] font-sans text-primary hover:bg-primary/10 transition-colors"
      >
        <Clock className="h-3 w-3" />
        <span>Switch to "{suggestion}"</span>
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss suggestion"
        title="Dismiss"
        className="h-6 w-6 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Layout helpers ───

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-display uppercase tracking-wider text-xs text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-sans text-sm">{label}</Label>
      {children}
      {hint && <p className="font-sans text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Generic character counter ───
// Surfaces a truncation/limit ceiling next to free-text fields so operators
// know the exact char ledge before the live mock ellipsizes (or before legal
// flags an overflow). State map: under (muted) → near (warning at 80%) → over
// (destructive). `scopeLabel` describes *what* is being measured (e.g.
// "headline in corner card", "disclaimer"). `overflowVerb` lets callers swap
// the badge copy — "Truncating" for layout-driven cuts, "Over limit" for
// policy-driven caps like disclaimers.
export function CharCounter({
  length,
  ceiling,
  scopeLabel,
  overflowVerb = 'Over limit',
}: {
  length: number;
  ceiling: number;
  scopeLabel: string;
  overflowVerb?: string;
}) {
  const ratio = ceiling > 0 ? length / ceiling : 0;
  const tone =
    length > ceiling
      ? 'text-destructive'
      : ratio >= 0.8
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground';
  return (
    <p className={cn('font-sans text-xs flex items-center gap-1', tone)}>
      <span className="tabular-nums">
        {length} / {ceiling}
      </span>
      <span className="text-muted-foreground">chars · {scopeLabel}</span>
      {length > ceiling && (
        <span className="font-display uppercase tracking-wider text-[10px] ml-1">
          {overflowVerb}
        </span>
      )}
    </p>
  );
}

// Human-readable layout label for `CharCounter` scope strings. Centralized so
// "corner card" stays consistent across counters and prose.
export function appearanceLabel(appearance: PromotionalPopupSettings['appearance']): string {
  return appearance === 'corner-card' ? 'corner card' : appearance;
}

// ─── Live FAB preview swatch ───
// Mirrors the shape of the real FAB rendered by `PromotionalPopup` so operators
// can see corner placement, accent color, and headline truncation without
// reloading the iframe.
export function FabPreviewSwatch({
  position,
  headline,
  accent,
}: {
  position: 'bottom-right' | 'bottom-left';
  headline: string;
  accent?: string;
}) {
  // Fall back to the *public site*'s primary, not the dashboard's primary —
  // operators QA against the theme visitors will actually see.
  const sitePrimary = useWebsitePrimaryColor();
  const accentColor = accent || sitePrimary;
  const accentFg = readableForegroundFor(accent);
  const truncated = headline.length > 22 ? `${headline.slice(0, 22)}…` : headline;
  const [pulsing, setPulsing] = useState(false);
  const stopRef = useRef<number | null>(null);

  const playPulse = useCallback(() => {
    if (stopRef.current) window.clearTimeout(stopRef.current);
    setPulsing(true);
    // 3 cycles × ~800ms — matches the public FAB hint duration.
    stopRef.current = window.setTimeout(() => setPulsing(false), 2400);
  }, []);

  useEffect(() => () => {
    if (stopRef.current) window.clearTimeout(stopRef.current);
  }, []);

  return (
    <div className="space-y-1.5">
      <div
        aria-hidden="true"
        className="relative w-44 h-24 rounded-md border border-border bg-gradient-to-br from-muted/60 to-muted/30 overflow-hidden shadow-inner"
      >
        <div className="absolute top-0 inset-x-0 h-3 bg-foreground/5 border-b border-border/60 flex items-center gap-1 px-1.5">
          <span className="h-1 w-1 rounded-full bg-foreground/20" />
          <span className="h-1 w-1 rounded-full bg-foreground/20" />
          <span className="h-1 w-1 rounded-full bg-foreground/20" />
        </div>
        <div
          className={cn(
            'absolute bottom-1.5 flex items-center gap-1 rounded-full pl-1 pr-1.5 h-5 shadow-md text-primary-foreground',
            position === 'bottom-left' ? 'left-1.5' : 'right-1.5',
            pulsing && 'motion-safe:animate-[promoFabPulse_800ms_ease-in-out_3]',
          )}
          style={{ backgroundColor: accentColor, color: accentFg }}
        >
          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-white/20">
            <Gift className="h-2 w-2" />
          </span>
          <span className="font-display uppercase tracking-wider text-[7px] max-w-[70px] truncate">
            {truncated || 'Offer'}
          </span>
          <ChevronRight className="h-2 w-2 opacity-80" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="font-sans text-[10px] text-muted-foreground">Live preview</p>
        <button
          type="button"
          onClick={playPulse}
          className="font-sans text-[10px] text-primary hover:underline inline-flex items-center gap-1"
        >
          <Sparkles className="h-2.5 w-2.5" />
          Play pulse
        </button>
      </div>
    </div>
  );
}

// ─── Live appearance swatch ───
// Mini-mock of the three popup layouts (modal / banner / corner-card) so the
// Appearance selector communicates intent without an iframe round-trip.
export function AppearancePreviewSwatch({
  appearance,
  accent,
  headline,
  eyebrow,
  eyebrowIcon,
}: {
  appearance: PromotionalPopupSettings['appearance'];
  accent?: string;
  headline: string;
  eyebrow?: string;
  eyebrowIcon?: EyebrowIcon;
}) {
  const sitePrimary = useWebsitePrimaryColor();
  const accentColor = accent || sitePrimary;
  const accentFg = readableForegroundFor(accent);
  const trim = (max: number) =>
    headline.length > max ? `${headline.slice(0, max)}…` : headline || 'Offer';
  const Icon = getEyebrowIcon(eyebrowIcon);
  const eyebrowText = eyebrow?.trim();
  const eyebrowStrip = eyebrowText ? (
    <span
      className="font-display uppercase tracking-[0.18em] text-[6px] inline-flex items-center gap-0.5 truncate"
      style={{ color: accentColor }}
    >
      {Icon && <Icon className="h-1.5 w-1.5 shrink-0" aria-hidden="true" />}
      <span className="truncate">{eyebrowText}</span>
    </span>
  ) : null;

  return (
    <div className="space-y-1.5">
      <div
        aria-hidden="true"
        className="relative w-44 h-24 rounded-md border border-border bg-gradient-to-br from-muted/60 to-muted/30 overflow-hidden shadow-inner"
      >
        <div className="absolute top-0 inset-x-0 h-3 bg-foreground/5 border-b border-border/60 flex items-center gap-1 px-1.5">
          <span className="h-1 w-1 rounded-full bg-foreground/20" />
          <span className="h-1 w-1 rounded-full bg-foreground/20" />
          <span className="h-1 w-1 rounded-full bg-foreground/20" />
        </div>
        {appearance === 'modal' && (
          <>
            <div className="absolute inset-0 top-3 bg-black/30 backdrop-blur-[1px]" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-14 rounded-md bg-card border border-border shadow-lg p-1.5 flex flex-col gap-0.5">
              {eyebrowStrip}
              <span className="font-display uppercase tracking-wider text-[7px] text-foreground leading-tight line-clamp-2">
                {trim(28)}
              </span>
              <span
                className="mt-auto h-1.5 w-12 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </>
        )}
        {appearance === 'banner' && (
          <div
            className="absolute top-3 inset-x-0 flex items-center px-1.5 gap-1 text-primary-foreground py-0.5"
            style={{ backgroundColor: accentColor, color: accentFg }}
          >
            <div className="flex flex-col flex-1 min-w-0">
              {eyebrowStrip && (
                <span className="text-white/80 [&>*]:text-white/80">{eyebrowStrip}</span>
              )}
              <span className="font-display uppercase tracking-wider text-[7px] truncate">
                {trim(26)}
              </span>
            </div>
            <span className="h-1.5 w-5 rounded-full bg-white/30 shrink-0" />
          </div>
        )}
        {appearance === 'corner-card' && (
          <div className="absolute bottom-1.5 right-1.5 w-24 h-14 rounded-md bg-card border border-border shadow-md p-1.5 flex flex-col gap-0.5">
            {eyebrowStrip}
            <span className="font-display uppercase tracking-wider text-[7px] text-foreground leading-tight line-clamp-2">
              {trim(22)}
            </span>
            <span
              className="mt-auto h-1.5 w-10 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          </div>
        )}
      </div>
      <p className="font-sans text-[10px] text-muted-foreground text-center">
        Live preview
      </p>
    </div>
  );
}

// ─── Hex normalization ───
// Coerce arbitrary CSS color strings into a `#rrggbb` value the native color
// input can render. Falls back to a neutral primary when the value isn't a
// 6-digit hex (the swatch text input still accepts hsl(...) etc.).
export function normalizeHex(value: string | undefined): string {
  if (!value) return '#7c3aed';
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed
      .slice(1)
      .split('')
      .map((c) => c + c)
      .join('')}`;
  }
  return '#7c3aed';
}

// ─── datetime-local <-> ISO helpers ───

export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ─── Accent contrast warning ───
// WCAG 2.x floor for non-text large UI is 3:1. When the operator picks an
// accent like #FFF080 (pale yellow) where neither white nor black text
// clears 3:1 against it, surface a non-blocking hint so they know CTA copy
// will be hard to read on the live popup. Returns null when:
//   - no custom accent (theme primary is presumed-good by the theme author)
//   - accent unparseable (e.g. `hsl(var(--primary))` ref)
//   - best contrast clears 3:1
export function AccentContrastWarning({ accent }: { accent: string | undefined | null }) {
  if (!accent || !accent.trim()) return null;
  const ratio = bestTextContrast(accent);
  if (ratio === null || ratio >= 3) return null;
  return (
    <p
      role="status"
      className="mt-2 inline-flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400"
    >
      <span aria-hidden="true">⚠</span>
      <span>
        Low contrast — even the best text color clears only{' '}
        <strong className="font-display tracking-wider">{ratio.toFixed(2)}:1</strong>.
        WCAG asks for at least 3:1 on UI surfaces. Visitors may struggle to
        read the CTA on this accent.
      </span>
    </p>
  );
}
