import { useState, useEffect, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Settings2, RotateCcw, Layout } from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { useDirtyState } from '@/hooks/useDirtyState';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useHeroConfig, type HeroConfig, DEFAULT_HERO } from '@/hooks/useSectionConfig';
import { RotatingWordsInput } from './RotatingWordsInput';
import { SliderInput } from './inputs/SliderInput';
import { UrlInput } from './inputs/UrlInput';
import { ToggleInput } from './inputs/ToggleInput';
import { CharCountInput } from './inputs/CharCountInput';
import { useDebounce } from '@/hooks/use-debounce';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { useSaveTelemetry } from '@/hooks/useSaveTelemetry';

import { SectionGroupHeader } from './SectionGroupHeader';
import { EditorCard } from './EditorCard';
import { HeroBackgroundEditor } from './HeroBackgroundEditor';
import { HeroSlidesManager } from './HeroSlidesManager';
import { HeroTextColorsEditor } from './HeroTextColorsEditor';
import { EditorCard as _EditorCardForColors } from './EditorCard';
import { Palette } from 'lucide-react';

export function HeroEditor() {
  const __saveTelemetry = useSaveTelemetry('hero-editor');
  const { data, isLoading, isSaving, update } = useHeroConfig();
  const [localConfig, setLocalConfig] = useState<HeroConfig>(DEFAULT_HERO);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const debouncedConfig = useDebounce(localConfig, 300);

  // Canonical dirty-state hook (key-order-stable structural compare + UI wiring).
  // See src/hooks/useDirtyState.ts for why JSON.stringify is forbidden here.
  useDirtyState(localConfig, data);

  // Live-edit bridge: stream in-memory edits into the preview iframe so the
  // canvas reflects what's being typed RIGHT NOW, not just the last save.
  const { effectiveOrganization } = useOrganizationContext();
  usePreviewBridge('section_hero', localConfig);

  useEffect(() => {
    if (data && !isLoading) {
      setLocalConfig(data);
    }
  }, [data, isLoading]);

  const handleSave = useCallback(async () => {
    try {
      await update(localConfig);
      toast.success('Hero section saved');
      // Drop the iframe's live override so it re-renders from the freshly
      // invalidated DB read instead of holding our stale postMessage value.
      clearPreviewOverride('section_hero', effectiveOrganization?.id ?? null);
      __saveTelemetry.event('save-success'); triggerPreviewRefresh(); __saveTelemetry.flush();
    } catch {
      toast.error('Failed to save');
    }
  }, [localConfig, update, effectiveOrganization?.id]);

  useEditorSaveAction(handleSave);

  const updateField = <K extends keyof HeroConfig>(field: K, value: HeroConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_HERO);
    toast.info('Reset to defaults — save to apply');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HeroBackgroundEditor
        config={localConfig}
        onChange={(patch) => setLocalConfig((prev) => ({ ...prev, ...patch }))}
      />

      <HeroSlidesManager
        config={localConfig}
        onChange={(patch) => setLocalConfig((prev) => ({ ...prev, ...patch }))}
      />

      <EditorCard
        title="Hero Section"
        icon={Layout}
        description={localConfig.slides.length > 0
          ? "Default fallback content (used when slides above are empty)"
          : "Configure the main hero banner on your homepage"}
        headerActions={
          <Button variant="ghost" size={tokens.button.inline} onClick={handleReset} className="text-muted-foreground gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        }
      >

      {/* Eyebrow */}
      <ToggleInput
        label="Show Eyebrow"
        value={localConfig.show_eyebrow}
        onChange={(value) => updateField('show_eyebrow', value)}
        description="Display the small text above the main headline"
      />
      {localConfig.show_eyebrow && (
        <CharCountInput
          label="Eyebrow Text"
          value={localConfig.eyebrow}
          onChange={(value) => updateField('eyebrow', value)}
          maxLength={40}
          placeholder="Hair • Color • Artistry"
          aiFieldType="eyebrow"
        />
      )}

      {/* Headline Text */}
      <CharCountInput
        label="Headline Text"
        value={localConfig.headline_text}
        onChange={(value) => updateField('headline_text', value)}
        maxLength={30}
        placeholder="Your Salon"
        description="The static headline above the rotating words"
        aiFieldType="hero_headline"
      />

      {/* Rotating Words */}
      <ToggleInput
        label="Show Rotating Words"
        value={localConfig.show_rotating_words}
        onChange={(value) => updateField('show_rotating_words', value)}
        description="Toggle the animated rotating headline words"
      />
      {localConfig.show_rotating_words && (
        <RotatingWordsInput
          words={localConfig.rotating_words}
          onChange={(words) => updateField('rotating_words', words)}
          label="Headline Rotating Words"
          placeholder="e.g. Salon, Extensions..."
        />
      )}

      {/* Subheadline */}
      <ToggleInput
        label="Show Subheadline"
        value={localConfig.show_subheadline}
        onChange={(value) => updateField('show_subheadline', value)}
        description="Display supporting text below the main headline"
      />
      {localConfig.show_subheadline && (
        <div className="space-y-4">
          <CharCountInput
            label="Subheadline Line 1"
            value={localConfig.subheadline_line1}
            onChange={(value) => updateField('subheadline_line1', value)}
            maxLength={60}
            description="First line of supporting text below the headline"
            aiFieldType="hero_subheadline"
          />
          <CharCountInput
            label="Subheadline Line 2"
            value={localConfig.subheadline_line2}
            onChange={(value) => updateField('subheadline_line2', value)}
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
          value={localConfig.cta_new_client}
          onChange={(value) => updateField('cta_new_client', value)}
          maxLength={30}
          description="Main call-to-action button"
          aiFieldType="cta_button"
        />
        <UrlInput
          label="Primary Button URL"
          value={localConfig.cta_new_client_url}
          onChange={(value) => updateField('cta_new_client_url', value)}
          placeholder="Leave empty to open the default form"
          description="Leave empty to open the default form dialog"
        />

        {/* Secondary Button with visibility toggle */}
        <ToggleInput
          label="Show Secondary Button"
          value={localConfig.show_secondary_button}
          onChange={(value) => updateField('show_secondary_button', value)}
          description="Display a second CTA button below the primary"
        />
        {localConfig.show_secondary_button && (
          <>
            <CharCountInput
              label="Secondary Button Text"
              value={localConfig.cta_returning_client}
              onChange={(value) => updateField('cta_returning_client', value)}
              maxLength={30}
            />
            <UrlInput
              label="Secondary Button URL"
              value={localConfig.cta_returning_client_url}
              onChange={(value) => updateField('cta_returning_client_url', value)}
              placeholder="/booking"
            />
          </>
        )}
      </div>

      {/* Below-Button Notes */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <ToggleInput
          label="Show Below-Button Notes"
          value={localConfig.show_consultation_notes}
          onChange={(value) => updateField('show_consultation_notes', value)}
          description="Display helper text below the CTA buttons"
        />
        {localConfig.show_consultation_notes && (
          <>
            <div className="space-y-2">
              <Label htmlFor="note1">Note Line 1</Label>
              <Input
                id="note1"
                value={localConfig.consultation_note_line1}
                onChange={(e) => updateField('consultation_note_line1', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note2">Note Line 2</Label>
              <Input
                id="note2"
                value={localConfig.consultation_note_line2}
                onChange={(e) => updateField('consultation_note_line2', e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {/* Advanced Settings */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between mt-4">
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Advanced Settings
            </span>
            <span className="text-xs text-muted-foreground">
              {showAdvanced ? 'Hide' : 'Show'}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-4">
          {/* Animation Timing */}
          <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm">Animation Timing</h4>
            <SliderInput
              label="Animation Start Delay"
              value={localConfig.animation_start_delay}
              onChange={(value) => updateField('animation_start_delay', value)}
              min={1}
              max={8}
              step={0.5}
              unit="s"
              description="When word rotation begins after page load"
            />
            <SliderInput
              label="Word Rotation Interval"
              value={localConfig.word_rotation_interval}
              onChange={(value) => updateField('word_rotation_interval', value)}
              min={2}
              max={10}
              step={0.5}
              unit="s"
              description="How long each rotating word displays"
            />
          </div>

          {/* Scroll Indicator */}
          <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm">Scroll Indicator</h4>
            <ToggleInput
              label="Show Scroll Indicator"
              value={localConfig.show_scroll_indicator}
              onChange={(value) => updateField('show_scroll_indicator', value)}
              description="Show the scroll arrow at the bottom"
            />
            {localConfig.show_scroll_indicator && (
              <div className="space-y-2">
                <Label>Scroll Indicator Text</Label>
                <Input
                  value={localConfig.scroll_indicator_text}
                  onChange={(e) => updateField('scroll_indicator_text', e.target.value)}
                  placeholder="Scroll"
                />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      </EditorCard>
    </div>
  );
}
