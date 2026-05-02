/**
 * HeroWashEditor — section-level "Image Wash" control.
 *
 * The wash is Layer 1 of the hero overlay stack (per `HeroBackground.tsx`):
 * a flat uniform tint over the entire image, independent from the editorial
 * scrim shape (Layer 2). It's the value every slide inherits when its own
 * `overlay_opacity` / `overlay_mode` are null.
 *
 * Per-slide overrides already exist in `HeroSlidesManager`. This component is
 * the missing global counterpart so operators can set the section default.
 *
 * Pure presentational; matches the in-line slide override UI for visual
 * consistency (Darken/Lighten pill toggle + 0–0.8 strength slider).
 */
import { Moon, Sun } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SliderInput } from './inputs/SliderInput';

interface HeroWashEditorProps {
  overlayMode: 'darken' | 'lighten';
  overlayOpacity: number;
  onChange: (patch: { overlay_mode?: 'darken' | 'lighten'; overlay_opacity?: number }) => void;
}

export function HeroWashEditor({ overlayMode, overlayOpacity, onChange }: HeroWashEditorProps) {
  const reset = () => onChange({ overlay_mode: 'darken', overlay_opacity: 0.4 });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Wash Tint</Label>
        <div className="flex gap-2">
          {([
            { id: 'darken', label: 'Darken', icon: Moon },
            { id: 'lighten', label: 'Lighten', icon: Sun },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ overlay_mode: id })}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] border transition-colors',
                overlayMode === id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/40',
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Darken for legibility over bright photos; lighten for dark photos with
          dark text colors.
        </p>
      </div>

      <SliderInput
        label={overlayMode === 'lighten' ? 'Wash Lightness' : 'Wash Darkness'}
        value={overlayOpacity}
        onChange={(v) => onChange({ overlay_opacity: v })}
        min={0}
        max={0.8}
        step={0.05}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={reset}
          className="text-muted-foreground"
        >
          Reset to default (Darken · 40%)
        </Button>
      </div>
    </div>
  );
}
