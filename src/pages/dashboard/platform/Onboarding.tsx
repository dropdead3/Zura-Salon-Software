import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { 
  Rocket, 
  Clock, 
  AlertTriangle, 
  Calendar,
  Building2,
  ChevronRight,
  Mail,
  Upload,
  Target,
  Users,
  Loader2
} from 'lucide-react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PlatformCard, PlatformCardHeader, PlatformCardTitle, PlatformCardContent } from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOnboardingOrganizations, type OnboardingOrganization } from '@/hooks/useOnboardingOrganizations';
import { OnboardingCalendar } from '@/components/platform/onboarding/OnboardingCalendar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { PageExplainer } from '@/components/ui/PageExplainer';

const stageConfig: Record<string, { label: string; order: number }> = {
  new: { label: 'New', order: 1 },
  importing: { label: 'Importing', order: 2 },
  training: { label: 'Training', order: 3 },
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  variant?: 'default' | 'warning' | 'success' | 'error';
  href?: string;
}

function StatCard({ title, value, icon: Icon, description, variant = 'default', href }: StatCardProps) {
  const iconStyles = {
    default: 'bg-violet-500/20 text-violet-400',
    warning: 'bg-amber-500/20 text-amber-400',
    success: 'bg-emerald-500/20 text-emerald-400',
    error: 'bg-red-500/20 text-red-400',
  };

  const valueStyles = {
    default: 'text-white',
    warning: 'text-amber-300',
    success: 'text-emerald-300',
    error: 'text-red-300',
  };

  const cardClasses = "group relative rounded-[16px] border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl p-5 transition-all duration-300 hover:bg-slate-800/60 hover:border-slate-600/50";

  const content = (
    <>
      <div className="absolute inset-0 rounded-[16px] bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-400">{title}</span>
          <div className={`p-2.5 rounded-xl ${iconStyles[variant]} transition-colors`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className={`text-4xl font-medium ${valueStyles[variant]} mb-1`}>{value}</div>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link to={href} className={cn(cardClasses, "cursor-pointer block")}>
        {content}
      </Link>
    );
  }

  return <div className={cardClasses}>{content}</div>;
}

function GoLiveBadge({ org }: { org: OnboardingOrganization }) {
  if (!org.go_live_date) {
    return <PlatformBadge variant="outline">No date set</PlatformBadge>;
  }

  const formattedDate = format(parseISO(org.go_live_date), 'MMM d');

  if (org.isOverdue) {
    return (
      <PlatformBadge variant="error" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {formattedDate} (Overdue)
      </PlatformBadge>
    );
  }

  if (org.isApproaching) {
    return (
      <PlatformBadge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" />
        {formattedDate}
      </PlatformBadge>
    );
  }

  return <PlatformBadge variant="default">{formattedDate}</PlatformBadge>;
}

function OrganizationCard({ org }: { org: OnboardingOrganization }) {
  const navigate = useNavigate();

  return (
    <div className="group relative rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 transition-all duration-200 hover:bg-slate-800/50 hover:border-slate-600/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-base font-medium text-white truncate">{org.name}</h4>
            {org.account_number && (
              <span className="text-xs text-slate-500">#{org.account_number}</span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400 mb-3">
            {org.primary_contact_email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {org.primary_contact_email}
              </span>
            )}
            {org.source_software && (
              <span className="flex items-center gap-1">
                <Upload className="h-3.5 w-3.5" />
                {org.source_software}
              </span>
            )}
            {org.locationCount > 0 && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {org.locationCount} location{org.locationCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <GoLiveBadge org={org} />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PlatformButton
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/platform/accounts/${org.id}`)}
          >
            View
            <ChevronRight className="h-4 w-4 ml-1" />
          </PlatformButton>
        </div>
      </div>
    </div>
  );
}

function StageSection({ stage, orgs }: { stage: string; orgs: OnboardingOrganization[] }) {
  const config = stageConfig[stage] || { label: stage, order: 99 };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-medium text-white">{config.label}</h3>
        <PlatformBadge variant="primary">{orgs.length}</PlatformBadge>
      </div>
      <div className="space-y-2">
        {orgs.map(org => (
          <OrganizationCard key={org.id} org={org} />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ org }: { org: OnboardingOrganization }) {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate(`/platform/accounts/${org.id}`)}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-colors text-left group"
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium shrink-0',
        org.isOverdue 
          ? 'bg-red-500/20 text-red-300' 
          : org.isApproaching 
            ? 'bg-amber-500/20 text-amber-300'
            : 'bg-slate-700/50 text-slate-300'
      )}>
        {org.go_live_date ? format(parseISO(org.go_live_date), 'd') : '—'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">
          {org.name}
        </p>
        <p className="text-xs text-slate-500">
          {org.go_live_date ? format(parseISO(org.go_live_date), 'MMMM yyyy') : 'No date set'}
        </p>
      </div>
      {org.account_number && (
        <span className="text-xs text-slate-500 shrink-0">#{org.account_number}</span>
      )}
    </button>
  );
}

export default function PlatformOnboarding() {
  const { data, isLoading, error } = useOnboardingOrganizations();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');

  // Fetch billing data for calendar
  const { data: billingData } = useQuery({
    queryKey: ['onboarding-billing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_billing')
        .select('organization_id, contract_start_date, contract_end_date, trial_ends_at');
      
      if (error) throw error;
      
      const map = new Map<string, { 
        contract_start_date?: string | null;
        contract_end_date?: string | null;
        trial_ends_at?: string | null;
      }>();
      
      data?.forEach(item => {
        map.set(item.organization_id, {
          contract_start_date: item.contract_start_date,
          contract_end_date: item.contract_end_date,
          trial_ends_at: item.trial_ends_at,
        });
      });
      
      return map;
    },
  });

  if (isLoading) {
    return (
      <PlatformPageContainer>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      </PlatformPageContainer>
    );
  }

  if (error) {
    return (
      <PlatformPageContainer>
        <PlatformPageHeader 
          title="Onboarding" 
          description="Track accounts through their go-live journey"
        />
        <PageExplainer pageId="platform-onboarding" />
        <div className="mt-8 text-center text-red-400">
          Failed to load onboarding data
        </div>
      </PlatformPageContainer>
    );
  }

  const { organizations, stats } = data!;

  // Group organizations by stage
  const groupedByStage = Object.entries(stageConfig)
    .map(([stage, config]) => ({
      stage,
      config,
      orgs: organizations.filter(o => o.onboarding_stage === stage),
    }))
    .filter(g => g.orgs.length > 0)
    .sort((a, b) => a.config.order - b.config.order);

  // Get upcoming go-lives (sorted by date, with dates first)
  const upcomingGoLives = [...organizations]
    .filter(o => o.go_live_date)
    .sort((a, b) => {
      const aDate = a.go_live_date ? parseISO(a.go_live_date).getTime() : Infinity;
      const bDate = b.go_live_date ? parseISO(b.go_live_date).getTime() : Infinity;
      return aDate - bDate;
    })
    .slice(0, 8);

  return (
    <PlatformPageContainer>
      <PlatformPageHeader 
        title="Onboarding" 
        description="Track accounts through their go-live journey"
        actions={
          <PlatformButton onClick={() => navigate('/platform/accounts')}>
            <Building2 className="h-4 w-4 mr-2" />
            All Accounts
          </PlatformButton>
        }
      />

      {/* Overdue Alert Banner */}
      {stats.overdue > 0 && (
        <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 flex-1">
            <strong>{stats.overdue}</strong> account{stats.overdue !== 1 ? 's are' : ' is'} past their scheduled go-live date
          </p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <StatCard
          title="Total Onboarding"
          value={stats.totalOnboarding}
          icon={Users}
          description="Active onboarding accounts"
        />
        <StatCard
          title="Approaching"
          value={stats.approaching}
          icon={Clock}
          description="Go-live within 7 days"
          variant={stats.approaching > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          description="Past go-live date"
          variant={stats.overdue > 0 ? 'error' : 'default'}
        />
        <StatCard
          title="Avg. Days to Go-Live"
          value={stats.avgDaysToGoLive !== null ? `${stats.avgDaysToGoLive}d` : '—'}
          icon={Calendar}
          description="For scheduled accounts"
        />
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'list' | 'calendar')} className="mt-8">
        <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1">
          <TabsTrigger 
            value="list"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger 
            value="calendar"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6 space-y-6">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Go-Live Timeline (2/3 width) */}
            <PlatformCard className="lg:col-span-2">
              <PlatformCardHeader>
                <PlatformCardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-violet-400" />
                  Upcoming Go-Lives
                </PlatformCardTitle>
              </PlatformCardHeader>
              <PlatformCardContent>
                {upcomingGoLives.length > 0 ? (
                  <div className="space-y-1">
                    {upcomingGoLives.map(org => (
                      <TimelineItem key={org.id} org={org} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">
                    No scheduled go-live dates
                  </p>
                )}
              </PlatformCardContent>
            </PlatformCard>

            {/* Stage Breakdown (1/3 width) */}
            <PlatformCard>
              <PlatformCardHeader>
                <PlatformCardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-violet-400" />
                  By Stage
                </PlatformCardTitle>
              </PlatformCardHeader>
              <PlatformCardContent>
                <div className="space-y-4">
                  {Object.entries(stageConfig).map(([stage, config]) => {
                    const count = stats.byStage[stage] || 0;
                    const percentage = stats.totalOnboarding > 0 
                      ? (count / stats.totalOnboarding) * 100 
                      : 0;
                    
                    return (
                      <div key={stage}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-300">{config.label}</span>
                          <span className="text-sm text-slate-500">{count}</span>
                        </div>
                        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PlatformCardContent>
            </PlatformCard>
          </div>

          {/* Organization Cards by Stage */}
          <div className="space-y-8">
            {groupedByStage.map(({ stage, orgs }) => (
              <StageSection key={stage} stage={stage} orgs={orgs} />
            ))}

            {organizations.length === 0 && (
              <div className="text-center py-12">
                <Rocket className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No accounts onboarding</h3>
                <p className="text-sm text-slate-500 mb-6">All accounts have completed their go-live journey</p>
                <PlatformButton onClick={() => navigate('/platform/accounts')}>
                  View All Accounts
                </PlatformButton>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            <OnboardingCalendar 
              organizations={organizations}
              billingData={billingData}
            />
          </div>
        </TabsContent>
      </Tabs>
    </PlatformPageContainer>
  );
}
