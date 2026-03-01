import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { tokens } from '@/lib/design-tokens';
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  Plus,
  Eye,
  MessageSquare,
  ExternalLink,
  Award,
  Search,
  Filter,
  Send,
  ArrowLeft,
} from 'lucide-react';
import {
  useAllAssistantProgress,
  useAllGraduationRequirements,
  useUpdateSubmissionStatus,
  useAddFeedback,
  useCreateRequirement,
  useUpdateRequirement,
  useSubmissionFeedback,
  type AssistantProgress,
  type GraduationSubmission,
} from '@/hooks/useGraduationTracker';
import { useFormatDate } from '@/hooks/useFormatDate';

const STATUS_COLORS = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const STATUS_LABELS = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Needs Work',
};

const CATEGORY_LABELS: Record<string, string> = {
  certification: 'Certification',
  experience: 'Experience',
  training: 'Training',
  approval: 'Final Approval',
  general: 'General',
};

function SubmissionReviewSheet({ 
  submission, 
  requirementTitle, 
  onClose 
}: { 
  submission: GraduationSubmission; 
  requirementTitle: string;
  onClose: () => void;
}) {
  const { formatDate } = useFormatDate();
  const updateStatus = useUpdateSubmissionStatus();
  const addFeedback = useAddFeedback();
  const { data: feedback = [] } = useSubmissionFeedback(submission.id);
  const [feedbackText, setFeedbackText] = useState('');

  const handleAddFeedback = () => {
    if (!feedbackText.trim()) return;
    addFeedback.mutate({
      submissionId: submission.id,
      content: feedbackText,
    });
    setFeedbackText('');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Requirement</h3>
        <p className="text-lg font-medium">{requirementTitle}</p>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Submission</h3>
        <div className="p-4 rounded-lg bg-muted/30 space-y-3">
          {submission.content && (
            <p className="text-sm">{submission.content}</p>
          )}
          {submission.attachment_url && (
            <a 
              href={submission.attachment_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              View Attachment
            </a>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
            <Clock className="h-3 w-3" />
            Submitted {formatDate(new Date(submission.submitted_at), 'MMM d, h:mm a')}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Status</h3>
        <div className="flex gap-2">
          <Button 
            variant={submission.status === 'approved' ? 'default' : 'outline'}
            className={submission.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            onClick={() => updateStatus.mutate({ id: submission.id, status: 'approved' })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button 
            variant={submission.status === 'rejected' ? 'default' : 'outline'}
            className={submission.status === 'rejected' ? 'bg-destructive hover:bg-destructive/90' : ''}
            onClick={() => updateStatus.mutate({ id: submission.id, status: 'rejected' })}
            disabled={updateStatus.isPending}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Request Changes
          </Button>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Feedback History</h3>
        
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-4">
            {feedback.map((item) => (
              <div key={item.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={item.author?.photo_url || undefined} />
                  <AvatarFallback>{item.author?.full_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.author?.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(new Date(item.created_at), 'MMM d')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input 
            value={feedbackText} 
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Add feedback..."
          />
          <Button size="icon" onClick={handleAddFeedback} disabled={!feedbackText.trim() || addFeedback.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssistantRow({ assistant, requirements }: { assistant: AssistantProgress; requirements: any[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<{ submission: GraduationSubmission; title: string } | null>(null);
  
  const completedCount = assistant.submissions.filter(s => s.status === 'approved').length;
  const progress = Math.round((completedCount / (requirements.length || 1)) * 100);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="overflow-hidden transition-all hover:border-primary/50">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10 border-2 border-background">
              <AvatarImage src={assistant.photo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {assistant.full_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium text-sm">{assistant.full_name}</h3>
              <p className="text-xs text-muted-foreground">
                {completedCount} of {requirements.length} completed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 flex-1 max-w-sm px-8">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon">
              <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <div className="border-t pt-4 grid gap-4">
              {requirements.map((req) => {
                const submission = assistant.submissions.find(s => s.requirement_id === req.id);
                const status = submission?.status;
                
                return (
                  <div key={req.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{req.title}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {CATEGORY_LABELS[req.category] || req.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground max-w-lg">
                        {req.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {status && (
                        <Badge className={STATUS_COLORS[status]} variant="outline">
                          {STATUS_LABELS[status]}
                        </Badge>
                      )}
                      {submission && (
                        <Button 
                          variant="ghost" 
                          size={tokens.button.inline}
                          onClick={() => setSelectedSubmission({ submission, title: req.title })}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Card>

      <PremiumFloatingPanel 
        open={!!selectedSubmission} 
        onOpenChange={(open) => !open && setSelectedSubmission(null)}
        maxWidth="560px"
      >
        <div className="p-5 pb-3 border-b border-border/40">
          <h2 className="font-display text-sm tracking-wide uppercase">Review Submission</h2>
        </div>
        {selectedSubmission && (
          <div className="flex-1 overflow-y-auto p-5">
            <SubmissionReviewSheet 
              submission={selectedSubmission.submission} 
              requirementTitle={selectedSubmission.title}
              onClose={() => setSelectedSubmission(null)}
            />
          </div>
        )}
      </PremiumFloatingPanel>
    </Collapsible>
  );
}

function RequirementsManager() {
  const { data: requirements, isLoading } = useAllGraduationRequirements();
  const createRequirement = useCreateRequirement();
  const updateRequirement = useUpdateRequirement();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newReq, setNewReq] = useState({ title: '', description: '', category: 'general' });

  const handleCreate = () => {
    createRequirement.mutate(newReq, {
      onSuccess: () => {
        setIsAddOpen(false);
        setNewReq({ title: '', description: '', category: 'general' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage graduation requirements that assistants must complete
        </p>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Requirement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Requirement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newReq.title}
                  onChange={(e) => setNewReq(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Complete 50 Blowouts"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newReq.description}
                  onChange={(e) => setNewReq(p => ({ ...p, description: e.target.value }))}
                  placeholder="Detailed description of the requirement..."
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newReq.category} onValueChange={(v) => setNewReq(p => ({ ...p, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certification">Certification</SelectItem>
                    <SelectItem value="experience">Experience</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="approval">Final Approval</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={!newReq.title.trim() || createRequirement.isPending} className="w-full">
                Create Requirement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {requirements?.map((req) => (
          <div key={req.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{req.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {CATEGORY_LABELS[req.category] || req.category}
                  </Badge>
                  {req.description && (
                    <span className="text-xs text-muted-foreground truncate max-w-md">
                      {req.description}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={req.is_active ? 'default' : 'secondary'}>
                {req.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Button
                variant="ghost"
                size={tokens.button.inline}
                onClick={() => updateRequirement.mutate({ id: req.id, is_active: !req.is_active })}
              >
                {req.is_active ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GraduationTracker() {
  const { data: assistants, isLoading: loadingAssistants } = useAllAssistantProgress();
  const { data: requirements, isLoading: loadingReqs } = useAllGraduationRequirements();

  return (
    <DashboardLayout>
      <DashboardPageHeader 
        title="Graduation Tracker"
        backTo="/dashboard/admin"
      />
      
      <div className="space-y-6">
        <Tabs defaultValue="progress" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="progress">Assistant Progress</TabsTrigger>
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="mt-6 space-y-4">
            {loadingAssistants || loadingReqs ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : assistants?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No assistants found.
              </div>
            ) : (
              assistants?.map(assistant => (
                <AssistantRow 
                  key={assistant.user_id} 
                  assistant={assistant} 
                  requirements={requirements || []} 
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="requirements" className="mt-6">
            <RequirementsManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
