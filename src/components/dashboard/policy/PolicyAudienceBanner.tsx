/**
 * Wave 28.11.3 — Audience banner header for the policy configurator.
 *
 * Replaces the stacked Publish + Require-ack toggles with a single
 * audience-themed banner that:
 *   - Sets context once (Internal vs Client-facing vs Both)
 *   - Surfaces only the action toggles that are valid for that audience
 *
 * Visibility Contract: renders nothing for unknown audiences.
 *
 * Wave 28.11.6 — Disabled toggles now expose an actionable "unlock path"
 * (Lock icon, amber helper text, inline "Go to Drafts →" CTA, and a
 * banner-level setup hint) so the operator understands the precondition
 * gating the control rather than reading the disabled state as broken.
 */
import { Globe, Users, Layers, Lock, ArrowRight, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PolicyLibraryEntry } from '@/hooks/policy/usePolicyData';
import type { StepId } from '@/lib/policy/configurator-steps';

interface Props {
  audience: PolicyLibraryEntry['audience'];
  publicPolicyUrl: string | null;
  /** External-facing controls — only rendered when audience touches external */
  isPublishedExternal?: boolean;
  publishDisabled?: boolean;
  onPublishChange?: (next: boolean) => void;
  requiresClientAck?: boolean;
  ackDisabled?: boolean;
  onClientAckChange?: (next: boolean) => void;
  hasApprovedClientVariant?: boolean;
  /** Internal-facing controls — hooked up in 28.11.4 (staff acks); reserved here */
  requiresStaffAck?: boolean;
  onStaffAckChange?: (next: boolean) => void;
  /** Wave 28.11.6 — jump to a configurator step (typically 'drafts') to satisfy
   *  the precondition blocking a disabled toggle. */
  onJumpToStep?: (step: StepId) => void;
}

export function PolicyAudienceBanner({
  audience,
  publicPolicyUrl,
  isPublishedExternal,
  publishDisabled,
  onPublishChange,
  requiresClientAck,
  ackDisabled,
  onClientAckChange,
  hasApprovedClientVariant,
  onJumpToStep,
}: Props) {
  const isExternal = audience === 'external';
  const isInternal = audience === 'internal';
  const isBoth = audience === 'both';

  const Icon = isInternal ? Users : isExternal ? Globe : Layers;
  const label = isInternal
    ? 'Internal handbook'
    : isExternal
      ? 'Client-facing'
      : 'Internal + Client-facing';

  const tone = isInternal
    ? 'border-border/60 bg-muted/40'
    : isExternal
      ? 'border-primary/30 bg-primary/[0.04]'
      : 'border-border/60 bg-card';

  const description = isInternal
    ? "This policy lives inside your handbook. It isn't shown to clients."
    : isExternal
      ? publicPolicyUrl
        ? `Visible to clients at ${publicPolicyUrl} once published.`
        : 'Visible to clients on your public policy page once published.'
      : 'Configured for both staff (handbook) and clients (public center).';

  // Wave 28.11.6 — derive precondition states for actionable disabled chrome.
  const touchesExternal = isExternal || isBoth;
  const publishBlockedByVariant = !!publishDisabled && !hasApprovedClientVariant;
  const ackBlockedByVariant = !!ackDisabled && !requiresClientAck && !hasApprovedClientVariant;
  const ackBlockedByPublish =
    !!ackDisabled && !requiresClientAck && hasApprovedClientVariant && !isPublishedExternal;
  const showSetupStrip = touchesExternal && !hasApprovedClientVariant && !!onJumpToStep;

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('rounded-lg border p-4 space-y-4', tone)}>
        {/* Context row */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-md flex items-center justify-center shrink-0',
              isExternal ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground/70',
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display text-xs tracking-wider uppercase text-foreground">
                {label}
              </p>
              {/* Wave 28.11.5 — Live badge applies to any audience that touches
                  external (external OR both), not just external-only. */}
              {(isExternal || isBoth) && isPublishedExternal && (
                <Badge
                  variant="outline"
                  className="font-sans text-[10px] text-primary border-primary/30"
                >
                  Live
                </Badge>
              )}
            </div>
            <p className="font-sans text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        </div>

        {/* Wave 28.11.6 — Banner-level "setup path" hint when the external
            toggles below are blocked by a missing client variant. Surfaces the
            gate at the section level so the operator sees the precondition
            before they reach for a disabled switch. */}
        {showSetupStrip && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="font-sans text-xs text-foreground">
                This policy needs an approved client-facing variant before it can publish.
              </p>
              <button
                type="button"
                onClick={() => onJumpToStep?.('drafts')}
                className="inline-flex items-center gap-1 font-sans text-xs text-primary hover:underline"
              >
                Go to Drafts
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* External actions */}
        {(isExternal || isBoth) && onPublishChange && (
          <div className="flex items-start gap-3 pt-3 border-t border-border/50">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'inline-flex rounded-full',
                    publishBlockedByVariant && 'ring-1 ring-dashed ring-foreground/20 p-0.5',
                  )}
                >
                  <Switch
                    id="publish-external"
                    checked={!!isPublishedExternal}
                    disabled={publishDisabled}
                    onCheckedChange={onPublishChange}
                  />
                </span>
              </TooltipTrigger>
              {publishBlockedByVariant && (
                <TooltipContent side="top">
                  Requires an approved client variant
                </TooltipContent>
              )}
            </Tooltip>
            <label htmlFor="publish-external" className="flex-1 cursor-pointer space-y-1">
              <p className="font-sans text-sm text-foreground inline-flex items-center gap-1.5">
                Publish to client policy center
                {publishBlockedByVariant && (
                  <Lock className="w-3 h-3 text-amber-500" aria-hidden />
                )}
              </p>
              <p
                className={cn(
                  'font-sans text-xs',
                  publishBlockedByVariant ? 'text-amber-500/90' : 'text-muted-foreground',
                )}
              >
                {hasApprovedClientVariant
                  ? isPublishedExternal
                    ? 'Currently visible to clients.'
                    : 'Turn on to make this policy visible on your public policy page.'
                  : 'No client-facing variant approved yet.'}
              </p>
              {publishBlockedByVariant && onJumpToStep && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onJumpToStep('drafts');
                  }}
                  className="inline-flex items-center gap-1 font-sans text-xs text-primary hover:underline"
                >
                  <ArrowRight className="w-3 h-3" />
                  Go to Drafts to approve one
                </button>
              )}
            </label>
          </div>
        )}

        {(isExternal || isBoth) && onClientAckChange && (
          <div className="flex items-start gap-3 pt-3 border-t border-border/50">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'inline-flex rounded-full',
                    (ackBlockedByVariant || ackBlockedByPublish) &&
                      'ring-1 ring-dashed ring-foreground/20 p-0.5',
                  )}
                >
                  <Switch
                    id="require-client-ack"
                    checked={!!requiresClientAck}
                    disabled={ackDisabled}
                    onCheckedChange={onClientAckChange}
                  />
                </span>
              </TooltipTrigger>
              {(ackBlockedByVariant || ackBlockedByPublish) && (
                <TooltipContent side="top">
                  {ackBlockedByVariant
                    ? 'Requires an approved client variant'
                    : 'Publish the policy before requiring acknowledgment'}
                </TooltipContent>
              )}
            </Tooltip>
            <label htmlFor="require-client-ack" className="flex-1 cursor-pointer space-y-1">
              <p className="font-sans text-sm text-foreground inline-flex items-center gap-1.5">
                Require client acknowledgment
                {(ackBlockedByVariant || ackBlockedByPublish) && (
                  <Lock className="w-3 h-3 text-amber-500" aria-hidden />
                )}
              </p>
              <p
                className={cn(
                  'font-sans text-xs',
                  ackBlockedByVariant || ackBlockedByPublish
                    ? 'text-amber-500/90'
                    : 'text-muted-foreground',
                )}
              >
                {ackBlockedByVariant
                  ? 'Approve a client-facing variant first.'
                  : ackBlockedByPublish
                    ? 'Publish this policy before requiring acknowledgment.'
                    : 'Clients must type their name and confirm on the public Policy Center before the policy is considered acknowledged.'}
              </p>
              {ackBlockedByVariant && onJumpToStep && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onJumpToStep('drafts');
                  }}
                  className="inline-flex items-center gap-1 font-sans text-xs text-primary hover:underline"
                >
                  <ArrowRight className="w-3 h-3" />
                  Go to Drafts to approve one
                </button>
              )}
            </label>
          </div>
        )}

        {/* Wave 28.11.4 — silence > false promise. The "staff acknowledgment ships
            next wave" placeholder was removed. The Applicability tab already implies
            the role-targeting story for internal policies. */}
      </div>
    </TooltipProvider>
  );
}
