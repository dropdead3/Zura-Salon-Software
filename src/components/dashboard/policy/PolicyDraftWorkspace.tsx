/**
 * PolicyDraftWorkspace (Wave 28.6)
 *
 * 4 cards (Internal · Client-facing · Disclosure · Manager note). Each card
 * shows AI status, last drafted, and Generate / Regenerate / Approve / Edit.
 * Drafts are AI-generated renderings of the structured rules — they cannot
 * invent rules. Operators must explicitly Approve.
 */
import { useMemo, useState } from 'react';
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Pencil, Save, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  VARIANT_LABELS,
  VARIANT_TYPE_ORDER,
  usePolicyVariants,
  useGenerateDraftVariant,
  useApprovePolicyVariant,
  useUpdateVariantBody,
  type PolicyVariantType,
  type PolicyVariantRow,
} from '@/hooks/policy/usePolicyDrafter';

interface Props {
  versionId: string;
  /** Whether all required rule blocks are configured. Drafter is disabled otherwise. */
  rulesReady: boolean;
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

export function PolicyDraftWorkspace({ versionId, rulesReady }: Props) {
  const { data: variants = [] } = usePolicyVariants(versionId);
  const generate = useGenerateDraftVariant();
  const approve = useApprovePolicyVariant();
  const updateBody = useUpdateVariantBody();
  const [editing, setEditing] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [pendingType, setPendingType] = useState<PolicyVariantType | null>(null);

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

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="font-sans text-xs text-muted-foreground">
          AI renders your configured rules in four voices. It cannot invent rules, fees, or
          exceptions — only translate what you've structured. Approve a draft to mark it
          published-ready.
        </p>
      </div>

      {!rulesReady && (
        <div className="rounded-lg border border-foreground/20 bg-muted/40 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
            <p className="font-sans text-xs text-muted-foreground">
              Configure required rules first. Drafting is disabled until all required
              fields have values.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {VARIANT_TYPE_ORDER.map((vt) => {
          const meta = VARIANT_LABELS[vt];
          const variant = byType.get(vt);
          const isPending = pendingType === vt && generate.isPending;
          const isEditing = variant && editing === variant.id;

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
                    {!isEditing && (
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
                        {variant?.body_md ? 'Regenerate' : 'Generate'}
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
                ) : variant?.body_md ? (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 max-h-64 overflow-y-auto">
                    <pre className="font-sans text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {variant.body_md}
                    </pre>
                  </div>
                ) : (
                  <p className="font-sans text-xs text-muted-foreground italic">
                    No draft yet.
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
