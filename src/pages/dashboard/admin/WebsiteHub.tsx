import { Link, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Palette,
  LayoutGrid,
  FileText,
  CalendarCheck,
  ShoppingBag,
  Search,
  Globe,
  Share2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useOrgPublicUrl } from '@/hooks/useOrgPublicUrl';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { WebsiteSettingsContent } from '@/components/dashboard/settings/WebsiteSettingsContent';

interface HubCardProps {
  to?: string;
  href?: string;
  external?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  colorClass?: string;
}

function HubCard({ to, href, external, icon: Icon, title, description, badge, colorClass = 'bg-primary/10 text-primary' }: HubCardProps) {
  const inner = (
    <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn('p-2.5 rounded-xl shrink-0', colorClass)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {badge && (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            )}
            {external ? (
              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (external && href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }

  return <Link to={to ?? '#'}>{inner}</Link>;
}

interface CategorySectionProps {
  title: string;
  children: React.ReactNode;
}

function CategorySection({ title, children }: CategorySectionProps) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-sm tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

export default function WebsiteHub() {
  const { dashPath } = useOrgDashboardPath();
  const { publicUrl, isUsingCustomDomain, customDomain } = useOrgPublicUrl();
  const [searchParams] = useSearchParams();

  // If a tab/openEditor deep link is present, defer to the existing settings surface so
  // direct links from elsewhere (sidebar, redirects, embedded editor return paths) still work.
  const hasDeepLink = searchParams.has('tab') || searchParams.has('openEditor');
  if (hasDeepLink) {
    return (
      <DashboardLayout>
        <DashboardPageHeader
          title="Website Hub"
          description="Theme, sections, booking, retail, SEO, and domain"
          backTo={dashPath('/admin/website-hub')}
        />
        <PageExplainer pageId="website-hub" />
        <WebsiteSettingsContent />
      </DashboardLayout>
    );
  }

  const sitePreviewUrl = publicUrl();
  const previewBadge = isUsingCustomDomain && customDomain ? customDomain : undefined;

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Website Hub"
        description="Everything you need to design, configure, and publish your salon's website"
        backTo={dashPath('/admin/management')}
      />
      <PageExplainer pageId="website-hub" />

      <div className="container max-w-[1600px] px-8 py-8 space-y-8">
        <CategorySection title="Design">
          <HubCard
            to={dashPath('/admin/website-hub?tab=theme')}
            icon={Palette}
            title="Theme & Branding"
            description="Active theme, color scheme, fonts, and theme library"
            colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
          <HubCard
            to={dashPath('/admin/website-hub?tab=theme&openEditor=1')}
            icon={LayoutGrid}
            title="Sections & Content"
            description="Edit hero, testimonials, gallery, stylists, locations, FAQ"
            colorClass="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          />
          <HubCard
            to={dashPath('/admin/website-hub?tab=theme&openEditor=1')}
            icon={FileText}
            title="Pages"
            description="Manage Home, About, Contact, and custom pages"
            colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
        </CategorySection>

        <CategorySection title="Commerce">
          <HubCard
            to={dashPath('/admin/website-hub?tab=booking')}
            icon={CalendarCheck}
            title="Online Booking"
            description="Enable bookings, deposits, buffers, and new client rules"
            colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <HubCard
            to={dashPath('/admin/website-hub?tab=retail')}
            icon={ShoppingBag}
            title="Online Store"
            description="Featured products, pickup, delivery, and shipping"
            colorClass="bg-pink-500/10 text-pink-600 dark:text-pink-400"
          />
        </CategorySection>

        <CategorySection title="Discoverability">
          <HubCard
            to={dashPath('/admin/website-hub?tab=seo')}
            icon={Search}
            title="SEO & Legal"
            description="Analytics, pixels, cookie consent, privacy and terms"
            colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          />
        </CategorySection>

        <CategorySection title="Domain & Social">
          <HubCard
            to={dashPath('/admin/website-hub?tab=domain')}
            icon={Globe}
            title="Custom Domain"
            description="Connect, verify, and serve your site from your own domain"
            badge={previewBadge}
            colorClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          />
          <HubCard
            to={dashPath('/admin/website-hub?tab=social')}
            icon={Share2}
            title="Social Links"
            description="Instagram, Facebook, TikTok, YouTube, and more"
            colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
          {sitePreviewUrl && (
            <HubCard
              external
              href={sitePreviewUrl}
              icon={ExternalLink}
              title="Preview Site"
              description={`Open the live site${isUsingCustomDomain ? ' at your custom domain' : ''}`}
              badge={previewBadge}
              colorClass="bg-slate-500/10 text-slate-600 dark:text-slate-400"
            />
          )}
        </CategorySection>
      </div>
    </DashboardLayout>
  );
}
