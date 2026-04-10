import React from 'react';
import { Link } from 'react-router-dom';

import { PLATFORM_NAME } from '@/lib/brand';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';

import { usePayrollEntitlement } from '@/hooks/payroll/usePayrollEntitlement';

import { PageExplainer } from '@/components/ui/PageExplainer';
import { useOpsHubFavorites } from '@/hooks/useOpsHubFavorites';

import {
  ClipboardList,
  GraduationCap,
  Target,
  HandHelping,
  CalendarClock,
  AlertTriangle,
  Briefcase,
  Cake,
  CreditCard,
  Camera,
  Bell,
  ChevronRight,
  Video,
  Trophy,
  ArrowLeftRight,
  MessageSquare,
  Coins,
  FileText,
  Star as StarIcon,
  ShieldAlert,
  CalendarDays,
  Users,
  HeartPulse,
  DollarSign,
  Store,
  Armchair,
  BookOpen,
  Globe,
  Search,
  Brain,
  MessageSquarePlus,
  UserCheck,
  GitMerge,
  UserPlus,
} from 'lucide-react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

// Icon name to component map for favorites serialization
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  HeartPulse, DollarSign, Store, ClipboardList, Video, MessageSquare,
  Armchair, CalendarDays, Bell, CalendarClock, ArrowLeftRight, HandHelping,
  Users, GraduationCap, Target, Trophy, StarIcon, AlertTriangle, FileText,
  ShieldAlert, BookOpen, CreditCard, Camera, Cake, Globe, Search, Brain,
  MessageSquarePlus, UserCheck, GitMerge, UserPlus, Briefcase, Coins,
};

function getIconName(icon: React.ComponentType<{ className?: string }>): string {
  for (const [name, comp] of Object.entries(ICON_MAP)) {
    if (comp === icon) return name;
  }
  return 'Users';
}

interface ManagementCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  stat?: string | number | null;
  statLabel?: string;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

const ManagementCard = React.forwardRef<HTMLAnchorElement, ManagementCardProps>(
  function ManagementCard({ href, icon: Icon, title, description, stat, statLabel, isFavorited, onToggleFavorite }, ref) {
    return (
      <Link to={href} ref={ref}>
        <Card className={cn(tokens.card.wrapper, "group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full border-border/50 relative")}>
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
              className={cn(
                "absolute top-2 right-2 z-10 p-1 rounded-md transition-all",
                isFavorited
                  ? "text-amber-500 opacity-100"
                  : "text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-amber-500"
              )}
            >
              <StarIcon className="w-3.5 h-3.5" fill={isFavorited ? "currentColor" : "none"} />
            </button>
          )}
          <CardContent className="p-5 min-h-[88px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={cn(tokens.card.iconBox, "shrink-0")}>
                  <Icon className={tokens.card.icon} />
                </div>
                <div className="flex-1">
                  <h3 className={tokens.card.title}>{title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {stat !== null && stat !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {stat} {statLabel}
                  </Badge>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }
);

interface HubGatewayCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

function HubGatewayCard({ href, icon: Icon, title, description, isFavorited, onToggleFavorite }: HubGatewayCardProps) {
  return (
    <Link to={href}>
      <Card className={cn(tokens.card.wrapper, "group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full border-border/50 bg-card/60 backdrop-blur-sm relative")}>
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
            className={cn(
              "absolute top-2 right-2 z-10 p-1 rounded-md transition-all",
              isFavorited
                ? "text-amber-500 opacity-100"
                : "text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-amber-500"
            )}
          >
            <StarIcon className="w-3.5 h-3.5" fill={isFavorited ? "currentColor" : "none"} />
          </button>
        )}
        <CardContent className="p-5 min-h-[108px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={cn(tokens.card.iconBox, "shrink-0")}>
                <Icon className={tokens.card.icon} />
              </div>
              <div className="flex-1">
                <h3 className={tokens.card.title}>{title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface CategorySectionProps {
  title: string;
  children: React.ReactNode;
  columns?: 2 | 3;
}

function CategorySection({ title, children, columns = 3 }: CategorySectionProps) {
  const validChildren = React.Children.toArray(children).filter(Boolean);
  if (validChildren.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="font-display text-sm tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className={cn(
        "grid gap-3 items-stretch",
        columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
      )}>
        {validChildren}
      </div>
    </div>
  );
}

// All cards defined as data for favorites rendering
interface CardDef {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  statKey?: string;
  statLabel?: string;
  type: 'hub' | 'card';
  conditional?: boolean;
}

export default function TeamHub() {
  const { dashPath } = useOrgDashboardPath();
  const { isEntitled: isPayrollEntitled } = usePayrollEntitlement();
  const { favorites, isFavorited, toggleFavorite, isAtLimit } = useOpsHubFavorites();

  const { data: stats } = useQuery({
    queryKey: ['team-hub-stats'],
    queryFn: async () => {
      const assistantRequestsResult = await supabase
        .from('assistant_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const businessCardsResult = await supabase
        .from('business_card_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const headshotsResult = await supabase
        .from('headshot_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const graduationsResult = await supabase
        .from('stylist_program_enrollment')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .not('graduation_type', 'is', null);

      const birthdaysResult = await supabase
        .from('employee_profiles')
        .select('birthday')
        .eq('is_active', true)
        .not('birthday', 'is', null);

      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const birthdaysThisWeek = (birthdaysResult.data || []).filter(p => {
        if (!p.birthday) return false;
        const bday = new Date(p.birthday);
        const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        return thisYearBday >= today && thisYearBday <= nextWeek;
      }).length;

      return {
        pendingAssistantRequests: assistantRequestsResult.count || 0,
        pendingBusinessCards: businessCardsResult.count || 0,
        pendingHeadshots: headshotsResult.count || 0,
        inProgressGraduations: graduationsResult.count || 0,
        birthdaysThisWeek,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const getStat = (key?: string): string | number | null => {
    if (!key || !stats) return null;
    const val = stats[key as keyof typeof stats];
    return val || null;
  };

  const handleToggleFavorite = (href: string, title: string, icon: React.ComponentType<{ className?: string }>) => {
    toggleFavorite(dashPath(href), title, getIconName(icon));
  };

  const renderFavoriteCard = (fav: { href: string; label: string; icon: string }) => {
    const IconComp = ICON_MAP[fav.icon] || Users;
    return (
      <Link key={fav.href} to={fav.href}>
        <Card className={cn(tokens.card.wrapper, "group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full border-amber-500/30 bg-amber-500/[0.06] dark:bg-amber-500/[0.08] relative")}>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(fav.href, fav.label, fav.icon); }}
            className="absolute top-2 right-2 z-10 p-1 rounded-md text-amber-500 opacity-100 transition-all"
          >
            <StarIcon className="w-3.5 h-3.5" fill="currentColor" />
          </button>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(tokens.card.iconBox, "shrink-0 bg-amber-500/15 text-amber-500")}>
                <IconComp className="w-5 h-5" />
              </div>
              <h3 className={tokens.card.title}>{fav.label}</h3>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  // Helper to wire favorite props
  const favProps = (subpath: string, title: string, icon: React.ComponentType<{ className?: string }>) => ({
    isFavorited: isFavorited(dashPath(subpath)),
    onToggleFavorite: () => handleToggleFavorite(subpath, title, icon),
  });

  return (
    <DashboardLayout>
      <div className={cn(tokens.layout.pageContainer, "max-w-[1600px] mx-auto")}>
        <DashboardPageHeader
          title="Operations Hub"
          description="People management, development, and team operations"
        />
        <PageExplainer pageId="team-hub" />

        {/* Favorites */}
        {favorites.length > 0 && (
          <CategorySection title="Favorites" columns={3}>
            {favorites.map(renderFavoriteCard)}
          </CategorySection>
        )}

        {/* 1. Daily Operations */}
        <CategorySection title="Daily Operations">
          {!isFavorited(dashPath('/admin/daily-huddle')) && (
            <ManagementCard
              href={dashPath('/admin/daily-huddle')}
              icon={MessageSquare}
              title="Daily Huddle"
              description="Create pre-shift notes and daily goals"
              {...favProps('/admin/daily-huddle', 'Daily Huddle', MessageSquare)}
            />
          )}
          {!isFavorited(dashPath('/admin/chair-assignments')) && (
            <ManagementCard
              href={dashPath('/admin/chair-assignments')}
              icon={Armchair}
              title="Chair Assignments"
              description="Station assignments and floor layout management"
              {...favProps('/admin/chair-assignments', 'Chair Assignments', Armchair)}
            />
          )}
          {!isFavorited(dashPath('/assistant-schedule')) && (
            <ManagementCard
              href={dashPath('/assistant-schedule')}
              icon={CalendarDays}
              title="Assistant Scheduling"
              description="Manage assistant assignments and coverage"
              {...favProps('/assistant-schedule', 'Assistant Scheduling', CalendarDays)}
            />
          )}
          {!isFavorited(dashPath('/admin/announcements')) && (
            <ManagementCard
              href={dashPath('/admin/announcements')}
              icon={Bell}
              title="Announcements"
              description="Send team-wide communications"
              {...favProps('/admin/announcements', 'Announcements', Bell)}
            />
          )}
        </CategorySection>

        {/* 2. Scheduling & Time Off */}
        <CategorySection title="Scheduling & Time Off">
          {!isFavorited(dashPath('/admin/schedule-requests')) && (
            <ManagementCard
              href={dashPath('/admin/schedule-requests')}
              icon={CalendarClock}
              title="Schedule Requests"
              description="Time-off and schedule change approvals"
              {...favProps('/admin/schedule-requests', 'Schedule Requests', CalendarClock)}
            />
          )}
          {!isFavorited(dashPath('/admin/shift-swaps')) && (
            <ManagementCard
              href={dashPath('/admin/shift-swaps')}
              icon={ArrowLeftRight}
              title="Shift Swap Approvals"
              description="Review and approve shift swap requests"
              {...favProps('/admin/shift-swaps', 'Shift Swap Approvals', ArrowLeftRight)}
            />
          )}
          {!isFavorited(dashPath('/admin/assistant-requests')) && (
            <ManagementCard
              href={dashPath('/admin/assistant-requests')}
              icon={HandHelping}
              title="Assistant Requests"
              description="Manage help requests from stylists"
              stat={stats?.pendingAssistantRequests || null}
              statLabel="pending"
              {...favProps('/admin/assistant-requests', 'Assistant Requests', HandHelping)}
            />
          )}
          {!isFavorited(dashPath('/schedule-meeting')) && (
            <ManagementCard
              href={dashPath('/schedule-meeting')}
              icon={CalendarClock}
              title="Meetings & Accountability"
              description="Schedule 1:1s and track commitments"
              {...favProps('/schedule-meeting', 'Meetings & Accountability', CalendarClock)}
            />
          )}
          {!isFavorited(dashPath('/admin/pto')) && (
            <ManagementCard
              href={dashPath('/admin/pto')}
              icon={CalendarDays}
              title="PTO Balances"
              description="Manage PTO policies and employee balances"
              {...favProps('/admin/pto', 'PTO Balances', CalendarDays)}
            />
          )}
        </CategorySection>

        {/* 3. People & Development */}
        <CategorySection title="People & Development">
          {!isFavorited(dashPath('/directory')) && (
            <ManagementCard
              href={dashPath('/directory')}
              icon={Users}
              title="Team Directory"
              description="View and manage your team roster"
              {...favProps('/directory', 'Team Directory', Users)}
            />
          )}
          {!isFavorited(dashPath('/admin/graduation-tracker')) && (
            <ManagementCard
              href={dashPath('/admin/graduation-tracker')}
              icon={GraduationCap}
              title="Graduation Tracker"
              description="Monitor assistant advancement and milestones"
              stat={stats?.inProgressGraduations || null}
              statLabel="in progress"
              {...favProps('/admin/graduation-tracker', 'Graduation Tracker', GraduationCap)}
            />
          )}
          {!isFavorited(dashPath('/admin/client-engine-tracker')) && (
            <ManagementCard
              href={dashPath('/admin/client-engine-tracker')}
              icon={Target}
              title="Client Engine Tracker"
              description="Program enrollment and participation rates"
              {...favProps('/admin/client-engine-tracker', 'Client Engine Tracker', Target)}
            />
          )}
          {!isFavorited(dashPath('/admin/challenges')) && (
            <ManagementCard
              href={dashPath('/admin/challenges')}
              icon={Trophy}
              title="Team Challenges"
              description="Create and manage team competitions"
              {...favProps('/admin/challenges', 'Team Challenges', Trophy)}
            />
          )}
          {!isFavorited(dashPath('/admin/onboarding-tracker')) && (
            <ManagementCard
              href={dashPath('/admin/onboarding-tracker')}
              icon={ClipboardList}
              title="Onboarding Hub"
              description="New hire progress, invitations, and checklist completion"
              {...favProps('/admin/onboarding-tracker', 'Onboarding Hub', ClipboardList)}
            />
          )}
          {!isFavorited(dashPath('/admin/training-hub')) && (
            <ManagementCard
              href={dashPath('/admin/training-hub')}
              icon={Video}
              title="Training Hub"
              description="Manage training library and track completions"
              {...favProps('/admin/training-hub', 'Training Hub', Video)}
            />
          )}
          {isPayrollEntitled && !isFavorited(dashPath('/admin/payroll')) && (
            <ManagementCard
              href={dashPath('/admin/payroll')}
              icon={DollarSign}
              title="Hiring & Payroll Hub"
              description="Compensation, commissions, and hiring pipeline"
              {...favProps('/admin/payroll', 'Hiring & Payroll Hub', DollarSign)}
            />
          )}
        </CategorySection>

        {/* 4. Recruiting & Hiring */}
        <CategorySection title="Recruiting & Hiring">
          {!isFavorited(dashPath('/admin/leads')) && (
            <ManagementCard
              href={dashPath('/admin/leads')}
              icon={UserPlus}
              title="Lead Management"
              description="Track prospective hires and inbound leads"
              {...favProps('/admin/leads', 'Lead Management', UserPlus)}
            />
          )}
          {!isFavorited(dashPath('/admin/recruiting')) && (
            <ManagementCard
              href={dashPath('/admin/recruiting')}
              icon={Briefcase}
              title="Recruiting Pipeline"
              description="Manage open positions and candidate stages"
              {...favProps('/admin/recruiting', 'Recruiting Pipeline', Briefcase)}
            />
          )}
          {isPayrollEntitled && !isFavorited(dashPath('/admin/payroll?tab=hire')) && (
            <ManagementCard
              href={dashPath('/admin/payroll?tab=hire')}
              icon={UserCheck}
              title="New Hire Wizard"
              description="Guided new hire setup with payroll integration"
              {...favProps('/admin/payroll?tab=hire', 'New Hire Wizard', UserCheck)}
            />
          )}
          {!isFavorited(dashPath('/admin/booth-renters?tab=onboarding')) && (
            <ManagementCard
              href={dashPath('/admin/booth-renters?tab=onboarding')}
              icon={Store}
              title="Renter Onboard Wizard"
              description="Guided onboarding for new booth renters"
              {...favProps('/admin/booth-renters?tab=onboarding', 'Renter Onboard Wizard', Store)}
            />
          )}
        </CategorySection>

        {/* 5. Client & Business */}
        <CategorySection title="Client & Business">
          {!isFavorited(dashPath('/admin/client-hub')) && (
            <ManagementCard
              href={dashPath('/admin/client-hub')}
              icon={HeartPulse}
              title="Client Hub"
              description="Client management, retention, and engagement"
              {...favProps('/admin/client-hub', 'Client Hub', HeartPulse)}
            />
          )}
          {!isFavorited(dashPath('/admin/booth-renters')) && (
            <ManagementCard
              href={dashPath('/admin/booth-renters')}
              icon={Store}
              title="Renter Hub"
              description="Booth renter contracts, billing, and compliance"
              {...favProps('/admin/booth-renters', 'Renter Hub', Store)}
            />
          )}
          {!isFavorited(dashPath('/admin/client-health')) && (
            <ManagementCard
              href={dashPath('/admin/client-health')}
              icon={Brain}
              title="Client Health Hub"
              description="Identify at-risk clients and retention opportunities"
              {...favProps('/admin/client-health', 'Client Health Hub', Brain)}
            />
          )}
          {!isFavorited(dashPath('/admin/feedback')) && (
            <ManagementCard
              href={dashPath('/admin/feedback')}
              icon={MessageSquarePlus}
              title="Feedback Hub"
              description="Client feedback collection and response tracking"
              {...favProps('/admin/feedback', 'Feedback Hub', MessageSquarePlus)}
            />
          )}
          {!isFavorited(dashPath('/admin/reengagement')) && (
            <ManagementCard
              href={dashPath('/admin/reengagement')}
              icon={UserCheck}
              title="Re-engagement"
              description="Win back lapsed clients with targeted outreach"
              {...favProps('/admin/reengagement', 'Re-engagement', UserCheck)}
            />
          )}
          {!isFavorited(dashPath('/admin/merge-clients')) && (
            <ManagementCard
              href={dashPath('/admin/merge-clients')}
              icon={GitMerge}
              title="Merge Clients"
              description="Deduplicate and merge client records"
              {...favProps('/admin/merge-clients', 'Merge Clients', GitMerge)}
            />
          )}
        </CategorySection>

        {/* 6. Marketing & Visibility */}
        <CategorySection title="Marketing & Visibility">
          {!isFavorited(dashPath('/admin/website-sections')) && (
            <ManagementCard
              href={dashPath('/admin/website-sections')}
              icon={Globe}
              title="Website Editor"
              description="Manage website sections, themes, and content"
              {...favProps('/admin/website-sections', 'Website Editor', Globe)}
            />
          )}
          {!isFavorited(dashPath('/admin/seo-workshop')) && (
            <ManagementCard
              href={dashPath('/admin/seo-workshop')}
              icon={Search}
              title="SEO Workshop"
              description="Tasks and guides to improve local visibility"
              {...favProps('/admin/seo-workshop', 'SEO Workshop', Search)}
            />
          )}
        </CategorySection>

        {/* 7. Compliance & Documentation */}
        <CategorySection title="Compliance & Documentation">
          {!isFavorited(dashPath('/admin/performance-reviews')) && (
            <ManagementCard
              href={dashPath('/admin/performance-reviews')}
              icon={StarIcon}
              title="Performance Reviews"
              description="Structured reviews with ratings and goals"
              {...favProps('/admin/performance-reviews', 'Performance Reviews', StarIcon)}
            />
          )}
          {!isFavorited(dashPath('/admin/incidents')) && (
            <ManagementCard
              href={dashPath('/admin/incidents')}
              icon={ShieldAlert}
              title="Incidents & Accountability"
              description="Incident reports, strikes, and safety documentation"
              {...favProps('/admin/incidents', 'Incidents & Accountability', ShieldAlert)}
            />
          )}
          {!isFavorited(dashPath('/admin/handbooks')) && (
            <ManagementCard
              href={dashPath('/admin/handbooks')}
              icon={BookOpen}
              title="Handbooks"
              description="Create and manage team handbooks and policy documents"
              {...favProps('/admin/handbooks', 'Handbooks', BookOpen)}
            />
          )}
        </CategorySection>

        {/* 6. Team Services */}
        <CategorySection title="Team Services">
          {!isFavorited(dashPath('/admin/business-cards')) && (
            <ManagementCard
              href={dashPath('/admin/business-cards')}
              icon={CreditCard}
              title="Business Cards"
              description="Process business card requests"
              stat={stats?.pendingBusinessCards || null}
              statLabel="pending"
              {...favProps('/admin/business-cards', 'Business Cards', CreditCard)}
            />
          )}
          {!isFavorited(dashPath('/admin/headshots')) && (
            <ManagementCard
              href={dashPath('/admin/headshots')}
              icon={Camera}
              title="Headshots"
              description="Schedule and track photo sessions"
              stat={stats?.pendingHeadshots || null}
              statLabel="pending"
              {...favProps('/admin/headshots', 'Headshots', Camera)}
            />
          )}
          {!isFavorited(dashPath('/admin/birthdays')) && (
            <ManagementCard
              href={dashPath('/admin/birthdays')}
              icon={Cake}
              title="Birthdays & Anniversaries"
              description="Upcoming team celebrations and milestones"
              stat={stats?.birthdaysThisWeek || null}
              statLabel="this week"
              {...favProps('/admin/birthdays', 'Birthdays & Anniversaries', Cake)}
            />
          )}
        </CategorySection>
      </div>
    </DashboardLayout>
  );
}
