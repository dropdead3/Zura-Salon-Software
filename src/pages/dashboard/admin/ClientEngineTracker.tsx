import { useState, useEffect, useMemo } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  Search, 
  ChevronDown,
  ChevronRight,
  Target,
  Users,
  Flame,
  Trophy,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  ArrowUpDown,
  DollarSign,
  Bell,
  Calendar,
  TrendingUp,
  Shield,
  User,
  Check,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAllPauseRequests } from '@/hooks/usePauseRequests';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import type { Database } from '@/integrations/supabase/types';
import { CoachNotesSection } from '@/components/dashboard/CoachNotesSection';


type ProgramStatus = Database['public']['Enums']['program_status'];

interface EmployeeProfile {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  photo_url: string | null;
  location_id: string | null;
}

interface Enrollment {
  id: string;
  user_id: string;
  current_day: number;
  streak_count: number;
  status: ProgramStatus;
  start_date: string;
  last_completion_date: string | null;
  restart_count: number;
  completed_at: string | null;
  forgive_credits_remaining: number;
  forgive_credits_used: number;
}

interface RingTheBellEntry {
  user_id: string;
  ticket_value: number;
}

interface DailyCompletion {
  enrollment_id: string;
  day_number: number;
  is_complete: boolean;
}

interface ParticipantData {
  profile: EmployeeProfile;
  enrollment: Enrollment;
  totalRevenue: number;
  ringCount: number;
  completedDays: number;
  progressPercent: number;
  daysSinceLastCompletion: number | null;
  passesUsed: number;
  passesRemaining: number;
}

const STATUS_CONFIG: Record<ProgramStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { label: 'Active', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: Play },
  paused: { label: 'Paused', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', icon: Pause },
  completed: { label: 'Completed', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Trophy },
  restarted: { label: 'Restarted', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30', icon: RotateCcw },
};

export default function ClientEngineTracker() {
  const { formatDate } = useFormatDate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatCurrencyWhole } = useFormatCurrency();
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  
  // Pause requests state
  const { requests: pauseRequests, loading: pauseLoading, reviewRequest } = useAllPauseRequests();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [pauseDays, setPauseDays] = useState(7);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'day' | 'streak' | 'revenue' | 'name'>('day');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handlePauseReview = async (decision: 'approved' | 'denied') => {
    if (!selectedRequest || !user) return;
    
    setIsProcessing(true);
    await reviewRequest(
      selectedRequest,
      decision,
      user.id,
      reviewNotes || undefined,
      decision === 'approved' ? pauseDays : undefined
    );
    setIsProcessing(false);
    setSelectedRequest(null);
    setReviewNotes('');
    setPauseDays(7);
  };

  const selectedRequestData = pauseRequests.find(r => r.id === selectedRequest);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [
        enrollmentsResult,
        profilesResult,
        ringEntriesResult,
        completionsResult,
      ] = await Promise.all([
        supabase
          .from('stylist_program_enrollment')
          .select('*'),
        supabase
          .from('employee_profiles')
          .select('user_id, full_name, display_name, photo_url, location_id')
          .eq('is_active', true),
        supabase
          .from('ring_the_bell_entries')
          .select('user_id, ticket_value'),
        supabase
          .from('daily_completions')
          .select('enrollment_id, day_number, is_complete')
          .eq('is_complete', true),
      ]);

      if (enrollmentsResult.error) throw enrollmentsResult.error;

      const enrollments = (enrollmentsResult.data || []) as Enrollment[];
      const profiles = (profilesResult.data || []) as EmployeeProfile[];
      const ringEntries = (ringEntriesResult.data || []) as RingTheBellEntry[];
      const completions = (completionsResult.data || []) as DailyCompletion[];

      // Build lookup maps
      const profilesMap = new Map(profiles.map(p => [p.user_id, p]));
      
      // Ring the bell totals per user
      const revenueMap = new Map<string, { total: number; count: number }>();
      ringEntries.forEach(entry => {
        const existing = revenueMap.get(entry.user_id) || { total: 0, count: 0 };
        revenueMap.set(entry.user_id, {
          total: existing.total + Number(entry.ticket_value),
          count: existing.count + 1,
        });
      });

      // Completions per enrollment
      const completionsMap = new Map<string, number>();
      completions.forEach(c => {
        const current = completionsMap.get(c.enrollment_id) || 0;
        completionsMap.set(c.enrollment_id, current + 1);
      });

      // Build participant data
      const data: ParticipantData[] = enrollments.map(enrollment => {
        const profile = profilesMap.get(enrollment.user_id) || {
          user_id: enrollment.user_id,
          full_name: 'Unknown',
          display_name: null,
          photo_url: null,
          location_id: null,
        };
        const revenue = revenueMap.get(enrollment.user_id) || { total: 0, count: 0 };
        const completedDays = completionsMap.get(enrollment.id) || 0;
        
        let daysSinceLastCompletion: number | null = null;
        if (enrollment.last_completion_date) {
          daysSinceLastCompletion = differenceInDays(new Date(), new Date(enrollment.last_completion_date));
        }

        return {
          profile,
          enrollment,
          totalRevenue: revenue.total,
          ringCount: revenue.count,
          completedDays,
          progressPercent: Math.round((enrollment.current_day / 75) * 100),
          daysSinceLastCompletion,
          passesUsed: enrollment.forgive_credits_used || 0,
          passesRemaining: enrollment.forgive_credits_remaining ?? 2,
        };
      });

      setParticipants(data);
    } catch (error: any) {
      console.error('Error fetching program data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load program data',
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

  // Filter and sort
  const filteredData = useMemo(() => {
    let result = [...participants];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.profile.full_name?.toLowerCase().includes(query) ||
        item.profile.display_name?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(item => item.enrollment.status === statusFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.profile.full_name || '').localeCompare(b.profile.full_name || '');
          break;
        case 'day':
          comparison = a.enrollment.current_day - b.enrollment.current_day;
          break;
        case 'streak':
          comparison = a.enrollment.streak_count - b.enrollment.streak_count;
          break;
        case 'revenue':
          comparison = a.totalRevenue - b.totalRevenue;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [participants, searchQuery, statusFilter, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const total = participants.length;
    const active = participants.filter(p => p.enrollment.status === 'active').length;
    const completed = participants.filter(p => p.enrollment.status === 'completed').length;
    const paused = participants.filter(p => p.enrollment.status === 'paused').length;
    const totalRevenue = participants.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalRings = participants.reduce((sum, p) => sum + p.ringCount, 0);
    const avgProgress = total > 0 ? Math.round(participants.reduce((sum, p) => sum + p.progressPercent, 0) / total) : 0;
    
    return { total, active, completed, paused, totalRevenue, totalRings, avgProgress };
  }, [participants]);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
            <Link to="/dashboard/admin/management">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center rounded-lg shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display">CLIENT ENGINE TRACKER</h1>
              <p className="text-muted-foreground text-sm">
                Monitor team progress through the 75-day program
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Enrolled</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Play className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-display">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-display">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-display">{formatCurrencyWhole(stats.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Bells Rung</span>
              </div>
              <span className="text-lg font-display">{stats.totalRings}</span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Avg Progress</span>
              </div>
              <span className="text-lg font-display">{stats.avgProgress}%</span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pause className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Paused</span>
              </div>
              <span className="text-lg font-display">{stats.paused}</span>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="restarted">Restarted</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Current Day</SelectItem>
                  <SelectItem value="streak">Streak</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                <ArrowUpDown className={cn("w-4 h-4", sortOrder === 'desc' && "rotate-180")} />
              </Button>
            </div>
          </div>
        </Card>

        {/* Participants List */}
        <div className="space-y-3">
          {filteredData.map((participant) => {
            const isExpanded = expandedUsers.has(participant.profile.user_id);
            const statusConfig = STATUS_CONFIG[participant.enrollment.status];
            const StatusIcon = statusConfig.icon;

            return (
              <Collapsible
                key={participant.enrollment.id}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(participant.profile.user_id)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={participant.profile.photo_url || undefined} />
                        <AvatarFallback>{getInitials(participant.profile.full_name)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            {participant.profile.display_name || participant.profile.full_name}
                          </p>
                          <Badge variant="outline" className={cn("text-[10px]", statusConfig.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Day {participant.enrollment.current_day}/75
                          </span>
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-500" />
                            {participant.enrollment.streak_count} streak
                          </span>
                          {participant.ringCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Bell className="w-3 h-3" />
                              {participant.ringCount} rings
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-primary" />
                            {participant.passesUsed}/2 passes used
                          </span>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrencyWhole(participant.totalRevenue)}</p>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                        </div>
                        <div className="w-24">
                          <Progress value={participant.progressPercent} className="h-2" />
                          <p className="text-xs text-muted-foreground text-center mt-1">
                            {participant.progressPercent}%
                          </p>
                        </div>
                      </div>

                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                          <p className="text-sm font-medium">
                            {formatDate(new Date(participant.enrollment.start_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Last Completion</p>
                          <p className="text-sm font-medium">
                            {participant.enrollment.last_completion_date 
                              ? formatDate(new Date(participant.enrollment.last_completion_date), 'MMM d, yyyy')
                              : 'Never'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Restarts</p>
                          <p className="text-sm font-medium">{participant.enrollment.restart_count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Days Completed</p>
                          <p className="text-sm font-medium">{participant.completedDays}</p>
                        </div>
                      </div>
                      
                      {/* Life Happens Passes */}
                      <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">Life Happens Passes</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-muted-foreground">
                              {participant.passesRemaining} remaining
                            </span>
                            {participant.passesUsed > 0 && (
                              <Badge variant="secondary">
                                {participant.passesUsed} used
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {participant.daysSinceLastCompletion !== null && participant.daysSinceLastCompletion > 1 && (
                        <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md flex items-center gap-2 text-amber-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">
                            {participant.daysSinceLastCompletion} days since last completion
                          </span>
                        </div>
                      )}

                      {/* Coach Notes */}
                      <CoachNotesSection 
                        enrollmentId={participant.enrollment.id}
                        participantName={participant.profile.display_name || participant.profile.full_name || 'Participant'}
                      />
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}

          {filteredData.length === 0 && (
            <Card className="p-12 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-display text-lg mb-2">No Participants Found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'No one has enrolled in the Client Engine program yet.'}
              </p>
            </Card>
          )}
        </div>

        {/* Pause Requests Section */}
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-yellow-500/20 text-yellow-600 flex items-center justify-center rounded-lg shrink-0">
              <Pause className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-display">PAUSE REQUESTS</h2>
              <p className="text-muted-foreground text-xs">
                Review and manage emergency pause requests
              </p>
            </div>
            {pauseRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pauseRequests.length} pending
              </Badge>
            )}
          </div>

          {pauseLoading ? (
            <Card className="p-6 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </Card>
          ) : pauseRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Pause className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-display text-base mb-1">No Pending Requests</h3>
              <p className="text-sm text-muted-foreground">
                There are no pause requests waiting for review.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pauseRequests.map((request) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{request.user_name}</h3>
                          <p className="text-xs text-muted-foreground">{request.user_email}</p>
                        </div>
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          Day {request.current_day || '?'}
                        </Badge>
                      </div>

                      <div className="bg-muted/50 rounded-md p-3">
                        <p className="text-xs font-medium mb-0.5">Reason for pause:</p>
                        <p className="text-xs text-muted-foreground">{request.reason}</p>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Requested {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Requesting {request.requested_duration_days} days</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size={tokens.button.card}
                      onClick={() => {
                        setSelectedRequest(request.id);
                        setPauseDays(request.requested_duration_days);
                      }}
                    >
                      Review
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Review Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Pause Request</DialogTitle>
            </DialogHeader>

            {selectedRequestData && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-1">From: {selectedRequestData.user_name}</p>
                  <p className="text-sm text-muted-foreground">Day {selectedRequestData.current_day} of the program</p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-1">Reason:</p>
                  <p className="text-sm text-muted-foreground">{selectedRequestData.reason}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pauseDays">Pause Duration (days)</Label>
                  <Input
                    id="pauseDays"
                    type="number"
                    min={1}
                    max={30}
                    value={pauseDays}
                    onChange={(e) => setPauseDays(parseInt(e.target.value) || 7)}
                  />
                  <p className="text-xs text-muted-foreground">
                    They requested {selectedRequestData.requested_duration_days} days
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes about your decision..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Approving will pause their program and preserve their progress.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => handlePauseReview('denied')}
                disabled={isProcessing}
                className="text-destructive hover:text-destructive"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1" />}
                Deny
              </Button>
              <Button
                onClick={() => handlePauseReview('approved')}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Approve Pause
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
