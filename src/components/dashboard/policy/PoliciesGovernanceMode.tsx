/**
 * PoliciesGovernanceMode — full governance dashboard mode.
 *
 * Activates when Core + Required adoption hits 100%. Renders the
 * full-fidelity layout (4-tile health strip + category cards +
 * library list with all filters) — what today's page shows by
 * default, but only after the operator has earned it.
 *
 * Includes a one-time "✓ Core + Required complete" celebration
 * strip. Dismissal persists in localStorage; reappears only if
 * completion drops below 100% and returns.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PolicyHealthStrip } from './PolicyHealthStrip';
import type { PolicyHealthSummary } from '@/hooks/policy/usePolicyData';

interface Props {
  summary: PolicyHealthSummary;
  /** Stable scope key for the celebration dismissal flag — usually
   *  the org id. Anonymous orgs share a scope. */
  scopeKey: string;
  /** Optional banners (existing-policies import, conflict) the host
   *  page wants rendered above the celebration strip. */
  topBanners?: ReactNode;
  /** Render slot for the existing category-cards section. */
  categorySection: ReactNode;
  /** Render slot for the existing library section (filters + lists). */
  librarySection: ReactNode;
}

export function PoliciesGovernanceMode({
  summary,
  scopeKey,
  topBanners,
  categorySection,
  librarySection,
}: Props) {
  const dismissKey = `policies:completion-celebrated:${scopeKey}`;
  const [celebrated, setCelebrated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(dismissKey) === '1';
  });

  // Re-read on scope change (org switch).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCelebrated(window.localStorage.getItem(dismissKey) === '1');
  }, [dismissKey]);

  const dismissCelebration = () => {
    setCelebrated(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(dismissKey, '1');
    }
  };

  return (
    <div className="space-y-8">
      {topBanners}

      {!celebrated && (
        <section
          className={cn(
            'rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card/80 to-card/80',
            'px-5 py-4 flex items-start gap-4',
          )}
        >
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-display text-xs tracking-[0.14em] uppercase text-foreground">
              Core + Required complete
            </h4>
            <p className="font-sans text-xs text-muted-foreground mt-1">
              Your operations and team now have a written contract. From here, manage versions and roll out updates.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={dismissCelebration}
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </section>
      )}

      <PolicyHealthStrip summary={summary} />
      {categorySection}
      {librarySection}
    </div>
  );
}
