import { Link } from 'react-router-dom';
import { PLATFORM_NAME } from '@/lib/brand';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';

import {

  LayoutGrid,
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
  MessageSquarePlus,
  UserCheck,
  ClipboardCheck,
  FileText,
  Star,
  ShieldAlert,
  CalendarDays,
  Store,
  Brain,
  Globe,
  Search,
  GitMerge,
} from 'lucide-react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { VisibilityGate } from '@/components/visibility/VisibilityGate';
import { SEOUnifiedTasksCard } from '@/components/dashboard/seo-workshop/SEOUnifiedTasksCard';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

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
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm truncate">{title}</h3>
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

interface CategorySectionProps {
  title: string;
  children: React.ReactNode;
}

function CategorySection({ title, children }: CategorySectionProps) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-sm tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

export default function ManagementHub() {
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();

  // Fetch stats for badges
  const { data: stats } = useQuery({
    queryKey: ['management-hub-stats'],
    queryFn: async () => {
      // Fetch stats individually to avoid type issues
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
        .from('employee_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('stylist_level', 'is', null);
      
      const birthdaysResult = await supabase
        .from('employee_profiles')
        .select('birthday')
        .eq('is_active', true)
        .not('birthday', 'is', null);

      // Calculate upcoming birthdays this week
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">
        <DashboardPageHeader
          title="Management Hub"
          description="Central command for team operations"
        />
        <PageExplainer pageId="management-hub" />

        {/* Team Development */}
        <CategorySection title="Team Development">
          <ManagementCard
            href={dashPath('/admin/onboarding-tracker')}
            icon={ClipboardList}
            title="Onboarding Hub"
            description="New hire progress, invitations, and checklist completion"
            stat={null}
            statLabel="active"
            colorClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
          />
          <ManagementCard
            href={dashPath('/admin/graduation-tracker')}
            icon={GraduationCap}
            title="Graduation Tracker"
            description="Track team level progression and retention"
            stat={stats?.inProgressGraduations || null}
            statLabel="with levels"
            colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400"
          />
          <ManagementCard
            href={dashPath('/admin/client-engine-tracker')}
            icon={Target}
            title="Client Engine Tracker"
            description="Program enrollment and participation rates"
            colorClass="bg-orange-500/10 text-orange-600 dark:text-orange-400"
          />
          <ManagementCard
            href={dashPath('/admin/training-hub')}
            icon={Video}
            title="Training Hub"
            description="Manage training library and track completions"
            colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
          <ManagementCard
            href={dashPath('/admin/challenges')}
            icon={Trophy}
            title="Team Challenges"
            description="Create and manage team competitions"
            colorClass="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
          />
        </CategorySection>

        {/* Scheduling & Requests */}
        <CategorySection title="Scheduling & Requests">
          <ManagementCard
            href={dashPath('/admin/assistant-requests')}
            icon={HandHelping}
            title="Assistant Requests"
            description="Manage help requests from stylists"
            stat={stats?.pendingAssistantRequests || null}
            statLabel="pending"
            colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          />
          <ManagementCard
            href={dashPath('/admin/schedule-requests')}
            icon={CalendarClock}
            title="Schedule Requests"
            description="Time-off and schedule change approvals"
            stat={null}
            statLabel="pending"
            colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          />
          <ManagementCard
            href={dashPath('/admin/shift-swaps')}
            icon={ArrowLeftRight}
            title="Shift Swap Approvals"
            description="Review and approve shift swap requests"
            colorClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          />
        </CategorySection>

        {/* Performance & Compliance */}
        <CategorySection title="Performance & Compliance">
          <ManagementCard
            href={dashPath('/admin/performance-reviews')}
            icon={Star}
            title="Performance Reviews"
            description="Structured reviews with ratings and goals"
            colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <ManagementCard
            href={dashPath('/admin/documents')}
            icon={FileText}
            title="Document Tracker"
            description="Licenses, certifications, and compliance docs"
            colorClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
          />
          <ManagementCard
            href={dashPath('/admin/incidents')}
            icon={ShieldAlert}
            title="Incident Reports"
            description="Workplace safety and incident documentation"
            colorClass="bg-orange-500/10 text-orange-600 dark:text-orange-400"
          />
        </CategorySection>

        {/* PTO & Leave */}
        <CategorySection title="PTO & Leave">
          <ManagementCard
            href={dashPath('/admin/pto')}
            icon={CalendarDays}
            title="PTO Balances"
            description="Manage PTO policies and employee balances"
            colorClass="bg-green-500/10 text-green-600 dark:text-green-400"
          />
          <ManagementCard
            href={dashPath('/admin/schedule-requests')}
            icon={CalendarClock}
            title="Time-Off Requests"
            description="View and approve time-off requests"
            colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          />
        </CategorySection>


        {/* Recruiting & Hiring */}
        <CategorySection title="Recruiting & Hiring">
          <ManagementCard
            href={dashPath('/admin/leads')}
            icon={UserPlus}
            title="Lead Management"
            description="Track and follow up with potential hires"
            colorClass="bg-green-500/10 text-green-600 dark:text-green-400"
          />
          <ManagementCard
            href={dashPath('/admin/recruiting')}
            icon={Briefcase}
            title="Recruiting Pipeline"
            description="Manage hiring funnel and interview stages"
            colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <ManagementCard
            href={dashPath('/admin/payroll?tab=hire')}
            icon={UserCheck}
            title="New Hire Wizard"
            description="Onboard a new team member with account creation and docs"
            colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
          <ManagementCard
            href={dashPath('/admin/booth-renters?tab=onboarding')}
            icon={Store}
            title="Renter Onboard Wizard"
            description="Set up a new booth renter with contract, station, and docs"
            colorClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          />
        </CategorySection>

        {/* Team Operations */}
        <CategorySection title="Team Operations">
          <ManagementCard
            href={dashPath('/admin/birthdays')}
            icon={Cake}
            title="Birthdays & Anniversaries"
            description="Upcoming team celebrations and milestones"
            stat={stats?.birthdaysThisWeek || null}
            statLabel="this week"
            colorClass="bg-pink-500/10 text-pink-600 dark:text-pink-400"
          />
          <ManagementCard
            href={dashPath('/admin/business-cards')}
            icon={CreditCard}
            title="Business Cards"
            description="Process business card requests"
            stat={stats?.pendingBusinessCards || null}
            statLabel="pending"
            colorClass="bg-slate-500/10 text-slate-600 dark:text-slate-400"
          />
          <ManagementCard
            href={dashPath('/admin/headshots')}
            icon={Camera}
            title="Headshots"
            description="Schedule and track photo sessions"
            stat={stats?.pendingHeadshots || null}
            statLabel="pending"
            colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
        </CategorySection>

        {/* Marketing & Visibility */}
        <CategorySection title="Marketing & Visibility">
          <ManagementCard
            href={dashPath('/admin/website-sections')}
            icon={Globe}
            title="Website Editor"
            description="Edit homepage sections, stylists, testimonials, and locations"
            colorClass="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          />
          <ManagementCard
            href={dashPath('/admin/seo-workshop')}
            icon={Search}
            title="SEO Workshop"
            description="Tasks and guides to improve local search visibility"
            colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
        </CategorySection>

        {/* Communications */}
        <CategorySection title="Communications">
          <ManagementCard
            href={dashPath('/admin/announcements')}
            icon={Bell}
            title="Create Announcement"
            description="Send team-wide communications"
            colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <ManagementCard
            href={dashPath('/admin/daily-huddle')}
            icon={MessageSquare}
            title="Daily Huddle"
            description="Create pre-shift notes and daily goals"
            colorClass="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          />
        </CategorySection>

        {/* AI & Automation */}
        <CategorySection title="AI & Automation">
          <ManagementCard
            href={dashPath('/admin/zura-config')}
            icon={Brain}
            title={`${PLATFORM_NAME} Configuration`}
            description="Customize AI personality, knowledge base, and guardrails"
            colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
        </CategorySection>

        {/* Points & Rewards */}
        <CategorySection title="Points & Rewards">
          <ManagementCard
            href={dashPath('/admin/points-config')}
            icon={Coins}
            title="Points & Rewards"
            description="Configure point rules and manage reward catalog"
            colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
        </CategorySection>

        {/* Client Experience */}
        <CategorySection title="Client Experience">
          <ManagementCard
            href={dashPath('/admin/client-health')}
            icon={Brain}
            title="Client Health Hub"
            description="At-risk clients, rebooking, win-back outreach, and more"
            colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          />
          <ManagementCard
            href={dashPath('/admin/feedback')}
            icon={MessageSquarePlus}
            title="Feedback Hub"
            description="Client surveys, reviews, and NPS tracking"
            colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <ManagementCard
            href={dashPath('/admin/reengagement')}
            icon={UserCheck}
            title="Re-engagement"
            description="Win-back campaigns for inactive clients"
            colorClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"
          />
          <ManagementCard
            href={dashPath('/admin/merge-clients')}
            icon={GitMerge}
            title="Merge Clients"
            description="Deduplicate and consolidate client profiles safely"
            colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          />
        </CategorySection>
        {/* M2: SEO Tasks integration */}
        <VisibilityGate
          elementKey="seo_unified_tasks_management"
          elementName="SEO Tasks"
          elementCategory="Management Hub"
        >
          <SEOUnifiedTasksCard organizationId={effectiveOrganization?.id} />
        </VisibilityGate>
      </div>
    </DashboardLayout>
  );
}
