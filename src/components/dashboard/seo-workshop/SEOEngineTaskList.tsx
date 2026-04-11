import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSEOTasks } from '@/hooks/useSEOTasks';
import { TASK_STATUS_CONFIG, ACTIVE_TASK_STATES, type SEOTaskStatus } from '@/config/seo-engine/seo-state-machine';
import { SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';
import { getPriorityTier, PRIORITY_TIERS } from '@/config/seo-engine/seo-priority-model';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Clock, AlertTriangle, Filter, Paperclip, Plus } from 'lucide-react';
import { useState } from 'react';
import { SEOTaskDetailDialog } from './SEOTaskDetailDialog';
import { SEOCreateTaskDialog } from './SEOCreateTaskDialog';

interface Props {
  organizationId: string | undefined;
}

type FilterStatus = 'active' | 'overdue' | 'completed' | 'all';

export function SEOEngineTaskList({ organizationId }: Props) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('active');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const statusMap: Record<FilterStatus, string[] | undefined> = {
    active: [...ACTIVE_TASK_STATES],
    overdue: ['overdue', 'escalated'],
    completed: ['completed'],
    all: undefined,
  };

  const { data: tasks = [], isLoading } = useSEOTasks(organizationId, {
    status: statusMap[statusFilter],
  });

  const filters: { key: FilterStatus; label: string; icon: typeof Clock }[] = [
    { key: 'active', label: 'Active', icon: Clock },
    { key: 'overdue', label: 'Overdue', icon: AlertTriangle },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
    { key: 'all', label: 'All', icon: Filter },
  ];

  return (
    <div className="space-y-4">
      {/* Status filter tabs + Create button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <Button
              key={f.key}
              variant={statusFilter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(f.key)}
              className="gap-1.5 font-sans"
            >
              <f.icon className="w-3.5 h-3.5" />
              {f.label}
            </Button>
          ))}
        </div>
        {organizationId && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 font-sans"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Create Task
          </Button>
        )}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className={tokens.loading.skeleton} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className={tokens.empty.container}>
          <Clock className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>No tasks found</h3>
          <p className={tokens.empty.description}>
            {statusFilter === 'active'
              ? 'No active SEO tasks. Tasks are generated when the engine detects opportunities.'
              : 'No tasks match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: any) => {
            const template = SEO_TASK_TEMPLATES[task.template_key];
            const statusConf = TASK_STATUS_CONFIG[task.status as SEOTaskStatus];
            const tier = getPriorityTier(task.priority_score);
            const tierConf = PRIORITY_TIERS[tier];
            const title = task.ai_generated_content?.title ?? template?.label ?? task.template_key;
            const seoObject = task.seo_objects;

            return (
              <Card key={task.id} className="cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setSelectedTask(task)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-sans font-medium">{title}</span>
                         <Badge variant={statusConf?.variant ?? 'outline'} className={`text-xs ${statusConf?.className ?? ''}`}>
                           {statusConf?.label ?? task.status}
                         </Badge>
                      </div>
                      {task.ai_generated_content?.explanation && (
                        <p className="text-xs text-muted-foreground mt-1 font-sans">
                          {task.ai_generated_content.explanation}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {seoObject && (
                           <span className="flex items-center gap-1"><Paperclip className="w-3 h-3" />{seoObject.label}</span>
                         )}
                        {task.due_at && (
                          <span>Due {new Date(task.due_at).toLocaleDateString()}</span>
                        )}
                        {task.assigned_role && (
                          <span>→ {task.assigned_role}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={tierConf.color as any} className="text-xs font-display tracking-wide">
                        P{task.priority_score}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Detail Dialog */}
      <SEOTaskDetailDialog
        task={selectedTask}
        organizationId={organizationId ?? ''}
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
      />

      {/* M6: Manual task creation dialog */}
      {organizationId && (
        <SEOCreateTaskDialog
          organizationId={organizationId}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      )}
    </div>
  );
}
