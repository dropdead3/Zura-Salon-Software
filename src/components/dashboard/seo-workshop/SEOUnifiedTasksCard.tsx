/**
 * SEO Unified Tasks Card — Integration for Zura Tasks.
 * Shows role-appropriate SEO work grouped by priority.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSEOTasks } from '@/hooks/useSEOTasks';
import { SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';
import { TASK_STATUS_CONFIG, ACTIVE_TASK_STATES, type SEOTaskStatus } from '@/config/seo-engine/seo-state-machine';
import { getPriorityTier, PRIORITY_TIERS } from '@/config/seo-engine/seo-priority-model';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

interface Props {
  organizationId: string | undefined;
  /** Optional: filter by assigned user */
  assignedTo?: string;
  /** Max items to show */
  limit?: number;
}

export function SEOUnifiedTasksCard({ organizationId, assignedTo, limit = 5 }: Props) {
  const { dashPath } = useOrgDashboardPath();
  const { data: tasks = [], isLoading } = useSEOTasks(organizationId, {
    status: [...ACTIVE_TASK_STATES, 'overdue', 'escalated'],
    assignedTo,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>SEO Tasks</CardTitle>
              <CardDescription>{tasks.length} active SEO task{tasks.length !== 1 ? 's' : ''}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="font-sans text-xs">
            <Link to={dashPath('/admin/seo-workshop')}>
              Open Workshop <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.slice(0, limit).map((task: any) => {
          const template = SEO_TASK_TEMPLATES[task.template_key];
          const statusConf = TASK_STATUS_CONFIG[task.status as SEOTaskStatus];
          const tier = getPriorityTier(task.priority_score ?? 0);
          const tierConf = PRIORITY_TIERS[tier];
          const title = task.ai_generated_content?.title ?? template?.label ?? task.template_key;

          return (
            <div key={task.id} className="flex items-center justify-between gap-2 text-sm font-sans">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant={tierConf.color as any} className="text-xs font-display tracking-wide shrink-0">
                  P{task.priority_score}
                </Badge>
                <span className="truncate">{title}</span>
              </div>
              <Badge variant={statusConf?.variant as any ?? 'outline'} className="text-xs shrink-0">
                {statusConf?.label ?? task.status}
              </Badge>
            </div>
          );
        })}
        {tasks.length > limit && (
          <p className="text-xs text-muted-foreground font-sans">
            +{tasks.length - limit} more SEO tasks
          </p>
        )}
      </CardContent>
    </Card>
  );
}
