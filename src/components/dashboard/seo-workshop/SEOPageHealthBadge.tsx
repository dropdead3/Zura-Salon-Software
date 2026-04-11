/**
 * SEO Page Health Badge — Integration for Website Builder.
 * Shows page-level SEO health score + quick-fix suggestions.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSEOHealthScores } from '@/hooks/useSEOHealthScores';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  organizationId: string | undefined;
  /** The SEO object ID for this page */
  seoObjectId?: string;
  /** Or look up by object key */
  objectKey?: string;
}

const ISSUE_TO_TEMPLATE: Record<string, string> = {
  'Missing meta title': 'metadata_fix',
  'Missing meta description': 'metadata_fix',
  'Missing H1': 'page_completion',
  'Thin content': 'content_refresh',
  'No internal links': 'internal_linking',
  'No FAQ section': 'faq_expansion',
  'No booking CTA': 'booking_cta_optimization',
};

export function SEOPageHealthBadge({ organizationId, seoObjectId, objectKey }: Props) {
  const queryClient = useQueryClient();
  const { data: scores = [], isLoading } = useSEOHealthScores(organizationId, {
    seoObjectId,
    domain: 'page',
  });

  if (isLoading) return <Skeleton className="h-5 w-14" />;
  if (!scores.length) return null;

  const latest = scores[0] as any;
  const score = latest.score ?? 0;

  // M1: Map to valid Badge variants with className overrides
  const getBadgeProps = () => {
    if (score >= 80) return { variant: 'outline' as const, className: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' };
    if (score >= 50) return { variant: 'outline' as const, className: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400' };
    return { variant: 'destructive' as const, className: '' };
  };

  const badgeProps = getBadgeProps();

  const signals = latest.raw_signals as any;
  const issues: string[] = [];
  if (signals) {
    if (!signals.has_meta_title) issues.push('Missing meta title');
    if (!signals.has_meta_description) issues.push('Missing meta description');
    if (!signals.has_h1) issues.push('Missing H1');
    if (signals.thin_content) issues.push('Thin content');
    if (!signals.has_internal_links) issues.push('No internal links');
    if (!signals.has_faq) issues.push('No FAQ section');
    if (!signals.has_cta) issues.push('No booking CTA');
  }

  // M9: Create a fix task for a detected issue
  const handleCreateFixTask = async (issue: string) => {
    const templateKey = ISSUE_TO_TEMPLATE[issue];
    if (!templateKey || !organizationId || !seoObjectId) return;

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 7);

    const { error } = await supabase.from('seo_tasks' as any).insert({
      organization_id: organizationId,
      template_key: templateKey,
      primary_seo_object_id: seoObjectId,
      status: 'detected',
      priority_score: 60,
      priority_factors: { source: 'page_health_badge_manual', issue },
      due_at: dueAt.toISOString(),
      ai_generated_content: {
        title: `Fix: ${issue}`,
        explanation: `Detected from page health badge — score ${score}/100.`,
      },
    });

    if (error) {
      toast.error('Failed to create task');
    } else {
      toast.success('SEO fix task created');
      queryClient.invalidateQueries({ queryKey: ['seo-tasks'] });
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant={badgeProps.variant} className={`text-xs font-display tracking-wide cursor-help ${badgeProps.className}`}>
            SEO {score}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-sans text-xs font-medium mb-1">Page Health: {score}/100</p>
          {issues.length > 0 ? (
            <ul className="text-xs font-sans text-muted-foreground space-y-1">
              {issues.map((issue, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span>• {issue}</span>
                  {seoObjectId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px] font-sans shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleCreateFixTask(issue); }}
                    >
                      <Wrench className="w-3 h-3 mr-0.5" />
                      Fix
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs font-sans text-muted-foreground">All checks passing</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
