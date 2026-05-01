import { Settings2 } from 'lucide-react';
import { EditorCard } from '../EditorCard';
import { ToggleInput } from '../inputs/ToggleInput';
import { SliderInput } from '../inputs/SliderInput';
import type { HeroConfig } from '@/hooks/useSectionConfig';

interface HeroRotatorEditorProps {
  config: HeroConfig;
  onChange: <K extends keyof HeroConfig>(field: K, value: HeroConfig[K]) => void;
}

/**
 * Slides rotator behavior: auto-advance, interval, transition, pause-on-hover.
 * Slide *content* is edited per-slide elsewhere; this controls how the
 * rotator cycles between them.
 */
export function HeroRotatorEditor({ config, onChange }: HeroRotatorEditorProps) {
  const slides = config.slides ?? [];
  const hasMultiple = slides.length > 1;
  const mode = config.rotator_mode ?? 'multi_slide';

  return (
    <EditorCard title="Slides Rotator" icon={Settings2}>
      <p className="text-xs text-muted-foreground -mt-1">
        Controls how the hero cycles between slides. When you have only one
        slide, the rotator is silent — these settings start mattering at two+.
      </p>

      {/* Rotator Mode picker — defines what each slide owns. */}
      <div className="space-y-2 pt-1">
        <label className="text-xs text-muted-foreground">Rotator Mode</label>
        <div className="flex gap-2">
          {([
            {
              id: 'multi_slide' as const,
              label: 'Multi-Slide',
              desc: 'Each slide has its own background, copy & buttons.',
            },
            {
              id: 'background_only' as const,
              label: 'Background-Only',
              desc: 'Shared copy & buttons, only the background rotates.',
            },
          ]).map(({ id, label, desc }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange('rotator_mode', id)}
                title={desc}
                className={`flex-1 px-3 py-2 rounded-xl text-left border transition-colors ${
                  active
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                }`}
              >
                <div className="text-[12px] font-sans font-medium">{label}</div>
                <div className={`text-[10px] mt-0.5 ${active ? 'text-background/70' : 'text-muted-foreground'}`}>
                  {desc}
                </div>
              </button>
            );
          })}
        </div>
        {mode === 'background_only' && (
          <p className="text-[10px] text-muted-foreground">
            Slide-specific copy is preserved and will return if you switch back to Multi-Slide.
          </p>
        )}
      </div>

      <ToggleInput
        label="Auto-Rotate"
        value={config.auto_rotate}
        onChange={(v) => onChange('auto_rotate', v)}
        description="Cycle through slides automatically"
      />

      {config.auto_rotate && (
        <SliderInput
          label="Slide Duration"
          value={(config.slide_interval_ms ?? 6000) / 1000}
          onChange={(v) => onChange('slide_interval_ms', Math.round(v * 1000))}
          min={3}
          max={15}
          step={0.5}
          unit="s"
        />
      )}

      <ToggleInput
        label="Pause on Hover"
        value={config.pause_on_hover}
        onChange={(v) => onChange('pause_on_hover', v)}
        description="Stop the rotator while the visitor's cursor is over the hero"
      />

      <div className="space-y-2 pt-2">
        <label className="text-xs text-muted-foreground">Transition Style</label>
        <div className="flex gap-2">
          {(['fade', 'crossfade', 'slide-up'] as const).map((opt) => {
            const active = (config.transition_style ?? 'fade') === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange('transition_style', opt)}
                className={`flex-1 px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                  active
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                }`}
              >
                {opt === 'slide-up' ? 'Slide Up' : opt[0].toUpperCase() + opt.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {!hasMultiple && (
        <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/30">
          Add a second slide to see the rotator in action.
        </p>
      )}
    </EditorCard>
  );
}
