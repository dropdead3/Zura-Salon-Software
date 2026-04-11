/**
 * SEO Page Health Badge — Integration for Website Builder.
 * Shows page-level SEO health score + quick-fix suggestions.
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSEOHealthScores } from '@/hooks/useSEOHealthScores';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  organizationId: string | undefined;
  /** The SEO object ID for this page */
  seoObjectId?: string;
  /** Or look up by object key */
  objectKey?: string;
}

export function SEOPageHealthBadge({ organizationId, seoObjectId, objectKey }: Props) {
  const { data: scores = [], isLoading } = useSEOHealthScores(organizationId, {
    seoObjectId,
    domain: 'page',
  });

  if (isLoading) return <Skeleton className="h-5 w-14" />;
  if (!scores.length) return null;

  const latest = scores[0] as any;
  const score = latest.score ?? 0;
  const variant = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'destructive';

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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant={variant as any} className="text-xs font-display tracking-wide cursor-help">
            SEO {score}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-sans text-xs font-medium mb-1">Page Health: {score}/100</p>
          {issues.length > 0 ? (
            <ul className="text-xs font-sans text-muted-foreground space-y-0.5">
              {issues.map((issue, i) => (
                <li key={i}>• {issue}</li>
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
