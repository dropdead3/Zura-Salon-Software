import { useState } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientAboutFacts } from '@/hooks/useClientAboutFacts';
import { useClientCallbacks } from '@/hooks/useClientCallbacks';
import { useCallbackLookup } from '@/contexts/CallbackLookupContext';
import { ClientAboutCard } from './ClientAboutCard';
import { ClientCallbacksPanel } from './ClientCallbacksPanel';

interface HospitalityBlockProps {
  organizationId: string | null | undefined;
  /**
   * Universal hospitality client key — resolved via `getHospitalityClientKey`.
   * Accepts a Phorest ID (legacy) or a Zura `clients.id` UUID. Renamed from
   * `phorestClientId` to reflect that hospitality data is Phorest-agnostic.
   */
  clientKey: string | null | undefined;
  firstName?: string | null;
  /** Compact mode for narrow surfaces (booking flow). */
  compact?: boolean;
}

/**
 * Wraps the About + Callbacks panels and collapses to a single neutral CTA
 * when the client has no facts AND no active callbacks — honors the
 * "silence is valid output" doctrine (alert-fatigue compliance).
 *
 * Active callbacks count is sourced from `CallbackLookupContext` when mounted
 * inside a provider (schedule grid) — avoids an extra per-client query. Falls
 * back to a per-client hook outside the provider (Client Detail Sheet).
 */
export function HospitalityBlock({
  organizationId,
  clientKey,
  firstName,
  compact = false,
}: HospitalityBlockProps) {
  const { data: facts = [] } = useClientAboutFacts(clientKey);
  const lookup = useCallbackLookup();
  // Only fire per-client query when no provider is mounted (cold path).
  const { data: hookCallbacks = [] } = useClientCallbacks(lookup ? null : clientKey);
  const callbacks = lookup ? lookup.getActiveCallbacks(clientKey) : hookCallbacks;

  const [userExpanded, setUserExpanded] = useState(false);
  const isEmpty = facts.length === 0 && callbacks.length === 0;

  if (!organizationId || !clientKey) return null;

  // Collapsed empty state (no data and user hasn't asked to expand)
  if (isEmpty && !userExpanded) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary/70" />
          <span>
            Capture personal details to make {firstName || 'this client'} feel known next visit.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setUserExpanded(true)}
          className="h-7 shrink-0 px-2 text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add personal context
        </Button>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'grid gap-3 md:grid-cols-2'}>
      <ClientAboutCard
        organizationId={organizationId}
        clientId={clientKey}
        clientFirstName={firstName}
        compact={compact}
      />
      <ClientCallbacksPanel
        organizationId={organizationId}
        clientId={clientKey}
        clientFirstName={firstName}
        compact={compact}
        hidePast={compact}
      />
    </div>
  );
}
