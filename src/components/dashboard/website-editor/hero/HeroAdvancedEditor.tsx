import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings2 } from 'lucide-react';
import { EditorCard } from '../EditorCard';
import { SliderInput } from '../inputs/SliderInput';
import { ToggleInput } from '../inputs/ToggleInput';
import type { HeroConfig } from '@/hooks/useSectionConfig';

interface HeroAdvancedEditorProps {
  config: HeroConfig;
  onChange: <K extends keyof HeroConfig>(field: K, value: HeroConfig[K]) => void;
}

/**
 * Advanced sub-editor: animation timing + scroll indicator. Previously lived
 * inside a Collapsible at the bottom of HeroEditor — now a focused page
 * reached from the hub.
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
        <SliderInput
          label="Word Rotation Interval"
          value={config.word_rotation_interval}
          onChange={(value) => onChange('word_rotation_interval', value)}
          min={2}
          max={10}
          step={0.5}
          unit="s"
          description="How long each rotating word displays"
        />
      </div>

      <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
        <h4 className="font-medium text-sm">Scroll Indicator</h4>
        <ToggleInput
          label="Show Scroll Indicator"
          value={config.show_scroll_indicator}
          onChange={(value) => onChange('show_scroll_indicator', value)}
          description="Show the scroll arrow at the bottom"
        />
        {config.show_scroll_indicator && (
          <div className="space-y-2">
            <Label>Scroll Indicator Text</Label>
            <Input
              value={config.scroll_indicator_text}
              onChange={(e) => onChange('scroll_indicator_text', e.target.value)}
              placeholder="Scroll"
            />
          </div>
        )}
      </div>
    </EditorCard>
  );
}
