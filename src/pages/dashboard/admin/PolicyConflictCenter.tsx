/**
 * Policy Conflict Center (Wave 28.9)
 *
 * Lists every (surface, category) bucket where 2+ adopted policies fight for
 * the same rendering surface. Each row deep-links to the configurator and
 * exposes a "Disable mapping" action that resolves the conflict surgically.
 *
 * Visibility contract: page is silent (empty state) when zero conflicts.
 */
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  usePolicyHealthSummary,
  useOrgPolicies,
  usePolicyLibrary,
} from '@/hooks/policy/usePolicyData';
import { SURFACE_META } from '@/hooks/policy/usePolicyApplicability';
import { ConflictRow } from '@/components/dashboard/policy/conflicts/ConflictRow';

export default function PolicyConflictCenter() {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const summary = usePolicyHealthSummary();
  const { isLoading: libLoading } = usePolicyLibrary();
  const { isLoading: adoptedLoading } = useOrgPolicies();
  const { effectiveOrganization } = useOrganizationContext();
  const orgSlug = effectiveOrganization?.slug;

  const policiesPath = orgSlug ? `/org/${orgSlug}/dashboard/admin/policies` : '/dashboard/admin/policies';

  const conflicts = summary.surface_conflicts;
  const isLoading = libLoading || adoptedLoading;

  // Group conflicts by surface for cleaner scanning.
  const grouped = useMemo(() => {
    const m = new Map<string, typeof conflicts>();
    conflicts.forEach((c) => {
      const arr = m.get(c.surface) ?? [];
      arr.push(c);
      m.set(c.surface, arr);
    });
    return Array.from(m.entries());
  }, [conflicts]);

  const jumpToPolicy = (libraryKey: string) => {
    setSearchParams({ policy: libraryKey });
    navigate(`${policiesPath}?policy=${libraryKey}`);
  };

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Policy conflicts"
        description="Surfaces where two or more policies of the same category are wired together. Resolve them so clients and staff see one consistent rule per surface."
        backTo={policiesPath}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(policiesPath)}
            className="font-sans"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to policies
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className={tokens.loading.spinner} />
        </div>
      ) : conflicts.length === 0 ? (
        <div className={tokens.empty.container}>
          <ShieldCheck className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>No conflicts detected</h3>
          <p className={tokens.empty.description}>
            Every surface renders one policy per category. Nothing to resolve.
          </p>
        </div>
      ) : (
        <div className="space-y-8 max-w-4xl">
          <div className="rounded-xl border border-foreground/20 bg-foreground/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-display text-xs tracking-wider uppercase text-foreground">
                  {conflicts.length} active conflict{conflicts.length === 1 ? '' : 's'}
                </p>
                <p className="font-sans text-xs text-muted-foreground mt-1">
                  Conflicts don't block the rest of the system, but they cause clients and
                  staff to see contradictory rules on the same surface. Resolution is manual:
                  disable the surface mapping for the policies you don't want rendering there.
                </p>
              </div>
            </div>
          </div>

          {grouped.map(([surface, surfaceConflicts]) => {
            const meta = SURFACE_META[surface as keyof typeof SURFACE_META];
            return (
              <section key={surface} className="space-y-3">
                <div>
                  <h2 className={cn(tokens.heading.section)}>
                    {meta?.label ?? surface}
                  </h2>
                  {meta?.description && (
                    <p className="font-sans text-sm text-muted-foreground mt-1">
                      {meta.description}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  {surfaceConflicts.map((c, i) => (
                    <ConflictRow
                      key={`${c.surface}-${c.category}-${i}`}
                      conflict={c}
                      onJumpToPolicy={jumpToPolicy}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
