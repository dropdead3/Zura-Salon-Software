import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  getActionsByCategory,
  SEO_WORKSHOP_CATEGORY_LABELS,
  type SEOWorkshopAction,
  type SEOWorkshopCategory,
} from '@/config/seoWorkshopActions';
import { useSEOWorkshopProgress, useCompleteSEOWorkshopAction, useUncompleteSEOWorkshopAction } from '@/hooks/useSEOWorkshop';
import { useReputationEntitlement } from '@/hooks/reputation/useReputationEntitlement';
import { useTasks } from '@/hooks/useTasks';
import { ExternalLink, PlusCircle, BookOpen, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SEOWorkshopActionListProps {
  organizationId: string | undefined;
}

export function SEOWorkshopActionList({ organizationId }: SEOWorkshopActionListProps) {
  const { data: completions = [], isLoading } = useSEOWorkshopProgress(organizationId);
  const completeMutation = useCompleteSEOWorkshopAction();
  const uncompleteMutation = useUncompleteSEOWorkshopAction();
  const { createTask } = useTasks();

  const completedSet = new Set(completions.map((c) => c.action_key));
  const byCategory = getActionsByCategory();
  const categories: SEOWorkshopCategory[] = ['local', 'on_page', 'technical', 'content', 'schema', 'reputation'];

  const handleToggle = (actionKey: string, willBeCompleted: boolean) => {
    if (!organizationId) return;
    if (willBeCompleted) {
      completeMutation.mutate({ organizationId, actionKey });
    } else {
      uncompleteMutation.mutate({ organizationId, actionKey });
    }
  };

  const handleAddToMyTasks = (action: SEOWorkshopAction) => {
    createTask.mutate({
      title: action.label,
      description: action.description,
      source: 'seo_workshop',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-muted/50 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const actions = byCategory[category];
        if (actions.length === 0) return null;

        return (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {SEO_WORKSHOP_CATEGORY_LABELS[category]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {actions.map((action) => {
                const isCompleted = completedSet.has(action.key);
                const isPending =
                  completeMutation.isPending || uncompleteMutation.isPending;

                return (
                  <div
                    key={action.key}
                    className={cn(
                      'flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:gap-4',
                      isCompleted && 'bg-muted/20'
                    )}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={(checked) => handleToggle(action.key, checked === true)}
                        disabled={isPending}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            isCompleted && 'line-through text-muted-foreground'
                          )}
                        >
                          {action.label}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {action.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {action.guideUrl && (
                            <a
                              href={action.guideUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <BookOpen className="h-3 w-3" />
                              Guide
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {action.toolUrl && (
                            <a
                              href={action.toolUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Wrench className="h-3 w-3" />
                              Tool
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size={tokens.button.inline}
                      className="shrink-0 gap-1 text-xs"
                      onClick={() => handleAddToMyTasks(action)}
                      disabled={createTask.isPending}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add to my tasks
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
