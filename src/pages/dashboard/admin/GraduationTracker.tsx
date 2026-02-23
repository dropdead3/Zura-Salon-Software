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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  needs_revision: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  rejected: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
};

const STATUS_LABELS = {
  pending: 'Pending Review',
  approved: 'Approved',
  needs_revision: 'Needs Revision',
  rejected: 'Rejected',
};

const CATEGORY_LABELS: Record<string, string> = {
  certification: 'Certifications',
  experience: 'Experience',
  training: 'Training',
  approval: 'Final Approvals',
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
  const [feedback, setFeedback] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'approved' | 'needs_revision' | 'rejected' | ''>('');
  const updateStatus = useUpdateSubmissionStatus();
  const addFeedback = useAddFeedback();
  const { data: feedbackHistory } = useSubmissionFeedback(submission.id);

  const handleSubmitReview = () => {
    if (selectedStatus) {
      updateStatus.mutate({
        submissionId: submission.id,
        status: selectedStatus,
        feedback: feedback || undefined,
      }, {
        onSuccess: () => {
          setFeedback('');
          setSelectedStatus('');
          onClose();
        },
      });
    }
  };

  const handleAddNote = () => {
    if (feedback.trim()) {
      addFeedback.mutate({
        submissionId: submission.id,
        feedback: feedback.trim(),
      }, {
        onSuccess: () => setFeedback(''),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-lg">{requirementTitle}</h3>
        <Badge className={STATUS_COLORS[submission.status]}>
          {STATUS_LABELS[submission.status]}
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-muted-foreground">Submitted</Label>
          <p className="text-sm">{formatDate(new Date(submission.submitted_at), 'PPP p')}</p>
        </div>

        {submission.assistant_notes && (
          <div>
            <Label className="text-muted-foreground">Assistant's Notes</Label>
            <p className="text-sm bg-muted p-3 rounded-md mt-1">{submission.assistant_notes}</p>
          </div>
        )}

        {submission.proof_url && (
          <div>
            <Label className="text-muted-foreground">Proof/Evidence</Label>
            <a 
              href={submission.proof_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline mt-1"
            >
              <ExternalLink className="h-4 w-4" />
              View Uploaded Proof
            </a>
          </div>
        )}
      </div>

      {/* Feedback History */}
      {feedbackHistory && feedbackHistory.length > 0 && (
        <div>
          <Label className="text-muted-foreground mb-2 block">Feedback History</Label>
          <ScrollArea className="h-40 rounded-md border">
            <div className="p-3 space-y-3">
              {feedbackHistory.map((fb) => (
                <div key={fb.id} className="text-sm border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <span className="font-medium">{fb.coach?.full_name || 'Coach'}</span>
                    <span>•</span>
                    <span>{formatDate(new Date(fb.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                  <p>{fb.feedback}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Add Feedback / Review */}
      <div className="space-y-3 pt-4 border-t">
        <Label>Add Feedback</Label>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Write feedback for the assistant..."
          rows={3}
        />

        {submission.status === 'pending' ? (
          <div className="flex flex-col gap-3">
            <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select decision..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">✓ Approve</SelectItem>
                <SelectItem value="needs_revision">↻ Needs Revision</SelectItem>
                <SelectItem value="rejected">✗ Reject</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleSubmitReview} 
              disabled={!selectedStatus || updateStatus.isPending}
              className="w-full"
            >
              Submit Review
            </Button>
          </div>
        ) : (
          <Button onClick={handleAddNote} disabled={!feedback.trim() || addFeedback.isPending}>
            <Send className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        )}
      </div>
    </div>
  );
}

function AssistantCard({ assistant, requirements }: { assistant: AssistantProgress; requirements: any[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<{ submission: GraduationSubmission; title: string } | null>(null);
  
  const progressPercent = assistant.total_requirements > 0 
    ? (assistant.completed_requirements / assistant.total_requirements) * 100 
    : 0;

  // Group submissions by requirement
  const submissionMap = new Map(assistant.submissions.map(s => [s.requirement_id, s]));

  // Group requirements by category
  const requirementsByCategory = requirements.reduce((acc, req) => {
    const cat = req.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(req);
    return acc;
  }, {} as Record<string, typeof requirements>);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={assistant.photo_url || undefined} />
                  <AvatarFallback>{assistant.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{assistant.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{assistant.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{assistant.completed_requirements}/{assistant.total_requirements}</span>
                    <span className="text-muted-foreground">completed</span>
                  </div>
                  <Progress value={progressPercent} className="w-32 h-2 mt-1" />
                </div>
                <div className="flex gap-2">
                  {assistant.pending_submissions > 0 && (
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                      {assistant.pending_submissions} pending
                    </Badge>
                  )}
                  {assistant.needs_revision > 0 && (
                    <Badge variant="secondary" className="bg-rose-500/10 text-rose-600">
                      {assistant.needs_revision} needs revision
                    </Badge>
                  )}
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-6">
              {Object.entries(requirementsByCategory).map(([category, reqs]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    {CATEGORY_LABELS[category] || category}
                  </h4>
                  <div className="space-y-2">
                    {(reqs as typeof requirements).map((req) => {
                      const submission = submissionMap.get(req.id);
                      const status = submission?.status;

                      return (
                        <div 
                          key={req.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {status === 'approved' ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : status === 'pending' ? (
                              <Clock className="h-5 w-5 text-amber-500" />
                            ) : status === 'needs_revision' ? (
                              <AlertCircle className="h-5 w-5 text-rose-500" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{req.title}</p>
                              {req.description && (
                                <p className="text-xs text-muted-foreground">{req.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {status && (
                              <Badge className={STATUS_COLORS[status]} variant="outline">
                                {STATUS_LABELS[status]}
                              </Badge>
                            )}
                            {submission && (
                              <Sheet>
                                <SheetTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size={tokens.button.inline}
                                    onClick={() => setSelectedSubmission({ submission, title: req.title })}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Review
                                  </Button>
                                </SheetTrigger>
                                <SheetContent className="sm:max-w-lg">
                                  <SheetHeader>
                                    <SheetTitle>Review Submission</SheetTitle>
                                  </SheetHeader>
                                  <div className="mt-6">
                                    <SubmissionReviewSheet 
                                      submission={submission} 
                                      requirementTitle={req.title}
                                      onClose={() => {}}
                                    />
                                  </div>
                                </SheetContent>
                              </Sheet>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
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
    if (newReq.title.trim()) {
      createRequirement.mutate(newReq, {
        onSuccess: () => {
          setNewReq({ title: '', description: '', category: 'general' });
          setIsAddOpen(false);
        },
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading requirements...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredAssistants = assistants?.filter(a => {
    const matchesSearch = a.full_name.toLowerCase().includes(search.toLowerCase()) ||
                          a.email.toLowerCase().includes(search.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'pending') return matchesSearch && a.pending_submissions > 0;
    if (statusFilter === 'revision') return matchesSearch && a.needs_revision > 0;
    if (statusFilter === 'complete') return matchesSearch && a.completed_requirements === a.total_requirements;
    return matchesSearch;
  });

  const stats = {
    total: assistants?.length || 0,
    pendingReviews: assistants?.reduce((acc, a) => acc + a.pending_submissions, 0) || 0,
    needsRevision: assistants?.reduce((acc, a) => acc + a.needs_revision, 0) || 0,
    graduated: assistants?.filter(a => a.completed_requirements === a.total_requirements).length || 0,
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
              <Link to="/dashboard/admin/management">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-medium flex items-center gap-3">
                <GraduationCap className="h-8 w-8 text-primary" />
                Graduation Tracker
              </h1>
              <p className="text-muted-foreground mt-1">
                Track and manage stylist assistant graduation progress
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Assistants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{stats.pendingReviews}</p>
                  <p className="text-sm text-muted-foreground">Pending Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10">
                  <AlertCircle className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{stats.needsRevision}</p>
                  <p className="text-sm text-muted-foreground">Needs Revision</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{stats.graduated}</p>
                  <p className="text-sm text-muted-foreground">Ready to Graduate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="progress" className="space-y-4">
          <TabsList>
            <TabsTrigger value="progress">Assistant Progress</TabsTrigger>
            <TabsTrigger value="requirements">Manage Requirements</TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assistants..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assistants</SelectItem>
                  <SelectItem value="pending">Has Pending Reviews</SelectItem>
                  <SelectItem value="revision">Needs Revision</SelectItem>
                  <SelectItem value="complete">Ready to Graduate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assistant List */}
            {loadingAssistants || loadingReqs ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading assistants...
              </div>
            ) : filteredAssistants?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stylist assistants found</p>
                  <p className="text-sm">Assistants with the "Stylist Assistant" role will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAssistants?.map((assistant) => (
                  <AssistantCard 
                    key={assistant.assistant_id} 
                    assistant={assistant} 
                    requirements={requirements?.filter(r => r.is_active) || []}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requirements">
            <Card>
              <CardHeader>
                <CardTitle>Graduation Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <RequirementsManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
