import { Label } from '@/components/ui/label';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { EditorCard } from '../EditorCard';
import type { HeroConfig } from '@/hooks/useSectionConfig';

interface HeroAlignmentEditorProps {
  config: HeroConfig;
  onChange: <K extends keyof HeroConfig>(field: K, value: HeroConfig[K]) => void;
}

/**
 * Section-level horizontal alignment for headline/subheadline/CTAs across
 * every slide. Per-slide overrides win when set on the slide itself.
 */
export function HeroAlignmentEditor({ config, onChange }: HeroAlignmentEditorProps) {
  return (
    <EditorCard title="Content Alignment" icon={AlignJustify}>
      <p className="text-xs text-muted-foreground -mt-1">
        Horizontal placement of the headline, subheadline, and call-to-action buttons.
        Applies to every slide unless a slide overrides it.
      </p>
      <div className="space-y-2">
        <Label className="text-xs">Alignment</Label>
        <div className="flex gap-2">
          {([
            { id: 'left', label: 'Left', Icon: AlignLeft },
            { id: 'center', label: 'Center', Icon: AlignCenter },
            { id: 'right', label: 'Right', Icon: AlignRight },
          ] as const).map(({ id, label, Icon }) => {
            const active = (config.content_alignment ?? 'center') === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange('content_alignment', id)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs border transition-colors ${
                  active
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </EditorCard>
  );
}
