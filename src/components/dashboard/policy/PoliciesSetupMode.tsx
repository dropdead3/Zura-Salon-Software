/**
 * PoliciesSetupMode — guided checklist mode for the Policies page.
 *
 * Activates when Core + Required adoption is below 100%. One job:
 * get the operator to "first published policy" and through the
 * required governance set in the smallest number of decisions.
 *
 * Design doctrine:
 *  - One headline progress meter (adopted / total). The 4-tile
 *    health strip belongs to governance mode only.
 *  - Exactly one "Next →" pointer at any time, sitting on the
 *    first unadopted Core row (or first unadopted Required row
 *    once Core is 100%).
 *  - Required-for-governance is collapsed/locked until Core is
 *    100%, with a "Start in parallel" link for power users.
 *  - Everything else (search, audience tabs, category cards,
 *    Recommended/Optional, hide-non-applicable) lives behind a
 *    single "Show more options" disclosure. Available, never
 *    blocking.
 */
import { useState, type ReactNode } from 'react';
import { ArrowRight, ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { PolicyLibraryRow } from './PolicyLibraryRow';
import {
  CORE_FUNCTION_POLICY_KEYS,
  CORE_FUNCTION_CONSUMERS,
  isCoreFunctionPolicy,
  type CoreFunctionPolicyKey,
} from '@/lib/policy/core-function-policies';
import { isPolicyFinalized, type PolicyLibraryEntry, type OrgPolicy } from '@/hooks/policy/usePolicyData';

interface Props {
  /** Library entries already filtered to applicability (no phantom
   *  extension/retail/etc. policies for orgs that don't qualify). */
  applicableLibrary: PolicyLibraryEntry[];
  adoptedByKey: Map<string, OrgPolicy>;
  onOpenPolicy: (libraryKey: string) => void;
  /** Mounted as the contents of "Show more options" disclosure —
   *  the existing filter+library section, unchanged. */
  moreOptions: ReactNode;
  /** Optional banners (conflict, existing-policies import) the host
   *  page wants rendered above the headline meter. */
  topBanners?: ReactNode;
}

export function PoliciesSetupMode({
  applicableLibrary,
  adoptedByKey,
  onOpenPolicy,
  moreOptions,
  topBanners,
}: Props) {
  const [parallelMode, setParallelMode] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Partition the library into the two required tiers.
  const coreEntries = applicableLibrary
    .filter((e) => isCoreFunctionPolicy(e.key))
    .sort(
      (a, b) =>
        CORE_FUNCTION_POLICY_KEYS.indexOf(a.key as CoreFunctionPolicyKey) -
        CORE_FUNCTION_POLICY_KEYS.indexOf(b.key as CoreFunctionPolicyKey),
    );

  const requiredEntries = applicableLibrary.filter(
    (e) => e.recommendation === 'required' && !isCoreFunctionPolicy(e.key),
  );

  // Completion counts use *finalization* — an approved version must
  // exist. A row in `policies` with status `drafting` does NOT count.
  const coreAdopted = coreEntries.filter((e) =>
    isPolicyFinalized(adoptedByKey.get(e.key)),
  ).length;
  const coreTotal = coreEntries.length;
  const corePct = coreTotal > 0 ? Math.round((coreAdopted / coreTotal) * 100) : 0;
  const coreComplete = coreTotal > 0 && coreAdopted === coreTotal;

  const requiredAdopted = requiredEntries.filter((e) =>
    isPolicyFinalized(adoptedByKey.get(e.key)),
  ).length;
  const requiredTotal = requiredEntries.length;
  const requiredPct =
    requiredTotal > 0 ? Math.round((requiredAdopted / requiredTotal) * 100) : 0;

  const totalAdopted = coreAdopted + requiredAdopted;
  const totalRequired = coreTotal + requiredTotal;
  const overallPct = totalRequired > 0 ? Math.round((totalAdopted / totalRequired) * 100) : 0;

  // The single "Next →" pointer — first not-finalized Core row, or once
  // Core is 100%, the first not-finalized Required row. Drafting rows
  // qualify (they're touched but not done).
  const nextPointerKey = (() => {
    const firstCore = coreEntries.find((e) => !isPolicyFinalized(adoptedByKey.get(e.key)));
    if (firstCore) return firstCore.key;
    const firstRequired = requiredEntries.find(
      (e) => !isPolicyFinalized(adoptedByKey.get(e.key)),
    );
    return firstRequired?.key ?? null;
  })();

  // Required section is locked behind Core completion unless the
  // operator opts into parallel-mode.
  const requiredUnlocked = coreComplete || parallelMode;

  return (
    <div className="space-y-8">
      {topBanners}

      {/* ─── Headline progress meter ─── */}
      <section
        className={cn(
          'rounded-xl border border-border/60 bg-card/80 px-6 py-5',
          'flex flex-col gap-3',
        )}
      >
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="font-display text-xs tracking-[0.14em] uppercase text-muted-foreground">
              You're {totalAdopted} of {totalRequired} finalized
            </p>
            <p className="font-sans text-xs text-muted-foreground mt-1">
              {coreTotal} core function{coreTotal === 1 ? '' : 's'}
              <span className="mx-1.5 text-muted-foreground/40">·</span>
              {requiredTotal} governance polic{requiredTotal === 1 ? 'y' : 'ies'}
              <span className="mx-1.5 text-muted-foreground/40">·</span>
              <span className="italic">finalized = approved version exists</span>
            </p>
          </div>
          <span className="font-display text-3xl tracking-wide text-foreground tabular-nums">
            {overallPct}%
          </span>
        </div>
        <Progress
          value={overallPct}
          className="h-1.5 bg-muted"
          indicatorClassName={cn(
            overallPct >= 100 ? 'bg-primary' : 'bg-primary/80',
          )}
        />
      </section>

      {/* ─── Section heading: do these first ─── */}
      <div>
        <h2 className={cn(tokens.heading.section)}>Do these first</h2>
        <p className="font-sans text-sm text-muted-foreground mt-1">
          A short, ordered path. Defaults work out of the box — configure to make them yours.
        </p>
      </div>

      {/* ─── Step 1 — Core functions ─── */}
      {coreEntries.length > 0 && (
        <section className="@container rounded-xl border border-border/60 overflow-hidden bg-card/40">
          <header className="bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Step 1 of 2
              </span>
              <h3 className="font-display text-sm tracking-wide uppercase text-foreground">
                Core functions
              </h3>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className={cn(
                    'font-sans text-xs',
                    coreComplete ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {coreAdopted} of {coreTotal} configured
                </span>
                <Progress
                  value={corePct}
                  className="h-[2px] w-[100px] bg-muted"
                  indicatorClassName={coreComplete ? 'bg-primary' : 'bg-primary/70'}
                />
                <span
                  className={cn(
                    'font-sans text-xs tabular-nums',
                    coreComplete ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {corePct}%
                </span>
              </div>
            </div>
            <p className="font-sans text-xs text-muted-foreground mt-1.5">
              These power POS and booking. Defaults work out of the box — configure to make them yours.
            </p>
          </header>
          <div className="divide-y divide-border/40">
            {coreEntries.map((entry) => (
              <PolicyLibraryRow
                key={entry.id}
                entry={entry}
                adopted={adoptedByKey.get(entry.key)}
                consumerLabel={
                  CORE_FUNCTION_CONSUMERS[entry.key as CoreFunctionPolicyKey]
                }
                showDefaultFallback
                nextPointer={nextPointerKey === entry.key}
                onClick={() => onOpenPolicy(entry.key)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── Step 2 — Required for governance ─── */}
      {requiredEntries.length > 0 && (
        <section
          className={cn(
            '@container rounded-xl border border-border/60 overflow-hidden bg-card/40 transition-opacity',
            !requiredUnlocked && 'opacity-70',
          )}
        >
          <header className="bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Step 2 of 2
              </span>
              <h3 className="font-display text-sm tracking-wide uppercase text-foreground inline-flex items-center gap-2">
                {!requiredUnlocked && (
                  <Lock className="w-3 h-3 text-muted-foreground" aria-hidden />
                )}
                Protect your business
              </h3>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className={cn(
                    'font-sans text-xs',
                    requiredAdopted === requiredTotal && requiredTotal > 0
                      ? 'text-primary'
                      : 'text-muted-foreground',
                  )}
                >
                  {requiredAdopted} of {requiredTotal} adopted
                </span>
                <Progress
                  value={requiredPct}
                  className="h-[2px] w-[100px] bg-muted"
                  indicatorClassName={
                    requiredAdopted === requiredTotal && requiredTotal > 0
                      ? 'bg-primary'
                      : 'bg-primary/70'
                  }
                />
                <span
                  className={cn(
                    'font-sans text-xs tabular-nums',
                    requiredAdopted === requiredTotal && requiredTotal > 0
                      ? 'text-primary'
                      : 'text-muted-foreground',
                  )}
                >
                  {requiredPct}%
                </span>
              </div>
            </div>
            <p className="font-sans text-xs text-muted-foreground mt-1.5">
              {requiredUnlocked
                ? 'Your operations and team need a written contract. Adopt these to govern the rest of the business.'
                : `Locked until Core is 100%. Finish ${coreTotal - coreAdopted} more core function${coreTotal - coreAdopted === 1 ? '' : 's'} — or start in parallel.`}
            </p>
          </header>

          {requiredUnlocked ? (
            <div className="divide-y divide-border/40">
              {requiredEntries.map((entry) => (
                <PolicyLibraryRow
                  key={entry.id}
                  entry={entry}
                  adopted={adoptedByKey.get(entry.key)}
                  nextPointer={nextPointerKey === entry.key}
                  onClick={() => onOpenPolicy(entry.key)}
                />
              ))}
            </div>
          ) : (
            <div className="px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
              <p className="font-sans text-xs text-muted-foreground">
                Or skip the gate and configure these alongside Core.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setParallelMode(true)}
                className="font-sans text-xs"
              >
                Start in parallel
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </section>
      )}

      {/* ─── More options disclosure ─── */}
      <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border/60" />
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="font-sans text-xs text-muted-foreground hover:text-foreground"
            >
              {moreOpen ? 'Hide' : 'Show'} more options
              <ChevronDown
                className={cn(
                  'w-3 h-3 ml-1 transition-transform',
                  moreOpen && 'rotate-180',
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <CollapsibleContent className="mt-6 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
          {moreOptions}
        </CollapsibleContent>
      </Collapsible>

      {nextPointerKey && (
        <p className="font-sans text-xs text-muted-foreground text-center">
          Next up:{' '}
          <button
            type="button"
            onClick={() => onOpenPolicy(nextPointerKey)}
            className="font-sans text-xs text-foreground inline-flex items-center gap-1 underline-offset-2 hover:underline"
          >
            {applicableLibrary.find((l) => l.key === nextPointerKey)?.title}
            <ArrowRight className="w-3 h-3" />
          </button>
        </p>
      )}
    </div>
  );
}
