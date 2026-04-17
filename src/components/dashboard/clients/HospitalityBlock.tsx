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
}

/**
 * Wraps the About + Callbacks panels and collapses to a single neutral CTA
 * when the client has no facts AND no active callbacks — honors the
 * "silence is valid output" doctrine (alert-fatigue compliance).
 */
export function HospitalityBlock({
  organizationId,
  phorestClientId,
  firstName,
}: HospitalityBlockProps) {
  const { data: facts = [] } = useClientAboutFacts(phorestClientId);
  const { data: callbacks = [] } = useClientCallbacks(phorestClientId);
  const [expanded, setExpanded] = useState(false);

  const isEmpty = facts.length === 0 && callbacks.length === 0;

  if (!organizationId || !phorestClientId) return null;

  // Collapsed empty state
  if (isEmpty && !expanded) {
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
          onClick={() => setExpanded(true)}
          className="h-7 shrink-0 px-2 text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add personal context
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <ClientAboutCard
        organizationId={organizationId}
        clientId={phorestClientId}
        clientFirstName={firstName}
      />
      <ClientCallbacksPanel
        organizationId={organizationId}
        clientId={phorestClientId}
        clientFirstName={firstName}
      />
    </div>
  );
}
