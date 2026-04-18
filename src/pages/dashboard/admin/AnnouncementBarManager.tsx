import { useState, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAnnouncementBarSettings, useUpdateAnnouncementBarSettings, type AnnouncementBarSettings } from '@/hooks/useAnnouncementBar';
import { toast } from 'sonner';
import { Megaphone, ExternalLink, ArrowRight, Save, Loader2 } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';

export default function AnnouncementBarManager() {
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
  });

  // Sync form data with fetched settings
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(formData);
      toast.success('Announcement bar settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleChange = (field: keyof AnnouncementBarSettings, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardLoader size="lg" fullPage />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display tracking-tight flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" />
              Announcement Bar
            </h1>
            <p className="text-muted-foreground mt-1">
              Customize the promotional banner displayed above the header on the public website.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview Website
              </a>
            </Button>
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Live Preview */}
        <Card className={tokens.card.wrapper}>
          <CardHeader>
            <CardTitle className="text-lg">Live Preview</CardTitle>
            <CardDescription>
              This is how the announcement bar will appear on your website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`bg-secondary py-4 md:py-2.5 px-4 md:px-6 rounded-lg ${!formData.enabled ? 'opacity-50' : ''}`}>
              <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-1 md:gap-0">
                <p className="text-sm text-foreground/80 text-center md:text-left">
                  {formData.message_prefix}{' '}
                  <span className="font-medium">{formData.message_highlight}</span>{' '}
                  {formData.message_suffix}
                </p>
                <span className="group inline-flex items-center gap-1.5 text-sm font-display text-foreground uppercase tracking-wide">
                  {formData.cta_text}
                  <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </div>
            {!formData.enabled && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                The announcement bar is currently hidden
              </p>
            )}
          </CardContent>
        </Card>

        {/* Settings Form */}
        <Card className={tokens.card.wrapper}>
          <CardHeader>
            <CardTitle className="text-lg">Settings</CardTitle>
            <CardDescription>
              Configure the announcement bar content and behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
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

            {/* Message Fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Message Content</h3>
              
              <div className="grid gap-4 md:grid-cols-3">
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
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Call-to-Action Button</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
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

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
