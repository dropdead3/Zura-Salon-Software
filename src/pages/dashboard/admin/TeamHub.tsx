import { Link } from 'react-router-dom';
import { PLATFORM_NAME } from '@/lib/brand';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { ManagementInviteDialog } from '@/components/management/ManagementInviteDialog';
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
} from 'lucide-react';

interface ManagementCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  stat?: string | number | null;
  statLabel?: string;
  colorClass?: string;
}

function ManagementCard({ href, icon: Icon, title, description, stat, statLabel, colorClass = 'bg-primary/10 text-primary' }: ManagementCardProps) {
  return (
    <Link to={href}>
      <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full border-border/50">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={cn("p-2.5 rounded-xl shrink-0", colorClass)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">{title}</h3>
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

interface HubGatewayCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  colorClass?: string;
}

function HubGatewayCard({ href, icon: Icon, title, description, colorClass = 'bg-primary/10 text-primary' }: HubGatewayCardProps) {
  return (
    <Link to={href}>
      <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full border-border/50 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-xl shrink-0", colorClass)}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-sm tracking-wide uppercase">{title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
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
        "grid gap-3",
        columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
      )}>
        {children}
      </div>
    </div>
  );
}

export default function TeamHub() {
  const { canInvite } = useInvitableRoles();
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
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">
        <DashboardPageHeader
          title="Operations Hub"
          description="People management, development, and team operations"
        />

        {/* Hub Gateway */}
        <CategorySection title="Hubs">
          <HubGatewayCard
            href="/dashboard/admin/client-hub"
            icon={HeartPulse}
            title="Client Hub"
            description="Client management, retention, and engagement"
            colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
          <HubGatewayCard
            href="/dashboard/admin/growth-hub"
            icon={Rocket}
            title="Growth Hub"
            description="Marketing, campaigns, and growth initiatives"
            colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <HubGatewayCard
            href="/dashboard/admin/payroll"
            icon={DollarSign}
            title="Hiring & Payroll Hub"
            description="Compensation, commissions, and hiring pipeline"
            colorClass="bg-green-500/10 text-green-600 dark:text-green-400"
          />
          <HubGatewayCard
            href="/dashboard/admin/booth-renters"
            icon={Store}
            title="Renter Hub"
            description="Booth renter contracts, billing, and compliance"
            colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <HubGatewayCard
            href="/dashboard/admin/chair-assignments"
            icon={Armchair}
            title="Chair Assignments"
            description="Station assignments and floor layout management"
            colorClass="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          />
          <HubGatewayCard
            href="/dashboard/admin/onboarding-tracker"
            icon={ClipboardList}
            title="Onboarding Hub"
            description="Track new hire progress and checklist completion"
            colorClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
          />
        </CategorySection>

        {/* People & Development */}
        <CategorySection title="People & Development">
          <ManagementCard
            href="/dashboard/directory"
            icon={Users}
            title="Team Directory"
            description="View and manage your team roster"
            colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          />
          <ManagementCard
            href="/dashboard/admin/graduation-tracker"
            icon={GraduationCap}
            title="Graduation Tracker"
            description="Monitor assistant advancement and milestones"
            stat={stats?.inProgressGraduations || null}
            statLabel="in progress"
            colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400"
          />
          <ManagementCard
            href="/dashboard/admin/training-hub"
            icon={Video}
            title="Training Hub"
            description="Manage training library and track completions"
            colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
          <ManagementCard
            href="/dashboard/admin/client-engine-tracker"
            icon={Target}
            title="Client Engine Tracker"
            description="Program enrollment and participation rates"
            colorClass="bg-orange-500/10 text-orange-600 dark:text-orange-400"
          />
          <ManagementCard
            href="/dashboard/admin/challenges"
            icon={Trophy}
            title="Team Challenges"
            description="Create and manage team competitions"
            colorClass="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
          />
          <ManagementCard
            href="/dashboard/admin/team"
            icon={Target}
            title="Program Team Overview"
            description="Track stylist program progress across the team"
            colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          />
          {canInvite && <ManagementInviteDialog variant="card" />}
          {canInvite && (
            <ManagementCard
              href="/dashboard/admin/account-management"
              icon={ClipboardCheck}
              title="Manage Invitations"
              description="View and manage all pending invitations"
              stat={pendingInvitationCount > 0 ? pendingInvitationCount : null}
              statLabel="pending"
              colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            />
          )}
        </CategorySection>

        {/* Scheduling & Requests */}
        <CategorySection title="Scheduling & Requests">
          <ManagementCard
            href="/dashboard/schedule-meeting"
            icon={CalendarClock}
            title="Meetings & Accountability"
            description="Schedule 1:1s and track commitments"
            colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
          <ManagementCard
            href="/dashboard/admin/assistant-requests"
            icon={HandHelping}
            title="Assistant Requests"
            description="Manage help requests from stylists"
            stat={stats?.pendingAssistantRequests || null}
            statLabel="pending"
            colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          />
          <ManagementCard
            href="/dashboard/admin/schedule-requests"
            icon={CalendarClock}
            title="Schedule Requests"
            description="Time-off and schedule change approvals"
            colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          />
          <ManagementCard
            href="/dashboard/admin/shift-swaps"
            icon={ArrowLeftRight}
            title="Shift Swap Approvals"
            description="Review and approve shift swap requests"
            colorClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          />
          <ManagementCard
            href="/dashboard/assistant-schedule"
            icon={CalendarDays}
            title="Assistant Scheduling"
            description="Manage assistant assignments and coverage"
            colorClass="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          />
          <ManagementCard
            href="/dashboard/admin/daily-huddle"
            icon={MessageSquare}
            title="Daily Huddle"
            description="Create pre-shift notes and daily goals"
            colorClass="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          />
        </CategorySection>

        {/* Performance & Compliance */}
        <CategorySection title="Performance & Compliance">
          <ManagementCard
            href="/dashboard/admin/performance-reviews"
            icon={Star}
            title="Performance Reviews"
            description="Structured reviews with ratings and goals"
            colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <ManagementCard
            href="/dashboard/admin/strikes"
            icon={AlertTriangle}
            title="Staff Strikes"
            description="Track disciplinary actions and warnings"
            colorClass="bg-red-500/10 text-red-600 dark:text-red-400"
          />
          <ManagementCard
            href="/dashboard/admin/documents"
            icon={FileText}
            title="Document Tracker"
            description="Licenses, certifications, and compliance docs"
            colorClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
          />
          <ManagementCard
            href="/dashboard/admin/incidents"
            icon={ShieldAlert}
            title="Incident Reports"
            description="Workplace safety and incident documentation"
            colorClass="bg-orange-500/10 text-orange-600 dark:text-orange-400"
          />
          <ManagementCard
            href="/dashboard/admin/pto"
            icon={CalendarDays}
            title="PTO Balances"
            description="Manage PTO policies and employee balances"
            colorClass="bg-green-500/10 text-green-600 dark:text-green-400"
          />
        </CategorySection>

        {/* Team Operations & Communications */}
        <CategorySection title="Team Operations & Communications">
          <ManagementCard
            href="/dashboard/admin/birthdays"
            icon={Cake}
            title="Birthdays & Anniversaries"
            description="Upcoming team celebrations and milestones"
            stat={stats?.birthdaysThisWeek || null}
            statLabel="this week"
            colorClass="bg-pink-500/10 text-pink-600 dark:text-pink-400"
          />
          <ManagementCard
            href="/dashboard/admin/business-cards"
            icon={CreditCard}
            title="Business Cards"
            description="Process business card requests"
            stat={stats?.pendingBusinessCards || null}
            statLabel="pending"
            colorClass="bg-slate-500/10 text-slate-600 dark:text-slate-400"
          />
          <ManagementCard
            href="/dashboard/admin/headshots"
            icon={Camera}
            title="Headshots"
            description="Schedule and track photo sessions"
            stat={stats?.pendingHeadshots || null}
            statLabel="pending"
            colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
          <ManagementCard
            href="/dashboard/admin/announcements"
            icon={Bell}
            title="Announcements"
            description="Send team-wide communications"
            colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <ManagementCard
            href="/dashboard/admin/changelog"
            icon={Sparkles}
            title="Changelog Manager"
            description="Document platform updates and releases"
            colorClass="bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400"
          />
          <ManagementCard
            href="/dashboard/admin/points-config"
            icon={Coins}
            title="Points & Rewards Config"
            description="Configure point rules and manage reward catalog"
            colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
        </CategorySection>

        {/* AI & Automation */}
        <CategorySection title="AI & Automation">
          <ManagementCard
            href="/dashboard/admin/zura-config"
            icon={Brain}
            title={`${PLATFORM_NAME} Configuration`}
            description="Customize AI personality, knowledge base, and guardrails"
            colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
        </CategorySection>
      </div>
    </DashboardLayout>
  );
}
