import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { cn, formatDisplayName } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { TrendSparkline } from '@/components/dashboard/TrendSparkline';
import { 
  Building2, 
  MapPin, 
  Upload, 
  Plus, 
  ArrowRight,
  Clock,
  Sparkles,
  Settings
} from 'lucide-react';
import { useOrganizationStats } from '@/hooks/useOrganizationStats';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformActivityFeed } from '@/components/platform/overview/PlatformActivityFeed';
import { PlatformLiveAnalytics } from '@/components/platform/overview/PlatformLiveAnalytics';
import { IncidentManagementCard } from '@/components/platform/overview/IncidentManagementCard';
import { PlatformOrgQuickSwitch } from '@/components/platform/PlatformOrgQuickSwitch';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getContextualMessage() {
  const hour = new Date().getHours();
  if (hour < 9) return 'Early start — here\'s your platform at a glance.';
  if (hour < 12) return 'Manage accounts, migrations, and platform health.';
  if (hour < 14) return 'Midday check-in — everything running smoothly.';
  if (hour < 18) return 'Afternoon overview — stay on top of your platform.';
  return 'Evening recap — review today\'s platform activity.';
}

export default function PlatformOverview() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useOrganizationStats();
  const { data: profile } = useEmployeeProfile();
  const greeting = useMemo(() => getGreeting(), []);
  const contextualMessage = useMemo(() => getContextualMessage(), []);
  
  const firstName = profile ? formatDisplayName(profile.full_name || '', profile.display_name).split(' ')[0] : '';

  if (isLoading) {
    return (
      <PlatformPageContainer>
        <PlatformOverviewSkeleton />
      </PlatformPageContainer>
    );
  }

  return (
    <PlatformPageContainer>
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{ 
            x: [0, 30, -20, 0], 
            y: [0, -25, 15, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[120px] will-change-transform"
          style={{ background: 'radial-gradient(circle, hsl(263 70% 60%), transparent 70%)' }}
        />
        <motion.div
          animate={{ 
            x: [0, -25, 20, 0], 
            y: [0, 20, -30, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.03] blur-[140px] will-change-transform"
          style={{ background: 'radial-gradient(circle, hsl(230 70% 55%), transparent 70%)' }}
        />
        <motion.div
          animate={{ 
            x: [0, 15, -10, 0], 
            y: [0, -15, 25, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.02] blur-[100px] will-change-transform"
          style={{ background: 'radial-gradient(circle, hsl(280 60% 50%), transparent 70%)' }}
        />
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display bg-gradient-to-r from-[hsl(var(--platform-foreground))] via-[hsl(var(--platform-foreground))] to-[hsl(var(--platform-primary))] bg-clip-text text-transparent tracking-tight">
              {greeting}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-[hsl(var(--platform-foreground-muted)/0.8)] mt-1.5 text-sm">
              {contextualMessage}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PlatformOrgQuickSwitch />
            <PlatformButton onClick={() => navigate('/platform/accounts')} className="gap-2">
              <Plus className="h-4 w-4" />
              New Account
            </PlatformButton>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={fadeUp} className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Accounts"
            value={stats?.totalOrganizations || 0}
            icon={Building2}
            description="Active accounts"
            href="/platform/accounts"
            sparkData={[2, 4, 3, 6, 5, 8, 7, 10]}
            index={0}
          />
          <StatCard
            title="In Onboarding"
            value={stats?.onboardingOrganizations || 0}
            icon={Clock}
            description="Accounts being set up"
            variant="warning"
            href="/platform/accounts?status=onboarding"
            sparkData={[1, 2, 1, 3, 2, 2, 3, 2]}
            index={1}
          />
          <StatCard
            title="Pending Migrations"
            value={stats?.pendingMigrations || 0}
            icon={Upload}
            description="Data imports in progress"
            variant={stats?.pendingMigrations ? 'warning' : 'default'}
            href="/platform/import"
            sparkData={[3, 2, 4, 1, 2, 1, 0, 1]}
            index={2}
          />
          <StatCard
            title="Total Locations"
            value={stats?.totalLocations || 0}
            icon={MapPin}
            description="Across all accounts"
            href="/platform/accounts"
            sparkData={[5, 6, 8, 9, 10, 12, 14, 16]}
            index={3}
          />
        </motion.div>

        {/* Gradient divider */}
        <motion.div 
          variants={fadeUp}
          className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--platform-primary)/0.2)] to-transparent" 
        />

        {/* Incident Banner + Analytics Row */}
        <motion.div variants={fadeUp} className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PlatformLiveAnalytics />
          </div>
          <div className="lg:col-span-1">
            <IncidentManagementCard />
          </div>
        </motion.div>

        {/* Gradient divider */}
        <motion.div 
          variants={fadeUp}
          className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--platform-primary)/0.2)] to-transparent" 
        />

        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="group/actions relative rounded-[22px] border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] backdrop-blur-xl p-5 overflow-hidden">
          {/* Subtle shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(var(--platform-primary)/0.03)] to-transparent -translate-x-full group-hover/actions:translate-x-full transition-transform duration-[1.5s] ease-in-out" />
          
          <div className="relative flex items-center gap-2 mb-5">
            <div className="p-2 rounded-xl bg-[hsl(var(--platform-primary)/0.2)] ring-1 ring-[hsl(var(--platform-primary)/0.1)]">
              <Sparkles className="h-4 w-4 text-[hsl(var(--platform-primary))]" />
            </div>
            <h2 className="text-lg font-medium text-[hsl(var(--platform-foreground))] tracking-tight">Quick Actions</h2>
          </div>
          <div className="relative grid gap-3 sm:grid-cols-3">
            <QuickActionButton 
              icon={Building2}
              label="View All Accounts"
              onClick={() => navigate('/platform/accounts')}
              hoverAnimation="group-hover/action:scale-110"
            />
            <QuickActionButton 
              icon={Upload}
              label="Start Migration"
              onClick={() => navigate('/platform/import')}
              hoverAnimation="group-hover/action:-translate-y-0.5"
            />
            <QuickActionButton 
              icon={Settings}
              label="Platform Settings"
              onClick={() => navigate('/platform/settings')}
              hoverAnimation="group-hover/action:rotate-45"
            />
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div variants={fadeUp}>
          <PlatformActivityFeed limit={10} />
        </motion.div>
      </motion.div>
    </PlatformPageContainer>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  variant?: 'default' | 'warning' | 'success';
  href?: string;
  sparkData?: number[];
  index?: number;
}

function StatCard({ title, value, icon: Icon, description, variant = 'default', href, sparkData, index = 0 }: StatCardProps) {
  const iconStyles = {
    default: 'bg-[hsl(var(--platform-primary)/0.2)] text-[hsl(var(--platform-primary))] ring-1 ring-[hsl(var(--platform-primary)/0.1)]',
    warning: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/10',
    success: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/10',
  };

  const valueStyles = {
    default: 'text-[hsl(var(--platform-foreground))]',
    warning: 'text-amber-400',
    success: 'text-emerald-400',
  };

  const glowStyles = {
    default: 'hover:shadow-[0_0_40px_-12px_hsl(var(--platform-primary)/0.2)]',
    warning: 'hover:shadow-[0_0_40px_-12px_rgba(245,158,11,0.15)]',
    success: 'hover:shadow-[0_0_40px_-12px_rgba(16,185,129,0.15)]',
  };

  const borderHoverStyles = {
    default: 'hover:border-[hsl(var(--platform-primary)/0.4)]',
    warning: 'hover:border-amber-500/30',
    success: 'hover:border-emerald-500/30',
  };

  const cardClasses = cn(
    "group/card relative rounded-[16px] border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] backdrop-blur-xl p-5",
    "transition-all duration-150 ease-out will-change-transform",
    "hover:-translate-y-px",
    glowStyles[variant],
    borderHoverStyles[variant],
    "overflow-hidden"
  );

  const content = (
    <>
      {/* Gradient shimmer on hover */}
      <div className="absolute inset-0 rounded-[16px] bg-gradient-to-br from-[hsl(var(--platform-primary)/0.07)] via-[hsl(var(--platform-secondary)/0.04)] to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
      
      {/* Top edge highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--platform-foreground)/0.06)] to-transparent" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-[hsl(var(--platform-foreground-muted))] tracking-wide uppercase">{title}</span>
          <div className={cn(
            'p-2.5 rounded-xl transition-all duration-150 group-hover/card:scale-105',
            iconStyles[variant]
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className={cn('text-4xl font-medium tabular-nums tracking-tight', valueStyles[variant])}>
            <AnimatedNumber value={value} duration={1400} />
          </div>
          {sparkData && sparkData.length > 1 && (
            <TrendSparkline 
              data={sparkData} 
              width={72} 
              height={28} 
            className="mb-1 opacity-50 group-hover/card:opacity-100 transition-opacity duration-150" 
            />
          )}
        </div>
        <div className="h-px bg-gradient-to-r from-[hsl(var(--platform-border)/0.4)] via-[hsl(var(--platform-border)/0.2)] to-transparent my-3" />
        <p className="text-sm text-[hsl(var(--platform-foreground-subtle))] group-hover/card:text-[hsl(var(--platform-foreground-muted))] transition-colors duration-150">{description}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Link to={href} className={cn(cardClasses, "cursor-pointer block")}>
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className={cardClasses}>
        {content}
      </div>
    </motion.div>
  );
}

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  hoverAnimation?: string;
}

function QuickActionButton({ icon: Icon, label, onClick, hoverAnimation }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group/action w-full flex items-center gap-3 px-4 py-3.5 rounded-xl",
        "bg-[hsl(var(--platform-bg-hover)/0.3)] border border-[hsl(var(--platform-border)/0.2)]",
        "text-[hsl(var(--platform-foreground)/0.9)] hover:text-[hsl(var(--platform-foreground))]",
        "hover:bg-[hsl(var(--platform-bg-hover)/0.5)] hover:border-[hsl(var(--platform-primary)/0.3)]",
        "active:scale-[0.98]",
        "transition-all duration-150 ease-out"
      )}
    >
      <div className="p-1.5 rounded-lg bg-[hsl(var(--platform-border)/0.3)] group-hover/action:bg-[hsl(var(--platform-primary)/0.2)] transition-colors duration-150">
        <Icon className={cn(
          "h-4 w-4 text-[hsl(var(--platform-foreground-muted))] group-hover/action:text-[hsl(var(--platform-primary))] transition-all duration-150",
          hoverAnimation
        )} />
      </div>
      <span className="flex-1 text-left text-sm font-medium">{label}</span>
      <ArrowRight className="h-4 w-4 text-[hsl(var(--platform-foreground-subtle))] group-hover/action:text-[hsl(var(--platform-primary))] group-hover/action:translate-x-1 transition-all duration-150" />
    </button>
  );
}

function PlatformOverviewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2 bg-[hsl(var(--platform-bg-hover))]" />
          <Skeleton className="h-5 w-72 bg-[hsl(var(--platform-bg-hover))]" />
        </div>
        <Skeleton className="h-10 w-40 bg-[hsl(var(--platform-bg-hover))]" />
      </div>
      <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-[16px] border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] p-5">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-24 bg-[hsl(var(--platform-bg-hover))]" />
              <Skeleton className="h-10 w-10 rounded-xl bg-[hsl(var(--platform-bg-hover))]" />
            </div>
            <Skeleton className="h-10 w-16 mb-2 bg-[hsl(var(--platform-bg-hover))]" />
            <Skeleton className="h-4 w-32 bg-[hsl(var(--platform-bg-hover))]" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-[16px] border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] p-5">
          <Skeleton className="h-6 w-32 mb-5 bg-[hsl(var(--platform-bg-hover))]" />
          <Skeleton className="h-[220px] w-full rounded-xl bg-[hsl(var(--platform-bg-hover))]" />
        </div>
        <div className="rounded-[16px] border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.4)] p-5">
          <Skeleton className="h-6 w-32 mb-5 bg-[hsl(var(--platform-bg-hover))]" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl bg-[hsl(var(--platform-bg-hover))]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
