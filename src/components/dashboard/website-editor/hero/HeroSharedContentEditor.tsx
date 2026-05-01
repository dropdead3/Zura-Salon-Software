import { Image as ImageIcon } from 'lucide-react';
import type { HeroConfig } from '@/hooks/useSectionConfig';
import { EditorCard } from '../EditorCard';
import { ToggleInput } from '../inputs/ToggleInput';
import { SliderInput } from '../inputs/SliderInput';
import { CharCountInput } from '../inputs/CharCountInput';
import { UrlInput } from '../inputs/UrlInput';
import { DynamicArrayInput } from '../inputs/DynamicArrayInput';

interface HeroSharedContentEditorProps {
  config: HeroConfig;
  onChange: <K extends keyof HeroConfig>(field: K, value: HeroConfig[K]) => void;
}

/**
 * Background-Only mode editor. Edits the single foreground (eyebrow / headline /
 * subheadline / CTAs) shared across every slide, plus the rotating-word and
 * consultation-notes blocks (already section-level globals). Per-slide copy is
 * intentionally hidden here — slides own only backgrounds in this mode.
 */
export function HeroSharedContentEditor({ config, onChange }: HeroSharedContentEditorProps) {
  return (
    <div className="space-y-4">
      {/* Eyebrow + Headline + Subheadline */}
      <EditorCard title="Shared Copy" icon={ImageIcon}>
        <p className="text-xs text-muted-foreground -mt-1">
          One headline shown above every rotating background.
        </p>

        <ToggleInput
          label="Show Eyebrow"
          value={!!config.show_eyebrow}
          onChange={(v) => onChange('show_eyebrow', v)}
        />
        {config.show_eyebrow && (
          <CharCountInput
            label="Eyebrow"
            value={config.eyebrow ?? ''}
            onChange={(v) => onChange('eyebrow', v)}
            maxLength={40}
          />
        )}

        <CharCountInput
          label="Headline"
          value={config.headline_text ?? ''}
          onChange={(v) => onChange('headline_text', v)}
          maxLength={60}
        />

        {/* Rotating word — section-level global, shared across all slides. */}
        <div className="space-y-3 pl-3 border-l-2 border-border/40">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Rotating Word in Headline</p>
            <p className="text-[11px] text-muted-foreground">
              Animates inside the shared headline.
            </p>
          </div>

          <ToggleInput
            label="Show Rotating Word"
            value={config.show_rotating_words ?? false}
            onChange={(v) => onChange('show_rotating_words', v)}
          />

          {(config.show_rotating_words ?? false) && (
            <>
              <DynamicArrayInput
                label="Word List"
                items={config.rotating_words ?? []}
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
        </div>

        <CharCountInput
          label="Subheadline Line 1"
          value={config.subheadline_line1 ?? ''}
          onChange={(v) => onChange('subheadline_line1', v)}
          maxLength={80}
        />
        <CharCountInput
          label="Subheadline Line 2"
          value={config.subheadline_line2 ?? ''}
          onChange={(v) => onChange('subheadline_line2', v)}
          maxLength={80}
        />

        {/* Consultation notes (also section-level). */}
        <div className="space-y-3 pl-3 border-l-2 border-border/40">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Notes Under Buttons</p>
            <p className="text-[11px] text-muted-foreground">
              Appears below the CTA buttons.
            </p>
          </div>

          <ToggleInput
            label="Show Notes"
            value={config.show_consultation_notes ?? false}
            onChange={(v) => onChange('show_consultation_notes', v)}
          />

          {(config.show_consultation_notes ?? false) && (
            <>
              <CharCountInput
                label="Note Line 1"
                value={config.consultation_note_line1 ?? ''}
                onChange={(v) => onChange('consultation_note_line1', v)}
                maxLength={80}
              />
              <CharCountInput
                label="Note Line 2"
                value={config.consultation_note_line2 ?? ''}
                onChange={(v) => onChange('consultation_note_line2', v)}
                maxLength={80}
              />
            </>
          )}
        </div>
      </EditorCard>

      {/* CTAs */}
      <EditorCard title="Shared Buttons" icon={ImageIcon}>
        <CharCountInput
          label="Primary Button"
          value={config.cta_new_client ?? ''}
          onChange={(v) => onChange('cta_new_client', v)}
          maxLength={30}
        />
        <UrlInput
          label="Primary Button URL"
          value={config.cta_new_client_url ?? ''}
          onChange={(v) => onChange('cta_new_client_url', v)}
          placeholder="Leave empty to open consultation form"
        />
        <ToggleInput
          label="Show Secondary Button"
          value={!!config.show_secondary_button}
          onChange={(v) => onChange('show_secondary_button', v)}
        />
        {config.show_secondary_button && (
          <>
            <CharCountInput
              label="Secondary Button"
              value={config.cta_returning_client ?? ''}
              onChange={(v) => onChange('cta_returning_client', v)}
              maxLength={30}
            />
            <UrlInput
              label="Secondary Button URL"
              value={config.cta_returning_client_url ?? ''}
              onChange={(v) => onChange('cta_returning_client_url', v)}
              placeholder="/booking"
            />
          </>
        )}
      </EditorCard>
    </div>
  );
}
