/**
 * Wave 28.11.3 — Audience banner header for the policy configurator.
 *
 * Replaces the stacked Publish + Require-ack toggles with a single
 * audience-themed banner that:
 *   - Sets context once (Internal vs Client-facing vs Both)
 *   - Surfaces only the action toggles that are valid for that audience
 *
 * Visibility Contract: renders nothing for unknown audiences.
 */
import { Globe, Users, Layers } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PolicyLibraryEntry } from '@/hooks/policy/usePolicyData';

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

  return (
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

      {/* External actions */}
      {(isExternal || isBoth) && onPublishChange && (
        <div className="flex items-start gap-3 pt-3 border-t border-border/50">
          <Switch
            id="publish-external"
            checked={!!isPublishedExternal}
            disabled={publishDisabled}
            onCheckedChange={onPublishChange}
          />
          <label htmlFor="publish-external" className="flex-1 cursor-pointer space-y-0.5">
            <p className="font-sans text-sm text-foreground">
              Publish to client policy center
            </p>
            <p className="font-sans text-xs text-muted-foreground">
              {hasApprovedClientVariant
                ? isPublishedExternal
                  ? 'Currently visible to clients.'
                  : 'Turn on to make this policy visible on your public policy page.'
                : 'Approve a client-facing variant in the Drafts tab before publishing.'}
            </p>
          </label>
        </div>
      )}

      {(isExternal || isBoth) && onClientAckChange && (
        <div className="flex items-start gap-3 pt-3 border-t border-border/50">
          <Switch
            id="require-client-ack"
            checked={!!requiresClientAck}
            disabled={ackDisabled}
            onCheckedChange={onClientAckChange}
          />
          <label htmlFor="require-client-ack" className="flex-1 cursor-pointer space-y-0.5">
            <p className="font-sans text-sm text-foreground">
              Require client acknowledgment
            </p>
            <p className="font-sans text-xs text-muted-foreground">
              Clients must type their name and confirm on the public Policy Center
              before the policy is considered acknowledged.
            </p>
          </label>
        </div>
      )}

      {/* Wave 28.11.4 — silence > false promise. The "staff acknowledgment ships
          next wave" placeholder was removed. The Applicability tab already implies
          the role-targeting story for internal policies. */}
    </div>
  );
}
