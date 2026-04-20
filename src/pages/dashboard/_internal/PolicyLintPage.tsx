/**
 * Policy Library Lint — internal dev surface
 *
 * Platform-admin gated read-only runner that executes
 * `runPolicyLibraryLint` against live `policy_library` rows.
 *
 * Why this exists: content-wave authors need a way to discover
 * `requires_*` drift without running the test suite locally.
 * CI catches it post-push; this catches it pre-push, ad hoc.
 *
 * Doctrine: see `mem://features/policy-os-applicability-doctrine.md`
 * Rules: see `src/lib/policy/lint-rules.ts`
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  runPolicyLibraryLint,
  type PolicyLibraryRow,
} from '@/lib/policy/lint-rules';

const QUERY_KEY = ['_internal', 'policy-lint'] as const;

function useLibraryRows() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<PolicyLibraryRow[]> => {
      const { data, error } = await supabase
        .from('policy_library')
        .select(
          'id, key, category, audience, title, why_it_matters, requires_extensions, requires_retail, requires_packages, requires_minors'
        )
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (error) throw error;
      return (data ?? []) as PolicyLibraryRow[];
    },
    staleTime: 30_000,
  });
}

export default function PolicyLintPage() {
  const queryClient = useQueryClient();
  const { data: rows, isLoading, isFetching, error, dataUpdatedAt } = useLibraryRows();

  const lintResult = rows ? runPolicyLibraryLint(rows) : { failures: [] };
  const failureCount = lintResult.failures.length;
  const rowCount = rows?.length ?? 0;
  const isClean = !isLoading && rowCount > 0 && failureCount === 0;
  const lastChecked = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  // Group failures by rule id (parsed from "[lib:key] (rule-id) message")
  const grouped = new Map<string, string[]>();
  for (const msg of lintResult.failures) {
    const match = msg.match(/\(([^)]+)\)/);
    const ruleId = match?.[1] ?? 'unknown';
    const list = grouped.get(ruleId) ?? [];
    list.push(msg);
    grouped.set(ruleId, list);
  }

  const handleRerun = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  return (
    <div className="container mx-auto px-4 py-6 lg:px-8 lg:py-8 max-w-[1600px] space-y-6">
      <DashboardPageHeader
        title="Policy Library Lint"
        description="Internal: validates seeded policy content against POLICY_LIBRARY_LINT_RULES."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRerun}
            disabled={isFetching}
            className="gap-2"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Re-run
          </Button>
        }
      />

      {/* Summary tile */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', isClean ? 'bg-emerald-500/10' : failureCount > 0 ? 'bg-destructive/10' : 'bg-muted')}>
              {isClean ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ) : failureCount > 0 ? (
                <ShieldAlert className="w-5 h-5 text-destructive" />
              ) : (
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              )}
            </div>
            <div>
              <CardTitle className="font-display text-base tracking-wide">
                {isLoading ? 'Loading…' : `${rowCount} entries · ${failureCount} failure${failureCount === 1 ? '' : 's'}`}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Last checked {lastChecked}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Body */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className={tokens.loading.spinner} />
        </div>
      )}

      {error && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Failed to load policy library: {(error as Error).message}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && isClean && (
        <Card>
          <CardContent>
            <div className={tokens.empty.container}>
              <ShieldCheck className={cn(tokens.empty.icon, 'text-emerald-600 opacity-40')} />
              <h3 className={tokens.empty.heading}>All entries pass lint rules</h3>
              <p className={tokens.empty.description}>
                {rowCount} library {rowCount === 1 ? 'entry' : 'entries'} validated. Last checked {lastChecked}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && failureCount > 0 && (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([ruleId, messages]) => (
            <Card key={ruleId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-sm tracking-wide">
                    Rule: {ruleId}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {messages.length} failure{messages.length === 1 ? '' : 's'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {messages.map((msg, idx) => (
                    <li
                      key={idx}
                      className="font-mono text-xs text-foreground/80 bg-muted/40 rounded-md px-3 py-2 break-all"
                    >
                      {msg}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          <p className="text-xs text-muted-foreground px-1">
            Doctrine: <code>mem://features/policy-os-applicability-doctrine.md</code> · Rules: <code>src/lib/policy/lint-rules.ts</code>
          </p>
        </div>
      )}
    </div>
  );
}
