/**
 * Wave 28.7 — Per-section source editor.
 *
 * Renders a saved handbook section row with:
 *   - "Policy-backed" toggle (when a candidate policy is approved)
 *   - Read-only preview when policy-backed
 *   - "Edit in Policy OS" CTA
 *
 * Custom-prose editing remains in the existing draft_content flow (untouched
 * here — that lives in the AI Drafting step, deferred per plan).
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import {
  useHandbookPolicySections,
  useResolvedHandbookSectionContent,
  useUpdateHandbookSectionSource,
  type AvailablePolicy,
} from '@/hooks/handbook/useHandbookPolicySections';
import { PolicyBackedSectionCard } from './PolicyBackedSectionCard';

interface Props {
  section: any;
}

export function HandbookSectionEditor({ section }: Props) {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { data: availableMap } = useHandbookPolicySections();
  const updateSource = useUpdateHandbookSectionSource();
  const { data: resolved, isLoading } = useResolvedHandbookSectionContent(section);

  const candidates: AvailablePolicy[] = availableMap?.get(section.library_section_key) ?? [];
  const isPolicyBacked = section.source === 'policy';
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(section.policy_ref_id ?? candidates[0]?.policyId ?? null);

  const handleToggle = (next: boolean) => {
    if (next) {
      const targetPolicy = selectedPolicyId ?? candidates[0]?.policyId;
      if (!targetPolicy) return;
      updateSource.mutate({ sectionId: section.id, source: 'policy', policyRefId: targetPolicy, variantType: 'internal' });
    } else {
      updateSource.mutate({ sectionId: section.id, source: 'custom', policyRefId: null });
    }
  };

  const handlePolicyChange = (policyId: string) => {
    setSelectedPolicyId(policyId);
    updateSource.mutate({ sectionId: section.id, source: 'policy', policyRefId: policyId, variantType: 'internal' });
  };

  const canBePolicyBacked = candidates.length > 0;

  return (
    <Card className="border-border bg-card/80">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={cn(tokens.heading.card, 'truncate')}>{section.title}</h3>
            <p className="font-sans text-xs text-muted-foreground mt-0.5">
              {isPolicyBacked ? 'Renders from approved policy variant' : 'Custom prose'}
            </p>
          </div>
          <Badge variant="outline" className={cn(
            'font-sans text-[10px] uppercase tracking-wider shrink-0',
            isPolicyBacked ? 'border-primary/40 text-primary bg-primary/5' : 'border-border text-muted-foreground'
          )}>
            {isPolicyBacked ? 'Policy' : 'Custom'}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
          <div className="flex items-start gap-3 min-w-0">
            <ClipboardList className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-sans text-sm font-medium text-foreground">Policy-backed source</p>
              <p className="font-sans text-xs text-muted-foreground mt-0.5">
                {canBePolicyBacked
                  ? 'Render this section directly from an approved policy. Single source of truth.'
                  : 'No approved policy is wired to this section yet.'}
              </p>
            </div>
          </div>
          <Switch
            checked={isPolicyBacked}
            onCheckedChange={handleToggle}
            disabled={!canBePolicyBacked || updateSource.isPending}
          />
        </div>

        {isPolicyBacked && candidates.length > 1 && (
          <div className="space-y-2">
            <p className={tokens.label.tiny}>Source policy</p>
            <div className="flex flex-wrap gap-2">
              {candidates.map((c) => (
                <Button
                  key={c.policyId}
                  size="sm"
                  variant={c.policyId === selectedPolicyId ? 'default' : 'outline'}
                  onClick={() => handlePolicyChange(c.policyId)}
                  className="font-sans"
                >
                  {c.internalTitle}
                </Button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : isPolicyBacked ? (
          <PolicyBackedSectionCard
            policyId={section.policy_ref_id}
            policyTitle={(resolved as any)?.policyTitle}
            body={resolved?.body ?? ''}
            approvedAt={(resolved as any)?.approvedAt}
            missing={resolved?.missing}
            missingReason={(resolved as any)?.reason}
          />
        ) : (
          <div className="border border-border/60 rounded-lg p-4 bg-muted/20">
            <p className="font-sans text-sm text-muted-foreground">
              {section.draft_content?.trim()
                ? section.draft_content
                : 'No draft content yet. Use the AI Drafting step to generate a draft.'}
            </p>
          </div>
        )}

        {!canBePolicyBacked && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(dashPath('/admin/policies'))}
            className="font-sans w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Adopt a policy in Policy OS
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
