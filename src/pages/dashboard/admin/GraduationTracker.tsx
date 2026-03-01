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
import { cn } from '@/lib/utils';
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
  type GraduationFeedback,
} from '@/hooks/useGraduationTracker';
import { useFormatDate } from '@/hooks/useFormatDate';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  needs_revision: 'bg-orange-100 text-orange-800',
  rejected: 'bg-red-100 text-red-800',
};

function SubmissionReviewPanel({ submission, requirementTitle }: { submission: GraduationSubmission; requirementTitle: string }) {
  const { formatDate } = useFormatDate();
  const updateStatus = useUpdateSubmissionStatus();
  const addFeedback = useAddFeedback();
  const { data: feedback = [] } = useSubmissionFeedback(submission.id);
  const [feedbackText, setFeedbackText] = useState('');

  const handleAddFeedback = () => {
    if (!feedbackText.trim()) return;
    addFeedback.mutate({
      submissionId: submission.id,
      feedback: feedbackText,
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
          {submission.assistant_notes && (
            <p className="text-sm">{submission.assistant_notes}</p>
          )}
          {submission.proof_url && (
            <a 
              href={submission.proof_url} 
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
            onClick={() => updateStatus.mutate({ submissionId: submission.id, status: 'approved' })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button 
            variant={submission.status === 'rejected' ? 'default' : 'outline'}
            className={submission.status === 'rejected' ? 'bg-destructive hover:bg-destructive/90' : ''}
            onClick={() => updateStatus.mutate({ submissionId: submission.id, status: 'rejected' })}
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
            {feedback.map((item: GraduationFeedback) => (
              <div key={item.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={item.coach?.photo_url || undefined} />
                  <AvatarFallback>{item.coach?.full_name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.coach?.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(new Date(item.created_at), 'MMM d')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.feedback}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Add feedback..."
            className="min-h-[60px] resize-none"
          />
          <Button 
            size="icon" 
            onClick={handleAddFeedback}
            disabled={!feedbackText.trim() || addFeedback.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssistantRow({ assistant, requirements }: { assistant: AssistantProgress; requirements: any[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<GraduationSubmission | null>(null);
  const progress = assistant.total_requirements > 0 
    ? (assistant.completed_requirements / assistant.total_requirements) * 100 
    : 0;

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-4 p-4 rounded-xl border bg-card/50">
          <Avatar className="h-10 w-10">
            <AvatarImage src={assistant.photo_url || undefined} />
            <AvatarFallback>{assistant.full_name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{assistant.full_name}</span>
              {assistant.pending_submissions > 0 && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                  {assistant.pending_submissions} pending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {assistant.completed_requirements}/{assistant.total_requirements} complete
              </span>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon">
              <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-2 ml-14 space-y-2">
          {requirements.map((req) => {
            const submission = assistant.submissions.find(s => s.requirement_id === req.id);
            return (
              <div 
                key={req.id} 
                className="flex items-center justify-between p-3 rounded-lg border bg-card/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => submission && setSelectedSubmission(submission)}
              >
                <div className="flex items-center gap-3">
                  {submission?.status === 'approved' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : submission?.status === 'pending' ? (
                    <Clock className="h-4 w-4 text-amber-600" />
                  ) : submission?.status === 'needs_revision' ? (
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span className="text-sm">{req.title}</span>
                </div>
                {submission && (
                  <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[submission.status as keyof typeof STATUS_COLORS])}>
                    {submission.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>

      <PremiumFloatingPanel
        open={!!selectedSubmission}
        onOpenChange={() => setSelectedSubmission(null)}
        maxWidth="560px"
      >
        {selectedSubmission && (
          <div className="p-5">
            <SubmissionReviewPanel
              submission={selectedSubmission}
              requirementTitle={requirements.find(r => r.id === selectedSubmission.requirement_id)?.title || 'Unknown'}
            />
          </div>
        )}
      </PremiumFloatingPanel>
    </>
  );
}

function RequirementsManager() {
  const { data: requirements = [], isLoading } = useAllGraduationRequirements();
  const createRequirement = useCreateRequirement();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');

  const handleCreate = () => {
    if (!title.trim()) return;
    createRequirement.mutate(
      { title: title.trim(), description: description.trim() || null, category },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setShowCreate(false);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm tracking-wide uppercase">Requirements</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add
        </Button>
      </div>

      {showCreate && (
        <Card className="p-4 space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Requirement title" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!title.trim() || createRequirement.isPending}>Save</Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className={cn("animate-pulse rounded-md bg-muted h-12 w-full")} />)}
        </div>
      ) : (
        requirements.map((req) => (
          <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium text-sm">{req.title}</p>
              {req.description && <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>}
            </div>
            <Badge variant="secondary" className="text-xs">{req.category}</Badge>
          </div>
        ))
      )}
    </div>
  );
}

export default function GraduationTracker() {
  const { data: assistants, isLoading: loadingAssistants } = useAllAssistantProgress();
  const { data: requirements, isLoading: loadingReqs } = useAllGraduationRequirements();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssistants = assistants?.filter(a => 
    a.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <DashboardPageHeader 
        title="Graduation Tracker"
        actions={
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assistants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        }
      />

      <div className="container max-w-[1600px] px-8 py-8 space-y-6">
        <Tabs defaultValue="assistants">
          <TabsList>
            <TabsTrigger value="assistants">
              <Users className="h-4 w-4 mr-2" />
              Assistants
            </TabsTrigger>
            <TabsTrigger value="requirements">
              <GraduationCap className="h-4 w-4 mr-2" />
              Requirements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assistants" className="mt-6 space-y-3">
            {loadingAssistants || loadingReqs ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className={cn("animate-pulse rounded-md bg-muted h-24 w-full")} />)}
              </div>
            ) : filteredAssistants?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No assistants found.
              </div>
            ) : (
              filteredAssistants?.map(assistant => (
                <AssistantRow 
                  key={assistant.assistant_id} 
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
