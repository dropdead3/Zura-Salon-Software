import { useRef, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyCompletion } from '@/hooks/useDailyCompletion';
import { useWeeklyAssignments } from '@/hooks/useWeeklyAssignments';
import { useActualUserId } from '@/hooks/useEffectiveUser';
import { usePauseRequests } from '@/hooks/usePauseRequests';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MissedDayDialog } from '@/components/dashboard/MissedDayDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Target, 
  Flame, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  ChevronRight,
  ChevronDown,
  Play,
  Lock,
  Loader2,
  ImageIcon,
  RotateCcw,
  Calendar,
  Video,
  FileText,
  ClipboardList,
  ExternalLink,
  Download,
  Eye,
  Image as ImageLucide,
  Shield,
  ChevronLeft,
  Bell
} from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { ClientEngineWelcome } from '@/components/dashboard/ClientEngineWelcome';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useQuery } from '@tanstack/react-query';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


export default function Program() {
  const { dashPath } = useOrgDashboardPath();
  const { user } = useAuth();
  const actualUserId = useActualUserId();
  
  // Check if the ACTUAL logged-in user (not impersonated) is a super admin
  const { data: actualProfile } = useQuery({
    queryKey: ['actual-user-profile', actualUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('is_super_admin')
        .eq('user_id', actualUserId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!actualUserId,
  });
  const isSuperAdmin = actualProfile?.is_super_admin;
  
  const {
    enrollment,
    todayCompletion,
    tasks,
    loading,
    hasMissedDay,
    daysMissed,
    updateTask,
    uploadProof,
    submitDay,
    acknowledgeMissedDay,
    useForgiveCredit,
    creditExpiresAt,
    refetch,
  } = useDailyCompletion(user?.id);

  const {
    pendingRequest,
    submitPauseRequest,
  } = usePauseRequests(enrollment?.id);

  const {
    currentWeek,
    completions: weeklyCompletions,
    toggleAssignmentCompletion,
    getAssignmentCompletion,
    getCurrentWeekProgress,
    loading: weeklyLoading,
  } = useWeeklyAssignments(enrollment?.id, enrollment?.current_day || 1);
  
  const [hasEnrollment, setHasEnrollment] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [weeklyExpanded, setWeeklyExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Super admin day navigation with arrow keys
  const jumpToDay = useCallback(async (newDay: number) => {
    if (!enrollment || !isSuperAdmin) return;
    if (newDay < 1 || newDay > 75) return;
    
    const { error } = await supabase
      .from('stylist_program_enrollment')
      .update({ current_day: newDay })
      .eq('id', enrollment.id);
    
    if (error) {
      toast.error('Failed to change day');
    } else {
      toast.success(`Jumped to Day ${newDay}`);
      refetch();
    }
  }, [enrollment, isSuperAdmin, refetch]);

  useEffect(() => {
    if (!isSuperAdmin || !enrollment) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const currentDay = enrollment.current_day || 1;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        jumpToDay(currentDay - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        jumpToDay(currentDay + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSuperAdmin, enrollment, jumpToDay]);

  // Auto-collapse weekly section when completed
  const weekProgress = getCurrentWeekProgress();
  const isWeekComplete = weekProgress.total > 0 && weekProgress.percentage === 100;
  
  useEffect(() => {
    if (isWeekComplete) {
      setWeeklyExpanded(false);
    }
  }, [isWeekComplete]);

  // Check enrollment when data loads - only set to true if not explicitly set to false
  if (!loading && hasEnrollment === null) {
    setHasEnrollment(!!enrollment);
  }

  const startProgram = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('stylist_program_enrollment')
      .insert({
        user_id: user.id,
        current_day: 1,
        streak_count: 0,
        status: 'active',
        weekly_wins_due_day: 7,
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting program:', error);
      toast.error('Failed to start program');
    } else {
      setHasEnrollment(true);
      refetch();
      // Scroll to top after starting program
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const restartProgram = async () => {
    if (!user || !enrollment) return;
    
    setRestarting(true);
    
    // Delete the enrollment entirely so user sees welcome page again
    const { error } = await supabase
      .from('stylist_program_enrollment')
      .delete()
      .eq('id', enrollment.id);

    if (error) {
      console.error('Error restarting program:', error);
      toast.error('Failed to restart program');
      setRestarting(false);
    } else {
      toast.success('Program reset! Redirecting to welcome page...');
      // Set state first, then refetch - this ensures welcome page shows
      setHasEnrollment(false);
      setRestarting(false);
      // Small delay to ensure state updates before any refetch
      setTimeout(() => refetch(), 100);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const url = await uploadProof(file);
    if (url) {
      toast.success('Proof uploaded successfully');
      refetch();
    }
    setUploading(false);
  };

  const handleSubmitDay = async () => {
    setSubmitting(true);
    await submitDay();
    setSubmitting(false);
  };

  if (loading || hasEnrollment === null) {
    return (
      <DashboardLayout>
        <DashboardLoader size="md" fullPage />
      </DashboardLayout>
    );
  }

  if (hasEnrollment === false) {
    return (
      <DashboardLayout>
        <ClientEngineWelcome onStartProgram={startProgram} />
      </DashboardLayout>
    );
  }

  const progressPercent = ((enrollment?.current_day || 1) / 75) * 100;
  const isWeeklyWinsDue = enrollment?.weekly_wins_due_day === enrollment?.current_day;
  const isPaused = enrollment?.status === 'paused';

  const getAssignmentIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'reading': 
      case 'worksheet': return FileText;
      default: return ClipboardList;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              {/* Super Admin Day Navigation */}
              {isSuperAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => jumpToDay((enrollment?.current_day || 1) - 1)}
                  disabled={(enrollment?.current_day || 1) <= 1}
                  className="h-8 w-8"
                  title="Previous day (←)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <h1 className="font-display text-3xl lg:text-4xl">
                DAY {enrollment?.current_day}
              </h1>
              {isSuperAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => jumpToDay((enrollment?.current_day || 1) + 1)}
                  disabled={(enrollment?.current_day || 1) >= 75}
                  className="h-8 w-8"
                  title="Next day (→)"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              )}
              <span className="text-sm text-muted-foreground font-sans">of 75</span>
            </div>
            
            {/* Restart Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size={tokens.button.card}
                  disabled={restarting}
                  className="text-muted-foreground hover:text-destructive hover:border-destructive"
                >
                  {restarting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  Restart
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restart the 75-Day Program?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset your progress and take you back to the welcome page to start fresh. 
                    Your streak will be reset to 0. This action cannot be undone.
                    {enrollment && enrollment.restart_count > 0 && (
                      <span className="block mt-2 text-muted-foreground">
                        You've restarted {enrollment.restart_count} time{enrollment.restart_count > 1 ? 's' : ''} before.
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={restartProgram}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Restart Program
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-sans">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>{enrollment?.streak_count} day streak</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-sans">
              <Shield className="w-4 h-4 text-primary" />
              <span>{enrollment?.forgive_credits_remaining ?? 2} Life Happens {(enrollment?.forgive_credits_remaining ?? 2) === 1 ? 'Pass' : 'Passes'}</span>
            </div>
            {enrollment?.status === 'active' && (
              <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs font-display tracking-wide">
                ACTIVE
              </span>
            )}
            {isPaused && (
              <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 text-xs font-display tracking-wide">
                PAUSED
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar with Week Milestones */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-sans text-muted-foreground">Program Progress</span>
            <span className="text-sm font-display">{Math.round(progressPercent)}%</span>
          </div>
          
          {/* Progress bar with week markers */}
          <div className="relative">
            <Progress value={progressPercent} className="h-2" />
            
            {/* Week milestone markers */}
            <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none">
              {Array.from({ length: 10 }, (_, i) => {
                const weekEndDay = (i + 1) * 7;
                const position = (weekEndDay / 75) * 100;
                const isPassed = (enrollment?.current_day || 1) > weekEndDay;
                return (
                  <div
                    key={i}
                    className={`absolute top-1/2 -translate-y-1/2 w-0.5 h-3 transition-colors ${
                      isPassed ? 'bg-primary' : 'bg-border'
                    }`}
                    style={{ left: `${position}%` }}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Week labels */}
          <div className="relative mt-4 h-6">
            {Array.from({ length: 11 }, (_, i) => {
              const weekNum = i + 1;
              const weekStartDay = i * 7 + 1;
              const weekEndDay = Math.min((i + 1) * 7, 75);
              const weekMidpoint = weekNum === 11 
                ? ((70 + 75) / 2) / 75 * 100 
                : ((weekStartDay + weekEndDay) / 2) / 75 * 100;
              const currentDay = enrollment?.current_day || 1;
              const isCurrentWeek = currentDay >= weekStartDay && currentDay <= weekEndDay;
              const isCompleted = currentDay > weekEndDay;
              
              return (
                <div
                  key={weekNum}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${weekMidpoint}%` }}
                >
                  <span 
                    className={`text-[10px] font-display tracking-wide transition-colors ${
                      isCurrentWeek 
                        ? 'text-primary font-medium' 
                        : isCompleted 
                          ? 'text-foreground' 
                          : 'text-muted-foreground/60'
                    }`}
                  >
                    W{weekNum}
                  </span>
                  {isCurrentWeek && (
                    <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Missed Day Dialog with Forgive Credits */}
        <MissedDayDialog
          open={hasMissedDay}
          daysMissed={daysMissed}
          forgiveCreditsRemaining={enrollment?.forgive_credits_remaining ?? 2}
          hasPendingPauseRequest={!!pendingRequest}
          creditExpiresAt={creditExpiresAt}
          onUseCredit={async () => {
            await useForgiveCredit();
          }}
          onRequestPause={async (reason) => {
            if (user) {
              await submitPauseRequest(user.id, reason);
            }
          }}
          onRestart={acknowledgeMissedDay}
        />

        {/* Paused Warning */}
        {isPaused && (
          <Card className="p-6 mb-8 border-yellow-500/50 bg-yellow-500/5">
            <div className="flex items-start gap-4">
              <Lock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-sm tracking-wide mb-1">
                  PROGRESS PAUSED
                </h3>
                <p className="text-sm text-muted-foreground font-sans">
                  Submit your Weekly Wins Report to unlock Day {enrollment?.current_day}.
                </p>
                <Button 
                  variant="outline" 
                  size={tokens.button.card} 
                  className="mt-4"
                  asChild
                >
                  <Link to={dashPath('/weekly-wins')}>
                    Submit Weekly Wins
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Weekly Wins Due */}
        {isWeeklyWinsDue && !isPaused && (
          <Card className="p-6 mb-8 border-blue-500/50 bg-blue-500/5">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-sm tracking-wide mb-1">
                  WEEKLY WINS DUE TODAY
                </h3>
                <p className="text-sm text-muted-foreground font-sans">
                  Submit your Weekly Wins Report before completing today's tasks.
                </p>
                <Button 
                  variant="outline" 
                  size={tokens.button.card} 
                  className="mt-4"
                  asChild
                >
                  <Link to={dashPath('/weekly-wins')}>
                    Submit Report
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Ring the Bell Call-out */}
        <Card className="p-5 mb-8 border-0 bg-gradient-to-r from-[hsl(40,50%,75%)] to-[hsl(35,40%,88%)]">
          <div className="flex items-center gap-4 px-2">
            <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-sans text-foreground">
                Did you book a new client or a high-ticket service (above $500) today? If so, ring the bell! We want to celebrate it.
              </p>
            </div>
            <Button variant="outline" size={tokens.button.card} asChild className="group flex-shrink-0 bg-white/50 hover:bg-white/70 border-[hsl(35,30%,70%)] hover-scale">
              <Link to={dashPath('/ring-the-bell')}>
                <Bell className="w-4 h-4 mr-2 origin-top group-hover:animate-swing" />
                Ring It
              </Link>
            </Button>
          </div>
        </Card>

        {/* Today's Tasks */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="p-6">
            <h2 className="font-display text-sm tracking-wide mb-6">TODAY'S TASKS</h2>
            <div className="space-y-4">
              <TaskItem 
                label="Post content (reel, story, or carousel)"
                completed={tasks.content_posted}
                onChange={(v) => updateTask('content_posted', v)}
                disabled={isPaused}
              />
              <TaskItem 
                label="Respond to all DMs within 2 hours"
                completed={tasks.dms_responded}
                onChange={(v) => updateTask('dms_responded', v)}
                disabled={isPaused}
              />
              <TaskItem 
                label="Follow up with 3 potential clients"
                completed={tasks.follow_ups}
                onChange={(v) => updateTask('follow_ups', v)}
                disabled={isPaused}
              />
              <TaskItem 
                label="Log your daily metrics"
                completed={tasks.metrics_logged}
                onChange={(v) => updateTask('metrics_logged', v)}
                disabled={isPaused}
              />
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="font-display text-sm tracking-wide mb-4">PROOF OF WORK</h2>
              <p className="text-sm text-muted-foreground font-sans mb-4">
                Upload a screenshot or video of your content posted today.
              </p>
              {todayCompletion?.proof_url ? (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30">
                  <ImageIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-sans text-green-600">Proof uploaded</span>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    disabled={isPaused || uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Proof
                      </>
                    )}
                  </Button>
                </>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-sm tracking-wide mb-4">QUICK ACTIONS</h2>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  asChild
                >
                  <Link to={dashPath('/stats')}>
                    <ChevronRight className="w-4 h-4 mr-2" />
                    Log Today's Metrics
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  asChild
                >
                  <Link to={dashPath('/training')}>
                    <ChevronRight className="w-4 h-4 mr-2" />
                    See Content Ideas
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Current Week Module */}
        {currentWeek && (
          <Collapsible open={weeklyExpanded} onOpenChange={setWeeklyExpanded}>
            <Card className="mb-8 overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="p-6 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-foreground text-background rounded-lg flex flex-col items-center justify-center">
                        <span className="text-[10px] font-display tracking-wide opacity-70">WEEK</span>
                        <span className="text-lg font-display -mt-1">{currentWeek.week_number}</span>
                      </div>
                      <div>
                        <h2 className="font-display text-lg">{currentWeek.title}</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
                          <Calendar className="w-3 h-3" />
                          Days {currentWeek.start_day} - {currentWeek.end_day}
                          {currentWeek.assignments?.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{weekProgress.completed}/{weekProgress.total} assignments complete</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {weekProgress.total > 0 && (
                        isWeekComplete ? (
                          <Badge variant="default" className="font-display bg-green-600 hover:bg-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Completed!
                          </Badge>
                        ) : (
                          <Badge 
                            variant="secondary"
                            className="font-display"
                          >
                            {weekProgress.percentage}%
                          </Badge>
                        )
                      )}
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${weeklyExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-6 pb-6 space-y-4 border-t pt-4">
                  {/* Week Objective */}
                  {currentWeek.objective && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Target className="w-4 h-4 text-primary mt-0.5" />
                        <div>
                          <p className="text-xs font-display tracking-wide text-muted-foreground mb-1">THIS WEEK'S OBJECTIVE</p>
                          <p className="text-sm font-sans">{currentWeek.objective}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Week Description */}
                  {currentWeek.description && (
                    <p className="text-sm text-muted-foreground font-sans">{currentWeek.description}</p>
                  )}

                  {/* Week Video */}
                  {currentWeek.video_url && (
                    <a 
                      href={currentWeek.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Video className="w-4 h-4" />
                      Watch Week {currentWeek.week_number} Training Video
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {/* Weekly Assignments */}
                  {currentWeek.assignments && currentWeek.assignments.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-xs tracking-wide text-muted-foreground">WEEKLY ASSIGNMENTS</h3>
                        <span className="text-xs text-muted-foreground font-sans">Complete these once this week</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-sans -mt-1">
                        These are one-time tasks to complete over the next 7 days — not daily repeating.
                      </p>
                      <div className="space-y-2">
                        {currentWeek.assignments.map((assignment) => {
                          const completion = getAssignmentCompletion(assignment.id);
                          const isComplete = completion?.is_complete ?? false;
                          const AssignmentIcon = getAssignmentIcon(assignment.assignment_type);
                          
                          return (
                            <button
                              key={assignment.id}
                              onClick={() => toggleAssignmentCompletion(assignment.id)}
                              disabled={isPaused}
                              className="w-full text-left p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <div className={`
                                  w-5 h-5 border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
                                  ${isComplete 
                                    ? 'bg-foreground border-foreground' 
                                    : 'border-border hover:border-foreground'
                                  }
                                `}>
                                  {isComplete && <CheckCircle2 className="w-3 h-3 text-background" />}
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <AssignmentIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <span className={`text-sm font-medium ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
                                      {assignment.title}
                                    </span>
                                    {assignment.is_required && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                  {assignment.description && (
                                    <p className={`text-sm mt-1 ${isComplete ? 'text-muted-foreground/60 line-through' : 'text-muted-foreground'}`}>
                                      {assignment.description}
                                    </p>
                                  )}
                                  {assignment.proof_type !== 'none' && (
                                    <p className="text-[10px] text-muted-foreground mt-1 capitalize">
                                      Proof: {assignment.proof_type}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Week Resources */}
                  {currentWeek.resources && currentWeek.resources.length > 0 && (
                    <div className="space-y-3 pt-4 border-t">
                      <h3 className="font-display text-xs tracking-wide text-muted-foreground">RESOURCES & MATERIALS</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {currentWeek.resources.map((resource) => {
                          const isImage = resource.file_type.startsWith('image/') || 
                            ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(resource.file_type);
                          const isPdf = resource.file_type === 'application/pdf' || resource.file_type === 'pdf';

                          return (
                            <div
                              key={resource.id}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                            >
                              {/* Thumbnail/Icon */}
                              {isImage ? (
                                <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-muted">
                                  <img 
                                    src={resource.file_url} 
                                    alt={resource.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{resource.title}</p>
                                {resource.description && (
                                  <p className="text-xs text-muted-foreground truncate">{resource.description}</p>
                                )}
                                <Badge variant="outline" className="text-[10px] mt-1">
                                  {isImage ? 'Image' : isPdf ? 'PDF' : resource.file_type.toUpperCase()}
                                </Badge>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1">
                                <a
                                  href={resource.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                                  title={isImage ? "View Image" : "View"}
                                >
                                  <Eye className="w-4 h-4" />
                                </a>
                                <a
                                  href={resource.file_url}
                                  download
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Submit Day Button */}
        <div className="mt-8">
          <Button 
            className="w-full lg:w-auto font-display tracking-wide px-8 py-6"
            disabled={isPaused || submitting}
            onClick={handleSubmitDay}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                SUBMITTING...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                SUBMIT DAY {enrollment?.current_day} FOR COMPLETION
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground font-sans mt-2">
            All tasks, proof, and metrics must be complete to submit.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

interface TaskItemProps {
  label: string;
  completed: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function TaskItem({ label, completed, onChange, disabled }: TaskItemProps) {
  return (
    <button 
      className="flex items-center gap-3 cursor-pointer group w-full text-left disabled:cursor-not-allowed disabled:opacity-50"
      onClick={() => !disabled && onChange(!completed)}
      disabled={disabled}
    >
      <div className={`
        w-5 h-5 border flex items-center justify-center transition-colors
        ${completed 
          ? 'bg-foreground border-foreground' 
          : 'border-border group-hover:border-foreground'
        }
      `}>
        {completed && <CheckCircle2 className="w-3 h-3 text-background" />}
      </div>
      <span className={`text-sm font-sans ${completed ? 'line-through text-muted-foreground' : ''}`}>
        {label}
      </span>
    </button>
  );
}
