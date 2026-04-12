import { useState, Fragment, useMemo } from 'react';
import { Info } from 'lucide-react';
import { Landmark, Building2, TrendingUp, Eye, Loader2, BookOpen, ChevronDown, ChevronRight, Check, X, AlertTriangle, Minus, CreditCard, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import {
  PlatformTable,
  PlatformTableHeader,
  PlatformTableBody,
  PlatformTableRow,
  PlatformTableHead,
  PlatformTableCell,
} from '@/components/platform/ui/PlatformTable';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { Switch } from '@/components/ui/switch';
import { useUpdateOrgFeatureFlag } from '@/hooks/useOrganizationFeatureFlags';
import {
  useOrgCapitalDiagnostics,
  getVisibilityVerdict,
  type VisibilityVerdict,
  type OpportunityDiagnostic,
  type OrgCapitalDiagnostics,
} from '@/hooks/useOrgCapitalDiagnostics';
import { formatCurrency } from '@/lib/format';
import type { EligibilityInputs } from '@/lib/capital-engine/capital-formulas';
import type { CapitalPolicy } from '@/config/capital-engine/capital-formulas-config';
import { STRIPE_CAPITAL_REQUIREMENTS, ZURA_HARD_GATES, ZURA_ADVISORIES } from '@/config/capital-engine/capital-formulas-config';
import { toast } from 'sonner';

/* ── Types ── */

interface OrgWithCapital {
  id: string;
  name: string;
  slug: string;
  account_number: number | null;
  capital_enabled: boolean;
  qualifying_count: number;
}

/* ── Data Hook ── */

function useOrganizationsWithCapital() {
  return useQuery({
    queryKey: ['platform-capital-orgs'],
    queryFn: async (): Promise<OrgWithCapital[]> => {
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug, account_number')
        .order('name');
      if (orgsError) throw orgsError;

      const { data: flags, error: flagsError } = await supabase
        .from('organization_feature_flags')
        .select('organization_id, is_enabled')
        .eq('flag_key', 'capital_enabled');
      if (flagsError) throw flagsError;

      // Count qualifying opps per org
      const { data: qualCounts, error: qualError } = await supabase
        .from('capital_funding_opportunities')
        .select('organization_id, status')
        .in('status', ['eligible_internal', 'eligible_provider', 'surfaced', 'viewed']);
      if (qualError) throw qualError;

      const flagMap = new Map(
        (flags || []).map((f) => [f.organization_id, f.is_enabled]),
      );

      const qualMap = new Map<string, number>();
      for (const row of qualCounts || []) {
        qualMap.set(row.organization_id, (qualMap.get(row.organization_id) ?? 0) + 1);
      }

      return (orgs || []).map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug || '',
        account_number: org.account_number ?? null,
        capital_enabled: flagMap.get(org.id) ?? false,
        qualifying_count: qualMap.get(org.id) ?? 0,
      }));
    },
  });
}

/* ── Visibility Badge ── */

function VisibilityBadge({ verdict }: { verdict: VisibilityVerdict }) {
  switch (verdict) {
    case 'surfacing':
      return <PlatformBadge variant="success">Surfacing</PlatformBadge>;
    case 'enabled_not_surfacing':
      return <PlatformBadge variant="warning">Enabled, Not Surfacing</PlatformBadge>;
    case 'disabled':
      return <PlatformBadge variant="default">Disabled</PlatformBadge>;
  }
}

/* ── Two-Layer Eligibility Check List (replaces legacy 19-check list) ── */

function EligibilityCheckList({ opp }: { opp: OpportunityDiagnostic }) {
  const readiness = opp.operationalReadiness;
  const ranking = opp.ranking;

  return (
    <div className="px-4 py-3 space-y-4 border-t border-[hsl(var(--platform-border)/0.15)] bg-[hsl(var(--platform-bg-card)/0.08)]">
      {/* Section 1: Hard Gate (critical ops only) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-3.5 w-3.5 text-red-400" />
          <p className="text-xs font-sans text-[hsl(var(--platform-foreground))] uppercase">
            Hard Gate ({readiness.ready ? 'Clear' : 'Blocked'})
          </p>
        </div>
        <div className="space-y-3">
          {ZURA_HARD_GATES.map((gate) => {
            const isBlocked = readiness.blockerCodes.includes(gate.code as any);
            return (
              <div key={gate.code} className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {isBlocked ? (
                    <X className="h-3.5 w-3.5 text-red-400" />
                  ) : (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-[hsl(var(--platform-foreground))]">{gate.label}</p>
                  <p className="text-xs text-[hsl(var(--platform-foreground-muted))] leading-relaxed">{gate.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Advisory Context (informational, does not block) */}
      {(readiness.advisoryCodes.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-xs font-sans text-[hsl(var(--platform-foreground))] uppercase">
              Advisory Context
            </p>
          </div>
          <div className="space-y-3">
            {ZURA_ADVISORIES.map((adv) => {
              const isActive = readiness.advisoryCodes.includes(adv.code as any);
              if (!isActive) return null;
              return (
                <div key={adv.code} className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {adv.severity === 'warning' ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <Info className="h-3.5 w-3.5 text-blue-400" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-[hsl(var(--platform-foreground))]">{adv.label}</p>
                    <p className="text-xs text-[hsl(var(--platform-foreground-muted))] leading-relaxed">{adv.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 3: Ranking Factors (scored, not gates) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-3.5 w-3.5 text-violet-400" />
          <p className="text-xs font-sans text-[hsl(var(--platform-foreground))] uppercase">
            Ranking Score: {ranking.score}/100
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {ranking.factors.map((factor) => (
            <div key={factor.code} className="flex items-start gap-2.5">
              <div className="mt-0.5 shrink-0">
                {factor.passed ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400/60" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400/60" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-[hsl(var(--platform-foreground))]">{factor.label}</p>
                <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">
                  {factor.code === 'risk' ? `Level ${factor.value}` : factor.value.toFixed(factor.code === 'roe' ? 2 : 0)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Two-Layer Eligibility Reference (no-opportunity state) ── */

function EligibilityReferenceList({ policy }: { policy: CapitalPolicy }) {
  return (
    <div className="space-y-5">
      {/* Section A — Stripe Capital Requirements */}
      <div className="rounded-lg border border-[hsl(var(--platform-border)/0.2)] bg-[hsl(var(--platform-bg-card)/0.08)] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="h-4 w-4 text-violet-400" />
          <h5 className="font-sans text-xs tracking-normal text-[hsl(var(--platform-foreground))] uppercase">
            Layer 1 — Stripe Capital Underwriting
          </h5>
        </div>
        <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">
          Stripe reviews connected accounts daily and determines eligibility automatically. Zura cannot influence these criteria — they are evaluated by Stripe's underwriting engine.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {STRIPE_CAPITAL_REQUIREMENTS.map((req) => (
            <div key={req.label} className="flex items-start gap-2.5">
              <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0 text-violet-400/50" />
              <div className="space-y-0.5">
                <p className="text-xs text-[hsl(var(--platform-foreground))]">{req.label}</p>
                <p className="text-xs text-[hsl(var(--platform-foreground-muted))] leading-relaxed">{req.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section B — Zura Operational Context */}
      <div className="rounded-lg border border-[hsl(var(--platform-border)/0.2)] bg-[hsl(var(--platform-bg-card)/0.08)] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-amber-400" />
          <h5 className="font-sans text-xs tracking-normal text-[hsl(var(--platform-foreground))] uppercase">
            Layer 2 — Zura Operational Context
          </h5>
        </div>
        <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">
          Stripe is the lender — Zura provides operational context, not additional underwriting. Only critical operational alerts block surfacing. Repayment and project context is shown as advisory information.
        </p>
        <div className="space-y-3">
          {ZURA_HARD_GATES.map((gate) => (
            <div key={gate.code} className="flex items-start gap-2.5">
              <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-400/60" />
              <div className="space-y-0.5">
                <p className="text-xs text-[hsl(var(--platform-foreground))]">
                  <span className="text-red-400/80">[Blocker]</span> {gate.label}
                </p>
                <p className="text-xs text-[hsl(var(--platform-foreground-muted))] leading-relaxed">{gate.description}</p>
              </div>
            </div>
          ))}
          {ZURA_ADVISORIES.map((adv) => (
            <div key={adv.code} className="flex items-start gap-2.5">
              {adv.severity === 'warning' ? (
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400/60" />
              ) : (
                <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-400/60" />
              )}
              <div className="space-y-0.5">
                <p className="text-xs text-[hsl(var(--platform-foreground))]">
                  <span className={adv.severity === 'warning' ? 'text-amber-400/80' : 'text-blue-400/80'}>
                    [{adv.severity === 'warning' ? 'Warning' : 'Info'}]
                  </span>{' '}
                  {adv.label}
                </p>
                <p className="text-xs text-[hsl(var(--platform-foreground-muted))] leading-relaxed">{adv.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-[hsl(var(--platform-border)/0.1)]">
          <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">
            Capital offers are surfaced when no critical operational alerts are active. Repayment and project context is shown as advisory information.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Diagnostic Panel (expanded row) ── */

function DiagnosticPanel({ orgId }: { orgId: string }) {
  const { data, isLoading } = useOrgCapitalDiagnostics(orgId);
  const [expandedOppId, setExpandedOppId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 px-4 text-sm text-[hsl(var(--platform-foreground-muted))]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading diagnostics…
      </div>
    );
  }

  if (!data) return null;

  const checks = [
    {
      label: 'Feature Flag',
      passed: data.flagEnabled,
      detail: data.flagEnabled ? 'capital_enabled is ON' : 'capital_enabled is OFF',
    },
    {
      label: 'Zura Pay Connected',
      passed: data.hasActiveStripeConnect,
      detail: data.hasActiveStripeConnect
        ? `${data.connectedLocationCount} of ${data.totalLocationCount} location${data.totalLocationCount !== 1 ? 's' : ''} connected to Zura Pay`
        : 'No locations connected to Zura Pay — Stripe Capital requires an active payment processing account',
    },
    {
      label: 'Qualifying Opportunities',
      passed: data.qualifyingCount > 0,
      detail:
        data.qualifyingCount > 0
          ? `${data.qualifyingCount} qualifying (pending_review, approved, or ready)`
          : data.totalOpportunities > 0
            ? `0 qualifying out of ${data.totalOpportunities} total opportunities`
            : 'No opportunities detected for this organization',
    },
    {
      label: 'Sidebar Visible',
      passed: data.sidebarVisible,
      detail: data.sidebarVisible
        ? "Zura Capital is visible in this organization's sidebar"
        : 'Zura Capital is NOT visible — all conditions above must pass',
    },
  ];

  return (
    <div className="px-6 py-5 space-y-5 border-t border-[hsl(var(--platform-border)/0.3)] bg-[hsl(var(--platform-bg-card)/0.15)]">
      {/* Diagnostic Checklist */}
      <div>
        <h4 className="font-sans text-xs tracking-normal text-[hsl(var(--platform-foreground-muted))] mb-3 uppercase">
          Visibility Checklist
        </h4>
        <div className="space-y-0 divide-y divide-[hsl(var(--platform-border)/0.1)]">
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex items-start gap-3 py-2.5 first:pt-0"
            >
              <div className="mt-0.5 shrink-0">
                {check.passed ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <X className="h-4 w-4 text-red-400" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="font-sans text-sm text-[hsl(var(--platform-foreground))]">
                  {check.label}
                </p>
                <p className="font-sans text-xs text-[hsl(var(--platform-foreground-muted))] leading-relaxed">
                  {check.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
        {data.lastOpportunityAt && (
          <p className="text-xs text-[hsl(var(--platform-foreground-muted))] mt-3">
            Last opportunity detected: {new Date(data.lastOpportunityAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Opportunity Breakdown */}
      {data.flagEnabled && data.opportunities.length > 0 && (
        <div>
          <h4 className="font-sans text-xs tracking-normal text-[hsl(var(--platform-foreground-muted))] mb-3 uppercase">
            Opportunity Breakdown
          </h4>
          <div className="rounded-lg border border-[hsl(var(--platform-border)/0.3)] overflow-hidden">
            {data.opportunities.map((opp) => {
              const isOppExpanded = expandedOppId === opp.id;
              return (
                <div key={opp.id} className="border-b border-[hsl(var(--platform-border)/0.15)] last:border-0">
                  <button
                    onClick={() => setExpandedOppId(isOppExpanded ? null : opp.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[hsl(var(--platform-bg-hover)/0.3)] transition-colors text-left"
                  >
                    {isOppExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-[hsl(var(--platform-foreground-muted))] shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-[hsl(var(--platform-foreground-muted))] shrink-0" />
                    )}
                    <span className="text-[hsl(var(--platform-foreground)/0.85)] flex-1 truncate">
                      {opp.title}
                    </span>
                    <PlatformBadge size="sm" variant={opp.isQualifying ? 'info' : 'default'}>
                      {opp.status}
                    </PlatformBadge>
                    {opp.operationalReadiness.ready ? (
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-red-400 shrink-0" />
                    )}
                  </button>
                  {isOppExpanded && <EligibilityCheckList opp={opp} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.flagEnabled && data.opportunities.length === 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--platform-foreground-muted))]">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            No opportunities have been detected for this organization yet.
          </div>
          <EligibilityReferenceList policy={data.effectivePolicy} />
        </div>
      )}
    </div>
  );
}

/* ── Page ── */

export default function CapitalControlTower() {
  const { data: orgs, isLoading } = useOrganizationsWithCapital();
  const updateFlag = useUpdateOrgFeatureFlag();
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleToggle = (orgId: string, orgName: string, currentValue: boolean) => {
    updateFlag.mutate(
      {
        organizationId: orgId,
        flagKey: 'capital_enabled',
        isEnabled: !currentValue,
        reason: 'Toggled by platform admin via Capital Control Tower',
      },
      {
        onSuccess: () => {
          toast.success(
            `Zura Capital ${!currentValue ? 'enabled' : 'disabled'} for ${orgName}`,
          );
        },
        onError: () => {
          toast.error(`Failed to update Capital access for ${orgName}`);
        },
      },
    );
  };

  const enabledCount = orgs?.filter((o) => o.capital_enabled).length ?? 0;
  const surfacingCount =
    orgs?.filter((o) => o.capital_enabled && o.qualifying_count > 0).length ?? 0;
  const totalCount = orgs?.length ?? 0;

  const filtered = orgs?.filter((o) => {
    if (filter === 'enabled') return o.capital_enabled;
    if (filter === 'disabled') return !o.capital_enabled;
    return true;
  });

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Zura Capital Control Tower"
        description="Manage Capital access and monitor rollout across the platform"
        actions={
          <PlatformButton
            variant="outline"
            onClick={() => navigate('/platform/capital/guide')}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Feature Guide
          </PlatformButton>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PlatformCard variant="glass">
          <PlatformCardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Landmark className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  Capital Enabled
                </p>
                <p className="text-2xl font-medium text-[hsl(var(--platform-foreground))]">
                  {isLoading ? '—' : enabledCount}
                </p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>

        <PlatformCard variant="glass">
          <PlatformCardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Eye className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  Surfacing
                </p>
                <p className="text-2xl font-medium text-[hsl(var(--platform-foreground))]">
                  {isLoading ? '—' : surfacingCount}
                </p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>

        <PlatformCard variant="glass">
          <PlatformCardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-500/10">
                <Building2 className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  Total Organizations
                </p>
                <p className="text-2xl font-medium text-[hsl(var(--platform-foreground))]">
                  {isLoading ? '—' : totalCount}
                </p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>

        <PlatformCard variant="glass">
          <PlatformCardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <TrendingUp className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  Rollout Coverage
                </p>
                <p className="text-2xl font-medium text-[hsl(var(--platform-foreground))]">
                  {isLoading
                    ? '—'
                    : totalCount > 0
                      ? `${Math.round((enabledCount / totalCount) * 100)}%`
                      : '0%'}
                </p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>
      </div>

      {/* Organization Access Table */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <PlatformCardTitle className="text-lg">
                Organization Access
              </PlatformCardTitle>
              <PlatformCardDescription>
                Toggle Capital on or off for each organization. Expand a row to
                see visibility diagnostics.
              </PlatformCardDescription>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-[hsl(var(--platform-bg-hover))] p-1">
              {(['all', 'enabled', 'disabled'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-[hsl(var(--platform-bg-card))] text-[hsl(var(--platform-foreground))]'
                      : 'text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'enabled' ? 'Enabled' : 'Disabled'}
                </button>
              ))}
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--platform-foreground-muted))]" />
            </div>
          ) : (
            <PlatformTable>
              <PlatformTableHeader>
                <PlatformTableRow>
                  <PlatformTableHead className="w-8" />
                  <PlatformTableHead>Organization</PlatformTableHead>
                  <PlatformTableHead>Account #</PlatformTableHead>
                  <PlatformTableHead>Visibility</PlatformTableHead>
                  <PlatformTableHead>Status</PlatformTableHead>
                  <PlatformTableHead className="text-right">
                    Access
                  </PlatformTableHead>
                </PlatformTableRow>
              </PlatformTableHeader>
              <PlatformTableBody>
                {filtered?.map((org) => {
                  const verdict = getVisibilityVerdict(
                    org.capital_enabled,
                    org.qualifying_count,
                  );
                  const isExpanded = expandedOrgId === org.id;

                  return (
                    <Fragment key={org.id}>
                      <PlatformTableRow
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedOrgId(isExpanded ? null : org.id)
                        }
                      >
                        <PlatformTableCell className="w-8 pr-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-[hsl(var(--platform-foreground-muted))]" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-[hsl(var(--platform-foreground-muted))]" />
                          )}
                        </PlatformTableCell>
                        <PlatformTableCell className="font-medium">
                          {org.name}
                        </PlatformTableCell>
                        <PlatformTableCell>
                          <span className="text-[hsl(var(--platform-foreground-muted))] font-mono text-xs">
                            {org.account_number || '—'}
                          </span>
                        </PlatformTableCell>
                        <PlatformTableCell>
                          <VisibilityBadge verdict={verdict} />
                        </PlatformTableCell>
                        <PlatformTableCell>
                          <PlatformBadge
                            variant={
                              org.capital_enabled ? 'success' : 'default'
                            }
                          >
                            {org.capital_enabled ? 'Active' : 'Inactive'}
                          </PlatformBadge>
                        </PlatformTableCell>
                        <PlatformTableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Switch
                            checked={org.capital_enabled}
                            onCheckedChange={() =>
                              handleToggle(
                                org.id,
                                org.name,
                                org.capital_enabled,
                              )
                            }
                            disabled={updateFlag.isPending}
                            className="data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-slate-600"
                          />
                        </PlatformTableCell>
                      </PlatformTableRow>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6}>
                            <DiagnosticPanel orgId={org.id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {filtered?.length === 0 && (
                  <PlatformTableRow>
                    <PlatformTableCell
                      colSpan={6}
                      className="text-center py-8 text-[hsl(var(--platform-foreground-muted))]"
                    >
                      No organizations match this filter.
                    </PlatformTableCell>
                  </PlatformTableRow>
                )}
              </PlatformTableBody>
            </PlatformTable>
          )}
        </PlatformCardContent>
      </PlatformCard>
    </PlatformPageContainer>
  );
}
