import { Repeat } from 'lucide-react';
import { EditorCard } from '../EditorCard';
import { ToggleInput } from '../inputs/ToggleInput';
import { SliderInput } from '../inputs/SliderInput';
import { DynamicArrayInput } from '../inputs/DynamicArrayInput';
import type { HeroConfig } from '@/hooks/useSectionConfig';

interface HeroRotatingWordsEditorProps {
  config: HeroConfig;
  onChange: <K extends keyof HeroConfig>(field: K, value: HeroConfig[K]) => void;
}

/**
 * Rotating headline word editor — section-level global, shared across all
 * slides per the Slider-Revolution model. Slide-specific copy lives in the
 * per-slide editor; this controls the cycling word that animates inside
 * every slide's headline.
 */
export function HeroRotatingWordsEditor({ config, onChange }: HeroRotatingWordsEditorProps) {
  const words = config.rotating_words ?? [];
  const enabled = config.show_rotating_words ?? false;

  return (
    <EditorCard title="Rotating Words" icon={Repeat}>
      <p className="text-xs text-muted-foreground -mt-1">
        Animated word that cycles inside the headline on every slide. Leave
        the list empty or toggle off to hide it entirely.
      </p>

      <ToggleInput
        label="Show Rotating Word"
        value={enabled}
        onChange={(v) => onChange('show_rotating_words', v)}
        description="Cycle through a list of words inside the headline"
      />

      {enabled && (
        <>
          <DynamicArrayInput
            label="Word List"
            items={words}
            onChange={(next) => onChange('rotating_words', next)}
            placeholder="Add a word..."
            maxItems={12}
            minItems={0}
            description="Each word appears in turn. 2–6 works best."
          />

          <SliderInput
            label="Rotation Interval"
            value={config.word_rotation_interval}
            onChange={(v) => onChange('word_rotation_interval', v)}
            min={2}
            max={10}
            step={0.5}
            unit="s"
            description="How long each word stays on screen"
          />
        </>
      )}

      {enabled && words.length === 0 && (
        <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/30">
          Add at least one word above — the rotator stays silent until the list has content.
        </p>
      )}
    </EditorCard>
  );
}
