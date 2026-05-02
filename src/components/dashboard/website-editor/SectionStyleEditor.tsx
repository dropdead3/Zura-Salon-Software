import { tokens } from '@/lib/design-tokens';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import type { StyleOverrides } from '@/components/home/SectionStyleWrapper';
import { DEFAULT_STYLE_OVERRIDES } from '@/components/home/SectionStyleWrapper';
import { ImageUploadInput } from './inputs/ImageUploadInput';
import { SectionBackgroundColorPicker } from './inputs/SectionBackgroundColorPicker';
import { ThemeAwareColorInput } from './inputs/ThemeAwareColorInput';

interface SectionStyleEditorProps {
  value: Partial<StyleOverrides>;
  onChange: (overrides: Partial<StyleOverrides>) => void;
  /** Pass sectionId for image upload path context */
  sectionId?: string;
}

export function SectionStyleEditor({ value, onChange, sectionId }: SectionStyleEditorProps) {
  const merged = { ...DEFAULT_STYLE_OVERRIDES, ...value };

  const update = (key: keyof StyleOverrides, val: unknown) => {
    onChange({ ...value, [key]: val });
  };

  const hasOverrides = value && Object.keys(value).some(k => {
    const v = value[k as keyof StyleOverrides];
    return v !== undefined && v !== '' && v !== 0 && v !== 'none' && v !== 'full';
  });

  return (
    <div className="space-y-5 py-1">
      {/* Background Type */}
      <div className="space-y-2">
        <Label className="text-xs">Background</Label>
        <Select value={merged.background_type} onValueChange={v => update('background_type', v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (inherit)</SelectItem>
            <SelectItem value="color">Solid Color</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
            <SelectItem value="image">Image</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Background Value */}
      {merged.background_type === 'color' && (
        // Per-section background picker: theme tokens + brand presets +
        // custom hex with an explicit "None" affordance. Mirrors the
        // Promo Popup accent pattern so operators get a consistent
        // chip-row vocabulary across every editor surface.
        <SectionBackgroundColorPicker
          value={merged.background_value}
          onChange={(v) => update('background_value', v)}
          label="Background Color"
        />
      )}
      {merged.background_type !== 'none' && merged.background_type !== 'color' && (
        <div className="space-y-2">
          <Label className="text-xs">
            {merged.background_type === 'gradient' ? 'CSS Gradient' : 'Image URL'}
          </Label>
          {merged.background_type === 'image' ? (
            <ImageUploadInput
              value={merged.background_value}
              onChange={v => update('background_value', v)}
              label=""
              pathPrefix={`sections/${sectionId ?? 'bg'}`}
            />
          ) : (
            <Input
              value={merged.background_value}
              onChange={e => update('background_value', e.target.value)}
              placeholder="linear-gradient(135deg, #667eea, #764ba2)"
              className="h-8 text-xs"
            />
          )}
        </div>
      )}

      {/* Text Color Override — uses the canonical theme-aware picker so the
          row inherits theme/in-use swatches alongside the native color input. */}
      <ThemeAwareColorInput
        label="Text Color Override"
        value={merged.text_color_override}
        onChange={(next) => update('text_color_override', next ?? '')}
        placeholder="Leave empty to inherit"
      />

      {/* Padding */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Padding Top ({merged.padding_top}px)</Label>
          <Slider
            value={[merged.padding_top]}
            onValueChange={([v]) => update('padding_top', v)}
            min={0}
            max={200}
            step={8}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Padding Bottom ({merged.padding_bottom}px)</Label>
          <Slider
            value={[merged.padding_bottom]}
            onValueChange={([v]) => update('padding_bottom', v)}
            min={0}
            max={200}
            step={8}
          />
        </div>
      </div>

      {/* Max Width */}
      <div className="space-y-2">
        <Label className="text-xs">Content Max Width</Label>
        <Select value={merged.max_width} onValueChange={v => update('max_width', v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small (672px)</SelectItem>
            <SelectItem value="md">Medium (896px)</SelectItem>
            <SelectItem value="lg">Large (1152px)</SelectItem>
            <SelectItem value="xl">Extra Large (1280px)</SelectItem>
            <SelectItem value="full">Full Width</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Border Radius */}
      <div className="space-y-2">
        <Label className="text-xs">Border Radius ({merged.border_radius}px)</Label>
        <Slider
          value={[merged.border_radius]}
          onValueChange={([v]) => update('border_radius', v)}
          min={0}
          max={32}
          step={4}
        />
      </div>

      {/* Reset */}
      {hasOverrides && (
        <Button
          variant="outline"
          size={tokens.button.card}
          className="w-full text-xs"
          onClick={() => onChange({})}
        >
          Reset All Styles
        </Button>
      )}
    </div>
  );
}

/** Check if style overrides contain any active values */
export function hasActiveStyleOverrides(value?: Partial<StyleOverrides> | null): boolean {
  if (!value) return false;
  return Object.keys(value).some(k => {
    const v = value[k as keyof StyleOverrides];
    return v !== undefined && v !== '' && v !== 0 && v !== 'none' && v !== 'full';
  });
}
