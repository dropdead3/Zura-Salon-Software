import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  Upload,
  Send,
  FileText,
  ExternalLink,
  Trophy,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  History,
} from 'lucide-react';
import {
  useGraduationRequirements,
  useGraduationSubmissions,
  useCreateSubmission,
  useUploadProof,
  useSubmissionFeedback,
  type GraduationRequirement,
  type GraduationSubmission,
} from '@/hooks/useGraduationTracker';
import { useEffectiveUserId } from '@/hooks/useEffectiveUser';
import { useFormatDate } from '@/hooks/useFormatDate';
import { usePromotionHistory } from '@/hooks/usePromotionHistory';
import { useLevelProgress } from '@/hooks/useLevelProgress';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { LevelProgressCard } from '@/components/coaching/LevelProgressCard';

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

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  certification: <Trophy className="h-5 w-5" />,
  experience: <Sparkles className="h-5 w-5" />,
  training: <FileText className="h-5 w-5" />,
  approval: <CheckCircle2 className="h-5 w-5" />,
  general: <GraduationCap className="h-5 w-5" />,
};

function FeedbackSection({ submissionId }: { submissionId: string }) {
  const { formatDate } = useFormatDate();
  const { data: feedback, isLoading } = useSubmissionFeedback(submissionId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading feedback...</p>;
  if (!feedback || feedback.length === 0) return null;

  return (
    <div className="mt-4">
      <Label className="text-muted-foreground mb-2 block">Coach Feedback</Label>
      <ScrollArea className="h-32 rounded-md border bg-muted/30">
        <div className="p-3 space-y-3">
          {feedback.map((fb) => (
            <div key={fb.id} className="text-sm border-b border-border/50 pb-2 last:border-0">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <span className="font-medium">{fb.coach?.full_name || 'Coach'}</span>
                <span>•</span>
                <span>{formatDate(new Date(fb.created_at), 'MMM d, h:mm a')}</span>
              </div>
              <p className="text-foreground">{fb.feedback}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function SubmissionDialog({ 
  requirement, 
  existingSubmission 
}: { 
  requirement: GraduationRequirement; 
  existingSubmission?: GraduationSubmission;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createSubmission = useCreateSubmission();
  const uploadProof = useUploadProof();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadProof.mutateAsync(file);
      setProofUrl(url);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    createSubmission.mutate({
      requirement_id: requirement.id,
      proof_url: proofUrl || undefined,
      assistant_notes: notes || undefined,
    }, {
      onSuccess: () => {
        setIsOpen(false);
        setNotes('');
        setProofUrl('');
      },
    });
  };

  const canResubmit = existingSubmission?.status === 'needs_revision';
  const isPending = existingSubmission?.status === 'pending';
  const isApproved = existingSubmission?.status === 'approved';

  if (isApproved) {
    return (
      <Badge className={STATUS_COLORS.approved}>
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Completed
      </Badge>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {isPending ? (
          <Badge className={STATUS_COLORS.pending}>
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        ) : canResubmit ? (
          <Button variant="outline" size={tokens.button.card} className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10">
            <AlertCircle className="h-4 w-4 mr-1" />
            Resubmit
          </Button>
        ) : (
          <Button variant="outline" size={tokens.button.card}>
            <Send className="h-4 w-4 mr-1" />
            Request Check
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {canResubmit ? 'Resubmit for Review' : 'Request Check'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <h3 className="font-medium">{requirement.title}</h3>
            {requirement.description && (
              <p className="text-sm text-muted-foreground mt-1">{requirement.description}</p>
            )}
          </div>

          {canResubmit && existingSubmission && (
            <FeedbackSection submissionId={existingSubmission.id} />
          )}

          <div>
            <Label>Upload Proof (optional)</Label>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
              />
              {proofUrl ? (
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm flex-1 truncate">File uploaded</span>
                  <Button 
                    variant="ghost" 
                    size={tokens.button.inline} 
                    onClick={() => setProofUrl('')}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload File'}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Images, PDFs, or documents accepted
            </p>
          </div>

          <div>
            <Label>Notes for Coach (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or context for your coach..."
              rows={3}
              className="mt-2"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={createSubmission.isPending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {canResubmit ? 'Resubmit for Review' : 'Submit for Check'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RequirementCard({ 
  requirement, 
  submission 
}: { 
  requirement: GraduationRequirement; 
  submission?: GraduationSubmission;
}) {
  const { formatDate } = useFormatDate();
  const [isExpanded, setIsExpanded] = useState(submission?.status === 'needs_revision');
  const status = submission?.status;
  const hasNeedsRevision = status === 'needs_revision';

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={`rounded-lg border transition-colors ${
        status === 'approved' ? 'border-emerald-500/30 bg-emerald-500/5' :
        status === 'needs_revision' ? 'border-rose-500/30 bg-rose-500/5' :
        status === 'pending' ? 'border-amber-500/30 bg-amber-500/5' :
        'border-border bg-card'
      }`}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
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
                <p className={`font-medium ${status === 'approved' ? 'line-through text-muted-foreground' : ''}`}>
                  {requirement.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SubmissionDialog requirement={requirement} existingSubmission={submission} />
              {(hasNeedsRevision || submission) && (
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {(hasNeedsRevision || submission) && (
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-0 border-t border-border/50">
              {requirement.description && (
                <p className="text-sm text-muted-foreground mt-3">{requirement.description}</p>
              )}
              
              {submission && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Submitted {formatDate(new Date(submission.submitted_at), 'PPP')}</span>
                  </div>
                  
                  {submission.proof_url && (
                    <a 
                      href={submission.proof_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Uploaded Proof
                    </a>
                  )}

                  {submission.assistant_notes && (
                    <div className="mt-2 p-2 rounded bg-muted/50">
                      <span className="text-xs text-muted-foreground">Your notes:</span>
                      <p className="mt-1">{submission.assistant_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {hasNeedsRevision && submission && (
                <FeedbackSection submissionId={submission.id} />
              )}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

export default function MyGraduation() {
  const effectiveUserId = useEffectiveUserId();
  const { formatDate } = useFormatDate();
  const { data: requirements, isLoading: loadingReqs } = useGraduationRequirements();
  const { data: submissions, isLoading: loadingSubs } = useGraduationSubmissions(effectiveUserId || undefined);
  const { data: promotions = [] } = usePromotionHistory(effectiveUserId || undefined);
  const progress = useLevelProgress(effectiveUserId || undefined);

  const isLoading = loadingReqs || loadingSubs;

  // Create submission map
  const submissionMap = new Map(submissions?.map(s => [s.requirement_id, s]) || []);

  // Calculate progress
  const totalRequirements = requirements?.filter(r => r.is_active).length || 0;
  const completedRequirements = submissions?.filter(s => s.status === 'approved').length || 0;
  const pendingReviews = submissions?.filter(s => s.status === 'pending').length || 0;
  const needsRevision = submissions?.filter(s => s.status === 'needs_revision').length || 0;
  const progressPercent = totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 0;

  // Group requirements by category
  const requirementsByCategory = requirements?.filter(r => r.is_active).reduce((acc, req) => {
    const cat = req.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(req);
    return acc;
  }, {} as Record<string, GraduationRequirement[]>) || {};

  const isGraduationReady = completedRequirements === totalRequirements && totalRequirements > 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <DashboardPageHeader
          title="My Level Progress"
          description="Track your performance, advancement path, and retention standing."
        />
        <PageExplainer pageId="my-graduation" />

        {/* Level-Based Progress Card */}
        <LevelProgressCard userId={effectiveUserId || undefined} />

        {/* Retention guidance — shown when at risk */}
        {progress?.retention?.isAtRisk && (
          <Card className="border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/10">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm text-foreground">
                    {progress.retention.actionType === 'demotion_eligible'
                      ? 'Some of your performance metrics are below the minimum standards for your current level. Please focus on improving these areas — your manager is available to help.'
                      : 'Your performance in one or more areas has dipped below the minimum for your current level. This is a coaching opportunity — reach out to your manager to discuss a plan.'}
                  </p>
                  <div className="space-y-1">
                    {progress.retention.failures.map(f => (
                      <div key={f.key} className="flex items-center gap-2 text-xs">
                        <span className="text-rose-600 dark:text-rose-400">•</span>
                        <span className="text-muted-foreground">{f.label}:</span>
                        <span className="text-rose-700 dark:text-rose-300 tabular-nums">
                          {f.unit === '/mo' || f.unit === '$' ? `$${f.current.toLocaleString()}` : `${f.current}${f.unit}`}
                        </span>
                        <span className="text-muted-foreground">
                          (minimum: {f.unit === '/mo' || f.unit === '$' ? `$${f.minimum.toLocaleString()}` : `${f.minimum}${f.unit}`})
                        </span>
                      </div>
                    ))}
                  </div>
                  {progress.retention.gracePeriodDays > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {progress.retention.gracePeriodDays}-day improvement window
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Promotion History Timeline */}
        {promotions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className={tokens.card.title}>
                <History className="w-4 h-4 mr-2 inline" />
                Level History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {promotions.map(p => {
                  const isDemotion = p.direction === 'demotion';
                  return (
                    <div key={p.id} className="flex items-center gap-3 text-sm">
                      <div className={cn('w-2 h-2 rounded-full shrink-0', isDemotion ? 'bg-rose-500' : 'bg-emerald-500')} />
                      <span className="text-muted-foreground">{p.from_level}</span>
                      <ArrowRight className={cn('w-3 h-3 text-muted-foreground', isDemotion && 'rotate-90 text-rose-500')} />
                      <span className="text-foreground">{p.to_level}</span>
                      {isDemotion && <span className="text-xs text-rose-500">(Demotion)</span>}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(new Date(p.promoted_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Overview — only show when graduation requirements exist */}
        {totalRequirements > 0 && (
          <Card className={isGraduationReady ? 'border-emerald-500/50 bg-emerald-500/5' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Overall Progress</span>
                <span className="text-2xl">{completedRequirements}/{totalRequirements}</span>
              </CardTitle>
              <CardDescription>
                {isGraduationReady 
                  ? '🎉 Congratulations! You have completed all requirements!'
                  : `${totalRequirements - completedRequirements} requirements remaining`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progressPercent} className="h-3" />
              <div className="flex gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>{completedRequirements} Completed</span>
                </div>
                {pendingReviews > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>{pendingReviews} Pending Review</span>
                  </div>
                )}
                {needsRevision > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <span>{needsRevision} Needs Revision</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Requirements by Category */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading your level progress...
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(requirementsByCategory).map(([category, reqs]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {CATEGORY_ICONS[category]}
                    </div>
                    {CATEGORY_LABELS[category] || category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reqs.map((req) => (
                    <RequirementCard 
                      key={req.id} 
                      requirement={req} 
                      submission={submissionMap.get(req.id)}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
