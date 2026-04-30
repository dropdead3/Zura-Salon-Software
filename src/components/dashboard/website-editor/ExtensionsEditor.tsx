import { useState, useEffect, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Star, Award, MapPin, Settings2, RotateCcw, Puzzle } from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useExtensionsConfig, type ExtensionsConfig, DEFAULT_EXTENSIONS } from '@/hooks/useSectionConfig';
import { ToggleInput } from './inputs/ToggleInput';
import { UrlInput } from './inputs/UrlInput';
import { CharCountInput } from './inputs/CharCountInput';
import { useDebounce } from '@/hooks/use-debounce';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { EditorCard } from './EditorCard';
import { ReviewsManager } from './ReviewsManager';

const ICON_OPTIONS = [
  { value: 'Star', icon: Star },
  { value: 'Award', icon: Award },
  { value: 'MapPin', icon: MapPin },
];

export function ExtensionsEditor() {
  const { data, isLoading, isSaving, update } = useExtensionsConfig();
  const [localConfig, setLocalConfig] = useState<ExtensionsConfig>(DEFAULT_EXTENSIONS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const debouncedConfig = useDebounce(localConfig, 300);

  const { effectiveOrganization } = useOrganizationContext();
  usePreviewBridge('section_extensions', localConfig);

  useEffect(() => {
    if (data && !isLoading) {
      setLocalConfig(data);
    }
  }, [data, isLoading]);

  const handleSave = useCallback(async () => {
    try {
      await update(localConfig);
      toast.success('Extensions section saved');
      clearPreviewOverride('section_extensions', effectiveOrganization?.id ?? null);
      triggerPreviewRefresh();
    } catch {
      toast.error('Failed to save');
    }
  }, [localConfig, update, effectiveOrganization?.id]);

  useEditorSaveAction(handleSave);

  const updateField = <K extends keyof ExtensionsConfig>(field: K, value: ExtensionsConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateFeature = (index: number, field: keyof ExtensionsConfig['features'][0], value: string) => {
    const newFeatures = [...localConfig.features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    updateField('features', newFeatures);
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_EXTENSIONS);
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
        title="Extensions Section"
        icon={Puzzle}
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
          description="Display introductory text above the headline"
        />
        {localConfig.show_eyebrow && (
          <CharCountInput
            label="Eyebrow Text"
            value={localConfig.eyebrow}
            onChange={(value) => updateField('eyebrow', value)}
            maxLength={60}
          />
        )}

        {/* Headlines */}
        <ToggleInput
          label="Show Headline"
          value={localConfig.show_headline}
          onChange={(value) => updateField('show_headline', value)}
          description="Display the main headline"
        />
        {localConfig.show_headline && (
          <div className="grid grid-cols-1 gap-4">
            <CharCountInput
              label="Headline Line 1"
              value={localConfig.headline_line1}
              onChange={(value) => updateField('headline_line1', value)}
              maxLength={30}
            />
            <CharCountInput
              label="Headline Line 2"
              value={localConfig.headline_line2}
              onChange={(value) => updateField('headline_line2', value)}
              maxLength={30}
            />
          </div>
        )}

        {/* Description */}
        <ToggleInput
          label="Show Description"
          value={localConfig.show_description}
          onChange={(value) => updateField('show_description', value)}
          description="Display supporting text below the headline"
        />
        {localConfig.show_description && (
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={localConfig.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Supporting text below the headline</p>
          </div>
        )}

        {/* Features */}
        <ToggleInput
          label="Show Feature Cards"
          value={localConfig.show_features}
          onChange={(value) => updateField('show_features', value)}
          description="Display the feature highlight cards"
        />
        {localConfig.show_features && (
          <div className="space-y-4 pt-4 border-t border-border/30">
            <h4 className="font-medium text-sm">Feature Cards</h4>
            <p className="text-xs text-muted-foreground">Highlight key selling points with icon, title, and description.</p>
            {localConfig.features.map((feature, index) => (
              <div key={index} className="p-4 border border-border/40 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  Feature {index + 1}
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={feature.title}
                    onChange={(e) => updateFeature(index, 'title', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={feature.description}
                    onChange={(e) => updateFeature(index, 'description', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTAs */}
        <div className="space-y-4 pt-4 border-t border-border/30">
          <h4 className="font-medium text-sm">Call to Action Buttons</h4>
          <ToggleInput
            label="Show Primary CTA"
            value={localConfig.show_primary_cta}
            onChange={(value) => updateField('show_primary_cta', value)}
            description="Display the primary call-to-action button"
          />
          {localConfig.show_primary_cta && (
            <>
              <CharCountInput
                label="Primary CTA"
                value={localConfig.cta_primary}
                onChange={(value) => updateField('cta_primary', value)}
                maxLength={30}
              />
              <UrlInput
                label="Primary CTA URL"
                value={localConfig.cta_primary_url}
                onChange={(value) => updateField('cta_primary_url', value)}
                placeholder="Leave empty to open the default form"
                description="Where the primary button links to"
              />
            </>
          )}

          <ToggleInput
            label="Show Secondary CTA"
            value={localConfig.show_secondary_cta}
            onChange={(value) => updateField('show_secondary_cta', value)}
          />
          {localConfig.show_secondary_cta && (
            <>
              <CharCountInput
                label="Secondary CTA"
                value={localConfig.cta_secondary}
                onChange={(value) => updateField('cta_secondary', value)}
                maxLength={30}
              />
              <UrlInput
                label="Secondary CTA URL"
                value={localConfig.cta_secondary_url}
                onChange={(value) => updateField('cta_secondary_url', value)}
                placeholder="/extensions"
              />
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
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Floating Badge</h4>
              <ToggleInput
                label="Show Floating Badge"
                value={localConfig.show_floating_badge}
                onChange={(value) => updateField('show_floating_badge', value)}
                description="Display the floating badge overlay on the section"
              />
              {localConfig.show_floating_badge && (
                <>
                  <div className="space-y-2">
                    <Label>Badge Text</Label>
                    <Input
                      value={localConfig.badge_text}
                      onChange={(e) => updateField('badge_text', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Badge Description</Label>
                    <Input
                      value={localConfig.floating_badge_description}
                      onChange={(e) => updateField('floating_badge_description', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Education Link</h4>
              <ToggleInput
                label="Show Education Link"
                value={localConfig.show_education_link}
                onChange={(value) => updateField('show_education_link', value)}
                description="Display a link for stylists wanting to learn your method"
              />
              {localConfig.show_education_link && (
                <>
                  <div className="space-y-2">
                    <Label>Link Text</Label>
                    <Input
                      value={localConfig.education_link_text}
                      onChange={(e) => updateField('education_link_text', e.target.value)}
                    />
                  </div>
                  <UrlInput
                    label="Link URL"
                    value={localConfig.education_link_url}
                    onChange={(value) => updateField('education_link_url', value)}
                    placeholder="/education"
                  />
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </EditorCard>

      <ReviewsManager surface="extensions" title="Extension Page Reviews" />
    </div>
  );
}
