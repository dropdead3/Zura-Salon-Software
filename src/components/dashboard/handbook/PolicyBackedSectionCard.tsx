/**
 * Wave 28.7 — Read-only preview of a policy-backed handbook section.
 *
 * Renders the approved internal variant body and offers a single CTA
 * to edit the underlying policy in the Policy Configurator. Per doctrine,
 * the handbook never mutates policy content — it only reflects it.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useNavigate } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

interface Props {
  policyId: string | null | undefined;
  policyTitle?: string;
  body: string;
  approvedAt?: string | null;
  missing?: boolean;
  missingReason?: string;
}

export function PolicyBackedSectionCard({ policyId, policyTitle, body, approvedAt, missing, missingReason }: Props) {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();

  const goToPolicy = () => {
    const target = policyId ? dashPath(`/admin/policies?policy=${policyId}`) : dashPath('/admin/policies');
    navigate(target);
  };

  if (missing) {
    const message =
      missingReason === 'not_approved'
        ? 'Underlying policy has no approved internal draft yet.'
        : missingReason === 'no_version'
        ? 'Policy has no current version configured.'
        : 'No policy linked.';
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={cn(tokens.heading.card)}>{policyTitle || 'Policy-backed section'}</h3>
              <p className="font-sans text-sm text-muted-foreground mt-1">{message}</p>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-amber-500/20">
            <Button variant="outline" size="sm" onClick={goToPolicy} className="font-sans">
              <ExternalLink className="w-4 h-4 mr-2" />
              Configure in Policy OS
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className={cn(tokens.heading.card)}>{policyTitle || 'Policy-backed content'}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="font-sans text-[10px] uppercase tracking-wider border-primary/30 text-primary">
                  Policy-backed
                </Badge>
                {approvedAt && (
                  <span className="font-sans text-xs text-muted-foreground">
                    Approved {new Date(approvedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={goToPolicy} className="font-sans shrink-0">
            <ExternalLink className="w-4 h-4 mr-2" />
            Edit in Policy OS
          </Button>
        </div>

        <div className="border-t border-border/60 pt-4">
          {body ? (
            <div className="font-sans text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{body}</div>
          ) : (
            <p className="font-sans text-sm text-muted-foreground italic">
              No body content in the approved variant.
            </p>
          )}
        </div>

        <p className="font-sans text-xs text-muted-foreground border-t border-border/60 pt-3">
          This section renders directly from the underlying policy. To change wording, edit the policy
          variant — handbook content stays in sync automatically.
        </p>
      </CardContent>
    </Card>
  );
}
