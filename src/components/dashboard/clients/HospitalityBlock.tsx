import { useState } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientAboutFacts } from '@/hooks/useClientAboutFacts';
import { useClientCallbacks } from '@/hooks/useClientCallbacks';
import { ClientAboutCard } from './ClientAboutCard';
import { ClientCallbacksPanel } from './ClientCallbacksPanel';

interface HospitalityBlockProps {
  organizationId: string | null | undefined;
  phorestClientId: string | null | undefined;
  firstName?: string | null;
  /** Compact mode for narrow surfaces (booking flow). */
  compact?: boolean;
}

/**
 * Wraps the About + Callbacks panels and collapses to a single neutral CTA
 * when the client has no facts AND no active callbacks — honors the
 * "silence is valid output" doctrine (alert-fatigue compliance).
 *
 * Empty state derives purely from data; clicking the CTA expands until the
 * user adds content. If the user later deletes everything, the block
 * automatically re-collapses (see `userExpanded` reset on isEmpty).
 */
export function HospitalityBlock({
  organizationId,
  phorestClientId,
  firstName,
  compact = false,
}: HospitalityBlockProps) {
  const { data: facts = [] } = useClientAboutFacts(phorestClientId);
  const { data: callbacks = [] } = useClientCallbacks(phorestClientId);
  const [userExpanded, setUserExpanded] = useState(false);

  const isEmpty = facts.length === 0 && callbacks.length === 0;

  if (!organizationId || !phorestClientId) return null;

  // Auto-reset expansion intent once data drains back to empty —
  // prevents the "two empty panels" flash after delete-all.
  if (!isEmpty && userExpanded) {
    // no-op: rendering panels anyway
  } else if (isEmpty && userExpanded === false) {
    // collapsed CTA path below
  }

  // Collapsed empty state (no data and user hasn't asked to expand)
  if (isEmpty && !userExpanded) {
    return (
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-2.5">
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

  // If expanded but the user has now drained all data, snap back to collapsed
  // on next interaction by resetting the flag — done via render-time check.
  // (Inline state derivation; React batches the next render.)
  if (isEmpty && userExpanded) {
    // Reset so subsequent renders show CTA again unless re-expanded.
    queueMicrotask(() => setUserExpanded(false));
  }

  return (
    <div className={compact ? 'space-y-3' : 'mt-3 grid gap-3 md:grid-cols-2'}>
      <ClientAboutCard
        organizationId={organizationId}
        clientId={phorestClientId}
        clientFirstName={firstName}
        compact={compact}
      />
      <ClientCallbacksPanel
        organizationId={organizationId}
        clientId={phorestClientId}
        clientFirstName={firstName}
        compact={compact}
        hidePast={compact}
      />
    </div>
  );
}
