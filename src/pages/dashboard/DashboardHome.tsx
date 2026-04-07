import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PhorestSyncPopout } from '@/components/dashboard/PhorestSyncPopout';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton } from '@/components/ui/chart-skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Calendar, 
  TrendingUp, 
  Bell, 
  CheckSquare, 
  Target,
  ChevronRight,
  Users,
  DollarSign,
  
  Flame,
  Hourglass,
  HandHelping,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDailyCompletion } from '@/hooks/useDailyCompletion';
import { useTasks } from '@/hooks/useTasks';
import { useCurrentUserApprovalStatus } from '@/hooks/useAccountApproval';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { VisibilityGate } from '@/components/visibility';
import { supabase } from '@/integrations/supabase/client';
import { TaskItem } from '@/components/dashboard/TaskItem';
import { AddTaskDialog } from '@/components/dashboard/AddTaskDialog';
import { EditTaskDialog } from '@/components/dashboard/EditTaskDialog';
import { TaskDetailDrilldown } from '@/components/dashboard/TaskDetailDrilldown';
import { TasksCard } from '@/components/dashboard/TasksCard';
import { TodaysBirthdayBanner } from '@/components/dashboard/TodaysBirthdayBanner';
import { TrialCountdownBanner } from '@/components/dashboard/TrialCountdownBanner';
const WidgetsSection = React.lazy(() => import('@/components/dashboard/WidgetsSection').then(m => ({ default: m.WidgetsSection })));
import { useBirthdayNotifications } from '@/hooks/useBirthdayNotifications';
import { useViewAs } from '@/contexts/ViewAsContext';
import { AnnouncementsBento } from '@/components/dashboard/AnnouncementsBento';
import { AnnouncementsDrawer } from '@/components/dashboard/AnnouncementsDrawer';
import { LiveSessionIndicator } from '@/components/dashboard/LiveSessionIndicator';
const DashboardSetupWizard = React.lazy(() => import('@/components/dashboard/DashboardSetupWizard').then(m => ({ default: m.DashboardSetupWizard })));
import { DashboardCustomizeMenu, getCardSize } from '@/components/dashboard/DashboardCustomizeMenu';
import { useDashboardLayout, isPinnedCardEntry, getPinnedCardId, getPinnedVisibilityKey, PINNABLE_CARD_IDS, getPinnedCardIdsFromLayout, isPinnedInLayout } from '@/hooks/useDashboardLayout';
const TodaysQueueSection = React.lazy(() => import('@/components/dashboard/TodaysQueueSection').then(m => ({ default: m.TodaysQueueSection })));
import { OperationsQuickStats } from '@/components/dashboard/operations/OperationsQuickStats';
const PinnedAnalyticsCard = React.lazy(() => import('@/components/dashboard/PinnedAnalyticsCard').then(m => ({ default: m.PinnedAnalyticsCard })));
import { getDateRange, type AnalyticsFilters, type DateRangeType } from '@/components/dashboard/PinnedAnalyticsCard';
import { AnalyticsFilterBar } from '@/components/dashboard/AnalyticsFilterBar';
import { CommandCenterControlRow } from '@/components/dashboard/CommandCenterControlRow';
import { useDashboardVisibility } from '@/hooks/useDashboardVisibility';
import { useUserLocationAccess } from '@/hooks/useUserLocationAccess';
import { useQuickStats } from '@/hooks/useQuickStats';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useTranslation } from 'react-i18next';
import { HubQuickLinks } from '@/components/dashboard/HubQuickLinks';
const AIInsightsDrawer = React.lazy(() => import('@/components/dashboard/AIInsightsDrawer').then(m => ({ default: m.AIInsightsDrawer })));
const PersonalInsightsDrawer = React.lazy(() => import('@/components/dashboard/PersonalInsightsDrawer').then(m => ({ default: m.PersonalInsightsDrawer })));
const TodaysPrepSection = React.lazy(() => import('@/components/dashboard/TodaysPrepSection').then(m => ({ default: m.TodaysPrepSection })));
const StylistPushList = React.lazy(() => import('@/components/dashboard/StylistPushList').then(m => ({ default: m.StylistPushList })));
const LevelProgressNudge = React.lazy(() => import('@/components/dashboard/LevelProgressNudge').then(m => ({ default: m.LevelProgressNudge })));
const GraduationKpiTile = React.lazy(() => import('@/components/dashboard/GraduationKpiTile').then(m => ({ default: m.GraduationKpiTile })));
const PaydayCountdownBanner = React.lazy(() => import('@/components/dashboard/mypay/PaydayCountdownBanner').then(m => ({ default: m.PaydayCountdownBanner })));
const InsightsNudgeBanner = React.lazy(() => import('@/components/dashboard/InsightsNudgeBanner').then(m => ({ default: m.InsightsNudgeBanner })));
const ActiveCampaignsCard = React.lazy(() => import('@/components/dashboard/ActiveCampaignsCard').then(m => ({ default: m.ActiveCampaignsCard })));
const InventoryManagerDashboardCard = React.lazy(() => import('@/components/dashboard/InventoryManagerDashboardCard').then(m => ({ default: m.InventoryManagerDashboardCard })));
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

const ROLE_MESSAGES = {
  leadership: {
    greetings: ["Welcome back,", "Ready to lead,", "Let's build momentum,", "Great things ahead,", "Another strong day,", "Let's make it count,"],
    subtitles: ["Here's what's happening across your operations", "Your team is set up for a strong day", "The numbers are telling a story", "Let's see where things stand", "Everything's moving in the right direction", "Here's your snapshot for today"],
  },
  stylist: {
    greetings: ["Welcome back,", "Good to see you,", "You're on a roll,", "Another great day ahead,", "Let's make it a great one,", "Time to create,"],
    subtitles: ["Here's what's on your schedule", "Your clients are going to love today", "Let's keep the momentum going", "You're set up for a strong day", "Here's your lineup for today", "Let's make every appointment count"],
  },
  frontDesk: {
    greetings: ["Welcome back,", "Good to see you,", "The front desk is yours,", "Another great day ahead,", "Let's keep things running smooth,", "Ready to roll,"],
    subtitles: ["Here's what's coming in today", "The schedule is looking good", "Let's keep the flow going", "You're set up for a smooth day", "Here's your snapshot for today", "Everything's on track"],
  },
  default: {
    greetings: ["Welcome back,", "Good to see you,", "Another great day ahead,", "Let's make it count,", "You're on a roll,", "Great things ahead,"],
    subtitles: ["Here's what's happening today", "Let's keep the momentum going", "You're set up for a strong day", "Everything's moving in the right direction", "Here's your snapshot for today", "Let's see where things stand"],
  },
} as const;

function getMessagePool(isLeadership: boolean, hasStylistRole: boolean, isFrontDesk: boolean) {
  if (isLeadership) return ROLE_MESSAGES.leadership;
  if (hasStylistRole) return ROLE_MESSAGES.stylist;
  if (isFrontDesk) return ROLE_MESSAGES.frontDesk;
  return ROLE_MESSAGES.default;
}

type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: Priority;
  is_pinned: boolean;
  created_at: string;
  link_url: string | null;
  link_label: string | null;
  location_id: string | null;
}

const priorityColors: Record<Priority, string> = {
  low: 'border-muted-foreground',
  normal: 'border-blue-500',
  high: 'border-orange-500',
  urgent: 'border-red-500',
};

const normalizeUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

export default function DashboardHome() {
  const { dashPath } = useOrgDashboardPath();
  const { user } = useAuth();
  const roles = useEffectiveRoles();
  const { enrollment } = useDailyCompletion(user?.id);
  const { tasks, createTask, toggleTask, deleteTask, updateTask, snoozeTask, isImpersonating } = useTasks();
  const [editingTask, setEditingTask] = useState<import('@/hooks/useTasks').Task | null>(null);
  const [viewingTask, setViewingTask] = useState<import('@/hooks/useTasks').Task | null>(null);
  const { data: approvalStatus } = useCurrentUserApprovalStatus();
  const { data: profile } = useEmployeeProfile();
  const queryClient = useQueryClient();
  const { layout, hasCompletedSetup, isLoading: layoutLoading, templateKey } = useDashboardLayout();
  
  // Location access control
  const { 
    accessibleLocations, 
    canViewAggregate, 
    defaultLocationId,
    assignedLocationIds,
    canViewAllLocations,
    isLoading: locationAccessLoading 
  } = useUserLocationAccess();

  const quickStatsLocationId = canViewAggregate ? undefined : defaultLocationId;
  const accessibleLocationIds = accessibleLocations.map((l) => l.id);
  const { todayClients, thisWeekRevenue, newClients, rebookingRate, isLoading: quickStatsLoading } = useQuickStats(quickStatsLocationId, accessibleLocationIds);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { t } = useTranslation('dashboard');
  
  // Analytics filter state (shared across all pinned analytics cards)
  const [locationId, setLocationId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRangeType>('today');
  const [compactView, setCompactView] = useState<boolean>(() => {
    try { return localStorage.getItem('cc-view-mode') === 'compact'; } catch { return false; }
  });
  
  const handleCompactChange = (v: boolean) => {
    setCompactView(v);
    try { localStorage.setItem('cc-view-mode', v ? 'compact' : 'detailed'); } catch {}
  };
  
  // Set default location when access data loads
  useEffect(() => {
    if (!locationAccessLoading && !locationId) {
      setLocationId(defaultLocationId);
    }
  }, [locationAccessLoading, defaultLocationId, locationId]);
  
  // Birthday notifications for leadership
  useBirthdayNotifications();
  
  // Check if viewing as another role
  const { isViewingAs } = useViewAs();
  const { isImpersonating: isGodMode } = useOrganizationContext();
  
  // Leadership team: super admin, admin, and manager
  // God Mode (platform impersonation) = full leadership access
  // When viewing as another role, only use effective roles (ignore profile.is_super_admin)
  const isLeadership = isGodMode
    ? true
    : isViewingAs 
      ? roles.includes('super_admin') || roles.includes('admin') || roles.includes('manager')
      : profile?.is_super_admin || roles.includes('super_admin') || roles.includes('admin') || roles.includes('manager');
  
  // Check if user has stylist, stylist_assistant, or booth_renter roles (for Quick Actions visibility)
  const hasStylistRole = roles.includes('stylist') || roles.includes('stylist_assistant') || roles.includes('booth_renter');
  
  // Check if user has receptionist/operations role
  const isReceptionist = roles.includes('receptionist') || roles.includes('admin');
  
  // Front Desk only (for Today's Queue)
  const isFrontDesk = roles.includes('receptionist');
  
  // Quick Actions should show for stylists/assistants/booth renters, front desk, or non-leadership roles
  const showQuickActions = hasStylistRole || isFrontDesk || (!isLeadership);
  
  // Compute analytics filters
  const dateFilters = useMemo(() => getDateRange(dateRange), [dateRange]);
  const analyticsFilters: AnalyticsFilters = useMemo(() => ({
    locationId,
    dateRange,
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
  }), [locationId, dateRange, dateFilters]);
  
  const { data: announcements } = useQuery({
    queryKey: ['announcements', assignedLocationIds, canViewAllLocations],
    queryFn: async () => {
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true);

      // Filter by location if user doesn't have full access
      if (!canViewAllLocations && assignedLocationIds.length > 0) {
        query = query.or(`location_id.is.null,location_id.in.(${assignedLocationIds.join(',')})`);
      }

      const { data, error } = await query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data as Announcement[];
    },
  });

  // Mark-as-read logic moved into AnnouncementsDrawer
  
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
  const pool = useMemo(() => getMessagePool(!!isLeadership, hasStylistRole, isFrontDesk), [isLeadership, hasStylistRole, isFrontDesk]);
  const [greeting] = useState(() => pool.greetings[Math.floor(Math.random() * pool.greetings.length)]);
  const [subtitle] = useState(() => pool.subtitles[Math.floor(Math.random() * pool.subtitles.length)]);

  // Show setup wizard for first-time users
  if (!hasCompletedSetup && !layoutLoading) {
    return (
      <DashboardLayout>
        <DashboardSetupWizard 
          roleTemplateKey={templateKey}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div 
        className="pt-2 px-6 pb-6 lg:pt-3 lg:px-8 lg:pb-8 space-y-6 overflow-x-hidden"
        initial="hidden"
        animate="visible"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
      >
        {/* Pending Approval Banner */}
        {approvalStatus?.is_approved === false && (
          <Alert className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-700">
            <Hourglass className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200 font-display">
              {t('home.pending_approval_title')}
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              {t('home.pending_approval_desc')}
            </AlertDescription>
          </Alert>
        )}

        {/* Trial Countdown Banner - visible when organization is in trial */}
        <TrialCountdownBanner />

        {/* Today's Birthday Banner - visible to all */}
        <TodaysBirthdayBanner />

        {/* Insights Nudge Banner */}
        <InsightsNudgeBanner userId={user?.id} isLeadership={isLeadership} />

        {/* Header with Customize Button */}

        {/* Dynamic sections based on layout order - wait for layout to prevent flash of hidden content */}
        {layoutLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-24 w-full rounded-xl" />
            <ChartSkeleton lines={4} className="h-32" />
            <ChartSkeleton lines={6} className="h-48" />
          </div>
        ) : (
        <DashboardSections 
          layout={layout}
          isLeadership={isLeadership}
          hasStylistRole={hasStylistRole}
          isFrontDesk={isFrontDesk}
          isReceptionist={isReceptionist}
          showQuickActions={showQuickActions}
          roles={roles}
          enrollment={enrollment}
          announcements={announcements}
          tasks={tasks}
          createTask={createTask}
          toggleTask={toggleTask}
          deleteTask={deleteTask}
          updateTask={updateTask}
          snoozeTask={snoozeTask}
          isImpersonating={isImpersonating}
          editingTask={editingTask}
          onEditTask={setEditingTask}
          viewingTask={viewingTask}
          onViewTask={setViewingTask}
          analyticsFilters={analyticsFilters}
          onLocationChange={setLocationId}
          onDateRangeChange={setDateRange}
          accessibleLocations={accessibleLocations}
          canViewAggregate={canViewAggregate}
          compact={compactView}
          onCompactChange={handleCompactChange}
        />
        )}
      </motion.div>
      
      {/* Announcements drawer now rendered inline in ai_insights section */}
    </DashboardLayout>
  );
}

// Extract section components into a separate component for cleaner code
interface DashboardSectionsProps {
  layout: ReturnType<typeof useDashboardLayout>['layout'];
  isLeadership: boolean;
  hasStylistRole: boolean;
  isFrontDesk: boolean;
  isReceptionist: boolean;
  showQuickActions: boolean;
  roles: string[];
  enrollment: ReturnType<typeof useDailyCompletion>['enrollment'];
  announcements: any[] | undefined;
  tasks: any[];
  createTask: any;
  toggleTask: any;
  deleteTask: any;
  updateTask: any;
  snoozeTask: any;
  isImpersonating: boolean;
  editingTask: import('@/hooks/useTasks').Task | null;
  onEditTask: (task: import('@/hooks/useTasks').Task | null) => void;
  viewingTask: import('@/hooks/useTasks').Task | null;
  onViewTask: (task: import('@/hooks/useTasks').Task | null) => void;
  analyticsFilters: AnalyticsFilters;
  onLocationChange: (value: string) => void;
  onDateRangeChange: (value: DateRangeType) => void;
  /** Locations the user can access (for filter bar) */
  accessibleLocations: { id: string; name: string }[];
  /** Whether user can see "All Locations" aggregate option */
  canViewAggregate: boolean;
  /** Whether compact view is active */
  compact: boolean;
  onCompactChange: (compact: boolean) => void;
}

function DashboardSections({
  layout,
  isLeadership,
  hasStylistRole,
  isFrontDesk,
  isReceptionist,
  showQuickActions,
  roles,
  enrollment,
  announcements,
  tasks,
  createTask,
  toggleTask,
  deleteTask,
  updateTask,
  snoozeTask,
  isImpersonating,
  editingTask,
  onEditTask,
  viewingTask,
  onViewTask,
  analyticsFilters,
  onLocationChange,
  onDateRangeChange,
  accessibleLocations,
  canViewAggregate,
  compact,
  onCompactChange,
}: DashboardSectionsProps) {
  const { dashPath } = useOrgDashboardPath();
  const { t } = useTranslation('dashboard');
  const { formatCurrencyWhole } = useFormatCurrency();
  const { todayClients, thisWeekRevenue, newClients, rebookingRate, isLoading: quickStatsLoading } = useQuickStats();
  // Fetch visibility data to check if cards are pinned
  const { data: visibilityData } = useDashboardVisibility();
  const leadershipRoles = ['super_admin', 'admin', 'manager'];
  const effectivePinnedCardIds = useMemo(() => getPinnedCardIdsFromLayout(layout), [layout]);
  
  const isCardPinned = (cardId: string): boolean => {
    if (isPinnedInLayout(layout, cardId)) return true;
    if (!visibilityData) return false;
    const visibilityKey = getPinnedVisibilityKey(cardId);
    return leadershipRoles.some(role => 
      visibilityData.find(v => v.element_key === visibilityKey && v.role === role)?.is_visible ?? false
    );
  };
  
  // Find cards that are pinned in DB but missing from sectionOrder
  const missingPinnedCards = useMemo(() => {
    const orderedIds = layout.sectionOrder || [];
    const existingPinnedIds = orderedIds.filter(isPinnedCardEntry).map(getPinnedCardId);
    return PINNABLE_CARD_IDS.filter(id => isCardPinned(id) && !existingPinnedIds.includes(id));
  }, [layout.sectionOrder, visibilityData, effectivePinnedCardIds]);

  // Check if there are any pinned analytics in the layout or missing from layout
  const hasPinnedAnalytics = useMemo(() => {
    const orderedIds = layout.sectionOrder?.length > 0 ? layout.sectionOrder : [];
    const hasInOrder = orderedIds.some(id => isPinnedCardEntry(id) && isCardPinned(getPinnedCardId(id)));
    return hasInOrder || missingPinnedCards.length > 0;
  }, [layout.sectionOrder, visibilityData, missingPinnedCards]);

  // Build section components map (excludes pinned cards - those are rendered separately)
  const sectionComponents = useMemo(() => ({
    // Moved to header (right side, under Customize)
    ai_insights: null,
    
    hub_quicklinks: isLeadership && (
      <HubQuickLinks 
        hubOrder={layout.hubOrder}
        enabledHubs={layout.enabledHubs}
      />
    ),

    

    payday_countdown: <PaydayCountdownBanner />,
    
    quick_actions: showQuickActions && (
      <VisibilityGate elementKey="quick_actions">
        <div>
          <h2 className="font-display text-xs tracking-[0.15em] mb-4">{t('home.quick_actions')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <VisibilityGate elementKey="ring_the_bell_action">
              <Button variant="ghost" className="h-auto py-4 flex-col gap-2 rounded-xl bg-muted/50 hover:bg-muted border border-border/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" asChild>
                <Link to={dashPath('/ring-the-bell')}>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs">{t('home.ring_the_bell')}</span>
                </Link>
              </Button>
            </VisibilityGate>
            <VisibilityGate elementKey="log_metrics_action">
              <Button variant="ghost" className="h-auto py-4 flex-col gap-2 rounded-xl bg-muted/50 hover:bg-muted border border-border/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" asChild>
                <Link to={dashPath('/stats')}>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs">{t('home.log_metrics')}</span>
                </Link>
              </Button>
            </VisibilityGate>
            <Button variant="ghost" className="h-auto py-4 flex-col gap-2 rounded-xl bg-muted/50 hover:bg-muted border border-border/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" asChild>
              <Link to={dashPath('/my-clients')}>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs">{t('home.my_clients')}</span>
              </Link>
            </Button>
            {roles.includes('stylist') && (
              <Button variant="ghost" className="h-auto py-4 flex-col gap-2 rounded-xl bg-muted/50 hover:bg-muted border border-border/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" asChild>
                <Link to={dashPath('/assistant-schedule')}>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <HandHelping className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs">{t('home.request_assistant')}</span>
                </Link>
              </Button>
            )}
            <VisibilityGate elementKey="training_action">
              <Button variant="ghost" className="h-auto py-4 flex-col gap-2 rounded-xl bg-muted/50 hover:bg-muted border border-border/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" asChild>
                <Link to={dashPath('/training')}>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs">{t('home.training')}</span>
                </Link>
              </Button>
            </VisibilityGate>
          </div>
        </div>
      </VisibilityGate>
    ),
    
    // operations_stats is now a pinnable analytics card, not a default section
    
    todays_queue: isFrontDesk && (
      <VisibilityGate 
        elementKey="todays_queue"
        elementName="Today's Queue"
        elementCategory="operations"
      >
        <TodaysQueueSection />
      </VisibilityGate>
    ),
    
    quick_stats: hasStylistRole && (
      <VisibilityGate elementKey="quick_stats">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden p-4 rounded-xl backdrop-blur-sm transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted shadow-inner flex items-center justify-center rounded-xl">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display tabular-nums">
                  {quickStatsLoading ? '—' : todayClients}
                </p>
                <p className="text-xs text-muted-foreground font-sans">{t('home.today_clients')}</p>
              </div>
            </div>
          </Card>
          <Card className="relative overflow-hidden p-4 rounded-xl backdrop-blur-sm transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted shadow-inner flex items-center justify-center rounded-xl">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display tabular-nums">
                  {quickStatsLoading ? '—' : <BlurredAmount>{formatCurrencyWhole(thisWeekRevenue)}</BlurredAmount>}
                </p>
                <p className="text-xs text-muted-foreground font-sans">{t('home.this_week')}</p>
              </div>
            </div>
          </Card>
          <Card className="relative overflow-hidden p-4 rounded-xl backdrop-blur-sm transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted shadow-inner flex items-center justify-center rounded-xl">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display tabular-nums">
                  {quickStatsLoading ? '—' : newClients}
                </p>
                <p className="text-xs text-muted-foreground font-sans">{t('home.new_clients')}</p>
              </div>
            </div>
          </Card>
          <Card className="relative overflow-hidden p-4 rounded-xl backdrop-blur-sm transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted shadow-inner flex items-center justify-center rounded-xl">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display tabular-nums">
                  {quickStatsLoading ? '—' : `${rebookingRate.toFixed(0)}%`}
                </p>
                <p className="text-xs text-muted-foreground font-sans">{t('home.rebooking_rate')}</p>
              </div>
            </div>
          </Card>
        </div>
      </VisibilityGate>
    ),
    
    todays_prep: hasStylistRole && (
      <TodaysPrepSection />
    ),
    
    push_list: hasStylistRole && (
      <VisibilityGate elementKey="push_list" elementName="Push List" elementCategory="retail">
        <StylistPushList />
      </VisibilityGate>
    ),

    level_progress: hasStylistRole && (
      <VisibilityGate elementKey="level_progress" elementName="Level Progress" elementCategory="growth">
        <LevelProgressNudge />
      </VisibilityGate>
    ),

    graduation_kpi: isLeadership && (
      <VisibilityGate elementKey="graduation_kpi" elementName="Team Level Progress" elementCategory="growth">
        <GraduationKpiTile />
      </VisibilityGate>
    ),
    
    schedule_tasks: (
      <VisibilityGate elementKey="my_tasks">
        <TasksCard
          tasks={tasks}
          createTask={createTask}
          toggleTask={toggleTask}
          deleteTask={deleteTask}
          updateTask={updateTask}
          snoozeTask={snoozeTask}
          isImpersonating={isImpersonating}
          editingTask={editingTask}
          onEditTask={onEditTask}
          viewingTask={viewingTask}
          onViewTask={onViewTask}
        />
      </VisibilityGate>
    ),
    
    // announcements moved to floating AnnouncementsDrawer
    
    client_engine: hasStylistRole && (
      <VisibilityGate elementKey="client_engine">
        <div className="relative group">
          <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[hsl(45,60%,70%)] via-[hsl(40,50%,85%)] to-[hsl(45,60%,70%)] opacity-60 blur-[0.5px]" />
          <div className="absolute -inset-[1px] rounded-xl overflow-hidden">
            <div className="gold-shimmer" />
          </div>
          
          <Card className="relative p-6 rounded-xl bg-gradient-to-br from-[hsl(40,30%,95%)] via-[hsl(45,25%,92%)] to-[hsl(40,20%,85%)] border border-[hsl(45,50%,75%)]/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-[hsl(40,40%,30%)] to-[hsl(35,35%,20%)] text-[hsl(45,50%,85%)] flex items-center justify-center rounded-lg shadow-md">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="font-display text-lg tracking-wide text-[hsl(35,30%,20%)]">{t('home.client_engine')}</h2>
                      {enrollment && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Flame className="w-4 h-4 text-primary" />
                          <span className="font-display text-[hsl(35,30%,20%)]">{enrollment.streak_count} {t('home.day_streak')}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-[hsl(35,20%,40%)] font-sans">
                      75 days of execution. No excuses.
                    </p>
                  </div>
                </div>
                
                {enrollment ? (
                  <div className="mt-3">
                    <p className="text-sm font-sans text-[hsl(35,20%,40%)]">
                      You're on <span className="text-[hsl(35,30%,20%)] font-medium">Day {enrollment.current_day}</span> of 75
                    </p>
                    <div className="w-full max-w-xs h-2 bg-[hsl(40,20%,80%)] mt-2 overflow-hidden rounded-full">
                      <div 
                        className="h-full bg-gradient-to-r from-[hsl(40,50%,45%)] to-[hsl(45,60%,55%)] transition-all rounded-full" 
                        style={{ width: `${(enrollment.current_day / 75) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-sans text-[hsl(35,20%,40%)] mt-1">
                    Ready to transform your book? Start the challenge today.
                  </p>
                )}
              </div>
              
              <Button 
                asChild
                className="bg-gradient-to-r from-[hsl(40,40%,25%)] to-[hsl(35,35%,15%)] hover:from-[hsl(40,45%,30%)] hover:to-[hsl(35,40%,20%)] text-[hsl(45,50%,90%)] border border-[hsl(45,50%,60%)]/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] px-8 shrink-0"
              >
                <Link to={dashPath('/program')}>
                  {enrollment ? t('home.continue_today') : t('home.start_program')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </VisibilityGate>
    ),
    
    inventory_manager: <InventoryManagerDashboardCard />,
    
    active_campaigns: isLeadership && <ActiveCampaignsCard />,
    
    widgets: <WidgetsSection />,
  }), [
    showQuickActions,
    isLeadership,
    hasStylistRole,
    isFrontDesk,
    isReceptionist,
    roles,
    enrollment,
    announcements,
    tasks,
    createTask,
    toggleTask,
    deleteTask,
    isImpersonating,
  ]);

  // Render sections in order based on layout
  const orderedSectionIds = layout.sectionOrder?.length > 0 
    ? layout.sectionOrder 
    : layout.sections;
  
  // Track if we've rendered the filter bar (only show once, before first pinned card)
  // filterBarRendered is no longer needed — detailed mode renders filter bar via bento grouping

  // Collect pinned card IDs for grid rendering in compact mode
  const pinnedCardIds = useMemo(() => {
    const fromOrder = orderedSectionIds
      .filter(id => isPinnedCardEntry(id) && isCardPinned(getPinnedCardId(id)))
      .map(getPinnedCardId);
    return [...fromOrder, ...missingPinnedCards];
  }, [orderedSectionIds, missingPinnedCards, visibilityData]);

  // Determine the index of the first pinned card in the section order (for filter bar placement)
  const firstPinnedIndex = orderedSectionIds.findIndex(
    id => isPinnedCardEntry(id) && isCardPinned(getPinnedCardId(id))
  );

  return (
    <>
      {orderedSectionIds.map((sectionId, index) => {
        // Handle pinned analytics cards
        if (isPinnedCardEntry(sectionId)) {
          const cardId = getPinnedCardId(sectionId);
          if (!isLeadership || !isCardPinned(cardId)) return null;
          
          // In compact mode, pinned cards are rendered together in a grid below
          // Only render filter bar at the first pinned card position
          if (compact) {
            if (index === firstPinnedIndex) {
              // Render filter bar + the entire bento grid here
              return (
                <React.Fragment key="compact-analytics-grid">
                  {hasPinnedAnalytics && (
                    <CommandCenterControlRow
                      isLeadership={isLeadership}
                      analyticsFilters={analyticsFilters}
                      onLocationChange={onLocationChange}
                      onDateRangeChange={onDateRangeChange}
                      accessibleLocations={accessibleLocations}
                      canViewAggregate={canViewAggregate}
                      compact={compact}
                      onCompactChange={onCompactChange}
                      roleContext={{ isLeadership, hasStylistRole, isFrontDesk, isReceptionist }}
                    />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {pinnedCardIds.map(cId => (
                      <PinnedAnalyticsCard key={`pinned:${cId}`} cardId={cId} filters={analyticsFilters} compact={compact} />
                    ))}
                  </div>
                </React.Fragment>
              );
            }
            // Skip remaining pinned cards (already rendered in the grid above)
            return null;
          }
          
          // Detailed mode: render all pinned cards at the first pinned position
          if (index === firstPinnedIndex) {
            const allDetailedPinned = [
              ...orderedSectionIds
                .filter(id => isPinnedCardEntry(id) && isCardPinned(getPinnedCardId(id)))
                .map(getPinnedCardId),
              ...missingPinnedCards,
            ];
            
            if (allDetailedPinned.length === 0) return null;
            
            // Group consecutive half-sized cards into pairs
            type CardGroup = { type: 'full' | 'pair'; cards: string[] };
            const groups: CardGroup[] = [];
            let i = 0;
            while (i < allDetailedPinned.length) {
              const current = allDetailedPinned[i];
              const next = allDetailedPinned[i + 1];
              if (getCardSize(current) === 'half' && next && getCardSize(next) === 'half') {
                groups.push({ type: 'pair', cards: [current, next] });
                i += 2;
              } else {
                groups.push({ type: 'full', cards: [current] });
                i += 1;
              }
            }
            
            return (
              <React.Fragment key="detailed-analytics-grid">
                {hasPinnedAnalytics && (
                    <CommandCenterControlRow
                      isLeadership={isLeadership}
                      analyticsFilters={analyticsFilters}
                      onLocationChange={onLocationChange}
                      onDateRangeChange={onDateRangeChange}
                      accessibleLocations={accessibleLocations}
                      canViewAggregate={canViewAggregate}
                      compact={compact}
                      onCompactChange={onCompactChange}
                      roleContext={{ isLeadership, hasStylistRole, isFrontDesk, isReceptionist }}
                    />
                )}
                {groups.map((group, gi) => {
                  if (group.type === 'pair') {
                    return (
                      <div key={`pair-${gi}`} className="flex flex-col md:flex-row gap-4 md:items-stretch">
                        <div className="flex-1 min-w-0 flex flex-col">
                          <PinnedAnalyticsCard cardId={group.cards[0]} filters={analyticsFilters} compact={compact} />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <PinnedAnalyticsCard cardId={group.cards[1]} filters={analyticsFilters} compact={compact} />
                        </div>
                      </div>
                    );
                  }
                  return (
                    <PinnedAnalyticsCard key={group.cards[0]} cardId={group.cards[0]} filters={analyticsFilters} compact={compact} />
                  );
                })}
              </React.Fragment>
            );
          }
          // Skip remaining pinned cards (already rendered at first position)
          return null;
        }
        
        // Regular section: only render if section is enabled
        if (!layout.sections.includes(sectionId)) return null;
        
        const component = sectionComponents[sectionId as keyof typeof sectionComponents];
        if (!component) return null;
        
        return <React.Fragment key={sectionId}>{component}</React.Fragment>;
      })}
    </>
  );
}

