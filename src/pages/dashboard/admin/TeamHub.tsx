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

import { usePendingInvitations } from '@/hooks/useStaffInvitations';
import { useInvitableRoles } from '@/hooks/useInvitableRoles';
import {

  ClipboardList,
  GraduationCap,
  Target,
  HandHelping,
  CalendarClock,
  AlertTriangle,
  UserPlus,
  Briefcase,
  Cake,
  CreditCard,
  Camera,
  Bell,
  Sparkles,
  ChevronRight,
  Video,
  Trophy,
  ArrowLeftRight,
  MessageSquare,
  Coins,
  UserCheck,
  ClipboardCheck,
  FileText,
  Star,
  ShieldAlert,
  CalendarDays,
  Brain,
  Users,
  HeartPulse,
  Rocket,
  DollarSign,
  Store,
  Armchair,
  Globe,
  Beaker,
  BookOpen,
} from 'lucide-react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { usePayrollEntitlement } from '@/hooks/payroll/usePayrollEntitlement';
import { useColorBarEntitlement } from '@/hooks/color-bar/useColorBarEntitlement';
import { PageExplainer } from '@/components/ui/PageExplainer';

interface ManagementCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  stat?: string | number | null;
  statLabel?: string;
}

const ManagementCard = React.forwardRef<HTMLAnchorElement, ManagementCardProps>(
  function ManagementCard({ href, icon: Icon, title, description, stat, statLabel }, ref) {
    return (
      <Link to={href} ref={ref}>
        <Card className={cn(tokens.card.wrapper, "group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full border-border/50")}>
          <CardContent className="p-5 min-h-[88px]">
            <div className="flex items-start justify-between gap-3">
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
}

function HubGatewayCard({ href, icon: Icon, title, description }: HubGatewayCardProps) {
  return (
    <Link to={href}>
      <Card className={cn(tokens.card.wrapper, "group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full border-border/50 bg-card/60 backdrop-blur-sm")}>
        <CardContent className="p-5 min-h-[108px]">
          <div className="flex items-start justify-between gap-3">
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
  return (
    <div className="space-y-3">
      <h2 className="font-display text-sm tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className={cn(
        "grid gap-3 items-stretch",
        columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
      )}>
        {children}
      </div>
    </div>
  );
}

export default function TeamHub() {
  const { dashPath } = useOrgDashboardPath();
  const { canInvite } = useInvitableRoles();
  const { isEntitled: isPayrollEntitled } = usePayrollEntitlement();
  const { isEntitled: isColorBarEntitled } = useColorBarEntitlement();
  const { data: pendingInvitations } = usePendingInvitations();
  const pendingInvitationCount = pendingInvitations?.length || 0;

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

  return (
    <DashboardLayout>
      <div className={cn(tokens.layout.pageContainer, "max-w-[1600px] mx-auto")}>
        <DashboardPageHeader
          title="Operations Hub"
          description="People management, development, and team operations"
        />
        <PageExplainer pageId="team-hub" />

        {/* Hub Gateway */}
        <CategorySection title="Hubs">
          <HubGatewayCard
            href={dashPath('/admin/client-hub')}
            icon={HeartPulse}
            title="Client Hub"
            description="Client management, retention, and engagement"
          />
          <HubGatewayCard
            href={dashPath('/admin/growth-hub')}
            icon={Rocket}
            title="Growth Hub"
            description="Marketing, campaigns, and growth initiatives"
          />
          {isPayrollEntitled && (
            <HubGatewayCard
              href={dashPath('/admin/payroll')}
              icon={DollarSign}
              title="Hiring & Payroll Hub"
              description="Compensation, commissions, and hiring pipeline"
            />
          )}
          <HubGatewayCard
            href={dashPath('/admin/booth-renters')}
            icon={Store}
            title="Renter Hub"
            description="Booth renter contracts, billing, and compliance"
          />
          <HubGatewayCard
            href={dashPath('/admin/onboarding-tracker')}
            icon={ClipboardList}
            title="Onboarding Hub"
            description="New hire progress, invitations, and checklist completion"
          />
          <HubGatewayCard
            href={dashPath('/admin/training-hub')}
            icon={Video}
            title="Training Hub"
            description="Manage training library and track completions"
          />
          <HubGatewayCard
            href={dashPath('/admin/website-hub')}
            icon={Globe}
            title="Website Hub"
            description="Website themes, editor, settings, and content management"
          />
          <HubGatewayCard
            href={dashPath('/admin/color-bar-settings')}
            icon={Beaker}
            title="Zura Color Bar Hub"
            description="Color Bar color & supply management, formulas, and station tracking"
          />
        </CategorySection>

        {/* People & Development */}
        <CategorySection title="People & Development">
          <ManagementCard
            href={dashPath('/directory')}
            icon={Users}
            title="Team Directory"
            description="View and manage your team roster"
          />
          <ManagementCard
            href={dashPath('/admin/graduation-tracker')}
            icon={GraduationCap}
            title="Graduation Tracker"
            description="Monitor assistant advancement and milestones"
            stat={stats?.inProgressGraduations || null}
            statLabel="in progress"
          />
          <ManagementCard
            href={dashPath('/admin/client-engine-tracker')}
            icon={Target}
            title="Client Engine Tracker"
            description="Program enrollment and participation rates"
          />
          <ManagementCard
            href={dashPath('/admin/challenges')}
            icon={Trophy}
            title="Team Challenges"
            description="Create and manage team competitions"
          />
          <ManagementCard
            href={dashPath('/admin/team')}
            icon={Target}
            title="Program Team Overview"
            description="Track stylist program progress across the team"
          />
          {canInvite && (
            <ManagementCard
              href={dashPath('/admin/onboarding-tracker?tab=invitations')}
              icon={ClipboardCheck}
              title="Manage Invitations"
              description="View and manage all pending invitations"
              stat={pendingInvitationCount > 0 ? pendingInvitationCount : null}
              statLabel="pending"
            />
          )}
        </CategorySection>

        {/* Scheduling & Requests */}
        <CategorySection title="Scheduling & Requests">
          <ManagementCard
            href={dashPath('/schedule-meeting')}
            icon={CalendarClock}
            title="Meetings & Accountability"
            description="Schedule 1:1s and track commitments"
          />
          <ManagementCard
            href={dashPath('/admin/assistant-requests')}
            icon={HandHelping}
            title="Assistant Requests"
            description="Manage help requests from stylists"
            stat={stats?.pendingAssistantRequests || null}
            statLabel="pending"
          />
          <ManagementCard
            href={dashPath('/admin/schedule-requests')}
            icon={CalendarClock}
            title="Schedule Requests"
            description="Time-off and schedule change approvals"
          />
          <ManagementCard
            href={dashPath('/admin/shift-swaps')}
            icon={ArrowLeftRight}
            title="Shift Swap Approvals"
            description="Review and approve shift swap requests"
          />
          <ManagementCard
            href={dashPath('/assistant-schedule')}
            icon={CalendarDays}
            title="Assistant Scheduling"
            description="Manage assistant assignments and coverage"
          />
          <ManagementCard
            href={dashPath('/admin/daily-huddle')}
            icon={MessageSquare}
            title="Daily Huddle"
            description="Create pre-shift notes and daily goals"
          />
        </CategorySection>

        {/* Performance & Compliance */}
        <CategorySection title="Performance & Compliance">
          <ManagementCard
            href={dashPath('/admin/performance-reviews')}
            icon={Star}
            title="Performance Reviews"
            description="Structured reviews with ratings and goals"
          />
          <ManagementCard
            href={dashPath('/admin/strikes')}
            icon={AlertTriangle}
            title="Staff Strikes"
            description="Track disciplinary actions and warnings"
          />
          <ManagementCard
            href={dashPath('/admin/documents')}
            icon={FileText}
            title="Document Tracker"
            description="Licenses, certifications, and compliance docs"
          />
          <ManagementCard
            href={dashPath('/admin/incidents')}
            icon={ShieldAlert}
            title="Incident Reports"
            description="Workplace safety and incident documentation"
          />
          <ManagementCard
            href={dashPath('/admin/pto')}
            icon={CalendarDays}
            title="PTO Balances"
            description="Manage PTO policies and employee balances"
          />
        </CategorySection>

        {/* Team Operations & Communications */}
        <CategorySection title="Team Operations & Communications">
          <ManagementCard
            href={dashPath('/admin/chair-assignments')}
            icon={Armchair}
            title="Chair Assignments"
            description="Station assignments and floor layout management"
          />
          <ManagementCard
            href={dashPath('/admin/birthdays')}
            icon={Cake}
            title="Birthdays & Anniversaries"
            description="Upcoming team celebrations and milestones"
            stat={stats?.birthdaysThisWeek || null}
            statLabel="this week"
          />
          <ManagementCard
            href={dashPath('/admin/business-cards')}
            icon={CreditCard}
            title="Business Cards"
            description="Process business card requests"
            stat={stats?.pendingBusinessCards || null}
            statLabel="pending"
          />
          <ManagementCard
            href={dashPath('/admin/headshots')}
            icon={Camera}
            title="Headshots"
            description="Schedule and track photo sessions"
            stat={stats?.pendingHeadshots || null}
            statLabel="pending"
          />
          <ManagementCard
            href={dashPath('/admin/announcements')}
            icon={Bell}
            title="Announcements"
            description="Send team-wide communications"
          />
          <ManagementCard
            href={dashPath('/admin/handbooks')}
            icon={BookOpen}
            title="Handbooks"
            description="Create and manage team handbooks and policy documents"
          />
        </CategorySection>
      </div>
    </DashboardLayout>
  );
}
