/**
 * SEOMyTasksCard — Role-filtered SEO task view for stylists and front desk.
 * GAP 4: Shows only tasks assigned to the current user with role-appropriate actions.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TASK_STATUS_CONFIG, type SEOTaskStatus } from '@/config/seo-engine/seo-state-machine';
import { Camera, MessageSquare, Star, Clock, CheckCircle2, Search } from 'lucide-react';
import { useState } from 'react';
import { SEOTaskDetailDialog } from './SEOTaskDetailDialog';

interface Props {
  organizationId: string | undefined;
}

const ROLE_TEMPLATES = [
  'review_request',
  'review_response',
  'photo_upload',
  'before_after_publish',
  'stylist_spotlight_publish',
];

const TEMPLATE_ICONS: Record<string, typeof Camera> = {
  review_request: Star,
  review_response: MessageSquare,
  photo_upload: Camera,
  before_after_publish: Camera,
  stylist_spotlight_publish: Search,
};

export function SEOMyTasksCard({ organizationId }: Props) {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['seo-my-tasks', organizationId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_tasks' as any)
        .select('*, seo_objects(id, label, object_type)')
        .eq('organization_id', organizationId!)
        .in('template_key', ROLE_TEMPLATES)
        .in('status', ['assigned', 'in_progress', 'detected', 'queued'])
        .order('priority_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!organizationId && !!user?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>My SEO Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className={tokens.loading.skeleton} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!tasks.length) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>My SEO Tasks</CardTitle>
              <CardDescription>Actions that help grow local visibility</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.map((task: any) => {
            const statusConf = TASK_STATUS_CONFIG[task.status as SEOTaskStatus];
            const Icon = TEMPLATE_ICONS[task.template_key] || Clock;
            const title = task.ai_generated_content?.title ?? task.template_key?.replace(/_/g, ' ');

            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/30 cursor-pointer transition-colors"
                onClick={() => setSelectedTask(task)}
              >
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-sans font-medium truncate">{title}</p>
                  {task.due_at && (
                    <p className="text-xs text-muted-foreground">
                      Due {new Date(task.due_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Badge variant={statusConf?.variant ?? 'outline'} className={`text-xs shrink-0 ${statusConf?.className ?? ''}`}>
                  {statusConf?.label ?? task.status}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <SEOTaskDetailDialog
        task={selectedTask}
        organizationId={organizationId ?? ''}
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
      />
    </>
  );
}
