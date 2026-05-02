import { useState, useEffect, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Settings2, RotateCcw, MessageSquareQuote } from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { useDirtyState } from '@/hooks/useDirtyState';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useTestimonialsConfig, type TestimonialsConfig, DEFAULT_TESTIMONIALS } from '@/hooks/useSectionConfig';
import { UrlInput } from './inputs/UrlInput';
import { ToggleInput } from './inputs/ToggleInput';
import { SliderInput } from './inputs/SliderInput';
import { CharCountInput } from './inputs/CharCountInput';
import { useDebounce } from '@/hooks/use-debounce';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { useSaveTelemetry } from '@/hooks/useSaveTelemetry';
import { EditorCard } from './EditorCard';
import { ReviewsManager } from './ReviewsManager';

export function TestimonialsEditor() {
  const __saveTelemetry = useSaveTelemetry('testimonials-editor');
  const { data, isLoading, isSaving, update } = useTestimonialsConfig();
  const [localConfig, setLocalConfig] = useState<TestimonialsConfig>(DEFAULT_TESTIMONIALS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const debouncedConfig = useDebounce(localConfig, 300);

  const { effectiveOrganization } = useOrganizationContext();
  usePreviewBridge('section_testimonials', localConfig);

  useEffect(() => {
    if (data && !isLoading) {
      setLocalConfig(data);
    }
  }, [data, isLoading]);

  const handleSave = useCallback(async () => {
    try {
      await update(localConfig);
      toast.success('Testimonials section saved');
      clearPreviewOverride('section_testimonials', effectiveOrganization?.id ?? null);
      __saveTelemetry.event('save-success'); triggerPreviewRefresh(); __saveTelemetry.flush();
    } catch {
      toast.error('Failed to save');
    }
  }, [localConfig, update, effectiveOrganization?.id]);

  useEditorSaveAction(handleSave);

  const updateField = <K extends keyof TestimonialsConfig>(field: K, value: TestimonialsConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_TESTIMONIALS);
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
      <EditorCard
        title="Testimonials Section"
        icon={MessageSquareQuote}
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
          />
        )}

        {/* Headline */}
        <ToggleInput
          label="Show Headline"
          value={localConfig.show_headline}
          onChange={(value) => updateField('show_headline', value)}
          description="Display the main heading for the testimonials section"
        />
        {localConfig.show_headline && (
          <CharCountInput
            label="Headline"
            value={localConfig.headline}
            onChange={(value) => updateField('headline', value)}
            maxLength={60}
          />
        )}

        {/* Google Review Link */}
        <ToggleInput
          label="Show Google Review Link"
          value={localConfig.show_google_review_link}
          onChange={(value) => updateField('show_google_review_link', value)}
          description="Display the 'Leave a review' link/button"
        />
        {localConfig.show_google_review_link && (
          <>
            <UrlInput
              label="Google Review URL"
              value={localConfig.google_review_url}
              onChange={(value) => updateField('google_review_url', value)}
              placeholder="https://g.page/r/..."
              description="Link to your Google Reviews page"
            />
            <CharCountInput
              label="Review Link Text"
              value={localConfig.link_text}
              onChange={(value) => updateField('link_text', value)}
              maxLength={30}
              description="Text for the link that opens your Google Reviews"
            />
          </>
        )}

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
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Display Options</h4>
              <ToggleInput
                label="Show Star Ratings"
                value={localConfig.show_star_ratings}
                onChange={(value) => updateField('show_star_ratings', value)}
                description="Display 5-star rating icons on each testimonial card"
              />
              <div className="space-y-2">
                <Label>Verified Badge Text</Label>
                <Input
                  value={localConfig.verified_badge_text}
                  onChange={(e) => updateField('verified_badge_text', e.target.value)}
                  placeholder="Verified Customer"
                />
                <p className="text-xs text-muted-foreground">Label shown on the verified badge for each review</p>
              </div>
              <SliderInput
                label="Max Visible Testimonials"
                value={localConfig.max_visible_testimonials}
                onChange={(value) => updateField('max_visible_testimonials', value)}
                min={4}
                max={40}
                step={2}
                description="Maximum number of testimonials displayed in the carousel"
              />
            </div>
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Animation</h4>
              <SliderInput
                label="Scroll Animation Duration"
                value={localConfig.scroll_animation_duration}
                onChange={(value) => updateField('scroll_animation_duration', value)}
                min={20}
                max={120}
                step={5}
                unit="s"
                description="Duration for one complete carousel cycle"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

      </EditorCard>

      <ReviewsManager surface="general" title="Homepage Reviews" />
    </div>
  );
}
