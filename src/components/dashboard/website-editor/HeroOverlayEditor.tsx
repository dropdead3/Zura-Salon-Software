/**
 * HeroOverlayEditor — consolidated section-level editor for the two hero
 * overlay layers that together control text legibility over the background
 * media:
 *
 *   Layer 1 — Image Wash: a flat uniform tint over the entire image
 *             (`overlay_mode` + `overlay_opacity`).
 *   Layer 2 — Text-area Scrim: an editorial gradient/vignette concentrated
 *             where headline text sits (`scrim_style` + `scrim_strength`).
 *
 * They were previously surfaced as two separate cards in the hero hub. They
 * solve the same operator goal ("make my text readable on this image"), so
 * we merge them into one editor with two clearly-labeled subsections. Each
 * layer remains independently tunable — the only thing that changes is the
 * navigation surface.
 */
import { Layers, Droplet } from 'lucide-react';
import { HeroWashEditor } from './HeroWashEditor';
import { HeroScrimEditor } from './HeroScrimEditor';
import type { HeroConfig } from '@/hooks/useSectionConfig';

interface HeroOverlayEditorProps {
  config: HeroConfig;
  onChange: <K extends keyof HeroConfig>(key: K, value: HeroConfig[K]) => void;
}

export function HeroOverlayEditor({ config, onChange }: HeroOverlayEditorProps) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Two layers stack over your hero media to keep text readable. Use the
        Image Wash for a uniform tint across the whole photo, and the Text-area
        Scrim for a focused gradient where the headline sits. They compose —
        you can run both, just one, or neither.
      </p>

      {/* Layer 1 — Image Wash */}
      <section className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
        <header className="flex items-center gap-2">
          <Droplet className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="font-display text-xs uppercase tracking-wider">
            Layer 1 · Image Wash
          </h4>
        </header>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Flat uniform tint over the entire hero image. Section default —
          inherited by every slide unless that slide overrides it.
        </p>
        <HeroWashEditor
          overlayMode={config.overlay_mode ?? 'darken'}
          overlayOpacity={config.overlay_opacity ?? 0.4}
          onChange={(patch) => {
            if (patch.overlay_mode !== undefined) onChange('overlay_mode', patch.overlay_mode);
            if (patch.overlay_opacity !== undefined) onChange('overlay_opacity', patch.overlay_opacity);
          }}
        />
      </section>

      {/* Layer 2 — Text-area Scrim */}
      <section className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
        <header className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="font-display text-xs uppercase tracking-wider">
            Layer 2 · Text-area Scrim
          </h4>
        </header>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Editorial gradient/vignette concentrated where headline text lives —
          transparent everywhere else. Sits on top of the Image Wash.
        </p>
        <HeroScrimEditor
          scrimStyle={config.scrim_style ?? 'gradient-bottom'}
          scrimStrength={config.scrim_strength ?? 0.55}
          bgType={config.background_type}
          // Title/description handled by the section header above.
          title=""
          description=""
          onChange={(patch) => {
            if (patch.scrim_style !== undefined) onChange('scrim_style', patch.scrim_style ?? undefined);
            if (patch.scrim_strength !== undefined) onChange('scrim_strength', patch.scrim_strength ?? undefined);
          }}
        />
      </section>
    </div>
  );
}
