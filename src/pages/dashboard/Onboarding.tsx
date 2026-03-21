import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  Download, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight,
  PartyPopper,
  Sparkles,
  CreditCard,
  ClipboardCheck,
  Check,
  Camera,
  CalendarDays,
  MapPin,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

// Import preview images
import businessCardClassic from '@/assets/onboarding/business-card-classic.jpg';
import businessCardModern from '@/assets/onboarding/business-card-modern.jpg';
import headshotSessionPreview from '@/assets/onboarding/headshot-session.jpg';

type AppRole = Database['public']['Enums']['app_role'];

interface Handbook {
  id: string;
  title: string;
  category: string | null;
  content: string | null;
  file_url: string | null;
  version: string | null;
  updated_at: string;
}

interface Acknowledgment {
  handbook_id: string;
  acknowledged_at: string;
}

interface BusinessCardRequest {
  id: string;
  design_style: string;
  status: string;
  requested_at: string;
}

interface HeadshotRequest {
  id: string;
  status: string;
  requested_at: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  scheduled_location: string | null;
}

interface TaskCompletion {
  task_key: string;
  completed_at: string;
}

interface OnboardingTask {
  id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  visible_to_roles: AppRole[];
  display_order: number;
  is_required: boolean;
}

const BUSINESS_CARD_STYLES = [
  { 
    id: 'classic', 
    name: 'Classic', 
    description: 'Clean and professional with traditional layout',
    image: businessCardClassic
  },
  { 
    id: 'modern', 
    name: 'Modern', 
    description: 'Bold and contemporary with striking design',
    image: businessCardModern
  },
];

export default function Onboarding() {
  const { user } = useAuth();
  const roles = useEffectiveRoles();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Handbook state
  const [handbooks, setHandbooks] = useState<Handbook[]>([]);
  const [acknowledgments, setAcknowledgments] = useState<Acknowledgment[]>([]);
  const [selectedHandbook, setSelectedHandbook] = useState<Handbook | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasReadContent, setHasReadContent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Business card state
  const [businessCardRequest, setBusinessCardRequest] = useState<BusinessCardRequest | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [requestingCard, setRequestingCard] = useState(false);
  
  // Headshot state
  const [headshotRequest, setHeadshotRequest] = useState<HeadshotRequest | null>(null);
  const [requestingHeadshot, setRequestingHeadshot] = useState(false);
  
  // Task state
  const [onboardingTasks, setOnboardingTasks] = useState<OnboardingTask[]>([]);
  const [taskCompletions, setTaskCompletions] = useState<TaskCompletion[]>([]);
  
  // Loading state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roles.length > 0 && user) {
      fetchData();
    } else if (roles.length === 0) {
      setLoading(false);
    }
  }, [roles, user]);

  const fetchData = async () => {
    const [handbooksResult, acknowledgementsResult, businessCardResult, headshotResult, tasksResult, completionsResult] = await Promise.all([
      supabase
        .from('handbooks')
        .select('id, title, category, content, file_url, version, updated_at, visible_to_roles')
        .eq('is_active', true)
        .eq('category', 'Onboarding')
        .order('title'),
      supabase
        .from('handbook_acknowledgments')
        .select('handbook_id, acknowledged_at'),
      supabase
        .from('business_card_requests')
        .select('id, design_style, status, requested_at')
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('headshot_requests')
        .select('id, status, requested_at, scheduled_date, scheduled_time, scheduled_location')
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('onboarding_tasks')
        .select('id, title, description, visible_to_roles, display_order, is_required')
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('onboarding_task_completions')
        .select('task_key, completed_at')
    ]);

    if (handbooksResult.error) {
      console.error('Error fetching handbooks:', handbooksResult.error);
    } else {
      const filteredHandbooks = (handbooksResult.data || []).filter((handbook: any) => {
        const visibleRoles = handbook.visible_to_roles || [];
        return roles.some(role => visibleRoles.includes(role));
      });
      setHandbooks(filteredHandbooks);
      
      if (acknowledgementsResult.data) {
        const ackIds = acknowledgementsResult.data.map(a => a.handbook_id);
        const firstUnack = filteredHandbooks.findIndex(h => !ackIds.includes(h.id));
        if (firstUnack !== -1) {
          setCurrentIndex(firstUnack);
        }
      }
    }

    if (!acknowledgementsResult.error) {
      setAcknowledgments(acknowledgementsResult.data || []);
    }

    if (!businessCardResult.error && businessCardResult.data) {
      setBusinessCardRequest(businessCardResult.data);
    }

    if (!headshotResult.error && headshotResult.data) {
      setHeadshotRequest(headshotResult.data);
    }

    // Filter tasks by user roles
    if (!tasksResult.error) {
      const filteredTasks = (tasksResult.data || []).filter((task: { visible_to_roles: AppRole[] | null }) => {
        const visibleRoles = task.visible_to_roles || [];
        return roles.some(role => visibleRoles.includes(role));
      }) as OnboardingTask[];
      setOnboardingTasks(filteredTasks);
    }

    if (!completionsResult.error) {
      setTaskCompletions(completionsResult.data || []);
    }

    setLoading(false);
  };

  const isAcknowledged = (handbookId: string) => {
    return acknowledgments.some(ack => ack.handbook_id === handbookId);
  };

  const isTaskCompleted = (taskId: string) => {
    return taskCompletions.some(tc => tc.task_key === taskId);
  };

  const handleAcknowledge = async () => {
    if (!selectedHandbook || !user) return;
    
    setSubmitting(true);
    
    const { error } = await supabase
      .from('handbook_acknowledgments')
      .insert({
        user_id: user.id,
        handbook_id: selectedHandbook.id
      });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } else {
      setAcknowledgments(prev => [...prev, {
        handbook_id: selectedHandbook.id,
        acknowledged_at: new Date().toISOString()
      }]);
      toast({
        title: 'Acknowledged!',
        description: 'Document has been acknowledged.'
      });
      setSelectedHandbook(null);
      setHasReadContent(false);
      
      const nextUnack = handbooks.findIndex((h, i) => 
        i > currentIndex && !isAcknowledged(h.id) && h.id !== selectedHandbook.id
      );
      if (nextUnack !== -1) {
        setCurrentIndex(nextUnack);
      }
    }
    
    setSubmitting(false);
  };

  const handleRequestBusinessCard = async () => {
    if (!selectedStyle || !user) return;
    
    setRequestingCard(true);
    
    const { data, error } = await supabase
      .from('business_card_requests')
      .insert({
        user_id: user.id,
        design_style: selectedStyle
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } else {
      setBusinessCardRequest(data);
      toast({
        title: 'Request Submitted!',
        description: 'Your business card request has been submitted.'
      });
    }
    
    setRequestingCard(false);
  };

  const handleRequestHeadshot = async () => {
    if (!user) return;
    
    setRequestingHeadshot(true);
    
    // First fetch the current user's profile for name/email
    const { data: profile } = await supabase
      .from('employee_profiles')
      .select('full_name, display_name, email')
      .eq('user_id', user.id)
      .single();
    
    const { data, error } = await supabase
      .from('headshot_requests')
      .insert({
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } else {
      setHeadshotRequest(data);
      toast({
        title: 'Request Submitted!',
        description: 'Your headshot session request has been submitted. An admin will schedule your session.'
      });
      
      // Notify admins via edge function
      try {
        await supabase.functions.invoke('notify-headshot-request', {
          body: {
            requester_name: profile?.display_name || profile?.full_name || 'Team Member',
            requester_email: profile?.email || user.email || '',
            requested_at: data.requested_at,
          },
        });
      } catch (notifyError) {
        console.error('Failed to send admin notification:', notifyError);
        // Don't show error to user - the request was still successful
      }
    }
    
    setRequestingHeadshot(false);
  };

  const handleToggleTask = async (taskId: string) => {
    if (!user) return;
    
    const isCompleted = isTaskCompleted(taskId);
    
    if (isCompleted) {
      const { error } = await supabase
        .from('onboarding_task_completions')
        .delete()
        .eq('user_id', user.id)
        .eq('task_key', taskId);

      if (!error) {
        setTaskCompletions(prev => prev.filter(tc => tc.task_key !== taskId));
      }
    } else {
      const { error } = await supabase
        .from('onboarding_task_completions')
        .insert({
          user_id: user.id,
          task_key: taskId
        });

      if (!error) {
        setTaskCompletions(prev => [...prev, {
          task_key: taskId,
          completed_at: new Date().toISOString()
        }]);
      }
    }
  };

  const openHandbook = (handbook: Handbook, index: number) => {
    setSelectedHandbook(handbook);
    setCurrentIndex(index);
    setHasReadContent(false);
  };

  const acknowledgedCount = handbooks.filter(h => isAcknowledged(h.id)).length;
  const totalHandbooks = handbooks.length;
  const handbooksProgress = totalHandbooks > 0 ? (acknowledgedCount / totalHandbooks) * 100 : 100;
  
  const completedTasksCount = onboardingTasks.filter(t => isTaskCompleted(t.id)).length;
  const totalTasks = onboardingTasks.length;
  const tasksProgress = totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 100;
  
  // Calculate overall progress (4 sections now: handbooks, business cards, headshots, tasks)
  const businessCardProgress = businessCardRequest ? 100 : 0;
  const headshotProgress = headshotRequest ? 100 : 0;
  const overallProgress = ((handbooksProgress + businessCardProgress + headshotProgress + tasksProgress) / 4);

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
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-3xl lg:text-4xl mb-2">WELCOME ABOARD</h1>
          <p className="text-muted-foreground font-sans max-w-md mx-auto">
            Complete the following sections to finish your onboarding process.
          </p>
        </div>

        {/* Overall Progress */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-sm tracking-wider">OVERALL PROGRESS</span>
            <span className="font-sans text-sm text-muted-foreground">
              {Math.round(overallProgress)}% complete
            </span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </Card>

        {/* Section 1: Onboarding Tasks Checklist */}
        <Collapsible defaultOpen={tasksProgress < 100}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="p-6 border-b bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                    tasksProgress >= 100 
                      ? "bg-green-500 animate-[pulse_0.5s_ease-in-out]" 
                      : "bg-primary/10"
                  )}>
                    {tasksProgress >= 100 ? (
                      <CheckCircle2 className="w-5 h-5 text-white animate-[scale-in_0.3s_ease-out]" />
                    ) : (
                      <ClipboardCheck className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h2 className="font-display text-lg">ONBOARDING CHECKLIST</h2>
                    <p className="text-sm text-muted-foreground font-sans">
                      {tasksProgress >= 100 ? 'All tasks completed!' : 'Complete these tasks to finish your setup'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-display text-lg">{completedTasksCount}/{totalTasks}</span>
                      <p className="text-xs text-muted-foreground">completed</p>
                    </div>
                    <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="p-6 space-y-2">
                {onboardingTasks.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="font-sans text-sm">No tasks assigned to your role</p>
                  </div>
                ) : (
                  onboardingTasks.map((task) => {
                    const completed = isTaskCompleted(task.id);
                    
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "w-full flex items-start gap-3 p-3 rounded-lg border transition-all",
                          completed
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-border'
                        )}
                      >
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className="flex-1 flex items-start gap-3 text-left hover:opacity-80 transition-opacity"
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all mt-0.5 shrink-0",
                            completed
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground/30'
                          )}>
                            {completed && <Check className="w-4 h-4 text-primary-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-sans text-sm",
                                completed && 'text-muted-foreground line-through'
                              )}>
                                {task.title}
                              </span>
                              {task.is_required ? (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Optional</Badge>
                              )}
                            </div>
                            {task.description && (
                              <span className="text-xs text-muted-foreground block mt-0.5">
                                {task.description}
                              </span>
                            )}
                          </div>
                        </button>
                        {task.link_url && (
                          <a
                            href={task.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 p-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                            title="Open link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 2: Handbooks */}
        <Collapsible defaultOpen={handbooksProgress < 100}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="p-6 border-b bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                    handbooksProgress >= 100 
                      ? "bg-green-500 animate-[pulse_0.5s_ease-in-out]" 
                      : "bg-primary/10"
                  )}>
                    {handbooksProgress >= 100 ? (
                      <CheckCircle2 className="w-5 h-5 text-white animate-[scale-in_0.3s_ease-out]" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h2 className="font-display text-lg">READ & ACKNOWLEDGE HANDBOOKS</h2>
                    <p className="text-sm text-muted-foreground font-sans">
                      {handbooksProgress >= 100 ? 'All handbooks acknowledged!' : 'Review and acknowledge receipt of required documents'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-display text-lg">{acknowledgedCount}/{totalHandbooks}</span>
                      <p className="text-xs text-muted-foreground">completed</p>
                    </div>
                    <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="p-6 space-y-3">
                {handbooks.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="font-sans text-sm">No handbooks assigned to your role</p>
                  </div>
                ) : (
                  handbooks.map((handbook, index) => {
                    const acknowledged = isAcknowledged(handbook.id);
                    const isCurrent = index === currentIndex && !acknowledged;
                    
                    return (
                      <div 
                        key={handbook.id} 
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-lg border transition-all",
                          acknowledged 
                            ? 'border-primary/30 bg-primary/5' 
                            : isCurrent 
                              ? 'border-primary ring-1 ring-primary/20' 
                              : 'border-border opacity-60'
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-display text-xs",
                          acknowledged 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {acknowledged ? <Check className="w-4 h-4" /> : index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-sans font-medium text-sm">{handbook.title}</h3>
                          <p className="text-xs text-muted-foreground">v{handbook.version}</p>
                        </div>

                        {acknowledged ? (
                          <span className="text-xs text-primary font-sans font-medium">Completed</span>
                        ) : (
                          <Button 
                            onClick={() => openHandbook(handbook, index)}
                            size="sm"
                            variant={isCurrent ? 'default' : 'outline'}
                            className="font-display text-xs"
                          >
                            REVIEW
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 3: Request Headshots */}
        <Collapsible defaultOpen={!headshotRequest}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="p-6 border-b bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                    headshotRequest 
                      ? "bg-green-500 animate-[pulse_0.5s_ease-in-out]" 
                      : "bg-primary/10"
                  )}>
                    {headshotRequest ? (
                      <CheckCircle2 className="w-5 h-5 text-white animate-[scale-in_0.3s_ease-out]" />
                    ) : (
                      <Camera className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h2 className="font-display text-lg">REQUEST YOUR HEADSHOTS</h2>
                    <p className="text-sm text-muted-foreground font-sans">
                      {headshotRequest ? 'Headshot session requested!' : 'Request a professional headshot session'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {headshotRequest && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                        Requested
                      </span>
                    )}
                    <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="p-6">
                {headshotRequest ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <h3 className="font-display text-lg mb-1">REQUEST SUBMITTED</h3>
                    <p className="text-sm text-muted-foreground font-sans mb-4">
                      An admin will schedule your headshot session.
                    </p>
                    
                    {headshotRequest.scheduled_date ? (
                      <div className="p-4 bg-muted/50 rounded-lg text-left max-w-xs mx-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarDays className="w-4 h-4 text-primary" />
                          <span className="font-sans font-medium text-sm">
                            {new Date(headshotRequest.scheduled_date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                        {headshotRequest.scheduled_time && (
                          <p className="text-xs text-muted-foreground ml-6">{headshotRequest.scheduled_time}</p>
                        )}
                        {headshotRequest.scheduled_location && (
                          <div className="flex items-center gap-2 mt-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{headshotRequest.scheduled_location}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Status: <span className="capitalize">{headshotRequest.status}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg overflow-hidden">
                      <img 
                        src={headshotSessionPreview} 
                        alt="Professional headshot session"
                        className="w-full h-40 object-cover"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground font-sans mb-2">
                        Professional headshots are essential for your business cards and team profile.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Once requested, an admin will coordinate with you to schedule your session.
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleRequestHeadshot}
                      disabled={requestingHeadshot}
                      className="w-full font-display"
                    >
                      {requestingHeadshot ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          REQUEST HEADSHOT SESSION
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 4: Business Cards */}
        <Collapsible defaultOpen={!businessCardRequest}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <div className="p-6 border-b bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                    businessCardRequest 
                      ? "bg-green-500 animate-[pulse_0.5s_ease-in-out]" 
                      : "bg-primary/10"
                  )}>
                    {businessCardRequest ? (
                      <CheckCircle2 className="w-5 h-5 text-white animate-[scale-in_0.3s_ease-out]" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h2 className="font-display text-lg">REQUEST YOUR BUSINESS CARDS</h2>
                    <p className="text-sm text-muted-foreground font-sans">
                      {businessCardRequest ? 'Business cards requested!' : 'Choose your preferred design style'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {businessCardRequest && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                        Requested
                      </span>
                    )}
                    <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="p-6">
                {businessCardRequest ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <h3 className="font-display text-lg mb-1">REQUEST SUBMITTED</h3>
                    <p className="text-sm text-muted-foreground font-sans">
                      You selected the <span className="font-medium text-foreground capitalize">{businessCardRequest.design_style}</span> design.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Status: <span className="capitalize">{businessCardRequest.status}</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {BUSINESS_CARD_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id)}
                          className={cn(
                            "relative p-3 rounded-lg border-2 text-left transition-all overflow-hidden",
                            selectedStyle === style.id
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <div className="aspect-[5/3] rounded-md mb-3 overflow-hidden bg-muted">
                            <img 
                              src={style.image} 
                              alt={`${style.name} design preview`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <h3 className="font-display text-sm mb-1">{style.name}</h3>
                          <p className="text-xs text-muted-foreground font-sans">{style.description}</p>
                          {selectedStyle === style.id && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={handleRequestBusinessCard}
                      disabled={!selectedStyle || requestingCard}
                      className="w-full font-display"
                    >
                      {requestingCard ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'REQUEST BUSINESS CARDS'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Completion CTA */}
        {overallProgress >= 100 && (
          <Card className="p-8 text-center bg-primary/5 border-primary/30">
            <PartyPopper className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h2 className="font-display text-2xl mb-2">ONBOARDING COMPLETE!</h2>
            <p className="text-muted-foreground font-sans mb-6">
              You've completed all onboarding steps. You're ready to start!
            </p>
            <Button onClick={() => navigate('/dashboard')} size={tokens.button.hero} className="font-display">
              <Sparkles className="w-4 h-4 mr-2" />
              GO TO DASHBOARD
            </Button>
          </Card>
        )}

        {/* Handbook Detail Dialog */}
        <Dialog open={!!selectedHandbook} onOpenChange={(open) => !open && setSelectedHandbook(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            {selectedHandbook && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="px-2 py-0.5 bg-muted rounded">
                      Step {currentIndex + 1} of {totalHandbooks}
                    </span>
                  </div>
                  <DialogTitle className="font-display text-xl">
                    {selectedHandbook.title}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Version {selectedHandbook.version}
                  </p>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto mt-4 space-y-4">
                  {selectedHandbook.content && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {selectedHandbook.content}
                      </div>
                    </div>
                  )}

                  {selectedHandbook.file_url && (
                    <Button asChild variant="outline" className="w-full font-display">
                      <a href={selectedHandbook.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-2" />
                        DOWNLOAD & REVIEW FILE
                      </a>
                    </Button>
                  )}

                  {!selectedHandbook.content && !selectedHandbook.file_url && (
                    <p className="text-muted-foreground text-center py-8">
                      No content available for this document.
                    </p>
                  )}
                </div>

                <DialogFooter className="mt-6 border-t pt-4">
                  <div className="w-full space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                      <Checkbox
                        id="read-confirm"
                        checked={hasReadContent}
                        onCheckedChange={(checked) => setHasReadContent(checked === true)}
                        className="mt-0.5"
                      />
                      <label 
                        htmlFor="read-confirm" 
                        className="text-sm font-sans leading-tight cursor-pointer"
                      >
                        I confirm that I have read, understood, and agree to comply with the contents of this document.
                      </label>
                    </div>
                    <Button 
                      onClick={handleAcknowledge} 
                      disabled={!hasReadContent || submitting}
                      className="w-full font-display"
                      size={tokens.button.hero}
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          ACKNOWLEDGE & CONTINUE
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}