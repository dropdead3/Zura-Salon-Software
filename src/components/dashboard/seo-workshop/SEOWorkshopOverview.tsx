import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  SEO_WORKSHOP_ACTIONS,
  SEO_WORKSHOP_CATEGORY_LABELS,
  getActionsByCategory,
  type SEOWorkshopCategory,
  type SEOWorkshopAction,
} from '@/config/seoWorkshopActions';
import { useSEOWorkshopProgress } from '@/hooks/useSEOWorkshop';
import { useReputationEntitlement } from '@/hooks/reputation/useReputationEntitlement';
import { CheckCircle2, Circle, ListTodo } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';

interface SEOWorkshopOverviewProps {
  organizationId: string | undefined;
  onGoToActions?: () => void;
}

export function SEOWorkshopOverview({ organizationId, onGoToActions }: SEOWorkshopOverviewProps) {
  const { data: completions = [], isLoading } = useSEOWorkshopProgress(organizationId);
  const completedSet = useMemo(() => new Set(completions.map((c) => c.action_key)), [completions]);

  const byCategory = useMemo(() => getActionsByCategory(), []);
  const categoryStats = useMemo(() => {
    const categories: SEOWorkshopCategory[] = ['local', 'on_page', 'technical', 'content', 'schema', 'reputation'];
    return categories.map((cat) => {
      const actions = byCategory[cat];
      const done = actions.filter((a) => completedSet.has(a.key)).length;
      return { category: cat, label: SEO_WORKSHOP_CATEGORY_LABELS[cat], total: actions.length, done };
    }).filter((s) => s.total > 0);
  }, [byCategory, completedSet]);

  const totalActions = SEO_WORKSHOP_ACTIONS.length;
  const totalDone = completions.length;
  const overallPct = totalActions > 0 ? Math.round((totalDone / totalActions) * 100) : 0;

  const nextRecommended = useMemo(() => {
    const incomplete = SEO_WORKSHOP_ACTIONS.filter((a) => !completedSet.has(a.key))
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
    return incomplete.slice(0, 5);
  }, [completedSet]);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-medium tabular-nums">{overallPct}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalDone} of {totalActions} actions complete
            </p>
          </CardContent>
        </Card>

        {categoryStats.slice(0, 2).map(({ category, label, total, done }) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-medium tabular-nums">
                {done}/{total}
              </p>
              <p className="text-xs text-muted-foreground mt-1">actions complete</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Progress by category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categoryStats.map(({ category, label, total, done }) => (
              <div
                key={category}
                className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
              >
                <span className="text-sm">{label}</span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {done}/{total}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {nextRecommended.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Next recommended</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {nextRecommended.map((action: SEOWorkshopAction) => (
                <li key={action.key} className="flex items-center gap-2 text-sm">
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{action.label}</span>
                </li>
              ))}
            </ul>
            {onGoToActions && (
              <Button variant="outline" size={tokens.button.card} className="mt-4" onClick={onGoToActions}>
                View all action items
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {totalDone === totalActions && totalActions > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-6">
            <CheckCircle2 className="h-10 w-10 shrink-0 text-primary" />
            <div>
              <p className="font-medium">All actions complete</p>
              <p className="text-sm text-muted-foreground">
                Keep your listings and content updated to maintain visibility.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
