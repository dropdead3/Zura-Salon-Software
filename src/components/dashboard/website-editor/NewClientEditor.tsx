import { useState, useEffect, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, UserPlus } from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useNewClientConfig, type NewClientConfig, DEFAULT_NEW_CLIENT } from '@/hooks/useSectionConfig';
import { RotatingWordsInput } from './RotatingWordsInput';
import { BenefitsListInput } from './BenefitsListInput';
import { ToggleInput } from './inputs/ToggleInput';
import { UrlInput } from './inputs/UrlInput';
import { CharCountInput } from './inputs/CharCountInput';
import { useDebounce } from '@/hooks/use-debounce';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { EditorCard } from './EditorCard';

export function NewClientEditor() {
  const { data, isLoading, isSaving, update } = useNewClientConfig();
  const [localConfig, setLocalConfig] = useState<NewClientConfig>(DEFAULT_NEW_CLIENT);
  const debouncedConfig = useDebounce(localConfig, 300);

  const { effectiveOrganization } = useOrganizationContext();
  usePreviewBridge('section_new_client', localConfig);

  useEffect(() => {
    if (data && !isLoading) {
      setLocalConfig(data);
    }
  }, [data, isLoading]);

  const handleSave = useCallback(async () => {
    try {
      await update(localConfig);
      toast.success('New Client section saved');
      clearPreviewOverride('section_new_client', effectiveOrganization?.id ?? null);
      triggerPreviewRefresh();
    } catch {
      toast.error('Failed to save');
    }
  }, [localConfig, update, effectiveOrganization?.id]);

  useEditorSaveAction(handleSave);

  const updateField = <K extends keyof NewClientConfig>(field: K, value: NewClientConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_NEW_CLIENT);
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
    <div className="space-y-6 h-full">
      <EditorCard
        title="New Client CTA"
        icon={UserPlus}
        headerActions={
          <Button variant="ghost" size={tokens.button.inline} onClick={handleReset} className="text-muted-foreground gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        }
      >
        {/* Headline */}
        <ToggleInput
          label="Show Headline"
          value={localConfig.show_headline}
          onChange={(value) => updateField('show_headline', value)}
          description="Display the headline prefix and rotating words"
        />
        {localConfig.show_headline && (
          <>
            <CharCountInput
              label="Headline Prefix"
              value={localConfig.headline_prefix}
              onChange={(value) => updateField('headline_prefix', value)}
              maxLength={30}
              placeholder="New Clients"
              description="Static text before the rotating words"
              aiFieldType="hero_headline"
            />
            <RotatingWordsInput
              words={localConfig.rotating_words}
              onChange={(words) => updateField('rotating_words', words)}
              label="Rotating Words"
              placeholder="e.g. Start Here, Wanted..."
            />
          </>
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
            <p className="text-xs text-muted-foreground">Supporting text displayed below the headline</p>
          </div>
        )}

        {/* Benefits */}
        <div className="pt-4 border-t border-border/40 space-y-4">
          <ToggleInput
            label="Show Benefits"
            value={localConfig.show_benefits}
            onChange={(value) => updateField('show_benefits', value)}
            description="Display benefit badges below the description"
          />
          {localConfig.show_benefits && (
            <BenefitsListInput
              benefits={localConfig.benefits}
              onChange={(benefits) => updateField('benefits', benefits)}
              label="Benefits (shown as badges)"
              placeholder="Add a benefit..."
            />
          )}
        </div>

        {/* CTA */}
        <div className="space-y-4 pt-4 border-t border-border/40">
          <ToggleInput
            label="Show CTA Button"
            value={localConfig.show_cta}
            onChange={(value) => updateField('show_cta', value)}
            description="Display the call-to-action button"
          />
          {localConfig.show_cta && (
            <>
              <CharCountInput
                label="CTA Button Text"
                value={localConfig.cta_text}
                onChange={(value) => updateField('cta_text', value)}
                maxLength={30}
                description="Text displayed on the main call-to-action button"
                aiFieldType="cta_button"
              />
              <UrlInput
                label="CTA Button URL"
                value={localConfig.cta_url}
                onChange={(value) => updateField('cta_url', value)}
                placeholder="Leave empty to open the default form"
                description="Where the button links to. Leave empty to open the default form."
              />
            </>
          )}
        </div>
      </EditorCard>
    </div>
  );
}
