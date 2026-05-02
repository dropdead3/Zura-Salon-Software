import { useState, useEffect, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAnnouncementBarSettings, useUpdateAnnouncementBarSettings, type AnnouncementBarSettings } from '@/hooks/useAnnouncementBar';
import { toast } from 'sonner';
import { Megaphone, ExternalLink, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditorCard } from './EditorCard';
import { ThemeAwareColorInput } from './inputs/ThemeAwareColorInput';
import { contrastRatio, readableForegroundFor } from '@/lib/color-contrast';

const BANNER_COLOR_PRESETS = [
  { label: 'Default (Secondary)', value: '', color: 'hsl(40, 20%, 92%)' },
  { label: 'Warm Sand', value: 'hsl(40, 25%, 90%)', color: 'hsl(40, 25%, 90%)' },
  { label: 'Soft Cream', value: 'hsl(40, 30%, 95%)', color: 'hsl(40, 30%, 95%)' },
  { label: 'Stone', value: 'hsl(30, 10%, 85%)', color: 'hsl(30, 10%, 85%)' },
  { label: 'Charcoal', value: 'hsl(0, 0%, 15%)', color: 'hsl(0, 0%, 15%)' },
  { label: 'Midnight', value: 'hsl(0, 0%, 8%)', color: 'hsl(0, 0%, 8%)' },
  { label: 'Blush', value: 'hsl(350, 20%, 93%)', color: 'hsl(350, 20%, 93%)' },
  { label: 'Sage', value: 'hsl(145, 18%, 92%)', color: 'hsl(145, 18%, 92%)' },
  { label: 'Slate Blue', value: 'hsl(210, 20%, 93%)', color: 'hsl(210, 20%, 93%)' },
];

function isDarkColor(color: string): boolean {
  if (!color) return false;
  const match = color.match(/hsl\((\d+),?\s*(\d+)%?,?\s*(\d+)%?\)/);
  if (!match) return false;
  return parseInt(match[3]) < 40;
}

export function AnnouncementBarContent() {
  const { data: settings, isLoading } = useAnnouncementBarSettings();
  const updateSettings = useUpdateAnnouncementBarSettings();
  
  const [formData, setFormData] = useState<AnnouncementBarSettings>({
    enabled: true,
    message_prefix: '',
    message_highlight: '',
    message_suffix: '',
    cta_text: '',
    cta_url: '',
    open_in_new_tab: true,
    bg_color: '',
    highlight_color: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        ...settings,
        bg_color: settings.bg_color || '',
        highlight_color: settings.highlight_color || '',
      });
    }
  }, [settings]);

  const { effectiveOrganization } = useOrganizationContext();
  // Live-edit bridge: stream in-memory edits into the preview iframe.
  usePreviewBridge('announcement_bar', formData);

  const handleSave = useCallback(async () => {
    try {
      await updateSettings.mutateAsync(formData);
      toast.success('Announcement bar settings saved');
      clearPreviewOverride('announcement_bar', effectiveOrganization?.id ?? null);
    } catch (error) {
      toast.error('Failed to save settings');
    }
  }, [formData, updateSettings, effectiveOrganization?.id]);

  useEditorSaveAction(handleSave);

  const handleChange = (field: keyof AnnouncementBarSettings, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isDark = isDarkColor(formData.bg_color || '');

  return (
    <EditorCard title="Announcement Bar" icon={Megaphone} description="Customize the promotional banner displayed above the header on the public website">
        {/* Visibility Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <Label htmlFor="enabled" className="text-base font-medium">Show Announcement Bar</Label>
            <p className="text-sm text-muted-foreground">
              Toggle the visibility of the announcement bar on your website
            </p>
          </div>
          <Switch
            id="enabled"
            checked={formData.enabled}
            onCheckedChange={(checked) => handleChange('enabled', checked)}
          />
        </div>

        <div className="elegant-divider" />

        {/* Banner Color */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground font-display uppercase tracking-wider">Banner Color</h3>
          <div className="flex flex-wrap gap-3">
            {BANNER_COLOR_PRESETS.map((preset) => {
              const isSelected = (formData.bg_color || '') === preset.value;
              const isPresetDark = isDarkColor(preset.value || 'hsl(40, 20%, 92%)');
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleChange('bg_color', preset.value)}
                  className={cn(
                    "relative w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110",
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
                  )}
                  style={{ backgroundColor: preset.color }}
                  title={preset.label}
                >
                  {isSelected && (
                    <Check className={cn("absolute inset-0 m-auto h-4 w-4", isPresetDark ? "text-white" : "text-foreground")} />
                  )}
                </button>
              );
            })}
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Custom color</Label>
            <ThemeAwareColorInput
              value={formData.bg_color || ''}
              onChange={(next) => handleChange('bg_color', next ?? '')}
              placeholder="e.g. #ebe6df"
            />
          </div>
        </div>

        <div className="elegant-divider" />

        {/* Message Fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground font-display uppercase tracking-wider">Message Content</h3>
          <div className="grid gap-4 grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="message_prefix">Message Prefix</Label>
              <Input
                id="message_prefix"
                value={formData.message_prefix}
                onChange={(e) => handleChange('message_prefix', e.target.value)}
                placeholder="Are you a salon"
                autoCapitalize="off"
              />
              <p className="text-xs text-muted-foreground">Text before the highlighted word</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message_highlight">Highlighted Word</Label>
              <Input
                id="message_highlight"
                value={formData.message_highlight}
                onChange={(e) => handleChange('message_highlight', e.target.value)}
                placeholder="professional"
                autoCapitalize="off"
              />
              <p className="text-xs text-muted-foreground">Displayed in bold/medium weight</p>
              <div className="space-y-2 pt-2">
                <Label className="text-sm">Highlight Color</Label>
                <ThemeAwareColorInput
                  value={formData.highlight_color || ''}
                  onChange={(next) => handleChange('highlight_color', next ?? '')}
                  placeholder="Auto (matches text)"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to inherit. If contrast is too low against the bar, an auto-readable
                  color is used instead.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message_suffix">Message Suffix</Label>
              <Input
                id="message_suffix"
                value={formData.message_suffix}
                onChange={(e) => handleChange('message_suffix', e.target.value)}
                placeholder="looking for our extensions?"
                autoCapitalize="off"
              />
              <p className="text-xs text-muted-foreground">Text after the highlighted word</p>
            </div>
          </div>
        </div>

        <div className="elegant-divider" />

        {/* CTA Fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground font-display uppercase tracking-wider">Call-to-Action Button</h3>
          <div className="grid gap-4 grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="cta_text">Button Text</Label>
              <Input
                id="cta_text"
                value={formData.cta_text}
                onChange={(e) => handleChange('cta_text', e.target.value)}
                placeholder="Shop Our Extensions Here"
                autoCapitalize="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta_url">Button Link URL</Label>
              <Input
                id="cta_url"
                type="url"
                value={formData.cta_url}
                onChange={(e) => handleChange('cta_url', e.target.value)}
                placeholder="https://example.com"
                autoCapitalize="off"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="open_in_new_tab" className="text-base font-medium">Open in New Tab</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, the link will open in a new browser tab
              </p>
            </div>
            <Switch
              id="open_in_new_tab"
              checked={formData.open_in_new_tab}
              onCheckedChange={(checked) => handleChange('open_in_new_tab', checked)}
            />
          </div>
        </div>
    </EditorCard>
  );
}
