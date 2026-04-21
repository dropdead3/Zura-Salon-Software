/**
 * PolicyDraftWorkspace (Wave 28.6 → starter drafts in 28.x)
 *
 * 4 cards (Internal · Client-facing · Disclosure · Manager note). Each card
 * shows AI status, last drafted, and Generate / Regenerate / Approve / Edit.
 * Drafts are AI-generated renderings of the structured rules — they cannot
 * invent rules. Operators must explicitly Approve.
 *
 * When no variant exists yet, we render a platform-authored "starter draft"
 * pre-filled with the operator's configured rule values via {{token}}
 * substitution. Operator can Approve as-is, Edit, or Regenerate with AI.
 */
import { useMemo, useState } from 'react';
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Pencil, Save, X, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  VARIANT_LABELS,
  VARIANT_TYPE_ORDER,
  usePolicyVariants,
  useGenerateDraftVariant,
  useApprovePolicyVariant,
  useUpdateVariantBody,
  useApproveStarterDraft,
  type PolicyVariantType,
  type PolicyVariantRow,
} from '@/hooks/policy/usePolicyDrafter';
import type { PolicyLibraryEntry } from '@/hooks/policy/usePolicyData';
import { getStarterDraftSet } from '@/lib/policy/starter-drafts';
import { renderStarterDraft } from '@/lib/policy/render-starter-draft';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface Props {
  versionId: string;
  /** Whether all required rule blocks are configured. Drafter is disabled otherwise. */
  rulesReady: boolean;
  /** Wave 28.11.4 — filters which voice variants surface for editing. */
  audience: PolicyLibraryEntry['audience'];
  /** Library key for resolving the platform-authored starter draft set. */
  libraryKey: string;
  /** Configured rule values (block_key → value) for token interpolation. */
  ruleValues: Record<string, unknown>;
}

/** Variant types valid for a given audience. Mirrors PolicySurfaceEditor. */
function variantsForAudience(
  audience: PolicyLibraryEntry['audience'],
): PolicyVariantType[] {
  if (audience === 'internal') return ['internal', 'manager_note'];
  if (audience === 'external') return ['client', 'disclosure'];
  return VARIANT_TYPE_ORDER;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function PolicyDraftWorkspace({ versionId, rulesReady, audience, libraryKey, ruleValues }: Props) {
  const allowedTypes = variantsForAudience(audience);
  const { data: variants = [] } = usePolicyVariants(versionId);
  const { effectiveOrganization } = useOrganizationContext();
  const generate = useGenerateDraftVariant();
  const approve = useApprovePolicyVariant();
  const updateBody = useUpdateVariantBody();
  const approveStarter = useApproveStarterDraft();
  const [editing, setEditing] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [pendingType, setPendingType] = useState<PolicyVariantType | null>(null);
  /** Local edits to starter drafts before approval (no DB row exists yet). */
  const [starterEdits, setStarterEdits] = useState<Record<string, string>>({});
  const [editingStarter, setEditingStarter] = useState<PolicyVariantType | null>(null);

  const starterSet = useMemo(() => getStarterDraftSet(libraryKey), [libraryKey]);
  const renderCtx = useMemo(
    () => ({
      ruleValues,
      orgName: effectiveOrganization?.name,
      platformName: 'Zura',
    }),
    [ruleValues, effectiveOrganization?.name],
  );

  const byType = useMemo(() => {
    const m = new Map<PolicyVariantType, PolicyVariantRow>();
    variants.forEach((v) => m.set(v.variant_type, v));
    return m;
  }, [variants]);

  const handleGenerate = (variantType: PolicyVariantType) => {
    setPendingType(variantType);
    generate.mutate(
      { versionId, variantType },
      { onSettled: () => setPendingType(null) },
    );
  };

  const handleStartEdit = (v: PolicyVariantRow) => {
    setEditing(v.id);
    setDraftText(v.body_md ?? '');
  };

  const handleSaveEdit = (v: PolicyVariantRow) => {
    updateBody.mutate(
      { variantId: v.id, versionId, body_md: draftText },
      { onSuccess: () => setEditing(null) },
    );
  };

  const getStarterBody = (vt: PolicyVariantType): string | null => {
    const template = starterSet?.[vt];
    if (!template) return null;
    if (starterEdits[vt] !== undefined) return starterEdits[vt];
    return renderStarterDraft(template, renderCtx);
  };

  const handleApproveStarter = (vt: PolicyVariantType) => {
    if (!effectiveOrganization?.id) return;
    const body = getStarterBody(vt);
    if (!body) return;
    approveStarter.mutate({
      versionId,
      organizationId: effectiveOrganization.id,
      variantType: vt,
      body_md: body,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="font-sans text-xs text-muted-foreground">
          Each policy ships with a platform-authored starter draft, pre-filled with your
          configured rules. Approve as-is, edit the wording, or regenerate with AI for a
          fresh take. AI cannot invent rules — only render what you've structured.
        </p>
      </div>

      {!rulesReady && (
        <div className="rounded-lg border border-foreground/20 bg-muted/40 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
            <p className="font-sans text-xs text-muted-foreground">
              Configure required rules first. AI regeneration is disabled until all required
              fields have values — but you can still approve the starter draft.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {allowedTypes.map((vt) => {
          const meta = VARIANT_LABELS[vt];
          const variant = byType.get(vt);
          const isPending = pendingType === vt && generate.isPending;
          const isEditing = variant && editing === variant.id;
          const starterBody = !variant ? getStarterBody(vt) : null;
          const isEditingStarter = editingStarter === vt;
          const hasStarter = !!starterBody;

          return (
            <Card key={vt} className="rounded-xl border border-border bg-card/80">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display text-xs tracking-wider uppercase text-foreground">
                        {meta.label}
                      </h4>
                      {variant?.approved && (
                        <Badge variant="outline" className="font-sans text-[10px] text-primary border-primary/30">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                          Approved
                        </Badge>
                      )}
                      {variant && !variant.approved && variant.body_md && (
                        <Badge variant="outline" className="font-sans text-[10px] text-muted-foreground">
                          Awaiting approval
                        </Badge>
                      )}
                      {variant?.ai_generated && (
                        <Badge variant="outline" className="font-sans text-[10px] text-muted-foreground">
                          AI
                        </Badge>
                      )}
                      {!variant && hasStarter && (
                        <Badge variant="outline" className="font-sans text-[10px] text-muted-foreground border-border">
                          <FileText className="w-2.5 h-2.5 mr-1" />
                          Starter draft
                        </Badge>
                      )}
                    </div>
                    <p className="font-sans text-xs text-muted-foreground mt-1">
                      {meta.description}
                    </p>
                    {variant?.last_drafted_at && (
                      <p className="font-sans text-[10px] text-muted-foreground/70 mt-1">
                        Last drafted {timeAgo(variant.last_drafted_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!isEditing && variant?.body_md && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(variant)}
                        className="h-8 font-sans"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                        Edit
                      </Button>
                    )}
                    {!isEditing && variant?.body_md && !variant.approved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approve.mutate({ variantId: variant.id, versionId })}
                        disabled={approve.isPending}
                        className="h-8 font-sans"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Approve
                      </Button>
                    )}
                    {!variant && hasStarter && !isEditingStarter && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingStarter(vt);
                            setStarterEdits((p) => ({ ...p, [vt]: starterBody! }));
                          }}
                          className="h-8 font-sans"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveStarter(vt)}
                          disabled={approveStarter.isPending || !effectiveOrganization?.id}
                          className="h-8 font-sans"
                        >
                          {approveStarter.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Approve
                        </Button>
                      </>
                    )}
                    {!isEditing && !isEditingStarter && (
                      <Button
                        size="sm"
                        onClick={() => handleGenerate(vt)}
                        disabled={!rulesReady || isPending}
                        className="h-8 font-sans"
                      >
                        {isPending ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {variant?.body_md ? 'Regenerate' : hasStarter ? 'AI version' : 'Generate'}
                      </Button>
                    )}
                  </div>
                </div>

                {isEditing && variant ? (
                  <div className="space-y-2">
                    <Textarea
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      rows={10}
                      className="font-mono text-xs"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(null)}
                        className="h-8 font-sans"
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(variant)}
                        disabled={updateBody.isPending}
                        className="h-8 font-sans"
                      >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        Save edits
                      </Button>
                    </div>
                  </div>
                ) : isEditingStarter && hasStarter ? (
                  <div className="space-y-2">
                    <Textarea
                      value={starterEdits[vt] ?? ''}
                      onChange={(e) => setStarterEdits((p) => ({ ...p, [vt]: e.target.value }))}
                      rows={10}
                      className="font-mono text-xs"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingStarter(null);
                          setStarterEdits((p) => {
                            const n = { ...p };
                            delete n[vt];
                            return n;
                          });
                        }}
                        className="h-8 font-sans"
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          handleApproveStarter(vt);
                          setEditingStarter(null);
                        }}
                        disabled={approveStarter.isPending || !effectiveOrganization?.id}
                        className="h-8 font-sans"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Save & approve
                      </Button>
                    </div>
                  </div>
                ) : variant?.body_md ? (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 max-h-64 overflow-y-auto">
                    <pre className="font-sans text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {variant.body_md}
                    </pre>
                  </div>
                ) : hasStarter ? (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 max-h-64 overflow-y-auto">
                    <pre className="font-sans text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {starterBody}
                    </pre>
                  </div>
                ) : (
                  <p className="font-sans text-xs text-muted-foreground italic">
                    No draft yet. Click Generate to create one with AI from your configured rules.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
