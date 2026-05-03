import { useState, useEffect, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Settings2, RotateCcw, MessageSquareQuote, Sparkles } from 'lucide-react';
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
import { ZuraReviewLibrary } from './ZuraReviewLibrary';
import { SectionTextColorsEditor } from './inputs/SectionTextColorsEditor';
import { TESTIMONIALS_COLOR_SLOTS } from '@/lib/sectionColorSlots';
import { SectionStyleEditor } from './SectionStyleEditor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock } from 'lucide-react';
import { useReputationEntitlement } from '@/hooks/reputation/useReputationEntitlement';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { Link } from 'react-router-dom';
import type { StyleOverrides } from '@/components/home/SectionStyleWrapper';

const REVIEW_SOURCE_OPTIONS: { value: NonNullable<TestimonialsConfig['review_source']>; label: string; hint: string }[] = [
  { value: 'manual', label: 'Manual testimonials only', hint: 'Use only the testimonials you type below.' },
  { value: 'zura', label: 'Approved Zura reviews only', hint: 'Pull consent-approved 5-star client reviews from the Reputation Engine.' },
  { value: 'mixed', label: 'Mixed (manual + Zura)', hint: 'Show both your manual testimonials and curated client reviews.' },
];

const LAYOUT_OPTIONS: { value: NonNullable<TestimonialsConfig['layout']>; label: string }[] = [
  { value: 'carousel', label: 'Infinite carousel (default)' },
  { value: 'grid', label: 'Grid' },
  { value: 'stacked', label: 'Stacked' },
  { value: 'hero', label: 'Featured hero' },
];

export function TestimonialsEditor() {
  const __saveTelemetry = useSaveTelemetry('testimonials-editor');
  const { data, isLoading, isSaving, update } = useTestimonialsConfig();
  const [localConfig, setLocalConfig] = useState<TestimonialsConfig>(DEFAULT_TESTIMONIALS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const { isEntitled: reputationEntitled } = useReputationEntitlement();
  const { dashPath } = useOrgDashboardPath();
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
  // Broadcast dirty state so the Website Editor Save bar activates.
  useDirtyState(localConfig, data, 'section_testimonials');

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
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="style">Background &amp; Style</TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="space-y-6 mt-0">
        {/* Lapse safety: prior subscriber whose `review_source` is still 'zura'/'mixed'
            after Reputation lapsed. Curated reviews are auto-hidden by the
            sync_reputation_entitlement trigger, so the live section silently goes empty. */}
        {!reputationEntitled && (localConfig.review_source === 'zura' || localConfig.review_source === 'mixed') && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
            <Lock className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-foreground space-y-1.5">
              <p className="font-medium">This section will be empty on your live site.</p>
              <p className="text-muted-foreground">
                Review source is set to <strong>{localConfig.review_source === 'zura' ? 'Approved Zura reviews only' : 'Mixed'}</strong>,
                but Zura Reputation is not active. Curated 5-star reviews are hidden until you resubscribe.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => updateField('review_source', 'manual')}
                >
                  Switch to Manual
                </Button>
                <Button asChild size="sm" variant="link" className="h-auto p-0 text-amber-600 dark:text-amber-400">
                  <Link to={dashPath('/apps?app=reputation')}>Resubscribe →</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Review Source */}
        <div className="space-y-2">
          <Label className="text-sm">Review Source</Label>
          <Select
            value={localConfig.review_source ?? 'manual'}
            onValueChange={(v) => updateField('review_source', v as NonNullable<TestimonialsConfig['review_source']>)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REVIEW_SOURCE_OPTIONS.map((o) => {
                const gated = (o.value === 'zura' || o.value === 'mixed') && !reputationEntitled;
                return (
                  <SelectItem key={o.value} value={o.value} disabled={gated}>
                    {o.label}{gated ? ' — requires Zura Reputation' : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {REVIEW_SOURCE_OPTIONS.find((o) => o.value === (localConfig.review_source ?? 'manual'))?.hint}
          </p>
          {(localConfig.review_source === 'zura' || localConfig.review_source === 'mixed') && (
            reputationEntitled ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLibraryOpen(true)}
                className="gap-1.5 mt-2"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Open Zura Review Library
              </Button>
            ) : (
              <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
                <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-muted-foreground">
                  Auto-curating 5-star client reviews onto your website requires
                  the Zura Reputation app.
                  <Button asChild variant="link" size="sm" className="h-auto p-0 ml-1 text-amber-600 dark:text-amber-400">
                    <Link to={dashPath('/apps?app=reputation')}>Subscribe →</Link>
                  </Button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Layout */}
        <div className="space-y-2">
          <Label className="text-sm">Layout</Label>
          <Select
            value={localConfig.layout ?? 'carousel'}
            onValueChange={(v) => updateField('layout', v as NonNullable<TestimonialsConfig['layout']>)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LAYOUT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
          </TabsContent>

          <TabsContent value="style" className="space-y-6 mt-0">
            <SectionTextColorsEditor
              value={localConfig.text_colors}
              onChange={(next) => updateField('text_colors', next)}
              slots={TESTIMONIALS_COLOR_SLOTS}
            />
            <SectionStyleEditor
              value={localConfig.style_overrides ?? {}}
              onChange={(next: Partial<StyleOverrides>) => updateField('style_overrides', next)}
              sectionId="testimonials"
            />
          </TabsContent>
        </Tabs>
      </EditorCard>

      <ReviewsManager surface="general" title="Homepage Reviews" />

      <ZuraReviewLibrary open={libraryOpen} onOpenChange={setLibraryOpen} />
    </div>
  );
}
