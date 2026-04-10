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
  Bell,
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
  valueStatement: string;
  features: string[];
  icon: React.ElementType;
  gradient: string;
  settingsPath?: string;
  comingSoon?: boolean;
}

const SUBSCRIBED_APPS: AppDef[] = [
  {
    key: 'backroom',
    name: 'Color Bar',
    tagline: 'Backbar Intelligence',
    valueStatement: 'Eliminate waste. Protect margin. Track every gram.',
    features: [
      'Backbar inventory tracking',
      'Chemical dispensing logs',
      'Waste analytics and cost visibility',
      'Smart reorder alerts',
    ],
    icon: Package,
    gradient: 'from-violet-500/20 to-purple-500/20',
    settingsPath: '/admin/color-bar',
  },
  {
    key: 'connect',
    name: 'Zura Connect',
    tagline: 'Unified Communications',
    valueStatement: 'Unify team and client communication in one hub.',
    features: [
      'Organized team channels',
      'Direct and group messaging',
      'AI-powered smart actions',
      'Client SMS (coming soon)',
    ],
    icon: MessageSquare,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    settingsPath: '/team-chat',
  },
];

const EXPLORE_APPS: AppDef[] = [
  {
    key: 'marketer',
    name: 'Zura Marketer',
    tagline: 'Campaign Intelligence',
    valueStatement: 'Turn services into campaigns. Close the attribution loop.',
    features: [
      'Campaign management across Meta and TikTok',
      'AI-generated creative and copy',
      'ROI attribution per campaign',
      'Capacity-aware targeting',
    ],
    icon: Megaphone,
    gradient: 'from-pink-500/20 to-rose-500/20',
    comingSoon: true,
  },
  {
    key: 'reputation',
    name: 'Zura Reputation',
    tagline: 'Reviews + Social Proof Engine',
    valueStatement: 'Convert happy clients into five-star proof.',
    features: [
      'Smart review request timing',
      'Google review automation',
      'Reputation scoring dashboard',
      'AI review responses (brand-aligned)',
    ],
    icon: Star,
    gradient: 'from-amber-500/20 to-yellow-500/20',
    comingSoon: true,
  },
  {
    key: 'reception',
    name: 'Zura Reception',
    tagline: 'AI Receptionist',
    valueStatement: 'Never miss a call. Never lose a booking.',
    features: [
      'AI call handling and routing',
      'Automated booking from calls',
      'Front-desk workflow automation',
      'After-hours coverage',
    ],
    icon: Phone,
    gradient: 'from-emerald-500/20 to-teal-500/20',
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
          <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureList({ features, muted }: { features: string[]; muted?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
      {features.map((f) => (
        <div key={f} className="flex items-start gap-2">
          <CheckCircle2
            className={cn(
              'w-3.5 h-3.5 mt-0.5 shrink-0',
              muted ? 'text-muted-foreground/40' : 'text-primary/70'
            )}
          />
          <span className="font-sans text-xs text-muted-foreground leading-snug">{f}</span>
        </div>
      ))}
    </div>
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
    <Card interactive>
      <CardContent className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0',
                app.gradient
              )}
            >
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className={cn(tokens.heading.card)}>{app.name}</h3>
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className="text-[10px] px-2"
                >
                  {isActive ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    'Inactive'
                  )}
                </Badge>
              </div>
              <p className="font-sans text-[11px] text-muted-foreground/60 tracking-wide mt-0.5">
                {app.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Value statement */}
        <p className="font-sans text-sm text-foreground/80 leading-relaxed">
          {app.valueStatement}
        </p>

        {/* Features */}
        <FeatureList features={app.features} />

        {/* CTA */}
        <div className="pt-1">
          {isActive && app.settingsPath ? (
            <Button variant="default" size="sm" asChild className="font-sans">
              <Link to={dashPath(app.settingsPath)}>
                Open <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="font-sans">
              Contact Sales
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
    <Card className="border-l-2 border-l-muted-foreground/10">
      <CardContent className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0',
              app.gradient
            )}
          >
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <h3 className={cn(tokens.heading.card)}>{app.name}</h3>
              <Badge variant="outline" className="text-[10px] px-2">
                <Lock className="w-3 h-3 mr-1" /> Coming Soon
              </Badge>
            </div>
            <p className="font-sans text-[11px] text-muted-foreground/60 tracking-wide mt-0.5">
              {app.tagline}
            </p>
          </div>
        </div>

        {/* Value statement */}
        <p className="font-sans text-sm text-foreground/80 leading-relaxed">
          {app.valueStatement}
        </p>

        {/* Features */}
        <FeatureList features={app.features} muted />

        {/* CTA */}
        <div className="pt-1">
          <Button variant="outline" size="sm" className="font-sans gap-2">
            <Bell className="w-3.5 h-3.5" /> Notify Me
          </Button>
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
          description="Extend your system with purpose-built tools. Each app integrates directly into your operational infrastructure."
        />

        {/* Your Apps */}
        <section className="space-y-4">
          <h2 className={tokens.heading.section}>Your Apps</h2>
          <div className="grid gap-6 sm:grid-cols-2">
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
          <div>
            <h2 className={tokens.heading.section}>Explore Apps</h2>
            <p className="font-sans text-sm text-muted-foreground mt-1">
              Expand your capabilities with purpose-built tools.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {EXPLORE_APPS.map((app) => (
              <ExploreAppCard key={app.key} app={app} />
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
