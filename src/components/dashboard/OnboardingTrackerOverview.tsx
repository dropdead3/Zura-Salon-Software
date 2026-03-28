import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  Camera,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface OnboardingStats {
  total: number;
  complete: number;
  inProgress: number;
  notStarted: number;
  handbooksCompletion: number;
  tasksCompletion: number;
  businessCardsRequested: number;
  headshotsRequested: number;
}

export function OnboardingTrackerOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OnboardingStats>({
    total: 0,
    complete: 0,
    inProgress: 0,
    notStarted: 0,
    handbooksCompletion: 0,
    tasksCompletion: 0,
    businessCardsRequested: 0,
    headshotsRequested: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [
        profilesResult,
        rolesResult,
        tasksResult,
        completionsResult,
        handbooksResult,
        acknowledgmentsResult,
        businessCardsResult,
        headshotsResult,
      ] = await Promise.all([
        supabase
          .from('employee_profiles')
          .select('user_id')
          .eq('is_active', true),
        supabase
          .from('user_roles')
          .select('user_id, role'),
        supabase
          .from('onboarding_tasks')
          .select('id, visible_to_roles')
          .eq('is_active', true),
        supabase
          .from('onboarding_task_completions')
          .select('user_id, task_key'),
        supabase
          .from('handbooks')
          .select('id, visible_to_roles')
          .eq('is_active', true)
          .eq('category', 'Onboarding'),
        supabase
          .from('handbook_acknowledgments')
          .select('user_id, handbook_id'),
        supabase
          .from('business_card_requests')
          .select('user_id, status'),
        supabase
          .from('headshot_requests')
          .select('user_id, status'),
      ]);

      const profiles = profilesResult.data || [];
      const roles = rolesResult.data || [];
      const tasks = tasksResult.data || [];
      const completions = completionsResult.data || [];
      const handbooks = handbooksResult.data || [];
      const acknowledgments = acknowledgmentsResult.data || [];
      const businessCards = businessCardsResult.data || [];
      const headshots = headshotsResult.data || [];

      // Build lookup maps
      const rolesMap = new Map<string, AppRole[]>();
      roles.forEach((r: { user_id: string; role: AppRole }) => {
        const existing = rolesMap.get(r.user_id) || [];
        rolesMap.set(r.user_id, [...existing, r.role]);
      });

      const completionsMap = new Map<string, Set<string>>();
      completions.forEach((c: { user_id: string; task_key: string }) => {
        const existing = completionsMap.get(c.user_id) || new Set();
        existing.add(c.task_key);
        completionsMap.set(c.user_id, existing);
      });

      const acksMap = new Map<string, Set<string>>();
      acknowledgments.forEach((a: { user_id: string; handbook_id: string }) => {
        const existing = acksMap.get(a.user_id) || new Set();
        existing.add(a.handbook_id);
        acksMap.set(a.user_id, existing);
      });

      // Unique users with business cards and headshots
      const usersWithBusinessCards = new Set(businessCards.map((bc: { user_id: string }) => bc.user_id));
      const usersWithHeadshots = new Set(headshots.map((hs: { user_id: string }) => hs.user_id));

      // Calculate per-user progress
      let totalComplete = 0;
      let totalInProgress = 0;
      let totalNotStarted = 0;
      let totalHandbooksCompleted = 0;
      let totalHandbooksRequired = 0;
      let totalTasksCompleted = 0;
      let totalTasksRequired = 0;

      profiles.forEach((profile: { user_id: string }) => {
        const userRoles = rolesMap.get(profile.user_id) || [];
        const userCompletions = completionsMap.get(profile.user_id) || new Set();
        const userAcks = acksMap.get(profile.user_id) || new Set();

        // Filter tasks visible to user's roles
        const visibleTasks = tasks.filter((task: { id: string; visible_to_roles: AppRole[] }) => 
          task.visible_to_roles.some((role: AppRole) => userRoles.includes(role))
        );
        const completedTasks = visibleTasks.filter((t: { id: string }) => userCompletions.has(t.id));

        // Filter handbooks visible to user's roles
        const visibleHandbooks = handbooks.filter((handbook: { id: string; visible_to_roles: AppRole[] | null }) =>
          handbook.visible_to_roles?.some((role: AppRole) => userRoles.includes(role))
        );
        const completedHandbooks = visibleHandbooks.filter((h: { id: string }) => userAcks.has(h.id));

        totalHandbooksRequired += visibleHandbooks.length;
        totalHandbooksCompleted += completedHandbooks.length;
        totalTasksRequired += visibleTasks.length;
        totalTasksCompleted += completedTasks.length;

        // Calculate progress
        const handbooksProgress = visibleHandbooks.length > 0 
          ? (completedHandbooks.length / visibleHandbooks.length) * 100 
          : 100;
        const tasksProgress = visibleTasks.length > 0 
          ? (completedTasks.length / visibleTasks.length) * 100 
          : 100;
        const businessCardProgress = usersWithBusinessCards.has(profile.user_id) ? 100 : 0;
        const headshotProgress = usersWithHeadshots.has(profile.user_id) ? 100 : 0;
        const overallProgress = (handbooksProgress + tasksProgress + businessCardProgress + headshotProgress) / 4;

        if (overallProgress === 100) {
          totalComplete++;
        } else if (overallProgress > 0) {
          totalInProgress++;
        } else {
          totalNotStarted++;
        }
      });

      setStats({
        total: profiles.length,
        complete: totalComplete,
        inProgress: totalInProgress,
        notStarted: totalNotStarted,
        handbooksCompletion: totalHandbooksRequired > 0 
          ? Math.round((totalHandbooksCompleted / totalHandbooksRequired) * 100) 
          : 100,
        tasksCompletion: totalTasksRequired > 0 
          ? Math.round((totalTasksCompleted / totalTasksRequired) * 100) 
          : 100,
        businessCardsRequested: usersWithBusinessCards.size,
        headshotsRequested: usersWithHeadshots.size,
      });
    } catch (error) {
      console.error('Error fetching onboarding stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const completionPercentage = stats.total > 0 
    ? Math.round((stats.complete / stats.total) * 100) 
    : 0;

  if (loading) {
    return (
      <Card className="p-5">
        <div className="space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <ClipboardCheck className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-medium text-sm">Onboarding Overview</h3>
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Team Completion</span>
            <MetricInfoTooltip description="Percentage of all onboarding items (tasks + handbooks) completed across all active employees." />
          </div>
          <span className="font-medium">{completionPercentage}%</span>
        </div>
        <Progress 
          value={completionPercentage} 
          className="h-2"
        />
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-2.5 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">{stats.total}</p>
          <div className="flex items-center gap-0.5 justify-center">
            <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wide">Total</p>
            <MetricInfoTooltip description="Count of all active employees in the onboarding process." />
          </div>
        </div>
        <div className="text-center p-2.5 bg-green-500/10 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-lg font-medium text-green-600">{stats.complete}</p>
          <div className="flex items-center gap-0.5 justify-center">
            <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wide">Done</p>
            <MetricInfoTooltip description="Employees who have completed 100% of their onboarding items." />
          </div>
        </div>
        <div className="text-center p-2.5 bg-yellow-500/10 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <Clock className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-lg font-medium text-yellow-600">{stats.inProgress}</p>
          <div className="flex items-center gap-0.5 justify-center">
            <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wide">Active</p>
            <MetricInfoTooltip description="Employees currently working through their onboarding checklist." />
          </div>
        </div>
        <div className="text-center p-2.5 bg-red-500/10 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-lg font-medium text-red-600">{stats.notStarted}</p>
          <div className="flex items-center gap-0.5 justify-center">
            <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wide">Pending</p>
            <MetricInfoTooltip description="Employees who haven't started any onboarding items yet." />
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground">Handbooks</p>
              <MetricInfoTooltip description="Percentage of onboarding handbooks acknowledged by employees." />
            </div>
            <p className="text-sm font-medium">{stats.handbooksCompletion}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
          <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground">Tasks</p>
              <MetricInfoTooltip description="Percentage of onboarding tasks marked as complete." />
            </div>
            <p className="text-sm font-medium">{stats.tasksCompletion}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground">Business Cards</p>
              <MetricInfoTooltip description="Number of business card requests submitted by new hires." />
            </div>
            <p className="text-sm font-medium">{stats.businessCardsRequested} requested</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground">Headshots</p>
              <MetricInfoTooltip description="Number of headshot requests submitted by new hires." />
            </div>
            <p className="text-sm font-medium">{stats.headshotsRequested} requested</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
