import { useState, useEffect, useMemo } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { tokens } from '@/lib/design-tokens';
import { PLATFORM_NAME, PLATFORM_URL } from '@/lib/brand';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Loader2, Save, Send, Monitor, Smartphone, Info, Instagram, Globe, Facebook } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn } from '@/lib/utils';
import { useColorTheme, ColorTheme } from '@/hooks/useColorTheme';

const THEME_ACCENT_DEFAULTS: Record<ColorTheme, string> = {
  'cream-lux': '#A8763A',
  rosewood: '#A53D5C',
  sage: '#4A9C6D',
  jade: '#1CB39C',
  marine: '#1F4D8F',
  zura: '#8B5CF6',
  cognac: '#B8651F',
  noir: '#1A1A1A',
  neon: '#FF2D8A',
  matrix: '#1AFF7A',
  peach: '#FF8A5C',
  orchid: '#C9907A',
};

const SAMPLE_VARIABLES: Record<string, string> = {
  stylist_name: 'Sarah Johnson',
  employee_name: 'Sarah Johnson',
  birthday_date: 'Monday, March 15',
  date: 'Monday, March 15',
  birthday_count: '2',
  count: '2',
  birthday_list: '<ul style="padding-left:20px"><li style="margin-bottom:4px">Emma Wilson — March 15</li><li style="margin-bottom:4px">Alex Chen — March 16</li></ul>',
  birthday_names: 'Emma Wilson, Alex Chen',
  days_until: '3',
  handbook_title: 'Employee Handbook 2026',
  training_title: 'Advanced Color Techniques',
  dashboard_url: '#',
  link: '#',
  plural: 's',
  inactive_count: '3',
  day_number: '5',
  current_day: '5',
  salon_name: 'Luxe Salon',
  organization_name: 'Luxe Salon',
  manager_name: 'Jessica Taylor',
  strike_count: '2',
  strike_reason: 'Late arrival',
  strike_date: 'February 10, 2026',
};

function fillSampleVariables(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = SAMPLE_VARIABLES[varName];
    if (value !== undefined) return value;
    return `<span style="display:inline-block;background:#e0e7ff;color:#4338ca;padding:1px 6px;border-radius:4px;font-size:12px;font-family:monospace;">{{${varName}}}</span>`;
  });
}

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
}

const BUTTON_RADIUS_OPTIONS = [
  { value: 'sharp', label: 'Sharp', css: '0px' },
  { value: 'rounded', label: 'Rounded', css: '8px' },
  { value: 'pill', label: 'Pill', css: '100px' },
] as const;

const HEADER_STYLE_OPTIONS = [
  { value: 'centered', label: 'Centered' },
  { value: 'left-aligned', label: 'Left-Aligned' },
  { value: 'minimal', label: 'Minimal' },
] as const;

export function EmailBrandingSettings() {
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const { colorTheme } = useColorTheme();
  const orgId = effectiveOrganization?.id;
  const themeDefault = THEME_ACCENT_DEFAULTS[colorTheme] || '#1A1A1A';
  const orgName = effectiveOrganization?.name || 'Your Organization';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: businessSettings } = useBusinessSettings();

  // Identity
  const [senderName, setSenderName] = useState('');
  const [replyTo, setReplyTo] = useState('');

  // Visual
  const [accentColor, setAccentColor] = useState(themeDefault);
  const [logoSource, setLogoSource] = useState<'auto' | 'light' | 'dark' | 'custom' | 'none'>('auto');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [headerStyle, setHeaderStyle] = useState<string>('centered');
  const [buttonRadius, setButtonRadius] = useState<string>('rounded');

  // Footer
  const [footerText, setFooterText] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [showAttribution, setShowAttribution] = useState(true);

  // Preview
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedTemplate, setSelectedTemplate] = useState('sample');

  // Test email
  const [testEmail, setTestEmail] = useState(user?.email || '');
  const [sendingTest, setSendingTest] = useState(false);
  const [testPopoverOpen, setTestPopoverOpen] = useState(false);

  const logoUrl = useMemo(() => {
    switch (logoSource) {
      case 'auto':
      case 'light':
        return businessSettings?.logo_light_url || null;
      case 'dark':
        return businessSettings?.logo_dark_url || null;
      case 'custom':
        return customLogoUrl || null;
      case 'none':
        return null;
    }
  }, [logoSource, customLogoUrl, businessSettings?.logo_light_url, businessSettings?.logo_dark_url]);

  const { data: emailTemplates } = useEmailTemplates();

  const { data: branding, isLoading } = useQuery({
    queryKey: ['email-branding', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('email_sender_name, email_reply_to, email_logo_url, email_accent_color, email_footer_text, email_social_links, email_show_attribution, email_button_radius, email_header_style, email_physical_address')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  useEffect(() => {
    if (branding) {
      setSenderName(branding.email_sender_name || '');
      setReplyTo(branding.email_reply_to || '');
      setAccentColor(branding.email_accent_color || themeDefault);
      setFooterText((branding.email_footer_text as string) || '');
      setPhysicalAddress((branding as any).email_physical_address || '');
      setSocialLinks((branding.email_social_links as SocialLinks) || {});
      setShowAttribution(branding.email_show_attribution !== false);
      setButtonRadius((branding.email_button_radius as string) || 'rounded');
      setHeaderStyle((branding.email_header_style as string) || 'centered');

      const savedUrl = branding.email_logo_url || null;
      if (!savedUrl) {
        setLogoSource('none');
      } else if (savedUrl === businessSettings?.logo_light_url) {
        setLogoSource('auto');
      } else if (savedUrl === businessSettings?.logo_dark_url) {
        setLogoSource('dark');
      } else {
        setLogoSource('custom');
        setCustomLogoUrl(savedUrl);
      }
    }
  }, [branding, businessSettings]);

  useEffect(() => {
    if (user?.email && !testEmail) {
      setTestEmail(user.email);
    }
  }, [user?.email]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No organization');
      const { error } = await supabase
        .from('organizations')
        .update({
          email_sender_name: senderName || null,
          email_reply_to: replyTo || null,
          email_accent_color: accentColor,
          email_logo_url: logoUrl,
          email_footer_text: footerText || null,
          email_physical_address: physicalAddress || null,
          email_social_links: socialLinks,
          email_show_attribution: showAttribution,
          email_button_radius: buttonRadius,
          email_header_style: headerStyle,
        } as any)
        .eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-branding', orgId] });
      toast({ title: 'Email branding saved' });
    },
    onError: () => {
      toast({ title: 'Failed to save', variant: 'destructive' });
    },
  });

  const hasChanges =
    senderName !== (branding?.email_sender_name || '') ||
    replyTo !== (branding?.email_reply_to || '') ||
    accentColor !== (branding?.email_accent_color || themeDefault) ||
    logoUrl !== (branding?.email_logo_url || null) ||
    footerText !== ((branding?.email_footer_text as string) || '') ||
    physicalAddress !== ((branding as any)?.email_physical_address || '') ||
    JSON.stringify(socialLinks) !== JSON.stringify((branding?.email_social_links as SocialLinks) || {}) ||
    showAttribution !== (branding?.email_show_attribution !== false) ||
    buttonRadius !== ((branding?.email_button_radius as string) || 'rounded') ||
    headerStyle !== ((branding?.email_header_style as string) || 'centered');

  const handleSendTestEmail = async () => {
    if (!testEmail) return;
    setSendingTest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const res = await supabase.functions.invoke('send-branding-test-email', {
        body: { recipient_email: testEmail },
      });
      if (res.error) throw res.error;
      const result = res.data;
      if (result?.success) {
        toast({ title: 'Test email sent', description: `Check ${testEmail}` });
        setTestPopoverOpen(false);
      } else {
        throw new Error(result?.error || 'Failed to send');
      }
    } catch (err: any) {
      toast({ title: 'Failed to send test email', description: err.message, variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

  const displayName = senderName || orgName;
  const previewAccent = accentColor || themeDefault;
  const previewButtonRadius = BUTTON_RADIUS_OPTIONS.find(o => o.value === buttonRadius)?.css || '8px';

  const templatePreviewHtml = useMemo(() => {
    if (selectedTemplate === 'sample' || !emailTemplates) return null;
    const tmpl = emailTemplates.find((t) => t.template_key === selectedTemplate);
    if (!tmpl) return null;
    return fillSampleVariables(tmpl.html_body);
  }, [selectedTemplate, emailTemplates]);

  const updateSocialLink = (key: keyof SocialLinks, value: string) => {
    setSocialLinks(prev => ({ ...prev, [key]: value || undefined }));
  };

  if (isLoading) {
    return <DashboardLoader size="md" className="py-12" />;
  }

  // Social icons for preview
  const socialIconsHtml = () => {
    const links: { url: string; label: string; icon: string }[] = [];
    if (socialLinks.instagram) links.push({ url: socialLinks.instagram, label: 'Instagram', icon: '📷' });
    if (socialLinks.facebook) links.push({ url: socialLinks.facebook, label: 'Facebook', icon: '📘' });
    if (socialLinks.tiktok) links.push({ url: socialLinks.tiktok, label: 'TikTok', icon: '🎵' });
    if (socialLinks.website) links.push({ url: socialLinks.website, label: 'Website', icon: '🌐' });
    return links;
  };

  const headerPadding = '24px';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: Settings */}
      <div className="space-y-6">
        {/* Identity Section */}
        <div className="space-y-4">
          <Eyebrow className="text-muted-foreground">Identity</Eyebrow>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sender-name">Sender Display Name</Label>
              <Input
                id="sender-name"
                placeholder={orgName}
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                autoCapitalize="off"
              />
              <p className="text-xs text-muted-foreground">The "from" name in recipients' inboxes.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply-to">Reply-To Email</Label>
              <Input
                id="reply-to"
                type="email"
                placeholder="hello@yoursalon.com"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Where replies are directed.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Visual Section */}
        <div className="space-y-4">
          <Eyebrow className="text-muted-foreground">Visual</Eyebrow>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Logo */}
            <div className="space-y-2">
              <Label>Email Logo</Label>
              <Select value={logoSource} onValueChange={(v) => setLogoSource(v as typeof logoSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Light Logo)</SelectItem>
                  <SelectItem value="light">Light Logo</SelectItem>
                  <SelectItem value="dark">Dark Logo</SelectItem>
                  <SelectItem value="custom">Custom URL</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
              {logoSource === 'custom' && (
                <Input
                  placeholder="https://example.com/logo.png"
                  value={customLogoUrl}
                  onChange={(e) => setCustomLogoUrl(e.target.value)}
                  className="mt-2"
                  autoCapitalize="off"
                />
              )}
              {logoUrl && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 mt-2">
                  <img src={logoUrl} alt="Email logo" className="h-10 w-auto max-w-[160px] object-contain rounded" />
                </div>
              )}
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <Label htmlFor="accent-color">Accent Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-input cursor-pointer p-0.5"
                />
                <Input
                  id="accent-color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  autoCapitalize="off"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground">Header background and CTA buttons.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Header Style */}
            <div className="space-y-2">
              <Label>Header Style</Label>
              <Select value={headerStyle} onValueChange={setHeaderStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HEADER_STYLE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Logo and header layout style.</p>
            </div>

            {/* Button Radius */}
            <div className="space-y-2">
              <Label>Button Style</Label>
              <div className="flex gap-2">
                {BUTTON_RADIUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setButtonRadius(opt.value)}
                    className={cn(
                      "flex-1 h-10 border text-sm transition-colors",
                      buttonRadius === opt.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-input bg-background text-muted-foreground hover:bg-muted"
                    )}
                    style={{ borderRadius: opt.css }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">CTA button corner radius.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Footer Section */}
        <div className="space-y-4">
          <Eyebrow className="text-muted-foreground">Footer</Eyebrow>
          
          <div className="space-y-2">
            <Label htmlFor="physical-address" className="flex items-center gap-1.5">
              Business Address
              <span className="text-xs font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Required</span>
            </Label>
            <Input
              id="physical-address"
              placeholder="123 Main St, Suite 100, Your City, ST 12345"
              value={physicalAddress}
              onChange={(e) => setPhysicalAddress(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Required by CAN-SPAM for all commercial emails. Your physical mailing address.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer-text">Footer Text</Label>
            <Textarea
              id="footer-text"
              placeholder="Additional footer text or tagline"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className="min-h-[60px] resize-none"
            />
            <p className="text-xs text-muted-foreground">Optional tagline or additional text shown in the email footer.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5" /> Instagram
              </Label>
              <Input
                placeholder="https://instagram.com/yoursalon"
                value={socialLinks.instagram || ''}
                onChange={(e) => updateSocialLink('instagram', e.target.value)}
                autoCapitalize="off"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Facebook className="w-3.5 h-3.5" /> Facebook
              </Label>
              <Input
                placeholder="https://facebook.com/yoursalon"
                value={socialLinks.facebook || ''}
                onChange={(e) => updateSocialLink('facebook', e.target.value)}
                autoCapitalize="off"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                🎵 TikTok
              </Label>
              <Input
                placeholder="https://tiktok.com/@yoursalon"
                value={socialLinks.tiktok || ''}
                onChange={(e) => updateSocialLink('tiktok', e.target.value)}
                autoCapitalize="off"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Website
              </Label>
              <Input
                placeholder="https://yoursalon.com"
                value={socialLinks.website || ''}
                onChange={(e) => updateSocialLink('website', e.target.value)}
                autoCapitalize="off"
                type="url"
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <Label htmlFor="show-attribution" className="text-sm">Show "Sent via Zura"</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Display attribution in email footer.</p>
            </div>
            <Switch
              id="show-attribution"
              checked={showAttribution}
              onCheckedChange={setShowAttribution}
            />
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Actions */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Popover open={testPopoverOpen} onOpenChange={setTestPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size={tokens.button.card} className="gap-2">
                <Send className="w-4 h-4" />
                Send Test
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Send Test Email</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sends a real email using your <span className="font-medium">saved</span> branding.
                  </p>
                </div>
                {hasChanges && (
                  <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <Info className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      You have unsaved changes. Save first to include them in the test email.
                    </p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="test-email" className="text-xs">Recipient</Label>
                  <Input
                    id="test-email"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-9 text-sm"
                  />
                </div>
                <Button
                  size={tokens.button.card}
                  className="w-full gap-2"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest || !testEmail}
                >
                  {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sendingTest ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Unsaved changes</span>
            )}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              size={tokens.button.card}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Branding
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT: Live Preview */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
          {/* Preview header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 gap-3 flex-wrap border-b border-border">
            <Eyebrow className="text-muted-foreground">Live Preview</Eyebrow>
            <div className="flex items-center gap-2">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="h-8 w-[160px] text-xs rounded-lg">
                  <SelectValue placeholder="Sample Content" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sample">Sample Content</SelectItem>
                  {emailTemplates?.filter((t) => t.is_active).map((t) => (
                    <SelectItem key={t.template_key} value={t.template_key}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 border rounded-full p-0.5">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={cn(
                    "p-1.5 rounded-full transition-colors",
                    previewMode === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Desktop (600px)"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={cn(
                    "p-1.5 rounded-full transition-colors",
                    previewMode === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Mobile (360px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Email preview container */}
          <div
            className="mx-auto transition-all duration-300 p-4"
            style={{ maxWidth: previewMode === 'desktop' ? 600 : 360 }}
          >
            <div style={{ backgroundColor: '#f4f4f5', padding: '20px 16px', borderRadius: 8 }}>
              <div style={{ maxWidth: 600, margin: '0 auto' }}>
                {/* Header */}
                {headerStyle === 'minimal' ? (
                  <div style={{ height: 6, backgroundColor: previewAccent, borderRadius: '12px 12px 0 0' }} />
                ) : (
                  <div
                    style={{
                      backgroundColor: previewAccent,
                      padding: headerPadding,
                      borderRadius: '12px 12px 0 0',
                      textAlign: headerStyle === 'left-aligned' ? 'left' : 'center',
                    }}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={displayName}
                        style={{ maxHeight: 48, maxWidth: 200, marginBottom: 8 }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: '#ffffff',
                          letterSpacing: '-0.025em',
                        }}
                      >
                        {displayName}
                      </span>
                    )}
                  </div>
                )}

                {/* Accent bar */}
                <div
                  style={{
                    height: 4,
                    background: `linear-gradient(90deg, ${previewAccent}, ${previewAccent}88)`,
                  }}
                />

                {/* Content */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '32px 24px',
                    borderLeft: '1px solid #e4e4e7',
                    borderRight: '1px solid #e4e4e7',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  }}
                >
                  {templatePreviewHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(templatePreviewHtml) }} />
                  ) : (
                    <>
                      <p style={{ fontSize: 16, color: '#18181b', margin: '0 0 16px' }}>
                        Hi there 👋
                      </p>
                      <p style={{ fontSize: 14, color: '#3f3f46', lineHeight: 1.6, margin: '0 0 16px' }}>
                        This is a preview of how your branded emails will appear to recipients.
                        The header, accent color, and footer below match the real template used
                        for all outbound emails from your organization.
                      </p>
                      <p style={{ fontSize: 14, color: '#3f3f46', lineHeight: 1.6, margin: '0 0 24px' }}>
                        Adjust settings on the left to see changes reflected here instantly.
                      </p>
                      <div style={{ textAlign: 'center' }}>
                        <a
                          href="#"
                          onClick={(e) => e.preventDefault()}
                          style={{
                            display: 'inline-block',
                            backgroundColor: previewAccent,
                            color: '#ffffff',
                            padding: '12px 32px',
                            borderRadius: previewButtonRadius,
                            textDecoration: 'none',
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          View Dashboard
                        </a>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div
                  style={{
                    backgroundColor: '#fafafa',
                    padding: '20px 24px',
                    borderRadius: '0 0 12px 12px',
                    border: '1px solid #e4e4e7',
                    borderTop: 'none',
                    textAlign: 'center',
                  }}
                >
                  {/* Social icons */}
                  {socialIconsHtml().length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      {socialIconsHtml().map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          onClick={(e) => e.preventDefault()}
                          style={{
                            display: 'inline-block',
                            margin: '0 8px',
                            fontSize: 18,
                            textDecoration: 'none',
                          }}
                          title={link.label}
                        >
                          {link.icon}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Footer text */}
                  {footerText && (
                    <p style={{ margin: '0 0 8px', fontSize: 11, color: '#a1a1aa', lineHeight: 1.5 }}>
                      {footerText}
                    </p>
                  )}

                  {/* Attribution */}
                  {showAttribution && (
                    <p style={{ margin: 0, fontSize: 12, color: '#a1a1aa' }}>
                      Sent via{' '}
                      <a href={PLATFORM_URL} style={{ color: '#a1a1aa', textDecoration: 'underline' }} onClick={(e) => e.preventDefault()}>
                        {PLATFORM_NAME}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
