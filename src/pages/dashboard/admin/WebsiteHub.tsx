import { Link, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { WebsiteEditorShell } from '@/components/dashboard/website-editor/WebsiteEditorShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Palette,
  LayoutGrid,
  CalendarCheck,
  ShoppingBag,
  Search,
  Globe,
  Share2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useOrgPublicUrl } from '@/hooks/useOrgPublicUrl';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { WebsiteSettingsContent } from '@/components/dashboard/settings/WebsiteSettingsContent';
import { useActiveTheme, useWebsiteThemes } from '@/hooks/useWebsiteThemes';
import {
  useWebsiteBookingSettings,
  useWebsiteRetailSettings,
  useWebsiteSeoLegalSettings,
  useWebsiteSocialLinksSettings,
} from '@/hooks/useWebsiteSettings';
import { useChangelogSummary } from '@/hooks/usePublishChangelog';

interface HubCardProps {
  to?: string;
  href?: string;
  external?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  status?: string;
  badge?: string;
  emphasized?: boolean;
  colorClass?: string;
}

function HubCard({
  to, href, external, icon: Icon, title, description, status, badge, emphasized,
  colorClass = 'bg-primary/10 text-primary',
}: HubCardProps) {
  const inner = (
    <Card className={cn(
      'group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full border-border/50',
      emphasized && 'border-primary/40 ring-1 ring-primary/20',
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn('p-2.5 rounded-xl shrink-0', colorClass)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
              {status && (
                <p className="text-[11px] text-foreground/70 mt-1.5 truncate font-medium">{status}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
            {external
              ? <ExternalLink className="w-4 h-4 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (external && href) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  }
  return <Link to={to ?? '#'}>{inner}</Link>;
}

export default function WebsiteHub() {
  const { dashPath } = useOrgDashboardPath();
  const { publicUrl, isUsingCustomDomain, customDomain } = useOrgPublicUrl();
  const [searchParams] = useSearchParams();

  // Per Hub-landings canon: only show the editor surface when the user explicitly
  // requested a tab via deep link. A bare hub URL always renders the card overview.
  const hasDeepLink = searchParams.has('tab') || searchParams.has('openEditor');
  if (hasDeepLink) {
    return (
      <DashboardLayout>
        <DashboardPageHeader
          title="Website Hub"
          description="Theme, sections, booking, store, SEO, and domain"
          backTo={dashPath('/admin/website-hub')}
        />
        <PageExplainer pageId="website-hub" />
        <WebsiteSettingsContent />
      </DashboardLayout>
    );
  }

  // ── Live status for cards ──
  const { data: themes } = useWebsiteThemes();
  const { data: activeThemeSetting } = useActiveTheme();
  const activeTheme = themes?.find((t) => t.id === (activeThemeSetting?.theme_id || 'cream_classic'));

  const { data: booking } = useWebsiteBookingSettings();
  const { data: retail } = useWebsiteRetailSettings();
  const { data: seo } = useWebsiteSeoLegalSettings();
  const { data: social } = useWebsiteSocialLinksSettings();
  const { hasChanges, totalChanges } = useChangelogSummary();

  const sitePreviewUrl = publicUrl();
  const previewBadge = isUsingCustomDomain && customDomain ? customDomain : undefined;

  const themeStatus = activeTheme ? `Active: ${activeTheme.name}` : undefined;
  const bookingStatus = booking
    ? booking.enabled
      ? `Enabled · ${booking.buffer_minutes ?? 15} min buffer`
      : 'Disabled'
    : undefined;
  const storeStatus = retail
    ? retail.enabled
      ? `Enabled${retail.featured_products ? ' · Featured products on' : ''}`
      : 'Disabled'
    : undefined;
  const domainStatus = isUsingCustomDomain && customDomain ? customDomain : 'Using default domain';
  const seoStatus = seo
    ? [seo.ga_id && 'GA4', seo.meta_pixel_id && 'Meta Pixel', seo.cookie_consent_enabled && 'Cookie consent']
        .filter(Boolean)
        .join(' · ') || 'Not configured'
    : undefined;
  const socialCount = social
    ? Object.values(social).filter((v) => typeof v === 'string' && v.length > 0).length
    : 0;
  const socialStatus = social
    ? socialCount > 0 ? `${socialCount} social link${socialCount === 1 ? '' : 's'} connected` : 'No social links yet'
    : undefined;

  const editorStatus = hasChanges
    ? `${totalChanges} unpublished change${totalChanges === 1 ? '' : 's'}`
    : 'All changes published';
  const editorBadge = hasChanges ? `${totalChanges}` : undefined;

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Website Hub"
        description="Everything you need to design, configure, and publish your salon's website"
        backTo={dashPath('/admin/management')}
      />
      <PageExplainer pageId="website-hub" />

      <div className="container max-w-[1600px] px-8 py-8 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <HubCard
            to={dashPath('/admin/website-hub?tab=editor')}
            icon={LayoutGrid}
            title="Edit Website"
            description="Pages, sections, content, and live preview"
            status={editorStatus}
            badge={editorBadge}
            emphasized={hasChanges}
            colorClass="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          />
          <HubCard
            to={dashPath('/admin/website-hub?tab=theme')}
            icon={Palette}
            title="Theme & Branding"
            description="Active theme, color scheme, fonts, library"
            status={themeStatus}
            colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
          <HubCard
            to={dashPath('/admin/website-hub?tab=booking')}
            icon={CalendarCheck}
            title="Online Booking"
            description="Deposits, buffers, and new client rules"
            status={bookingStatus}
            colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <HubCard
            to={dashPath('/admin/website-hub?tab=store')}
            icon={ShoppingBag}
            title="Online Store"
            description="Featured products, pickup, delivery, shipping"
            status={storeStatus}
            colorClass="bg-pink-500/10 text-pink-600 dark:text-pink-400"
          />
          <HubCard
            to={dashPath('/admin/website-hub?tab=domain')}
            icon={Globe}
            title="Custom Domain"
            description="Connect, verify, and serve from your own domain"
            status={domainStatus}
            badge={previewBadge}
            colorClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          />
          <HubCard
            to={dashPath('/admin/website-hub?tab=seo')}
            icon={Search}
            title="SEO & Legal"
            description="Analytics, pixels, cookie consent, privacy"
            status={seoStatus}
            colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          />
          <HubCard
            to={dashPath('/admin/website-hub?tab=integrations')}
            icon={Share2}
            title="Integrations"
            description="Social links and third-party connections"
            status={socialStatus}
            colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
          {sitePreviewUrl && (
            <HubCard
              external
              href={sitePreviewUrl}
              icon={ExternalLink}
              title="Preview Public Site"
              description={`Open the live site${isUsingCustomDomain ? ' at your custom domain' : ''}`}
              badge={previewBadge}
              colorClass="bg-slate-500/10 text-slate-600 dark:text-slate-400"
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
