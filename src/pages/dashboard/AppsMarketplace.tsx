import { Link } from 'react-router-dom';
import {
  Package,
  MessageSquare,
  Megaphone,
  Star,
  Phone,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useOrganizationApps } from '@/hooks/useOrganizationApps';
import { useConnectEntitlement } from '@/hooks/connect/useConnectEntitlement';
import { Skeleton } from '@/components/ui/skeleton';

/* ------------------------------------------------------------------ */
/*  App catalogue                                                     */
/* ------------------------------------------------------------------ */

interface AppDef {
  key: string;
  name: string;
  tagline: string;
  icon: React.ElementType;
  iconColor: string;
  settingsPath?: string;
  comingSoon?: boolean;
}

const SUBSCRIBED_APPS: AppDef[] = [
  {
    key: 'backroom',
    name: 'Color Bar',
    tagline: 'Backbar inventory tracking, chemical dispensing, and waste analytics.',
    icon: Package,
    iconColor: 'text-violet-500',
    settingsPath: '/admin/color-bar',
  },
  {
    key: 'connect',
    name: 'Zura Connect',
    tagline: 'Real-time team messaging and client communications.',
    icon: MessageSquare,
    iconColor: 'text-blue-500',
    settingsPath: '/team-chat',
  },
];

const EXPLORE_APPS: AppDef[] = [
  {
    key: 'marketer',
    name: 'Zura Marketer',
    tagline: 'Campaign management, creative generation, and ROI attribution across Meta & TikTok.',
    icon: Megaphone,
    iconColor: 'text-pink-500',
    comingSoon: true,
  },
  {
    key: 'reputation',
    name: 'Zura Reputation',
    tagline: 'Smart review timing, Google review flows, reputation scoring, and AI-powered review responses.',
    icon: Star,
    iconColor: 'text-amber-500',
    comingSoon: true,
  },
  {
    key: 'reception',
    name: 'Zura Reception',
    tagline: 'AI receptionist for call handling, booking, and front-desk automation.',
    icon: Phone,
    iconColor: 'text-emerald-500',
    comingSoon: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Components                                                        */
/* ------------------------------------------------------------------ */

function AppCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function SubscribedAppCard({
  app,
  isActive,
  dashPath,
}: {
  app: AppDef;
  isActive: boolean;
  dashPath: (p: string) => string;
}) {
  const Icon = app.icon;
  return (
    <Card interactive className="group">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Icon className={cn('w-5 h-5', app.iconColor)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(tokens.heading.card)}>{app.name}</h3>
              <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px]">
                {isActive ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                ) : (
                  'Inactive'
                )}
              </Badge>
            </div>
            <p className={cn(tokens.body.muted, 'line-clamp-2')}>{app.tagline}</p>
          </div>

          {app.settingsPath && (
            <Button variant="ghost" size="sm" asChild className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link to={dashPath(app.settingsPath)}>
                Open <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ExploreAppCard({ app }: { app: AppDef }) {
  const Icon = app.icon;
  return (
    <Card className="opacity-70">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Icon className={cn('w-5 h-5', app.iconColor)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(tokens.heading.card)}>{app.name}</h3>
              <Badge variant="outline" className="text-[10px]">
                <Lock className="w-3 h-3 mr-1" /> Coming Soon
              </Badge>
            </div>
            <p className={cn(tokens.body.muted, 'line-clamp-2')}>{app.tagline}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function AppsMarketplace() {
  const { dashPath } = useOrgDashboardPath();
  const { hasApp, isLoading: appsLoading } = useOrganizationApps();
  const { isEntitled: connectActive, isLoading: connectLoading } = useConnectEntitlement();

  const isLoading = appsLoading || connectLoading;

  const getActiveStatus = (key: string) => {
    if (key === 'connect') return connectActive;
    return hasApp(key);
  };

  return (
    <DashboardLayout>
    <div className={tokens.layout.pageContainer}>
      <DashboardPageHeader
        title="Zura Apps"
        description="Manage your subscriptions and explore new tools for your business."
      />

      {/* Your Apps */}
      <section className="space-y-4">
        <h2 className={tokens.heading.section}>Your Apps</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {isLoading
            ? [1, 2].map((i) => <AppCardSkeleton key={i} />)
            : SUBSCRIBED_APPS.map((app) => (
                <SubscribedAppCard
                  key={app.key}
                  app={app}
                  isActive={getActiveStatus(app.key)}
                  dashPath={dashPath}
                />
              ))}
        </div>
      </section>

      {/* Explore */}
      <section className="space-y-4 mt-10">
        <h2 className={tokens.heading.section}>Explore Apps</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXPLORE_APPS.map((app) => (
            <ExploreAppCard key={app.key} app={app} />
          ))}
        </div>
      </section>
    </div>
    </DashboardLayout>
  );
}
