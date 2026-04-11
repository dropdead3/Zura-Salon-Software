/**
 * SEO Task Detail Dialog.
 * Shows task details, completion validation, proof upload, status actions,
 * and post-completion impact feedback.
 */

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';
import { TASK_STATUS_CONFIG, ACTIVE_TASK_STATES, type SEOTaskStatus } from '@/config/seo-engine/seo-state-machine';
import { getPriorityTier, PRIORITY_TIERS } from '@/config/seo-engine/seo-priority-model';
import { useSEOTaskTransition, useSEOTaskComplete, useSEOProofUpload, useSEOTaskImpact } from '@/hooks/useSEOTaskActions';
import { IMPACT_CATEGORY_LABELS } from '@/lib/seo-engine/seo-impact-tracker';
import { useAuth } from '@/contexts/AuthContext';
import { tokens } from '@/lib/design-tokens';
import type { ProofArtifact } from '@/lib/seo-engine/seo-completion-validator';
import { SEOTaskAutoAction } from './SEOTaskAutoAction';
import { AI_ELIGIBLE_TEMPLATES } from '@/config/seo-engine/seo-task-templates';
import { Upload, CheckCircle2, Play, AlertTriangle, X, FileImage, Paperclip, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  task: any;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SEOTaskDetailDialog({ task, organizationId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const template = SEO_TASK_TEMPLATES[task?.template_key];
  const statusConf = TASK_STATUS_CONFIG[task?.status as SEOTaskStatus];
  const tier = getPriorityTier(task?.priority_score ?? 0);
  const tierConf = PRIORITY_TIERS[tier];

  const [notes, setNotes] = useState('');
  const [uploadedProofs, setUploadedProofs] = useState<ProofArtifact[]>([]);
  const [managerApproved, setManagerApproved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // U3: Reset state when switching between tasks
  useEffect(() => {
    setNotes('');
    setUploadedProofs([]);
    setManagerApproved(false);
  }, [task?.id]);

  const transitionMut = useSEOTaskTransition();
  const completeMut = useSEOTaskComplete();
  const uploadMut = useSEOProofUpload();

  // Impact feedback for completed tasks
  const isCompleted = task?.status === 'completed';
  const { data: impactData = [] } = useSEOTaskImpact(isCompleted ? task?.id : undefined);

  if (!task) return null;

  const title = task.ai_generated_content?.title ?? template?.label ?? task.template_key;
  const explanation = task.ai_generated_content?.explanation;
  const isActive = ACTIVE_TASK_STATES.includes(task.status);
  const canStart = task.status === 'assigned' || task.status === 'escalated' || task.status === 'overdue';
  const canComplete = task.status === 'in_progress' || task.status === 'awaiting_verification';
  const needsProof = template && !template.systemVerifiable;

  const handleTransition = (newStatus: SEOTaskStatus) => {
    transitionMut.mutate({ taskId: task.id, newStatus, performedBy: userId, notes: notes || undefined });
  };

  const handleComplete = () => {
    completeMut.mutate({
      taskId: task.id,
      templateKey: task.template_key,
      performedBy: userId,
      proofArtifacts: uploadedProofs,
      systemSignals: {}, // Phase 3: system signals would come from integrations
      managerApproved,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadMut.mutateAsync({ organizationId, taskId: task.id, file });
      setUploadedProofs((prev) => [
        ...prev,
        {
          type: result.type,
          value: result.signedUrl,
          uploadedAt: new Date().toISOString(),
        },
      ]);
      toast({ title: 'Proof uploaded', description: file.name });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide">{title}</DialogTitle>
          <DialogDescription className="font-sans text-sm">
            {template?.completionDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status & Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusConf?.variant ?? 'outline'} className={statusConf?.className}>{statusConf?.label ?? task.status}</Badge>
            <Badge variant={tierConf.color as any} className="font-display tracking-wide">
              P{task.priority_score}
            </Badge>
            {task.assigned_role && <Badge variant="outline">→ {task.assigned_role}</Badge>}
          </div>

          {/* Explanation */}
          {explanation && (
            <p className="text-sm text-muted-foreground font-sans">{explanation}</p>
          )}

          {/* SEO Object */}
          {task.seo_objects && (
             <div className="text-xs text-muted-foreground flex items-center gap-1">
               <Paperclip className="w-3 h-3" /> {task.seo_objects.label} ({task.seo_objects.object_type})
             </div>
           )}

          {/* Due date */}
          {task.due_at && (
            <div className="text-xs text-muted-foreground">
              Due: {new Date(task.due_at).toLocaleDateString()}
            </div>
          )}

          {/* Post-completion Impact Feedback */}
          {isCompleted && impactData.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-sans font-medium flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  Impact Measured
                </p>
                {impactData.slice(0, 3).map((impact: any, i: number) => {
                  const category = impact.impact_category ?? 'unknown';
                  const label = IMPACT_CATEGORY_LABELS[category] ?? category;
                  const delta = impact.metric_delta ?? 0;
                  const confidence = impact.confidence ?? 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs font-sans">
                      <span className="text-muted-foreground">
                        {label}: <span className={delta > 0 ? 'text-green-500' : 'text-destructive'}>{delta > 0 ? '+' : ''}{Math.round(delta * 100)}%</span>
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {Math.round(confidence * 100)}% confidence
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* AI Auto-Action for eligible templates */}
          {isActive && AI_ELIGIBLE_TEMPLATES[task.template_key] && (
            <SEOTaskAutoAction task={task} organizationId={organizationId} />
          )}

          {/* Proof Upload Section (for non-system-verifiable tasks) */}
          {needsProof && canComplete && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-sans font-medium">Proof Required</p>
                <p className="text-xs text-muted-foreground">
                  {template.proofRequirements.join(', ')}
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMut.isPending}
                  className="gap-2 font-sans"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadMut.isPending ? 'Uploading…' : 'Upload Proof'}
                </Button>

                {uploadedProofs.length > 0 && (
                  <div className="space-y-1">
                    {uploadedProofs.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileImage className="w-3 h-3" />
                        <span>{p.type} — uploaded</span>
                      </div>
                    ))}
                  </div>
                )}

                {template.proofRequirements.includes('manager_approval') && (
                  <label className="flex items-center gap-2 text-sm font-sans cursor-pointer">
                    <input
                      type="checkbox"
                      checked={managerApproved}
                      onChange={(e) => setManagerApproved(e.target.checked)}
                      className="rounded"
                    />
                    Manager approved
                  </label>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {isActive && (
            <Textarea
              placeholder="Add notes (optional)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm font-sans"
              rows={2}
            />
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {canStart && (
              <Button
                size="sm"
                onClick={() => handleTransition('in_progress')}
                disabled={transitionMut.isPending}
                className="gap-1.5 font-sans"
              >
                <Play className="w-3.5 h-3.5" />
                Start
              </Button>
            )}

            {canComplete && (
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={completeMut.isPending}
                className="gap-1.5 font-sans"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {completeMut.isPending ? 'Validating…' : 'Complete'}
              </Button>
            )}

            {isActive && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTransition('canceled')}
                disabled={transitionMut.isPending}
                className="gap-1.5 font-sans text-destructive"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
            )}

            {(task.status === 'overdue' || task.status === 'escalated') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTransition('in_progress')}
                disabled={transitionMut.isPending}
                className="gap-1.5 font-sans"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Resume
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
