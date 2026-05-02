import { useState, useEffect, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Settings2, RotateCcw, HelpCircle } from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { useDirtyState } from '@/hooks/useDirtyState';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useFAQConfig, type FAQConfig, DEFAULT_FAQ } from '@/hooks/useSectionConfig';
import { RotatingWordsInput } from './RotatingWordsInput';
import { UrlInput } from './inputs/UrlInput';
import { ToggleInput } from './inputs/ToggleInput';
import { CharCountInput } from './inputs/CharCountInput';
import { useDebounce } from '@/hooks/use-debounce';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { useSaveTelemetry } from '@/hooks/useSaveTelemetry';
import { EditorCard } from './EditorCard';
import { FAQItemsManager } from './FAQItemsManager';

export function FAQEditor() {
  const __saveTelemetry = useSaveTelemetry('faq-editor');
  const { data, isLoading, isSaving, update } = useFAQConfig();
  const [localConfig, setLocalConfig] = useState<FAQConfig>(DEFAULT_FAQ);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const debouncedConfig = useDebounce(localConfig, 300);

  // Live-edit bridge — stream in-memory edits into the preview iframe.
  const { effectiveOrganization } = useOrganizationContext();
  usePreviewBridge('section_faq', localConfig);

  useEffect(() => {
    if (data && !isLoading) {
      setLocalConfig(data);
    }
  }, [data, isLoading]);

  const handleSave = useCallback(async () => {
    try {
      await update(localConfig);
      toast.success('FAQ section saved');
      clearPreviewOverride('section_faq', effectiveOrganization?.id ?? null);
      __saveTelemetry.event('save-success'); triggerPreviewRefresh(); __saveTelemetry.flush();
    } catch {
      toast.error('Failed to save');
    }
  }, [localConfig, update, effectiveOrganization?.id]);

  useEditorSaveAction(handleSave);

  const updateField = <K extends keyof FAQConfig>(field: K, value: FAQConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateParagraph = (index: number, value: string) => {
    const newParagraphs = [...localConfig.intro_paragraphs];
    newParagraphs[index] = value;
    updateField('intro_paragraphs', newParagraphs);
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_FAQ);
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
        title="FAQ Section"
        icon={HelpCircle}
        headerActions={
          <Button variant="ghost" size={tokens.button.card} onClick={handleReset} className="text-muted-foreground gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        }
      >
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
            placeholder="e.g. Asked, Answered..."
          />
        )}

        {/* Intro Paragraphs */}
        <ToggleInput
          label="Show Intro Paragraphs"
          value={localConfig.show_intro_paragraphs}
          onChange={(value) => updateField('show_intro_paragraphs', value)}
          description="Display introductory text above the FAQ list"
        />
        {localConfig.show_intro_paragraphs && (
          <div className="space-y-4 pt-4 border-t border-border/40">
            <h4 className="font-medium text-sm">Introduction Paragraphs</h4>
            <p className="text-xs text-muted-foreground">Displayed above the FAQ list to set context for visitors.</p>
            {localConfig.intro_paragraphs.map((paragraph, index) => (
              <div key={index} className="space-y-2">
                <Label>Paragraph {index + 1}</Label>
                <Textarea
                  value={paragraph}
                  onChange={(e) => updateParagraph(index, e.target.value)}
                  rows={3}
                />
              </div>
            ))}
          </div>
        )}

        {/* CTA Buttons */}
        <div className="space-y-4 pt-4 border-t border-border/40">
          <h4 className="font-medium text-sm">Call to Action Buttons</h4>
          <ToggleInput
            label="Show Primary CTA"
            value={localConfig.show_primary_cta}
            onChange={(value) => updateField('show_primary_cta', value)}
            description="Display the main CTA below the FAQ list"
          />
          {localConfig.show_primary_cta && (
            <>
              <CharCountInput
                label="Primary Button Text"
                value={localConfig.cta_primary_text}
                onChange={(value) => updateField('cta_primary_text', value)}
                maxLength={30}
              />
              <UrlInput
                label="Primary Button URL"
                value={localConfig.cta_primary_url}
                onChange={(value) => updateField('cta_primary_url', value)}
                placeholder="/faq"
                description="Where the primary button links to"
              />
            </>
          )}

          <ToggleInput
            label="Show Secondary CTA"
            value={localConfig.show_secondary_cta}
            onChange={(value) => updateField('show_secondary_cta', value)}
            description="Display the secondary CTA button"
          />
          {localConfig.show_secondary_cta && (
            <>
              <CharCountInput
                label="Secondary Button Text"
                value={localConfig.cta_secondary_text}
                onChange={(value) => updateField('cta_secondary_text', value)}
                maxLength={30}
              />
              <UrlInput
                label="Secondary Button URL"
                value={localConfig.cta_secondary_url}
                onChange={(value) => updateField('cta_secondary_url', value)}
                placeholder="/policies"
                description="Where the secondary button links to"
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
              <h4 className="font-medium text-sm">Search & Display</h4>
              <ToggleInput
                label="Show Search Bar"
                value={localConfig.show_search_bar}
                onChange={(value) => updateField('show_search_bar', value)}
                description="Allow visitors to search through FAQs"
              />
              {localConfig.show_search_bar && (
                <div className="space-y-2">
                  <Label>Search Placeholder</Label>
                  <Input
                    value={localConfig.search_placeholder}
                    onChange={(e) => updateField('search_placeholder', e.target.value)}
                    placeholder="Search questions..."
                  />
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

      </EditorCard>

      <FAQItemsManager />
    </div>
  );
}
