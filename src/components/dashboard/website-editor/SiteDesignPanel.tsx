/**
 * SiteDesignPanel — Square-style global Site Design overrides.
 *
 * Persisted as a single `site_settings` row keyed `website_design_overrides`.
 * Overrides are layered on top of the active theme (which itself comes from the
 * `website_themes` table) — they never replace the theme, they decorate it.
 *
 * Live-applies via two channels:
 *   1. Persisted setting → `<DesignOverridesApplier />` reads it on mount.
 *   2. Optimistic preview while the user drags sliders → `PREVIEW_DESIGN_OVERRIDES`
 *      postMessage so the iframe can update CSS vars without waiting for a save.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Palette, Save, Sparkles, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { tokens } from '@/lib/design-tokens';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { useToast } from '@/hooks/use-toast';

// ─── Schema ───
export type ButtonShape = 'square' | 'rounded' | 'pill';
export type Density = 'compact' | 'comfy' | 'spacious';

export interface DesignOverrides {
  [key: string]: unknown; // satisfies SiteSettingValue index signature
  // Colors stored as HSL triplets ("220 90% 56%") so they slot into shadcn vars.
  primary_hsl: string | null;
  secondary_hsl: string | null;
  accent_hsl: string | null;
  background_hsl: string | null;
  // Typography: stack-name keys mapped client-side to a CSS font-family stack.
  heading_font: string | null;
  body_font: string | null;
  // Layout knobs.
  density: Density;
  button_shape: ButtonShape;
  hero_overlay_opacity: number; // 0–100
  section_tint_opacity: number; // 0–10 (subtle alternating tint)
}

const DEFAULTS: DesignOverrides = {
  primary_hsl: null,
  secondary_hsl: null,
  accent_hsl: null,
  background_hsl: null,
  heading_font: null,
  body_font: null,
  density: 'comfy',
  button_shape: 'rounded',
  hero_overlay_opacity: 40,
  section_tint_opacity: 0,
};

// Curated font stacks. Adding a stack is a one-line change.
export const FONT_STACKS: Record<string, string> = {
  termina: '"Termina", "Helvetica Neue", sans-serif',
  aeonik: '"Aeonik Pro", "Inter", system-ui, sans-serif',
  inter: '"Inter", system-ui, sans-serif',
  serif_laguna: '"Laguna", Georgia, serif',
  display_serif: 'Georgia, "Times New Roman", serif',
  playfair: '"Playfair Display", Georgia, serif',
  mono: '"JetBrains Mono", "Menlo", monospace',
};

const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: 'termina', label: 'Termina (Brand display)' },
  { value: 'aeonik', label: 'Aeonik Pro (Brand body)' },
  { value: 'inter', label: 'Inter' },
  { value: 'serif_laguna', label: 'Laguna (Editorial serif)' },
  { value: 'display_serif', label: 'Georgia (Classic serif)' },
  { value: 'playfair', label: 'Playfair Display' },
  { value: 'mono', label: 'JetBrains Mono' },
];

// ─── Hex ↔ HSL conversion ───
// We store HSL because shadcn theme tokens consume `hsl(var(--primary))`.
function hexToHslTriplet(hex: string): string | null {
  const m = hex.trim().match(/^#?([\da-f]{3}|[\da-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0;
  let sat = 0;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        hue = ((b - r) / d + 2) * 60;
        break;
      case b:
        hue = ((r - g) / d + 4) * 60;
        break;
    }
  }
  return `${Math.round(hue)} ${Math.round(sat * 100)}% ${Math.round(l * 100)}%`;
}

function hslTripletToHex(triplet: string | null): string {
  if (!triplet) return '#000000';
  const m = triplet.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return '#000000';
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ─── Live preview message ───
// LivePreviewPanel forwards this to the iframe; DesignOverridesApplier listens.
function broadcastToPreview(overrides: DesignOverrides) {
  window.dispatchEvent(
    new CustomEvent('editor-design-preview', { detail: overrides }),
  );
}

interface SiteDesignPanelProps {
  onClose: () => void;
}

export function SiteDesignPanel({ onClose }: SiteDesignPanelProps) {
  const { toast } = useToast();
  const { data: persisted, isLoading } = useSiteSettings<DesignOverrides>(
    'website_design_overrides',
  );
  const updateSetting = useUpdateSiteSetting<DesignOverrides>();

  const [draft, setDraft] = useState<DesignOverrides>(DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const initRef = useRef(false);
  // Snapshot of last-persisted state — used to revert the iframe when the
  // operator discards in-flight edits without saving.
  const persistedSnapshotRef = useRef<DesignOverrides>(DEFAULTS);

  // Hydrate once from server state.
  useEffect(() => {
    if (initRef.current) return;
    if (isLoading) return;
    const hydrated = { ...DEFAULTS, ...(persisted ?? {}) };
    setDraft(hydrated);
    persistedSnapshotRef.current = hydrated;
    initRef.current = true;
  }, [isLoading, persisted]);

  // Live-broadcast on every draft change so the iframe reflects edits instantly.
  // rAF-throttled so rapid slider/color-picker drags can't flood the postMessage
  // bridge (60fps cap; coalesces multi-field updates into a single frame).
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!initRef.current) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      broadcastToPreview(draft);
      rafRef.current = null;
    });
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [draft]);

  // Broadcast dirty state to the shell so it can guard backdrop/ESC closes.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('site-design-dirty-state', { detail: { dirty } }),
    );
  }, [dirty]);

  const setField = useCallback(<K extends keyof DesignOverrides>(key: K, value: DesignOverrides[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await updateSetting.mutateAsync({ key: 'website_design_overrides', value: draft });
      setDirty(false);
      // Refresh snapshot so a subsequent discard reverts to the just-saved state.
      persistedSnapshotRef.current = draft;
      toast({ title: 'Site Design saved', description: 'Changes are now live in your site.' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [draft, updateSetting, toast]);

  const handleReset = useCallback(() => {
    setDraft(DEFAULTS);
    setDirty(true);
    broadcastToPreview(DEFAULTS);
  }, []);

  // Close-intent: if dirty, surface confirm dialog. Otherwise close immediately.
  const handleCloseIntent = useCallback(() => {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }, [dirty, onClose]);

  // Confirmed discard: revert iframe + local draft to last-persisted snapshot, then close.
  const handleDiscardConfirmed = useCallback(() => {
    const snapshot = persistedSnapshotRef.current;
    setDraft(snapshot);
    setDirty(false);
    broadcastToPreview(snapshot);
    setDiscardOpen(false);
    onClose();
  }, [onClose]);

  // Shell → panel bridge: external close requests (backdrop / ESC / toolbar
  // toggle) flow through here so the dirty-confirm dialog can intercept.
  useEffect(() => {
    const onExternalClose = () => handleCloseIntent();
    const onExternalDiscard = () => handleDiscardConfirmed();
    window.addEventListener('site-design-close-request', onExternalClose);
    window.addEventListener('site-design-discard-request', onExternalDiscard);
    return () => {
      window.removeEventListener('site-design-close-request', onExternalClose);
      window.removeEventListener('site-design-discard-request', onExternalDiscard);
    };
  }, [handleCloseIntent, handleDiscardConfirmed]);

  // Color helpers
  const colorRow = (
    label: string,
    field: keyof Pick<DesignOverrides, 'primary_hsl' | 'secondary_hsl' | 'accent_hsl' | 'background_hsl'>,
  ) => {
    const hex = hslTripletToHex(draft[field]);
    return (
      <div key={field} className="flex items-center justify-between gap-3">
        <Label className="text-xs text-muted-foreground flex-1">{label}</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hex}
            onChange={(e) => setField(field, hexToHslTriplet(e.target.value))}
            className="h-8 w-12 rounded-lg border border-border cursor-pointer bg-transparent p-0"
            aria-label={`${label} color`}
          />
          <Input
            value={draft[field] ?? ''}
            onChange={(e) => setField(field, e.target.value || null)}
            placeholder="0 0% 0%"
            className="h-8 w-32 text-[11px] font-mono rounded-full"
            aria-label={`${label} HSL value`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm tracking-wide uppercase text-foreground truncate">
              Site Design
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">
              Global theme overrides — applies to every page
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={handleCloseIntent}>
          {dirty ? 'Close' : 'Done'}
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-5 py-5 space-y-7">
        {/* Colors */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="font-display text-[11px] tracking-wider uppercase text-muted-foreground">
              Color
            </h4>
          </div>
          <div className="space-y-3">
            {colorRow('Primary', 'primary_hsl')}
            {colorRow('Secondary', 'secondary_hsl')}
            {colorRow('Accent', 'accent_hsl')}
            {colorRow('Background', 'background_hsl')}
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            Leave blank to inherit from the active theme.
          </p>
        </section>

        {/* Typography */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="font-display text-[11px] tracking-wider uppercase text-muted-foreground">
              Typography
            </h4>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Heading font</Label>
              <Select
                value={draft.heading_font ?? '__default__'}
                onValueChange={(v) => setField('heading_font', v === '__default__' ? null : v)}
              >
                <SelectTrigger className="h-9 rounded-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Inherit from theme</SelectItem>
                  {FONT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} style={{ fontFamily: FONT_STACKS[o.value] }}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Body font</Label>
              <Select
                value={draft.body_font ?? '__default__'}
                onValueChange={(v) => setField('body_font', v === '__default__' ? null : v)}
              >
                <SelectTrigger className="h-9 rounded-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Inherit from theme</SelectItem>
                  {FONT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} style={{ fontFamily: FONT_STACKS[o.value] }}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Layout */}
        <section className="space-y-3">
          <h4 className="font-display text-[11px] tracking-wider uppercase text-muted-foreground">
            Layout & Density
          </h4>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Density</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['compact', 'comfy', 'spacious'] as const).map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={draft.density === d ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 rounded-full text-xs capitalize font-medium"
                    onClick={() => setField('density', d)}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Button shape</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['square', 'rounded', 'pill'] as const).map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={draft.button_shape === s ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 rounded-full text-xs capitalize font-medium"
                    onClick={() => setField('button_shape', s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section finishes */}
        <section className="space-y-3">
          <h4 className="font-display text-[11px] tracking-wider uppercase text-muted-foreground">
            Section Finishes
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Hero overlay opacity</Label>
                <span className="text-[11px] font-mono text-foreground">{draft.hero_overlay_opacity}%</span>
              </div>
              <Slider
                value={[draft.hero_overlay_opacity]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) => setField('hero_overlay_opacity', v)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Section tint (alternating)</Label>
                <span className="text-[11px] font-mono text-foreground">{draft.section_tint_opacity}%</span>
              </div>
              <Slider
                value={[draft.section_tint_opacity]}
                min={0}
                max={10}
                step={1}
                onValueChange={([v]) => setField('section_tint_opacity', v)}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border/60 shrink-0">
        <Button
          variant="ghost"
          size={tokens.button.card}
          onClick={handleReset}
          className="rounded-full text-xs"
          disabled={updateSetting.isPending}
        >
          Reset to theme
        </Button>
        <Button
          variant="default"
          size={tokens.button.card}
          onClick={handleSave}
          disabled={!dirty || updateSetting.isPending}
          className="rounded-full"
        >
          {updateSetting.isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1.5" />
          )}
          Save Design
        </Button>
      </div>

      {/* Discard-draft confirmation */}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard design changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved Site Design edits. Closing now will revert the preview
              to your last saved design.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardConfirmed}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
