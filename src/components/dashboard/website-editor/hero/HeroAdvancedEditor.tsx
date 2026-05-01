import { Settings2 } from 'lucide-react';
import { EditorCard } from '../EditorCard';
import { SliderInput } from '../inputs/SliderInput';
import type { HeroConfig } from '@/hooks/useSectionConfig';

interface HeroAdvancedEditorProps {
  config: HeroConfig;
  onChange: <K extends keyof HeroConfig>(field: K, value: HeroConfig[K]) => void;
}

/**
 * Advanced sub-editor: animation timing only.
 *
 * Note: scroll-indicator controls used to live here but were promoted to
 * the Content Alignment editor. The word-rotation interval was promoted to
 * the dedicated Rotating Words editor so all word-cycling controls live
 * together.
 */
export function HeroAdvancedEditor({ config, onChange }: HeroAdvancedEditorProps) {
  return (
    <EditorCard title="Advanced" icon={Settings2}>
      <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
        <h4 className="font-medium text-sm">Animation Timing</h4>
        <SliderInput
          label="Animation Start Delay"
          value={config.animation_start_delay}
          onChange={(value) => onChange('animation_start_delay', value)}
          min={1}
          max={8}
          step={0.5}
          unit="s"
          description="When word rotation begins after page load"
        />
      </div>
    </EditorCard>
  );
}
