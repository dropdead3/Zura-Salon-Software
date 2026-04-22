/**
 * InlineRuleEditor (Wave 28.15)
 *
 * Renders the active variant's prose with `{{token}}` placeholders replaced
 * by clickable rule chips. Brand tokens ({{ORG_NAME}}, {{PLATFORM_NAME}})
 * are interpolated as plain text via `interpolateBrandTokens`. Schema-field
 * tokens become <RuleChipPopover> components that edit the underlying
 * rule value and persist via the parent's onRuleChange handler.
 *
 * The operator can also flip into "Edit text" mode per variant section to
 * write the prose directly — this writes to `policy_variants.body_md` via
 * the existing useUpdateVariantBody mutation. Inline edits collapse the
 * chip back into static text within that variant only.
 */
import { Fragment, useMemo, useState } from 'react';
import { Pencil, Save, X, FileText, Sparkles, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { RuleChipPopover } from './RuleChipPopover';
import {
  VARIANT_LABELS,
  usePolicyVariants,
  useGenerateDraftVariant,
  useUpdateVariantBody,
  useApproveStarterDraft,
  type PolicyVariantType,
  type PolicyVariantRow,
} from '@/hooks/policy/usePolicyDrafter';
import type { PolicyAudience } from '@/hooks/policy/usePolicyData';
import type { RuleField } from '@/lib/policy/configurator-schemas';
import { getStarterDraftSet } from '@/lib/policy/starter-drafts';
import { interpolateBrandTokens } from '@/lib/policy/render-starter-draft';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { PLATFORM_NAME } from '@/lib/brand';

interface Props {
  versionId: string;
  libraryKey: string;
  audience: PolicyAudience;
  /** All rule fields from the schema, keyed lookup for chip mounting. */
  fields: RuleField[];
  /** Current rule values keyed by block_key. */
  values: Record<string, unknown>;
  /** Called when an inline chip is committed. Parent persists via save_policy_rule_blocks. */
  onRuleChange: (key: string, next: unknown) => void;
  disabled?: boolean;
}

/** Variant types valid for a given audience. */
function variantsForAudience(audience: PolicyAudience): PolicyVariantType[] {
  if (audience === 'internal') return ['internal', 'manager_note'];
  if (audience === 'external') return ['client', 'disclosure'];
  return ['internal', 'client', 'disclosure', 'manager_note'];
}

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

interface Segment {
  kind: 'text' | 'token';
  value: string;
}

function parseSegments(text: string): Segment[] {
  if (!text) return [];
  const out: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ kind: 'text', value: text.slice(last, m.index) });
    }
    out.push({ kind: 'token', value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push({ kind: 'text', value: text.slice(last) });
  }
  return out;
}

/**
 * Render a single piece of plain text, preserving line breaks and bolding
 * any `**...**` runs (markdown's lightweight emphasis). Headlines like
 * `**Cancellation policy**` on their own line render as a small heading
 * for readability without pulling in a full markdown engine.
 */
function renderText(text: string, keyPrefix: string) {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const isHeading = /^\*\*[^*]+\*\*$/.test(line.trim());
    if (isHeading) {
      const content = line.trim().replace(/^\*\*|\*\*$/g, '');
      return (
        <Fragment key={`${keyPrefix}-${idx}`}>
          <span className="block font-display text-xs tracking-wider uppercase text-foreground mt-3 mb-1 first:mt-0">
            {content}
          </span>
        </Fragment>
      );
    }
    // Inline bold runs
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <Fragment key={`${keyPrefix}-${idx}`}>
        {parts.map((p, i) => {
          if (/^\*\*[^*]+\*\*$/.test(p)) {
            return (
              <span key={i} className="text-foreground">
                {p.replace(/^\*\*|\*\*$/g, '')}
              </span>
            );
          }
          return <Fragment key={i}>{p}</Fragment>;
        })}
        {idx < lines.length - 1 && <br />}
      </Fragment>
    );
  });
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

export function InlineRuleEditor({
  versionId,
  libraryKey,
  audience,
  fields,
  values,
  onRuleChange,
  disabled,
}: Props) {
  const allowedTypes = variantsForAudience(audience);
  const { data: variants = [] } = usePolicyVariants(versionId);
  const { effectiveOrganization } = useOrganizationContext();
  const generate = useGenerateDraftVariant();
  const updateBody = useUpdateVariantBody();
  const approveStarter = useApproveStarterDraft();

  const [editingText, setEditingText] = useState<PolicyVariantType | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [pendingType, setPendingType] = useState<PolicyVariantType | null>(null);

  const starterSet = useMemo(() => getStarterDraftSet(libraryKey), [libraryKey]);
  const fieldsByKey = useMemo(() => {
    const m = new Map<string, RuleField>();
    fields.forEach((f) => m.set(f.key, f));
    return m;
  }, [fields]);

  const variantByType = useMemo(() => {
    const m = new Map<PolicyVariantType, PolicyVariantRow>();
    variants.forEach((v) => m.set(v.variant_type, v));
    return m;
  }, [variants]);

  const orgName = effectiveOrganization?.name;

  /**
   * Resolve the active body for a variant. Priority:
   *   1. existing approved/edited row body_md (operator's truth)
   *   2. platform-authored starter draft (with brand tokens resolved)
   *   3. null (no body to render)
   */
  const getBody = (vt: PolicyVariantType): string | null => {
    const row = variantByType.get(vt);
    if (row?.body_md) return row.body_md;
    const starter = starterSet?.[vt];
    if (!starter) return null;
    return interpolateBrandTokens(starter, { orgName, platformName: PLATFORM_NAME });
  };

  const handleStartEditText = (vt: PolicyVariantType) => {
    const body = getBody(vt) ?? '';
    setEditBuffer(body);
    setEditingText(vt);
  };

  const handleSaveText = (vt: PolicyVariantType) => {
    const row = variantByType.get(vt);
    if (row) {
      updateBody.mutate(
        { variantId: row.id, versionId, body_md: editBuffer },
        { onSuccess: () => setEditingText(null) },
      );
    } else if (effectiveOrganization?.id) {
      // No row yet — approving a starter with custom edits creates the row.
      approveStarter.mutate(
        {
          versionId,
          organizationId: effectiveOrganization.id,
          variantType: vt,
          body_md: editBuffer,
        },
        { onSuccess: () => setEditingText(null) },
      );
    }
  };

  const handleRegenerate = (vt: PolicyVariantType) => {
    setPendingType(vt);
    generate.mutate(
      { versionId, variantType: vt },
      { onSettled: () => setPendingType(null) },
    );
  };

  return (
    <div className="space-y-6">
      {allowedTypes.map((vt) => {
        const meta = VARIANT_LABELS[vt];
        const row = variantByType.get(vt);
        const body = getBody(vt);
        const isEditing = editingText === vt;
        const isStarter = !row && !!body;
        const isPending = pendingType === vt && generate.isPending;

        if (!body && !isEditing) return null;

        const segments = body ? parseSegments(body) : [];

        return (
          <section key={vt} className="space-y-3">
            <header className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-display text-xs tracking-wider uppercase text-foreground">
                  {meta.label}
                </h4>
                {row?.approved && (
                  <Badge variant="outline" className="font-sans text-[10px] text-primary border-primary/30">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                    Approved
                  </Badge>
                )}
                {row && !row.approved && (
                  <Badge variant="outline" className="font-sans text-[10px] text-muted-foreground">
                    Awaiting approval
                  </Badge>
                )}
                {isStarter && (
                  <Badge variant="outline" className="font-sans text-[10px] text-muted-foreground border-border">
                    <FileText className="w-2.5 h-2.5 mr-1" />
                    Starter
                  </Badge>
                )}
                {row?.ai_generated && (
                  <Badge variant="outline" className="font-sans text-[10px] text-muted-foreground">
                    AI
                  </Badge>
                )}
                {row?.last_drafted_at && (
                  <span className="font-sans text-[10px] text-muted-foreground/70">
                    Last drafted {timeAgo(row.last_drafted_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!isEditing && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEditText(vt)}
                      disabled={disabled}
                      className="h-8 font-sans"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Edit text
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRegenerate(vt)}
                      disabled={disabled || isPending}
                      className="h-8 font-sans"
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : row?.body_md ? (
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      {row?.body_md ? 'Regenerate' : 'AI version'}
                    </Button>
                  </>
                )}
              </div>
            </header>

            <p className="font-sans text-xs text-muted-foreground -mt-1">
              {meta.description}
            </p>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editBuffer}
                  onChange={(e) => setEditBuffer(e.target.value)}
                  rows={Math.max(8, editBuffer.split('\n').length + 1)}
                  className="font-mono text-xs"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingText(null)}
                    className="h-8 font-sans"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveText(vt)}
                    disabled={updateBody.isPending || approveStarter.isPending}
                    className="h-8 font-sans"
                  >
                    {(updateBody.isPending || approveStarter.isPending) ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Save text
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'rounded-xl border border-border bg-card/60 p-5',
                  'font-sans text-sm text-foreground/90 leading-relaxed',
                )}
              >
                {segments.map((seg, i) => {
                  if (seg.kind === 'text') {
                    return (
                      <Fragment key={i}>
                        {renderText(seg.value, `${vt}-${i}`)}
                      </Fragment>
                    );
                  }
                  // token segment
                  const field = fieldsByKey.get(seg.value);
                  if (!field) {
                    // Unresolved token — leave as-is so authors notice missing wiring.
                    return (
                      <code
                        key={i}
                        className="font-mono text-[11px] px-1 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {`{{${seg.value}}}`}
                      </code>
                    );
                  }
                  return (
                    <RuleChipPopover
                      key={i}
                      field={field}
                      value={values[seg.value]}
                      audience={audience}
                      onChange={(next) => onRuleChange(seg.value, next)}
                      disabled={disabled}
                    />
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
