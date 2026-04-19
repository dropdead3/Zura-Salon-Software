/**
 * Wave 28.7 — Publish preflight banner.
 *
 * Per visibility-contract doctrine: returns null when there are no blockers
 * and no warnings. Materially silent until a structural issue exists.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useNavigate } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import type { PreflightResult } from '@/hooks/handbook/useHandbookPublishPreflight';

interface Props {
  result: PreflightResult | undefined;
}

export function HandbookPreflightBanner({ result }: Props) {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  if (!result) return null;
  if (result.blockers.length === 0 && result.warnings.length === 0) return null;

  const hasBlockers = result.blockers.length > 0;

  return (
    <Card className={cn(hasBlockers ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/30')}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
            hasBlockers ? 'bg-destructive/10' : 'bg-muted'
          )}>
            {hasBlockers ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(tokens.heading.card)}>
                {hasBlockers ? 'Publish blocked' : 'Publish warnings'}
              </h3>
              {hasBlockers && (
                <Badge variant="outline" className="font-sans text-[10px] uppercase tracking-wider border-destructive/40 text-destructive bg-destructive/5">
                  {result.blockers.length} blocker{result.blockers.length === 1 ? '' : 's'}
                </Badge>
              )}
              {result.warnings.length > 0 && (
                <Badge variant="outline" className="font-sans text-[10px] uppercase tracking-wider">
                  {result.warnings.length} warning{result.warnings.length === 1 ? '' : 's'}
                </Badge>
              )}
            </div>
            <p className="font-sans text-sm text-muted-foreground mt-1">
              {hasBlockers
                ? 'Resolve every blocker before this handbook can publish.'
                : 'Warnings do not prevent publish but reduce handbook quality.'}
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border/60">
          {[...result.blockers, ...result.warnings].slice(0, 6).map((issue) => (
            <div key={issue.id} className="flex items-start justify-between gap-3 py-1">
              <div className="min-w-0 flex-1">
                <p className="font-sans text-sm text-foreground">{issue.message}</p>
                <p className="font-sans text-xs text-muted-foreground mt-0.5">{issue.remediationHint}</p>
              </div>
              {issue.policyId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(dashPath(`/admin/policies?policy=${issue.policyId}`))}
                  className="font-sans shrink-0"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open policy
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
