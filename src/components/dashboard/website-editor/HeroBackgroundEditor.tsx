/**
 * HeroBackgroundEditor — section-level background media (image OR video) for
 * the hero. Used as the static background when no slides are configured, and
 * as the inherited fallback for slides whose background_type is 'inherit'.
 */
import { tokens } from '@/lib/design-tokens';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon } from 'lucide-react';
import type { HeroConfig } from '@/hooks/useSectionConfig';
import { MediaUploadInput } from './inputs/MediaUploadInput';
import { SliderInput } from './inputs/SliderInput';
import { EditorCard } from './EditorCard';

interface HeroBackgroundEditorProps {
  config: HeroConfig;
  onChange: (next: Partial<HeroConfig>) => void;
}

export function HeroBackgroundEditor({ config, onChange }: HeroBackgroundEditorProps) {
  const kind = config.background_type === 'video' ? 'video' : config.background_type === 'image' ? 'image' : '';

  return (
    <EditorCard
      title="Background Media"
      icon={ImageIcon}
      description="Optional image or short video shown behind the hero text"
    >
      <MediaUploadInput
        label="Section Background"
        value={config.background_url}
        posterValue={config.background_poster_url}
        kind={kind}
        onChange={({ url, posterUrl, kind: k }) =>
          onChange({
            background_url: url,
            background_poster_url: posterUrl,
            background_type: k === 'video' ? 'video' : k === 'image' ? 'image' : 'none',
          })
        }
        pathPrefix="hero"
      />

      {config.background_type !== 'none' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Fit</Label>
            <div className="flex gap-2">
              {(['cover', 'contain'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => onChange({ background_fit: opt })}
                  className={`flex-1 px-3 py-2 rounded-full text-xs border transition-colors ${
                    config.background_fit === opt
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                  }`}
                >
                  {opt === 'cover' ? 'Cover' : 'Contain'}
                </button>
              ))}
            </div>
          </div>
          <SliderInput
            label="Overlay Darkness"
            value={config.overlay_opacity}
            onChange={(v) => onChange({ overlay_opacity: v })}
            min={0}
            max={0.8}
            step={0.05}
            description="Darkens the media to keep text legible"
          />
        </>
      )}
    </EditorCard>
  );
}
