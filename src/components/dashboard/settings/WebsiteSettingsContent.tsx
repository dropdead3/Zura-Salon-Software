import { useState, useEffect, useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { PLATFORM_NAME } from '@/lib/brand';
import { QRCodeCanvas } from 'qrcode.react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Globe, Palette, Calendar, ShoppingBag, Scale,
  ExternalLink, Check, Loader2, Save,
  Instagram, Facebook, Twitter, Linkedin, Youtube,
  ArrowRight, Copy, Link as LinkIcon, QrCode,
  LayoutGrid, Share2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { colorThemes, COLOR_THEME_TO_CATEGORY_MAP, useColorTheme, type ColorTheme } from '@/hooks/useColorTheme';
import { useServiceCategoryThemes, useApplyCategoryTheme } from '@/hooks/useCategoryThemes';
import { useAutoSyncTerminalSplash } from '@/hooks/useAutoSyncTerminalSplash';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import {
  useWebsiteBookingSettings,
  useUpdateWebsiteBookingSettings,
  useWebsiteRetailSettings,
  useUpdateWebsiteRetailSettings,
  useWebsiteSeoLegalSettings,
  useUpdateWebsiteSeoLegalSettings,
  useWebsiteThemeSettings,
  useUpdateWebsiteThemeSettings,
  useWebsiteSocialLinksSettings,
  useUpdateWebsiteSocialLinksSettings,
  type WebsiteBookingSettings,
  type WebsiteRetailSettings,
  type WebsiteSeoLegalSettings,
  type WebsiteThemeSettings,
  type WebsiteSocialLinksSettings,
} from '@/hooks/useWebsiteSettings';
import {
  useAnnouncementBarSettings,
  useUpdateAnnouncementBarSettings,
  type AnnouncementBarSettings,
} from '@/hooks/useAnnouncementBar';
import { cn } from '@/lib/utils';
import { DomainConfigCard } from './DomainConfigCard';
import { useOrgPublicUrl } from '@/hooks/useOrgPublicUrl';
import { CancellationFeePoliciesSettings } from './CancellationFeePoliciesSettings';
import { DisputePolicySettings } from './DisputePolicySettings';
import { TipDistributionPolicySettings } from './TipDistributionPolicySettings';
import { ActiveThemeCard } from './ActiveThemeCard';
import { ThemeLibraryGrid } from './ThemeLibraryGrid';
import { useWebsiteThemes, useActiveTheme, useActivateTheme } from '@/hooks/useWebsiteThemes';
// useColorTheme already imported above
// Website Editor shell (immersive editor) lives in its own component now.
import { WebsiteEditorShell } from '@/components/dashboard/website-editor/WebsiteEditorShell';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { OnlineStoreProductsTable } from './OnlineStoreProductsTable';
import { StoreAppearanceConfigurator } from './StoreAppearanceConfigurator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookingVisibilityCard } from './BookingVisibilityCard';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { isStructurallyEqual } from '@/lib/stableStringify';

const DEFAULT_SOCIAL_LINKS: WebsiteSocialLinksSettings = {
  instagram: '',
  facebook: '',
  twitter: '',
  youtube: '',
  linkedin: '',
  tiktok: '',
};

const SOCIAL_FIELDS = [
  { key: 'instagram' as const, icon: Instagram, label: 'Instagram', placeholder: 'https://instagram.com/yoursalon' },
  { key: 'facebook' as const, icon: Facebook, label: 'Facebook', placeholder: 'https://facebook.com/yoursalon' },
  { key: 'twitter' as const, icon: Twitter, label: 'X / Twitter', placeholder: 'https://x.com/yoursalon' },
  { key: 'youtube' as const, icon: Youtube, label: 'YouTube', placeholder: 'https://youtube.com/@yoursalon' },
  { key: 'linkedin' as const, icon: Linkedin, label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yoursalon' },
];

// ─── Editor Tab (immersive editor) ───
function EditorTab() {
  return <WebsiteEditorShell />;
}

// ─── Domain Tab (extracted from old General) ───
function DomainTab() {
  const { effectiveOrganization } = useOrganizationContext();
  return (
    <div className="space-y-6">
      <DomainConfigCard organizationId={effectiveOrganization?.id} />
    </div>
  );
}

// ─── Integrations Tab (Social Links + future pixels surface) ───
function IntegrationsTab() {
  const { toast } = useToast();
  const { data: socialSettings, isLoading } = useWebsiteSocialLinksSettings();
  const updateSocial = useUpdateWebsiteSocialLinksSettings();
  const [socialLocal, setSocialLocal] = useState<WebsiteSocialLinksSettings>(DEFAULT_SOCIAL_LINKS);

  useEffect(() => {
    if (socialSettings) setSocialLocal(socialSettings);
  }, [socialSettings]);

  const socialHasChanges = socialSettings && !isStructurallyEqual(socialLocal, socialSettings);

  const handleSaveSocial = () => {
    updateSocial.mutate(
      { key: 'website_social_links', value: socialLocal },
      {
        onSuccess: () => toast({ title: 'Saved', description: 'Social links updated.' }),
        onError: () => toast({ variant: 'destructive', title: 'Error', description: 'Failed to save social links.' }),
      }
    );
  };

  if (isLoading) {
    return <DashboardLoader size="md" className="py-12" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">SOCIAL LINKS</CardTitle>
          <CardDescription>Social media URLs shown in website footer and contact sections.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SOCIAL_FIELDS.map(({ key, icon: Icon, label, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                placeholder={placeholder}
                autoCapitalize="off"
                className="flex-1"
                value={socialLocal[key] || ''}
                onChange={(e) => setSocialLocal(prev => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
          {socialHasChanges && (
            <Button onClick={handleSaveSocial} disabled={updateSocial.isPending} className="w-full mt-2">
              {updateSocial.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Social Links
            </Button>
          )}

          {/* Social Links Preview */}
          <div className="rounded-lg border bg-muted/30 p-4 mt-4 space-y-3">
            <p className="text-xs font-display text-muted-foreground uppercase tracking-wide">Live Preview</p>
            <div className="rounded-md p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-display mb-3">Connect</p>
              <div className="space-y-2">
                {SOCIAL_FIELDS.map(({ key, icon: Icon, label }) => {
                  const hasUrl = !!(socialLocal[key]);
                  return (
                    <div
                      key={key}
                      className={cn(
                        "inline-flex items-center gap-2 text-sm font-sans font-light transition-all",
                        hasUrl
                          ? "text-foreground/50"
                          : "text-muted-foreground/30"
                      )}
                    >
                      <Icon size={18} />
                      <span>{hasUrl ? (socialLocal[key] || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Theme Tab (overview only; editor lives in the Editor tab now) ───
function ThemeTab() {
  const { data: themes, isLoading: themesLoading } = useWebsiteThemes();
  const { data: activeThemeSetting, isLoading: activeLoading } = useActiveTheme();
  const activateTheme = useActivateTheme();
  const { setColorTheme } = useColorTheme();
  const { toast } = useToast();
  const { data: categoryThemes } = useServiceCategoryThemes();
  const applyCategoryTheme = useApplyCategoryTheme();
  const { data: business } = useBusinessSettings();
  const { effectiveOrganization } = useOrganizationContext();
  const { syncSplashToTheme } = useAutoSyncTerminalSplash(business?.logo_dark_url, business?.business_name || '', effectiveOrganization?.id);
  const [, setSearchParams] = useSearchParams();

  const activeThemeId = activeThemeSetting?.theme_id || 'cream_classic';
  const activeTheme = themes?.find((t) => t.id === activeThemeId);

  const handleActivate = async (themeId: string) => {
    const theme = themes?.find((t) => t.id === themeId);
    if (!theme) return;

    try {
      await activateTheme.mutateAsync(themeId);
      const LEGACY_MAP: Record<string, ColorTheme> = { bone: 'cream-lux', cream: 'cream-lux', rose: 'rosewood', ocean: 'marine', ember: 'cognac' };
      const validSchemes = ['zura', 'cream-lux', 'rosewood', 'sage', 'jade', 'marine', 'cognac', 'noir', 'neon', 'matrix', 'peach', 'orchid', 'bone', 'cream', 'rose', 'ocean', 'ember'];
      if (validSchemes.includes(theme.color_scheme)) {
        const raw = theme.color_scheme as string;
        const colorThemeId = (LEGACY_MAP[raw] ?? raw) as ColorTheme;
        setColorTheme(colorThemeId);
        const mappedName = COLOR_THEME_TO_CATEGORY_MAP[colorThemeId];
        const matched = categoryThemes?.find(t => t.name === mappedName);
        if (matched) applyCategoryTheme.mutate(matched);
        syncSplashToTheme(colorThemeId);
      }
      toast({ title: 'Theme activated', description: `"${theme.name}" is now your active theme.` });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to activate theme.' });
    }
  };

  const { publicUrl: getPublicUrl } = useOrgPublicUrl();
  const orgPreviewUrl = getPublicUrl();
  const handlePreview = (_themeId?: string) => {
    if (orgPreviewUrl) window.open(orgPreviewUrl, '_blank', 'noopener,noreferrer');
  };

  // "Customize" jumps to the dedicated immersive Editor tab.
  const handleCustomize = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'editor');
      return next;
    }, { replace: false });
  };

  if (themesLoading || activeLoading) {
    return <DashboardLoader size="md" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {activeTheme && (
        <ActiveThemeCard
          theme={activeTheme}
          onCustomize={handleCustomize}
          onPreview={() => handlePreview()}
        />
      )}

      {themes && themes.length > 0 && (
        <ThemeLibraryGrid
          themes={themes}
          activeThemeId={activeThemeId}
          onActivate={handleActivate}
          onPreview={(id) => handlePreview(id)}
          isActivating={activateTheme.isPending}
        />
      )}
    </div>
  );
}


// ─── Booking Tab ───
function BookingTab() {
  const { data: settings, isLoading } = useWebsiteBookingSettings();
  const updateBooking = useUpdateWebsiteBookingSettings();
  const { toast } = useToast();
  const [local, setLocal] = useState<WebsiteBookingSettings>({
    enabled: false,
    require_deposit: false,
    buffer_minutes: 15,
    new_client_mode: 'both',
  });

  useEffect(() => {
    if (settings) setLocal(settings);
  }, [settings]);

  const hasChanges = settings && !isStructurallyEqual(local, settings);

  const handleSave = () => {
    updateBooking.mutate(
      { key: 'website_booking', value: local },
      {
        onSuccess: () => toast({ title: 'Saved', description: 'Online booking settings updated.' }),
        onError: () => toast({ variant: 'destructive', title: 'Error', description: 'Failed to save.' }),
      }
    );
  };

  if (isLoading) {
    return <DashboardLoader size="md" className="py-12" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-display text-lg">ONLINE BOOKING</CardTitle>
          <CardDescription>Allow clients to book appointments directly from your website.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Enable online booking</p>
              <p className="text-xs text-muted-foreground">Show the booking widget on your public website</p>
            </div>
            <Switch checked={local.enabled} onCheckedChange={(v) => setLocal(prev => ({ ...prev, enabled: v }))} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Require deposit</p>
              <p className="text-xs text-muted-foreground">Clients must pay a deposit to confirm their booking</p>
            </div>
            <Switch checked={local.require_deposit} onCheckedChange={(v) => setLocal(prev => ({ ...prev, require_deposit: v }))} />
          </div>

          <div className="space-y-2">
            <Label>Buffer time between appointments (minutes)</Label>
            <Input
              type="number"
              min={0}
              max={120}
              value={local.buffer_minutes}
              onChange={(e) => setLocal(prev => ({ ...prev, buffer_minutes: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Client booking mode</Label>
            <Select value={local.new_client_mode} onValueChange={(v: WebsiteBookingSettings['new_client_mode']) => setLocal(prev => ({ ...prev, new_client_mode: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">New & existing clients</SelectItem>
                <SelectItem value="new_only">New clients only</SelectItem>
                <SelectItem value="existing_only">Existing clients only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasChanges && (
            <Button onClick={handleSave} disabled={updateBooking.isPending} className="w-full">
              {updateBooking.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Booking Settings
            </Button>
          )}
        </CardContent>
      </Card>

      <BookingVisibilityCard />

      {/* Cancellation & No-Show Fee Policies */}
      <div className="lg:col-span-2">
        <CancellationFeePoliciesSettings />
      </div>

      {/* Dispute Policy */}
      <div className="lg:col-span-2">
        <DisputePolicySettings />
      </div>

      {/* Tip Distribution Policy */}
      <div className="lg:col-span-2">
        <TipDistributionPolicySettings />
      </div>
    </div>
  );
}

// ─── Retail Tab ───
function RetailTab() {
  const { data: settings, isLoading } = useWebsiteRetailSettings();
  const updateRetail = useUpdateWebsiteRetailSettings();
  const { toast } = useToast();
  const [local, setLocal] = useState<WebsiteRetailSettings>({
    enabled: false,
    pickup: true,
    delivery: false,
    shipping: false,
    featured_products: true,
    continue_selling_when_out_of_stock: false,
  });
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (settings) setLocal(settings);
  }, [settings]);

  const hasChanges = settings && !isStructurallyEqual(local, settings);

  const handleSave = () => {
    updateRetail.mutate(
      { key: 'website_retail', value: local },
      {
        onSuccess: () => toast({ title: 'Saved', description: 'Retail settings updated.' }),
        onError: () => toast({ variant: 'destructive', title: 'Error', description: 'Failed to save.' }),
      }
    );
  };

  const { publicUrl: getPublicUrl } = useOrgPublicUrl();
  const storeUrl = getPublicUrl('/shop') ?? '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    setLinkCopied(true);
    toast({ title: 'Copied!', description: 'Store link copied to clipboard.' });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (isLoading) {
    return <DashboardLoader size="md" className="py-12" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg">ONLINE SHOP</CardTitle>
              <CardDescription>Sell retail products directly from your website.</CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Enable online shop</p>
              <p className="text-xs text-muted-foreground">Allow clients to browse and purchase retail products</p>
            </div>
            <Switch checked={local.enabled} onCheckedChange={(v) => setLocal(prev => ({ ...prev, enabled: v }))} />
          </div>

          <div className="space-y-3 pl-1">
            <p className="text-xs font-display text-muted-foreground uppercase tracking-wide">Fulfillment Options</p>
            {[
              { key: 'pickup' as const, label: 'In-store pickup', desc: 'Clients collect orders at your location' },
              { key: 'delivery' as const, label: 'Local delivery', desc: 'Deliver within a set radius' },
              { key: 'shipping' as const, label: 'Shipping', desc: 'Ship products to any address' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch checked={local[key]} onCheckedChange={(v) => setLocal(prev => ({ ...prev, [key]: v }))} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Featured products on homepage</p>
              <p className="text-xs text-muted-foreground">Showcase selected products on the homepage</p>
            </div>
            <Switch checked={local.featured_products} onCheckedChange={(v) => setLocal(prev => ({ ...prev, featured_products: v }))} />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-sm">Continue selling when out of stock</Label>
              <p className="text-xs text-muted-foreground">Allow customers to purchase products even when stock reaches zero</p>
            </div>
            <Switch checked={local.continue_selling_when_out_of_stock} onCheckedChange={(v) => setLocal(prev => ({ ...prev, continue_selling_when_out_of_stock: v }))} />
          </div>

          {hasChanges && (
            <Button onClick={handleSave} disabled={updateRetail.isPending} className="w-full">
              {updateRetail.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Retail Settings
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Shareable Store Link */}
      {local.enabled && storeUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              STORE LINK
            </CardTitle>
            <CardDescription>Share this link on your existing website, social media, or anywhere clients can find you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={storeUrl}
                readOnly
                className="font-mono text-xs bg-muted/50"
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink} className="shrink-0">
                {linkCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="icon" asChild className="shrink-0">
                <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              This link works independently — clients can browse your products even if you don't use the full {PLATFORM_NAME} website.
            </p>

            {/* QR Code */}
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium font-display uppercase tracking-wider text-muted-foreground">QR Code</span>
                </div>
                <Button
                  variant="outline"
                  size={tokens.button.inline}
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    const canvas = document.querySelector('#store-qr-code canvas') as HTMLCanvasElement;
                    if (!canvas) return;
                    const link = document.createElement('a');
                    link.download = 'store-qr-code.png';
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                  }}
                >
                  Download QR
                </Button>
              </div>
              <div id="store-qr-code" className="flex justify-center p-4 bg-white rounded-lg border border-border/50">
                <QRCodeCanvas value={storeUrl} size={128} level="M" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Online Store Products Configurator */}
      {local.enabled && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">STORE PRODUCTS</CardTitle>
            <CardDescription>Choose which products are visible on your online store.</CardDescription>
          </CardHeader>
          <CardContent>
            <OnlineStoreProductsTable />
          </CardContent>
        </Card>
      )}

      {/* Store Appearance Configurator with Live Preview */}
      {local.enabled && storeUrl && (
        <div className="lg:col-span-2">
          <StoreAppearanceConfigurator storeUrl={storeUrl} />
        </div>
      )}
    </div>
  );
}

// ─── SEO & Legal Tab ───
function SeoLegalTab() {
  const { data: settings, isLoading } = useWebsiteSeoLegalSettings();
  const updateSeo = useUpdateWebsiteSeoLegalSettings();
  const { toast } = useToast();
  const [local, setLocal] = useState<WebsiteSeoLegalSettings>({
    ga_id: '',
    gtm_id: '',
    meta_pixel_id: '',
    tiktok_pixel_id: '',
    cookie_consent_enabled: false,
    privacy_url: '',
    terms_url: '',
  });

  useEffect(() => {
    if (settings) setLocal(settings);
  }, [settings]);

  const hasChanges = settings && !isStructurallyEqual(local, settings);

  const handleSave = () => {
    updateSeo.mutate(
      { key: 'website_seo_legal', value: local },
      {
        onSuccess: () => toast({ title: 'Saved', description: 'SEO & legal settings updated.' }),
        onError: () => toast({ variant: 'destructive', title: 'Error', description: 'Failed to save.' }),
      }
    );
  };

  if (isLoading) {
    return <DashboardLoader size="md" className="py-12" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">ANALYTICS & TRACKING</CardTitle>
          <CardDescription>Connect your analytics and advertising platforms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Google Analytics ID</Label>
            <Input 
              placeholder="G-XXXXXXXXXX" 
              value={local.ga_id} 
              onChange={(e) => setLocal(prev => ({ ...prev, ga_id: e.target.value }))}
              autoCapitalize="off"
            />
          </div>
          <div className="space-y-2">
            <Label>Google Tag Manager ID</Label>
            <Input 
              placeholder="GTM-XXXXXXX" 
              value={local.gtm_id} 
              onChange={(e) => setLocal(prev => ({ ...prev, gtm_id: e.target.value }))}
              autoCapitalize="off"
            />
          </div>
          <div className="space-y-2">
            <Label>Meta Pixel ID</Label>
            <Input 
              placeholder="1234567890" 
              value={local.meta_pixel_id} 
              onChange={(e) => setLocal(prev => ({ ...prev, meta_pixel_id: e.target.value }))}
              autoCapitalize="off"
            />
          </div>
          <div className="space-y-2">
            <Label>TikTok Pixel ID</Label>
            <Input 
              placeholder="CXXXXXXXXXXXXXXXXX" 
              value={local.tiktok_pixel_id} 
              onChange={(e) => setLocal(prev => ({ ...prev, tiktok_pixel_id: e.target.value }))}
              autoCapitalize="off"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">COOKIE CONSENT</CardTitle>
          <CardDescription>Show a cookie consent banner to comply with privacy regulations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Show cookie consent banner</p>
              <p className="text-xs text-muted-foreground">Displays a consent banner for analytics cookies on first visit</p>
            </div>
            <Switch
              checked={local.cookie_consent_enabled}
              onCheckedChange={(v) => setLocal(prev => ({ ...prev, cookie_consent_enabled: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">LEGAL PAGES</CardTitle>
          <CardDescription>Links to your legal documents displayed in the website footer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Privacy Policy URL</Label>
            <Input 
              placeholder="https://yoursalon.com/privacy" 
              value={local.privacy_url} 
              onChange={(e) => setLocal(prev => ({ ...prev, privacy_url: e.target.value }))}
              autoCapitalize="off"
            />
          </div>
          <div className="space-y-2">
            <Label>Terms of Service URL</Label>
            <Input 
              placeholder="https://yoursalon.com/terms" 
              value={local.terms_url} 
              onChange={(e) => setLocal(prev => ({ ...prev, terms_url: e.target.value }))}
              autoCapitalize="off"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Don't have legal pages yet? Free generators like{' '}
            <a href="https://www.termsfeed.com" target="_blank" rel="noopener noreferrer" className="underline">TermsFeed</a>{' '}
            or{' '}
            <a href="https://www.freeprivacypolicy.com" target="_blank" rel="noopener noreferrer" className="underline">FreePrivacyPolicy</a>{' '}
            can help you create them.
          </p>
        </CardContent>
      </Card>

      {hasChanges && (
        <Button onClick={handleSave} disabled={updateSeo.isPending} className="w-full lg:col-span-2">
          {updateSeo.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save SEO & Legal Settings
        </Button>
      )}
    </div>
  );
}

// ─── Main Export ───
const TAB_ALIASES: Record<string, string> = {
  general: 'domain',   // old "General" was domain + announcement + social
  retail: 'store',     // rename
  social: 'integrations',
};

export function WebsiteSettingsContent() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Back-compat: normalize legacy query params (?tab=general/retail/social, ?openEditor=1)
  // to the new tab IDs. Keeps old links working without a redirect round-trip.
  useEffect(() => {
    const rawTab = searchParams.get('tab');
    const openEditor = searchParams.get('openEditor') === '1';
    const aliased = rawTab ? TAB_ALIASES[rawTab] : undefined;
    if (!openEditor && !aliased) return;

    const next = new URLSearchParams(searchParams);
    if (openEditor) {
      next.set('tab', 'editor');
      next.delete('openEditor');
    } else if (aliased) {
      next.set('tab', aliased);
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const rawTab = searchParams.get('tab');
  const initialTab =
    (rawTab && TAB_ALIASES[rawTab]) ||
    (searchParams.get('openEditor') === '1' ? 'editor' : rawTab) ||
    'editor';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    next.delete('openEditor');
    setSearchParams(next, { replace: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <TabsList>
          <TabsTrigger value="editor" className="gap-1.5">
            <LayoutGrid className="w-4 h-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-1.5">
            <Palette className="w-4 h-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="booking" className="gap-1.5">
            <Calendar className="w-4 h-4" />
            Booking
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-1.5">
            <ShoppingBag className="w-4 h-4" />
            Store
          </TabsTrigger>
          <TabsTrigger value="domain" className="gap-1.5">
            <Globe className="w-4 h-4" />
            Domain
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-1.5">
            <Scale className="w-4 h-4" />
            SEO & Legal
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Share2 className="w-4 h-4" />
            Integrations
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="editor"><EditorTab /></TabsContent>
      <TabsContent value="theme"><ThemeTab /></TabsContent>
      <TabsContent value="booking"><BookingTab /></TabsContent>
      <TabsContent value="store"><RetailTab /></TabsContent>
      <TabsContent value="domain"><DomainTab /></TabsContent>
      <TabsContent value="seo"><SeoLegalTab /></TabsContent>
      <TabsContent value="integrations"><IntegrationsTab /></TabsContent>
    </Tabs>
  );
}

