import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, AlertTriangle, Inbox } from 'lucide-react';
import {
  useRecoveryTasks, STATUS_LABELS, RecoveryTaskWithFeedback,
} from '@/hooks/useRecoveryTasks';
import { RecoveryTaskDrawer } from '@/components/feedback/RecoveryTaskDrawer';
import { ComplianceBanner } from '@/components/feedback/ComplianceBanner';
import { RecoverySLABadge } from '@/components/feedback/RecoverySLABadge';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format, formatDistanceToNow } from 'date-fns';
import { tokens } from '@/lib/design-tokens';

const STATUS_GROUPS: { key: string; title: string; statuses: string[] }[] = [
  { key: 'new', title: 'New', statuses: ['new'] },
  { key: 'inProgress', title: 'In Progress', statuses: ['contacted'] },
  { key: 'resolved', title: 'Resolved', statuses: ['resolved', 'refunded', 'redo_booked', 'closed'] },
];

export default function RecoveryInbox() {
  const { dashPath } = useOrgDashboardPath();
  const { user } = useAuth();
  const { data: tasks, isLoading } = useRecoveryTasks();
  const [selected, setSelected] = useState<RecoveryTaskWithFeedback | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [mineOnly, setMineOnly] = useState(false);

  // Deep-link: /recovery?response=<feedback_response_id> opens that task's drawer
  useEffect(() => {
    const responseId = searchParams.get('response');
    if (!responseId || !tasks?.length || selected) return;
    const match = tasks.find(t => t.feedback_response_id === responseId);
    if (match) setSelected(match);
  }, [searchParams, tasks, selected]);

  const handleClose = () => {
    setSelected(null);
    if (searchParams.get('response')) {
      searchParams.delete('response');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const visibleTasks = useMemo(() => {
    if (!tasks) return [];
    if (mineOnly && user?.id) return tasks.filter((t) => t.assigned_to === user.id);
    return tasks;
  }, [tasks, mineOnly, user?.id]);

  const mineCount = useMemo(
    () => (tasks ?? []).filter((t) => t.assigned_to === user?.id).length,
    [tasks, user?.id],
  );

  const grouped = useMemo(() => {
    const out: Record<string, RecoveryTaskWithFeedback[]> = { new: [], inProgress: [], resolved: [] };
    for (const t of visibleTasks) {
      if (t.status === 'new') out.new.push(t);
      else if (t.status === 'contacted') out.inProgress.push(t);
      else out.resolved.push(t);
    }
    return out;
  }, [visibleTasks]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Client Recovery Inbox"
          description="Follow up with clients who left low feedback. All clients still see public review options regardless of their rating."
          backTo={dashPath('/admin/feedback')}
          backLabel="Back to Client Feedback"
        />

        <ComplianceBanner />

        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-4 py-3">
          <div>
            <Label htmlFor="mine-only" className="cursor-pointer">
              Show only mine
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mineCount > 0
                ? `You're assigned to ${mineCount} recovery${mineCount === 1 ? '' : 'ies'}.`
                : 'Nothing assigned to you yet.'}
            </p>
          </div>
          <Switch id="mine-only" checked={mineOnly} onCheckedChange={setMineOnly} />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className={tokens.loading.skeleton} />)}
          </div>
        ) : (tasks?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="font-display text-base tracking-wide">No recovery tasks</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                When a client submits feedback at or below your follow-up threshold, a task will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {STATUS_GROUPS.map((group) => (
              <Card key={group.key}>
                <CardHeader>
                  <CardTitle className="font-display text-base tracking-wide flex items-center gap-2">
                    {group.title}
                    <Badge variant="secondary">{grouped[group.key].length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {grouped[group.key].length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nothing here</p>
                  ) : grouped[group.key].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelected(t)}
                      className="w-full text-left rounded-xl border border-border/60 bg-card/50 hover:bg-card transition p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3.5 w-3.5 ${(t.feedback?.overall_rating ?? 0) >= s ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                            />
                          ))}
                        </div>
                        {t.priority === 'urgent' && (
                          <Badge variant="destructive" className="gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" /> Urgent
                          </Badge>
                        )}
                      </div>
                      <RecoverySLABadge
                        status={t.status}
                        createdAt={t.created_at}
                        firstContactedAt={(t as any).first_contacted_at ?? null}
                        resolvedAt={t.resolved_at}
                      />
                      {t.feedback?.comments && (
                        <p className="text-xs text-muted-foreground line-clamp-2">"{t.feedback.comments}"</p>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{STATUS_LABELS[t.status]}</span>
                        <span>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <RecoveryTaskDrawer task={selected} open={!!selected} onClose={handleClose} />
    </DashboardLayout>
  );
}
