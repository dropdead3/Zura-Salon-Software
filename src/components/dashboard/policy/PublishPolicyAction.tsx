/**
 * PublishPolicyAction (Wave 28.15)
 *
 * Single primary "Publish policy" CTA that wraps the three operator-visible
 * mutations into one transaction with smart defaults:
 *
 *   1. Approve the active starter draft for each unsigned variant of the
 *      policy's audience (so the operator doesn't re-approve N variants).
 *   2. If audience touches external AND there is an approved client variant,
 *      flip is_published_external = true on the current version.
 *   3. If the library entry's default_requires_ack is true, set
 *      requires_acknowledgment = true on the policy.
 *
 * The "▾" reveals an Options popover with three independent toggles for the
 * 10% who want granular control. Defaults handle the 90% case.
 *
 * Doctrine: this is a UX consolidation, not a new authority. Every action
 * runs through existing RLS-gated hooks; no new privilege is invented.
 */
import { useMemo, useState } from 'react';
import { ChevronDown, CheckCircle2, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import {
  usePolicyVariants,
  useApprovePolicyVariant,
  useApproveStarterDraft,
  type PolicyVariantType,
} from '@/hooks/policy/usePolicyDrafter';
import { usePublishPolicyExternally } from '@/hooks/policy/usePublishPolicyExternally';
import { useUpdatePolicyAcknowledgmentFlag } from '@/hooks/policy/useUpdatePolicyAcknowledgmentFlag';
import type { PolicyAudience } from '@/hooks/policy/usePolicyData';
import { getStarterDraftSet } from '@/lib/policy/starter-drafts';
import { renderStarterDraft } from '@/lib/policy/render-starter-draft';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { PLATFORM_NAME } from '@/lib/brand';

interface Props {
  policyId: string;
  versionId: string;
  libraryKey: string;
  audience: PolicyAudience;
  ruleValues: Record<string, unknown>;
  isPublishedExternal: boolean;
  requiresAcknowledgment: boolean;
  /** Library default for ack — drives the smart-default toggle initial state. */
  defaultRequiresAck?: boolean;
  /** Display status string — surfaces inside the button label as a leading dot. */
  displayStatusLabel?: string;
  /** Tone hint for the leading dot ('success' = published/live, 'warning' = drafting). */
  displayStatusTone?: 'success' | 'warning' | 'neutral';
  onAfter?: () => void;
  disabled?: boolean;
}

function variantsForAudience(audience: PolicyAudience): PolicyVariantType[] {
  if (audience === 'internal') return ['internal', 'manager_note'];
  if (audience === 'external') return ['client', 'disclosure'];
  return ['internal', 'client', 'disclosure', 'manager_note'];
}

export function PublishPolicyAction({
  policyId,
  versionId,
  libraryKey,
  audience,
  ruleValues,
  isPublishedExternal,
  requiresAcknowledgment,
  defaultRequiresAck,
  displayStatusLabel,
  displayStatusTone = 'neutral',
  onAfter,
  disabled,
}: Props) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const orgName = effectiveOrganization?.name;
  const { data: variants = [] } = usePolicyVariants(versionId);
  const approveExisting = useApprovePolicyVariant();
  const approveStarter = useApproveStarterDraft();
  const publish = usePublishPolicyExternally();
  const updateAck = useUpdatePolicyAcknowledgmentFlag();

  const allowedTypes = useMemo(() => variantsForAudience(audience), [audience]);
  const starterSet = useMemo(() => getStarterDraftSet(libraryKey), [libraryKey]);

  const isExternal = audience !== 'internal';
  const [optionsOpen, setOptionsOpen] = useState(false);
  // Smart-default toggles in the options popover. Defaults match the
  // intended one-click behavior so the operator can deviate only when
  // they explicitly open Options.
  const [optApprove, setOptApprove] = useState(true);
  const [optPublish, setOptPublish] = useState(isExternal);
  const [optRequireAck, setOptRequireAck] = useState(
    requiresAcknowledgment || (isExternal && !!defaultRequiresAck),
  );
  const [running, setRunning] = useState(false);

  const variantByType = useMemo(() => {
    const m = new Map<PolicyVariantType, (typeof variants)[number]>();
    variants.forEach((v) => m.set(v.variant_type, v));
    return m;
  }, [variants]);

  const hasApprovedClientVariant = variants.some(
    (v) => v.approved && v.variant_type === 'client',
  );

  /**
   * Run the approve+publish+ack pipeline. Each step is idempotent: variants
   * already approved are skipped; publish only flips when the audience and
   * approved-variant precondition are met; ack only writes when the value
   * actually changes.
   */
  const runPipeline = async (opts: { approve: boolean; publish: boolean; requireAck: boolean }) => {
    if (!orgId || !versionId) return;
    setRunning(true);
    try {
      // Step 1 — approve unsigned variants for this audience.
      if (opts.approve) {
        for (const vt of allowedTypes) {
          const row = variantByType.get(vt);
          if (row?.approved) continue;
          if (row?.body_md) {
            // Operator-edited (or AI-generated) variant exists — approve it.
            await approveExisting.mutateAsync({ variantId: row.id, versionId });
            continue;
          }
          const template = starterSet?.[vt];
          if (!template) continue;
          const body = renderStarterDraft(template, {
            ruleValues,
            orgName,
            platformName: PLATFORM_NAME,
          });
          await approveStarter.mutateAsync({
            versionId,
            organizationId: orgId,
            variantType: vt,
            body_md: body,
          });
        }
      }

      // Step 2 — publish externally (only when audience touches external and we
      // now have an approved client variant). The RPC enforces the same gate
      // server-side; this client-side check just avoids a guaranteed error.
      if (opts.publish && isExternal) {
        // Refetch is implicit — variants invalidated above. We optimistically
        // assume the just-approved client body satisfies the gate.
        const willHaveClient = hasApprovedClientVariant || opts.approve;
        if (willHaveClient && !isPublishedExternal) {
          await publish.mutateAsync({ policyId, publish: true });
        }
      }

      // Step 3 — ack flag.
      if (opts.requireAck !== requiresAcknowledgment) {
        await updateAck.mutateAsync({
          policyId,
          requiresAcknowledgment: opts.requireAck,
        });
      }

      toast({
        title: 'Policy published',
        description: opts.publish && isExternal
          ? 'Approved and live on your client policy center.'
          : 'Approved and live for your team.',
      });
      onAfter?.();
    } catch (e) {
      toast({
        title: 'Could not publish',
        description: e instanceof Error ? e.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
      setOptionsOpen(false);
    }
  };

  return (
    <div className="inline-flex items-stretch rounded-full border border-primary/20 overflow-hidden shadow-sm">
      <Button
        size="sm"
        onClick={() =>
          runPipeline({
            approve: true,
            publish: isExternal,
            requireAck: requiresAcknowledgment || (isExternal && !!defaultRequiresAck),
          })
        }
        disabled={disabled || running}
        className="rounded-none rounded-l-full font-sans h-9 px-4 border-0"
      >
        {running ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : displayStatusLabel ? (
          <span
            className={
              'mr-2 inline-block w-1.5 h-1.5 rounded-full ' +
              (displayStatusTone === 'success'
                ? 'bg-emerald-400'
                : displayStatusTone === 'warning'
                  ? 'bg-amber-400'
                  : 'bg-muted-foreground/60')
            }
            aria-hidden
          />
        ) : (
          <CheckCircle2 className="w-4 h-4 mr-2" />
        )}
        {displayStatusLabel
          ? `${displayStatusLabel} · Publish`
          : 'Publish policy'}
      </Button>
      <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            disabled={disabled || running}
            className="rounded-none rounded-r-full h-9 px-2 border-0 border-l border-primary-foreground/20"
            aria-label="Publish options"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-4 space-y-4">
          <div className="space-y-1">
            <p className="font-display text-[11px] tracking-wider uppercase text-foreground flex items-center gap-1.5">
              <Settings className="w-3 h-3" />
              Publish options
            </p>
            <p className="font-sans text-xs text-muted-foreground">
              Defaults handle most policies. Override below if you need granular control.
            </p>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <Label className="font-sans text-sm">Approve wording</Label>
                <p className="font-sans text-xs text-muted-foreground mt-0.5">
                  Locks the current text as the approved version.
                </p>
              </div>
              <Switch checked={optApprove} onCheckedChange={setOptApprove} />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <Label className="font-sans text-sm">Publish to clients</Label>
                <p className="font-sans text-xs text-muted-foreground mt-0.5">
                  {isExternal
                    ? 'Renders on your public policy page.'
                    : 'This policy is internal-only — change audience above to enable.'}
                </p>
              </div>
              <Switch
                checked={optPublish && isExternal}
                onCheckedChange={setOptPublish}
                disabled={!isExternal}
              />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <Label className="font-sans text-sm">Require acknowledgment</Label>
                <p className="font-sans text-xs text-muted-foreground mt-0.5">
                  Adds a signature footer to the public policy.
                </p>
              </div>
              <Switch
                checked={optRequireAck}
                onCheckedChange={setOptRequireAck}
                disabled={!isExternal}
              />
            </div>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() =>
                runPipeline({
                  approve: optApprove,
                  publish: optPublish,
                  requireAck: optRequireAck,
                })
              }
              disabled={running}
              className="font-sans"
            >
              {running ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Apply and publish
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
