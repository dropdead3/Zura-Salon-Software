import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Loader2, 
  Search, 
  ChevronDown,
  ChevronRight,
  BookOpen,
  CreditCard,
  Camera,
  ClipboardCheck,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Users,
  Filter,
  ArrowUpDown,
  UserPlus,
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { OnboardingTrackerOverview } from '@/components/dashboard/OnboardingTrackerOverview';
import { InvitationsTab } from '@/components/access-hub/InvitationsTab';
import { InviteStaffDialog } from '@/components/dashboard/InviteStaffDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';

type AppRole = Database['public']['Enums']['app_role'];

interface EmployeeProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  photo_url: string | null;
  hire_date: string | null;
  is_active: boolean;
}

interface OnboardingTask {
  id: string;
  title: string;
  visible_to_roles: AppRole[];
}

interface TaskCompletion {
  user_id: string;
  task_key: string;
  completed_at: string;
}

interface HandbookAcknowledgment {
  user_id: string;
  handbook_id: string;
  acknowledged_at: string;
}

interface Handbook {
  id: string;
  title: string;
  visible_to_roles: AppRole[] | null;
}

interface BusinessCardRequest {
  user_id: string;
  status: string;
  requested_at: string;
}

interface HeadshotRequest {
  user_id: string;
  status: string;
  requested_at: string;
  scheduled_date: string | null;
}

interface UserRole {
  user_id: string;
  role: AppRole;
}

interface StaffOnboardingData {
  profile: EmployeeProfile;
  roles: AppRole[];
  handbooksTotal: number;
  handbooksCompleted: number;
  tasksTotal: number;
  tasksCompleted: number;
  businessCardStatus: string | null;
  headshotStatus: string | null;
  overallProgress: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  scheduled: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  stylist: 'Stylist',
  receptionist: 'Receptionist',
  assistant: 'Assistant',
  stylist_assistant: 'Stylist Assistant',
  admin_assistant: 'Admin Assistant',
  operations_assistant: 'Operations Assistant',
  booth_renter: 'Booth Renter',
  bookkeeper: 'Bookkeeper',
};

export default function OnboardingTracker() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { roles, isPlatformUser } = useAuth();
  const { data: isPrimaryOwner } = useIsPrimaryOwner();
  const isSuperAdmin = roles.includes('super_admin');
  const canManage = isSuperAdmin || isPlatformUser || isPrimaryOwner;

  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'invitations' ? 'invitations' : 'progress';

  const handleTabChange = (value: string) => {
    if (value === 'progress') {
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ tab: value }, { replace: true });
    }
  };

  const [loading, setLoading] = useState(true);
  const [staffData, setStaffData] = useState<StaffOnboardingData[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'hire_date'>('progress');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Raw data for detail views
  const [taskCompletions, setTaskCompletions] = useState<TaskCompletion[]>([]);
  const [handbookAcknowledgments, setHandbookAcknowledgments] = useState<HandbookAcknowledgment[]>([]);
  const [onboardingTasks, setOnboardingTasks] = useState<OnboardingTask[]>([]);
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // Fetch all data in parallel
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
          .select('user_id, full_name, email, photo_url, hire_date, is_active')
          .eq('is_active', true)
          .order('full_name'),
        supabase
          .from('user_roles')
          .select('user_id, role'),
        supabase
          .from('onboarding_tasks')
          .select('id, title, visible_to_roles')
          .eq('is_active', true),
        supabase
          .from('onboarding_task_completions')
          .select('user_id, task_key, completed_at'),
        supabase
          .from('handbooks')
          .select('id, title, visible_to_roles')
          .eq('is_active', true)
          .eq('category', 'Onboarding'),
        supabase
          .from('handbook_acknowledgments')
          .select('user_id, handbook_id, acknowledged_at'),
        supabase
          .from('business_card_requests')
          .select('user_id, status, requested_at')
          .order('requested_at', { ascending: false }),
        supabase
          .from('headshot_requests')
          .select('user_id, status, requested_at, scheduled_date')
          .order('requested_at', { ascending: false }),
      ]);

      if (profilesResult.error) throw profilesResult.error;

      const profiles = profilesResult.data || [];
      const roles = (rolesResult.data || []) as UserRole[];
      const tasks = (tasksResult.data || []) as OnboardingTask[];
      const completions = (completionsResult.data || []) as TaskCompletion[];
      const hbooks = (handbooksResult.data || []) as Handbook[];
      const acks = (acknowledgmentsResult.data || []) as HandbookAcknowledgment[];
      const businessCards = (businessCardsResult.data || []) as BusinessCardRequest[];
      const headshots = (headshotsResult.data || []) as HeadshotRequest[];

      // Store raw data for detail views
      setOnboardingTasks(tasks);
      setTaskCompletions(completions);
      setHandbooks(hbooks);
      setHandbookAcknowledgments(acks);

      // Create lookup maps
      const rolesMap = new Map<string, AppRole[]>();
      roles.forEach(r => {
        const existing = rolesMap.get(r.user_id) || [];
        rolesMap.set(r.user_id, [...existing, r.role]);
      });

      const completionsMap = new Map<string, Set<string>>();
      completions.forEach(c => {
        const existing = completionsMap.get(c.user_id) || new Set();
        existing.add(c.task_key);
        completionsMap.set(c.user_id, existing);
      });

      const acksMap = new Map<string, Set<string>>();
      acks.forEach(a => {
        const existing = acksMap.get(a.user_id) || new Set();
        existing.add(a.handbook_id);
        acksMap.set(a.user_id, existing);
      });

      // Get latest business card and headshot request per user
      const latestBusinessCards = new Map<string, BusinessCardRequest>();
      businessCards.forEach(bc => {
        if (!latestBusinessCards.has(bc.user_id)) {
          latestBusinessCards.set(bc.user_id, bc);
        }
      });

      const latestHeadshots = new Map<string, HeadshotRequest>();
      headshots.forEach(hs => {
        if (!latestHeadshots.has(hs.user_id)) {
          latestHeadshots.set(hs.user_id, hs);
        }
      });

      // Calculate onboarding data for each user
      const data: StaffOnboardingData[] = profiles.map(profile => {
        const userRoles = rolesMap.get(profile.user_id) || [];
        const userCompletions = completionsMap.get(profile.user_id) || new Set();
        const userAcks = acksMap.get(profile.user_id) || new Set();
        const businessCard = latestBusinessCards.get(profile.user_id);
        const headshot = latestHeadshots.get(profile.user_id);

        // Filter tasks visible to user's roles
        const visibleTasks = tasks.filter(task => 
          task.visible_to_roles.some(role => userRoles.includes(role))
        );
        const completedTasks = visibleTasks.filter(t => userCompletions.has(t.id));

        // Filter handbooks visible to user's roles
        const visibleHandbooks = hbooks.filter(handbook =>
          handbook.visible_to_roles?.some(role => userRoles.includes(role))
        );
        const completedHandbooks = visibleHandbooks.filter(h => userAcks.has(h.id));

        // Calculate progress
        const handbooksProgress = visibleHandbooks.length > 0 
          ? (completedHandbooks.length / visibleHandbooks.length) * 100 
          : 100;
        const tasksProgress = visibleTasks.length > 0 
          ? (completedTasks.length / visibleTasks.length) * 100 
          : 100;
        const businessCardProgress = businessCard ? 100 : 0;
        const headshotProgress = headshot ? 100 : 0;
        const overallProgress = (handbooksProgress + tasksProgress + businessCardProgress + headshotProgress) / 4;

        return {
          profile,
          roles: userRoles,
          handbooksTotal: visibleHandbooks.length,
          handbooksCompleted: completedHandbooks.length,
          tasksTotal: visibleTasks.length,
          tasksCompleted: completedTasks.length,
          businessCardStatus: businessCard?.status || null,
          headshotStatus: headshot?.status || null,
          overallProgress,
        };
      });

      setStaffData(data);
    } catch (error: any) {
      console.error('Error fetching onboarding data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load onboarding data',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...staffData];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.profile.full_name?.toLowerCase().includes(query) ||
        item.profile.email?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      result = result.filter(item => item.roles.includes(roleFilter as AppRole));
    }

    // Status filter
    if (statusFilter === 'complete') {
      result = result.filter(item => item.overallProgress === 100);
    } else if (statusFilter === 'incomplete') {
      result = result.filter(item => item.overallProgress < 100);
    } else if (statusFilter === 'not_started') {
      result = result.filter(item => item.overallProgress === 0);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.profile.full_name || '').localeCompare(b.profile.full_name || '');
          break;
        case 'progress':
          comparison = a.overallProgress - b.overallProgress;
          break;
        case 'hire_date':
          const dateA = a.profile.hire_date ? new Date(a.profile.hire_date).getTime() : 0;
          const dateB = b.profile.hire_date ? new Date(b.profile.hire_date).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [staffData, searchQuery, roleFilter, statusFilter, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const total = staffData.length;
    const complete = staffData.filter(s => s.overallProgress === 100).length;
    const inProgress = staffData.filter(s => s.overallProgress > 0 && s.overallProgress < 100).length;
    const notStarted = staffData.filter(s => s.overallProgress === 0).length;
    return { total, complete, inProgress, notStarted };
  }, [staffData]);

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'text-green-600 dark:text-green-400';
    if (progress >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStatusIcon = (status: string | null) => {
    if (!status) return <Circle className="w-4 h-4 text-muted-foreground" />;
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'scheduled':
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
        <DashboardPageHeader
          title="Onboarding Hub"
          description="Monitor team onboarding progress, invitations, and checklist completion"
          actions={<InviteStaffDialog />}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <ResponsiveTabsList onTabChange={handleTabChange}>
            <TabsTrigger value="progress" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Progress</span>
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Invitations</span>
            </TabsTrigger>
          </ResponsiveTabsList>

          <TabsContent value="progress" className="mt-0 space-y-6">

        {/* Overview Summary */}
        <OnboardingTrackerOverview />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Staff</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-display">{stats.complete}</p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-display">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-display">{stats.notStarted}</p>
                <p className="text-xs text-muted-foreground">Not Started</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="incomplete">In Progress</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="hire_date">Hire Date</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                <ArrowUpDown className={cn("w-4 h-4 transition-transform", sortOrder === 'desc' && "rotate-180")} />
              </Button>
            </div>
          </div>
        </Card>

        {/* Staff List */}
        <div className="space-y-3">
          {filteredData.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-sans">No staff members match your filters.</p>
            </Card>
          ) : (
            filteredData.map((item) => (
              <Collapsible 
                key={item.profile.user_id}
                open={expandedUsers.has(item.profile.user_id)}
                onOpenChange={() => toggleExpanded(item.profile.user_id)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger className="w-full">
                    <div className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                      {/* Avatar */}
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={item.profile.photo_url || undefined} />
                        <AvatarFallback className="font-display text-xs">
                          {item.profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name and roles */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-sans font-medium text-sm truncate">
                          {item.profile.full_name || 'Unnamed'}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.roles.map(role => (
                            <Badge key={role} variant="secondary" className="text-xs px-1.5 py-0">
                              {ROLE_LABELS[role]}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Progress indicators */}
                      <div className="hidden sm:flex items-center gap-4">
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs font-medium">
                                {item.handbooksCompleted}/{item.handbooksTotal}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Handbooks</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1.5">
                              <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs font-medium">
                                {item.tasksCompleted}/{item.tasksTotal}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Tasks</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                              {getStatusIcon(item.businessCardStatus)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Business Card: {item.businessCardStatus || 'Not requested'}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1.5">
                              <Camera className="w-4 h-4 text-muted-foreground" />
                              {getStatusIcon(item.headshotStatus)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Headshot: {item.headshotStatus || 'Not requested'}</TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Overall progress */}
                      <div className="flex items-center gap-3">
                        <div className="w-24 hidden lg:block">
                          <Progress value={item.overallProgress} className="h-2" />
                        </div>
                        <span className={cn("text-sm font-display w-12 text-right", getProgressColor(item.overallProgress))}>
                          {Math.round(item.overallProgress)}%
                        </span>
                        {expandedUsers.has(item.profile.user_id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t bg-muted/30 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Handbooks */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <BookOpen className="w-4 h-4" />
                            Handbooks ({item.handbooksCompleted}/{item.handbooksTotal})
                          </div>
                          <div className="space-y-1 pl-6">
                            {handbooks
                              .filter(h => h.visible_to_roles?.some(r => item.roles.includes(r)))
                              .map(handbook => {
                                const isCompleted = handbookAcknowledgments.some(
                                  a => a.user_id === item.profile.user_id && a.handbook_id === handbook.id
                                );
                                return (
                                  <div key={handbook.id} className="flex items-center gap-2 text-xs">
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                                    ) : (
                                      <Circle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <span className={cn(!isCompleted && "text-muted-foreground")}>
                                      {handbook.title}
                                    </span>
                                  </div>
                                );
                              })}
                            {handbooks.filter(h => h.visible_to_roles?.some(r => item.roles.includes(r))).length === 0 && (
                              <p className="text-xs text-muted-foreground">No handbooks assigned</p>
                            )}
                          </div>
                        </div>

                        {/* Tasks */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <ClipboardCheck className="w-4 h-4" />
                            Tasks ({item.tasksCompleted}/{item.tasksTotal})
                          </div>
                          <div className="space-y-1 pl-6">
                            {onboardingTasks
                              .filter(t => t.visible_to_roles.some(r => item.roles.includes(r)))
                              .map(task => {
                                const isCompleted = taskCompletions.some(
                                  c => c.user_id === item.profile.user_id && c.task_key === task.id
                                );
                                return (
                                  <div key={task.id} className="flex items-center gap-2 text-xs">
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                                    ) : (
                                      <Circle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <span className={cn(!isCompleted && "text-muted-foreground")}>
                                      {task.title}
                                    </span>
                                  </div>
                                );
                              })}
                            {onboardingTasks.filter(t => t.visible_to_roles.some(r => item.roles.includes(r))).length === 0 && (
                              <p className="text-xs text-muted-foreground">No tasks assigned</p>
                            )}
                          </div>
                        </div>

                        {/* Business Card */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <CreditCard className="w-4 h-4" />
                            Business Card
                          </div>
                          <div className="pl-6">
                            {item.businessCardStatus ? (
                              <Badge className={cn("text-xs", STATUS_COLORS[item.businessCardStatus])}>
                                {item.businessCardStatus.charAt(0).toUpperCase() + item.businessCardStatus.slice(1)}
                              </Badge>
                            ) : (
                              <p className="text-xs text-muted-foreground">Not requested</p>
                            )}
                          </div>
                        </div>

                        {/* Headshot */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Camera className="w-4 h-4" />
                            Headshot Session
                          </div>
                          <div className="pl-6">
                            {item.headshotStatus ? (
                              <Badge className={cn("text-xs", STATUS_COLORS[item.headshotStatus])}>
                                {item.headshotStatus.charAt(0).toUpperCase() + item.headshotStatus.slice(1)}
                              </Badge>
                            ) : (
                              <p className="text-xs text-muted-foreground">Not requested</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          )}
        </div>

          </TabsContent>

          <TabsContent value="invitations" className="mt-0">
            <InvitationsTab canManage={canManage} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
