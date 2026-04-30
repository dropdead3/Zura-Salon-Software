import { useState, useEffect, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link2, Instagram, Facebook, Twitter, Youtube, Linkedin, Plus, Trash2, PanelBottom } from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
import { fetchSiteSetting, writeSiteSettingDraft } from '@/lib/siteSettingsDraft';
import { useEditorDirtyState } from '@/hooks/useEditorDirtyState';
import { ToggleInput } from './inputs/ToggleInput';
import { EditorCard } from './EditorCard';

interface FooterLink {
  href: string;
  label: string;
}

interface FooterBottomLink {
  href: string;
  label: string;
}

interface FooterConfig {
  [key: string]: unknown;
  tagline: string;
  copyright_text: string;
  contact_email: string;
  instagram_url: string;
  facebook_url: string;
  twitter_url: string;
  youtube_url: string;
  linkedin_url: string;
  tiktok_url: string;
  nav_links: FooterLink[];
  bottom_links: FooterBottomLink[];
  powered_by_text: string;
  show_tagline: boolean;
  show_social_links: boolean;
  show_nav_links: boolean;
  show_bottom_links: boolean;
  show_powered_by: boolean;
}

const DEFAULT_FOOTER: FooterConfig = {
  tagline: '',
  copyright_text: '© {year} Your Salon Name. All rights reserved.',
  contact_email: '',
  instagram_url: '',
  facebook_url: '',
  twitter_url: '',
  youtube_url: '',
  linkedin_url: '',
  tiktok_url: '',
  nav_links: [
    { href: '/services', label: 'Services' },
    { href: '/booking', label: 'Book' },
  ],
  bottom_links: [],
  powered_by_text: '',
  show_tagline: true,
  show_social_links: true,
  show_nav_links: true,
  show_bottom_links: true,
  show_powered_by: true,
};

const SOCIAL_PLATFORMS = [
  { key: 'instagram_url' as const, icon: Instagram, label: 'Instagram', placeholder: 'https://instagram.com/yoursalon' },
  { key: 'facebook_url' as const, icon: Facebook, label: 'Facebook', placeholder: 'https://facebook.com/yoursalon' },
  { key: 'twitter_url' as const, icon: Twitter, label: 'X / Twitter', placeholder: 'https://x.com/yoursalon' },
  { key: 'youtube_url' as const, icon: Youtube, label: 'YouTube', placeholder: 'https://youtube.com/@yoursalon' },
  { key: 'linkedin_url' as const, icon: Linkedin, label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yoursalon' },
  { key: 'tiktok_url' as const, icon: () => <span className="text-xs font-medium">TT</span>, label: 'TikTok', placeholder: 'https://tiktok.com/@yoursalon' },
];

export function FooterEditor() {
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId();
  // Editor reads draft layer; public site reads live value.
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ['site-settings', orgId, 'website_footer', 'draft'],
    queryFn: async () => {
      return await fetchSiteSetting<FooterConfig>(orgId!, 'website_footer', 'draft');
    },
    enabled: !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: async (value: FooterConfig) => {
      if (!orgId) throw new Error('No organization context');
      const { data: { user } } = await supabase.auth.getUser();
      // Draft-only write — Publish promotes to live.
      await writeSiteSettingDraft(orgId, 'website_footer', value, user?.id ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, 'website_footer'] });
    },
  });


  const [config, setConfig] = useState<FooterConfig>(DEFAULT_FOOTER);
  const [isDirty, setIsDirty] = useState(false);
  useEditorDirtyState(isDirty);

  useEffect(() => {
    if (savedConfig) {
      setConfig({ ...DEFAULT_FOOTER, ...savedConfig });
    }
  }, [savedConfig]);

  const handleChange = (field: keyof FooterConfig, value: unknown) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = useCallback(async () => {
    try {
      await saveMutation.mutateAsync(config);
      setIsDirty(false);
      toast.success('Footer settings saved & published');
      triggerPreviewRefresh();
    } catch {
      toast.error('Failed to save footer settings');
    }
  }, [config, saveMutation]);

  useEditorSaveAction(handleSave);

  const addNavLink = () => {
    handleChange('nav_links', [...config.nav_links, { href: '/', label: 'New Link' }]);
  };

  const removeNavLink = (index: number) => {
    handleChange('nav_links', config.nav_links.filter((_, i) => i !== index));
  };

  const updateNavLink = (index: number, field: 'href' | 'label', value: string) => {
    const updated = [...config.nav_links];
    updated[index] = { ...updated[index], [field]: value };
    handleChange('nav_links', updated);
  };

  const addBottomLink = () => {
    handleChange('bottom_links', [...config.bottom_links, { href: '/', label: 'New Link' }]);
  };

  const removeBottomLink = (index: number) => {
    handleChange('bottom_links', config.bottom_links.filter((_, i) => i !== index));
  };

  const updateBottomLink = (index: number, field: 'href' | 'label', value: string) => {
    const updated = [...config.bottom_links];
    updated[index] = { ...updated[index], [field]: value };
    handleChange('bottom_links', updated);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Brand & Contact */}
      <EditorCard title="Brand & Contact" icon={PanelBottom} description="Tagline, copyright, and contact information">
        <ToggleInput
          label="Show Tagline"
          value={config.show_tagline}
          onChange={(v) => handleChange('show_tagline', v)}
          description="Display the brand tagline in the footer"
        />
        {config.show_tagline && (
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input value={config.tagline} onChange={e => handleChange('tagline', e.target.value)} />
          </div>
        )}
        <div className="space-y-2">
          <Label>Copyright Text</Label>
          <Input value={config.copyright_text} onChange={e => handleChange('copyright_text', e.target.value)} />
          <p className="text-xs text-muted-foreground">{'{year}'} will be replaced with the current year</p>
        </div>
        <div className="space-y-2">
          <Label>Contact Email</Label>
          <Input type="email" value={config.contact_email} onChange={e => handleChange('contact_email', e.target.value)} />
        </div>
        <ToggleInput
          label="Show Powered By"
          value={config.show_powered_by}
          onChange={(v) => handleChange('show_powered_by', v)}
          description="Display the 'Powered by' text at the bottom"
        />
        {config.show_powered_by && (
          <div className="space-y-2">
            <Label>Powered By Text</Label>
            <Input value={config.powered_by_text} onChange={e => handleChange('powered_by_text', e.target.value)} />
          </div>
        )}
      </EditorCard>

      {/* Social Links */}
      <EditorCard title="Social Media" icon={Instagram} description="Social media links displayed in the footer">
        <ToggleInput
          label="Show Social Links"
          value={config.show_social_links}
          onChange={(v) => handleChange('show_social_links', v)}
          description="Display social media icons in the footer"
        />
        {config.show_social_links && SOCIAL_PLATFORMS.map(({ key, icon: Icon, label, placeholder }) => (
          <div key={key} className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center text-muted-foreground shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <Input
              value={(config[key] as string) || ''}
              onChange={e => handleChange(key, e.target.value)}
              placeholder={placeholder}
              autoCapitalize="off"
            />
          </div>
        ))}
      </EditorCard>

      {/* Navigation Links */}
      <EditorCard title="Navigation Links" icon={Link2} description="Main footer navigation links">
        <ToggleInput
          label="Show Navigation Links"
          value={config.show_nav_links}
          onChange={(v) => handleChange('show_nav_links', v)}
          description="Display navigation links in the footer"
        />
        {config.show_nav_links && (
          <>
            {config.nav_links.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input className="flex-1" placeholder="Label" value={link.label} onChange={e => updateNavLink(index, 'label', e.target.value)} />
                <Input className="flex-1" placeholder="/path" value={link.href} onChange={e => updateNavLink(index, 'href', e.target.value)} />
                <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => removeNavLink(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size={tokens.button.inline} onClick={addNavLink} className="gap-2">
              <Plus className="h-4 w-4" /> Add Link
            </Button>
          </>
        )}
      </EditorCard>

      {/* Bottom Links */}
      <EditorCard title="Bottom Bar Links" description="Links shown at the very bottom of the footer">
        <ToggleInput
          label="Show Bottom Links"
          value={config.show_bottom_links}
          onChange={(v) => handleChange('show_bottom_links', v)}
          description="Display links at the very bottom of the footer"
        />
        {config.show_bottom_links && (
          <>
            {config.bottom_links.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input className="flex-1" placeholder="Label" value={link.label} onChange={e => updateBottomLink(index, 'label', e.target.value)} />
                <Input className="flex-1" placeholder="/path" value={link.href} onChange={e => updateBottomLink(index, 'href', e.target.value)} />
                <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => removeBottomLink(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size={tokens.button.inline} onClick={addBottomLink} className="gap-2">
              <Plus className="h-4 w-4" /> Add Link
            </Button>
          </>
        )}
      </EditorCard>
    </div>
  );
}
