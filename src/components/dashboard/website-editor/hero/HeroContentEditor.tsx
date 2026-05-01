import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react';
import { EditorCard } from '../EditorCard';
import { RotatingWordsInput } from '../RotatingWordsInput';
import { UrlInput } from '../inputs/UrlInput';
import { ToggleInput } from '../inputs/ToggleInput';
import { CharCountInput } from '../inputs/CharCountInput';
import type { HeroConfig } from '@/hooks/useSectionConfig';

interface HeroContentEditorProps {
  config: HeroConfig;
  onChange: <K extends keyof HeroConfig>(field: K, value: HeroConfig[K]) => void;
}

/**
 * Content & Copy sub-editor: alignment, eyebrow, headline, rotating words,
 * subheadline, CTA buttons, and below-button notes.
 *
 * Pure controlled component — receives `config` + `onChange` from
 * `HeroEditor`. Keeps all save/dirty state at the parent level so this view
 * is freely swappable without losing unsaved edits.
 */
export function HeroContentEditor({ config, onChange }: HeroContentEditorProps) {
  return (
    <EditorCard title="Content & Copy" icon={Type}>
      {/* Content alignment */}
      <div className="space-y-2">
        <Label className="text-xs">Content Alignment</Label>
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
        <p className="text-[11px] text-muted-foreground">
          Horizontal placement of the headline, subheadline, and call-to-action buttons.
        </p>
      </div>

      {/* Eyebrow */}
      <ToggleInput
        label="Show Eyebrow"
        value={config.show_eyebrow}
        onChange={(value) => onChange('show_eyebrow', value)}
        description="Display the small text above the main headline"
      />
      {config.show_eyebrow && (
        <CharCountInput
          label="Eyebrow Text"
          value={config.eyebrow}
          onChange={(value) => onChange('eyebrow', value)}
          maxLength={40}
          placeholder="Hair • Color • Artistry"
          aiFieldType="eyebrow"
        />
      )}

      {/* Headline */}
      <CharCountInput
        label="Headline Text"
        value={config.headline_text}
        onChange={(value) => onChange('headline_text', value)}
        maxLength={30}
        placeholder="Your Salon"
        description="The static headline above the rotating words"
        aiFieldType="hero_headline"
      />

      {/* Rotating words */}
      <ToggleInput
        label="Show Rotating Words"
        value={config.show_rotating_words}
        onChange={(value) => onChange('show_rotating_words', value)}
        description="Toggle the animated rotating headline words"
      />
      {config.show_rotating_words && (
        <RotatingWordsInput
          words={config.rotating_words}
          onChange={(words) => onChange('rotating_words', words)}
          label="Headline Rotating Words"
          placeholder="e.g. Salon, Extensions..."
        />
      )}

      {/* Subheadline */}
      <ToggleInput
        label="Show Subheadline"
        value={config.show_subheadline}
        onChange={(value) => onChange('show_subheadline', value)}
        description="Display supporting text below the main headline"
      />
      {config.show_subheadline && (
        <div className="space-y-4">
          <CharCountInput
            label="Subheadline Line 1"
            value={config.subheadline_line1}
            onChange={(value) => onChange('subheadline_line1', value)}
            maxLength={60}
            description="First line of supporting text below the headline"
            aiFieldType="hero_subheadline"
          />
          <CharCountInput
            label="Subheadline Line 2"
            value={config.subheadline_line2}
            onChange={(value) => onChange('subheadline_line2', value)}
            maxLength={60}
            description="Second line of supporting text"
          />
        </div>
      )}

      {/* CTAs */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <h4 className="font-medium text-sm">Call to Action Buttons</h4>
        <CharCountInput
          label="Primary Button Text"
          value={config.cta_new_client}
          onChange={(value) => onChange('cta_new_client', value)}
          maxLength={30}
          description="Main call-to-action button"
          aiFieldType="cta_button"
        />
        <UrlInput
          label="Primary Button URL"
          value={config.cta_new_client_url}
          onChange={(value) => onChange('cta_new_client_url', value)}
          placeholder="Leave empty to open the default form"
          description="Leave empty to open the default form dialog"
        />

        <ToggleInput
          label="Show Secondary Button"
          value={config.show_secondary_button}
          onChange={(value) => onChange('show_secondary_button', value)}
          description="Display a second CTA button below the primary"
        />
        {config.show_secondary_button && (
          <>
            <CharCountInput
              label="Secondary Button Text"
              value={config.cta_returning_client}
              onChange={(value) => onChange('cta_returning_client', value)}
              maxLength={30}
            />
            <UrlInput
              label="Secondary Button URL"
              value={config.cta_returning_client_url}
              onChange={(value) => onChange('cta_returning_client_url', value)}
              placeholder="/booking"
            />
          </>
        )}
      </div>

      {/* Below-button notes */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <ToggleInput
          label="Show Below-Button Notes"
          value={config.show_consultation_notes}
          onChange={(value) => onChange('show_consultation_notes', value)}
          description="Display helper text below the CTA buttons"
        />
        {config.show_consultation_notes && (
          <>
            <div className="space-y-2">
              <Label htmlFor="note1">Note Line 1</Label>
              <Input
                id="note1"
                value={config.consultation_note_line1}
                onChange={(e) => onChange('consultation_note_line1', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note2">Note Line 2</Label>
              <Input
                id="note2"
                value={config.consultation_note_line2}
                onChange={(e) => onChange('consultation_note_line2', e.target.value)}
              />
            </div>
          </>
        )}
      </div>
    </EditorCard>
  );
}
