/**
 * SEO Content Tasks Card — Integration for Zura Marketer.
 * Shows pending content-type SEO tasks with draft generation capability.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSEOTasks } from '@/hooks/useSEOTasks';
import { SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';
import { TASK_STATUS_CONFIG, ACTIVE_TASK_STATES, type SEOTaskStatus } from '@/config/seo-engine/seo-state-machine';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { toast } from 'sonner';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  organizationId: string | undefined;
}

const CONTENT_TASK_TYPES = [
  'content', 'page',
];

export function SEOContentTasksCard({ organizationId }: Props) {
  const { dashPath } = useOrgDashboardPath();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const { data: allTasks = [], isLoading } = useSEOTasks(organizationId, {
    status: [...ACTIVE_TASK_STATES],
  });

  const contentTasks = allTasks.filter((t: any) => {
    const template = SEO_TASK_TEMPLATES[t.template_key];
    return template && CONTENT_TASK_TYPES.includes(template.taskType);
  });

  // M8: Generate draft content via AI edge function
  const handleGenerateDraft = async (task: any) => {
    setGeneratingId(task.id);
    try {
      const template = SEO_TASK_TEMPLATES[task.template_key];
      const { data, error } = await supabase.functions.invoke('ai-gateway', {
        body: {
          action: 'seo_content_draft',
          taskId: task.id,
          templateKey: task.template_key,
          templateLabel: template?.label ?? task.template_key,
          objectLabel: task.seo_objects?.label ?? '',
          context: task.ai_generated_content?.explanation ?? '',
        },
      });

      if (error) throw error;

      // Update task with draft in ai_generated_content
      const existingContent = task.ai_generated_content || {};
      await supabase.from('seo_tasks' as any).update({
        ai_generated_content: {
          ...existingContent,
          draft: data?.draft ?? data?.content ?? 'Draft generated — check task details.',
          draft_generated_at: new Date().toISOString(),
        },
      }).eq('id', task.id);

      toast.success('Draft generated — open the task to review.');
    } catch {
      toast.error('Draft generation unavailable — try again later.');
    } finally {
      setGeneratingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (contentTasks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>SEO Content Tasks</CardTitle>
              <CardDescription>{contentTasks.length} pending content task{contentTasks.length !== 1 ? 's' : ''}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="font-sans text-xs">
            <Link to={dashPath('/admin/seo-workshop')}>
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {contentTasks.slice(0, 5).map((task: any) => {
          const template = SEO_TASK_TEMPLATES[task.template_key];
          const statusConf = TASK_STATUS_CONFIG[task.status as SEOTaskStatus];
          const title = task.ai_generated_content?.title ?? template?.label ?? task.template_key;

          return (
            <div key={task.id} className="flex items-center justify-between text-sm font-sans gap-2">
              <span className="truncate">{title}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] font-sans gap-1"
                  disabled={generatingId === task.id}
                  onClick={() => handleGenerateDraft(task)}
                >
                  <Sparkles className="w-3 h-3" />
                  {generatingId === task.id ? 'Drafting…' : 'Draft'}
                </Button>
                <Badge variant={statusConf?.variant ?? 'outline'} className={`text-xs ${statusConf?.className ?? ''}`}>
                   {statusConf?.label ?? task.status}
                 </Badge>
              </div>
            </div>
          );
        })}
        {contentTasks.length > 5 && (
          <p className="text-xs text-muted-foreground font-sans">
            +{contentTasks.length - 5} more content tasks
          </p>
        )}
      </CardContent>
    </Card>
  );
}
