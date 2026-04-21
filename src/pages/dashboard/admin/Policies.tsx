import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Loader2, Library, Settings, FileText, ArrowRight, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  usePolicyLibrary,
  useOrgPolicies,
  usePolicyHealthSummary,
  POLICY_CATEGORY_META,
  type PolicyCategory,
} from '@/hooks/policy/usePolicyData';
import {
  usePolicyOrgProfile,
  isApplicableToProfile,
  type PolicyOrgProfile,
} from '@/hooks/policy/usePolicyOrgProfile';
import type { PolicyLibraryEntry } from '@/hooks/policy/usePolicyData';
import { computeHiddenByReason } from '@/lib/policy/applicability-summary';
import { PolicyHealthStrip } from '@/components/dashboard/policy/PolicyHealthStrip';
import { PolicyCategoryCard } from '@/components/dashboard/policy/PolicyCategoryCard';
import { PolicyLibraryRow } from '@/components/dashboard/policy/PolicyLibraryRow';
import { PoliciesSetupMode } from '@/components/dashboard/policy/PoliciesSetupMode';
import { PoliciesGovernanceMode } from '@/components/dashboard/policy/PoliciesGovernanceMode';
import {
  CORE_FUNCTION_POLICY_KEYS,
  CORE_FUNCTION_CONSUMERS,
  isCoreFunctionPolicy,
  type CoreFunctionPolicyKey,
} from '@/lib/policy/core-function-policies';
import { PolicySetupIntro } from '@/components/dashboard/policy/PolicySetupIntro';
import { PolicySetupWizard } from '@/components/dashboard/policy/PolicySetupWizard';
import { PolicyConfiguratorPanel } from '@/components/dashboard/policy/PolicyConfiguratorPanel';
import { PolicyConflictBanner } from '@/components/dashboard/policy/PolicyConflictBanner';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

export default function Policies() {
  const { dashPath } = useOrgDashboardPath();
  const { data: library = [], isLoading: libLoading } = usePolicyLibrary();
  const { data: adopted = [], isLoading: adoptedLoading } = useOrgPolicies();
  const { data: profile, isLoading: profileLoading } = usePolicyOrgProfile();
  const summary = usePolicyHealthSummary();

  const [activeCategory, setActiveCategory] = useState<PolicyCategory | 'all'>('all');
  const [activeAudience, setActiveAudience] = useState<'all' | 'external' | 'internal' | 'both'>('all');
  const [setupOpen, setSetupOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activePolicyKey = searchParams.get('policy');
  const librarySectionRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Search query — URL-synced via ?q=
  const [query, setQuery] = useState<string>(() => searchParams.get('q') ?? '');
  const [adoptionFilter, setAdoptionFilter] = useState<'all' | 'adopted' | 'not_adopted'>('all');

  // Sync query <-> URL (?q=)
  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (current === query) return;
    const next = new URLSearchParams(searchParams);
    if (query.trim()) next.set('q', query);
    else next.delete('q');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Keyboard shortcuts: "/" focuses the search; Esc clears, then blurs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        if (query) {
          e.preventDefault();
          setQuery('');
        } else {
          searchInputRef.current?.blur();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [query]);

  const handleCategoryCardClick = (cat: PolicyCategory) => {
    setActiveCategory((prev) => (prev === cat ? 'all' : cat));
    // Defer to next frame so the state-driven scroll target is laid out before scrolling.
    requestAnimationFrame(() => {
      librarySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const orgScopeKey = profile?.organization_id ?? 'anon';
  const showAllStorageKey = `policies:show-non-applicable:${orgScopeKey}`;
  const hideAdoptedStorageKey = `policies:hide-adopted-required:${orgScopeKey}`;
  const [showNonApplicable, setShowNonApplicable] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(`policies:show-non-applicable:anon`) === '1';
  });
  const [hideAdoptedRequired, setHideAdoptedRequired] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(`policies:hide-adopted-required:anon`) === '1';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(showAllStorageKey);
    if (stored !== null) setShowNonApplicable(stored === '1');
  }, [showAllStorageKey]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(hideAdoptedStorageKey);
    if (stored !== null) setHideAdoptedRequired(stored === '1');
  }, [hideAdoptedStorageKey]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(showAllStorageKey, showNonApplicable ? '1' : '0');
  }, [showAllStorageKey, showNonApplicable]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(hideAdoptedStorageKey, hideAdoptedRequired ? '1' : '0');
  }, [hideAdoptedStorageKey, hideAdoptedRequired]);

  const hasProfile = !!profile?.setup_completed_at;

  const activeEntry = useMemo(
    () => library.find((l) => l.key === activePolicyKey) ?? null,
    [library, activePolicyKey],
  );

  const closeConfigurator = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('policy');
    setSearchParams(next, { replace: true });
  };

  // Defensive: if URL has ?policy=... but library hasn't loaded the entry, no-op.
  useEffect(() => {
    if (activePolicyKey && library.length > 0 && !activeEntry) {
      closeConfigurator();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePolicyKey, library.length, activeEntry]);

  const adoptedByKey = useMemo(() => {
    const map = new Map<string, (typeof adopted)[number]>();
    adopted.forEach((p) => map.set(p.library_key, p));
    return map;
  }, [adopted]);

  // Applicability layer: hide policies that require services this org does not offer
  // (e.g., extension policies for solo stylists who don't do extensions). Mirrors the
  // Setup Wizard's recommendedKeysForProfile logic — Library page now has parity.
  const profileApplicableLibrary = useMemo(() => {
    if (showNonApplicable) return library;
    return library.filter((l) => isApplicableToProfile(l, profile));
  }, [library, profile, showNonApplicable]);

  const hiddenByProfile = useMemo(() => {
    if (showNonApplicable || !profile) return [] as PolicyLibraryEntry[];
    return library.filter((l) => !isApplicableToProfile(l, profile));
  }, [library, profile, showNonApplicable]);

  // Wave 28.11.8 — group hidden entries by reason so the chip reads as a one-glance
  // breakdown ("8 extensions · 2 minors") instead of a single opaque count.
  // Logic extracted to `computeHiddenByReason` so future surfaces (Command Center
  // tile, audit reports) can reuse the same grouping. See
  // `mem://features/policy-os-applicability-doctrine`.
  const hiddenByReason = useMemo(
    () => computeHiddenByReason(hiddenByProfile, profile),
    [hiddenByProfile, profile],
  );

  const audienceCounts = useMemo(() => {
    const counts = { all: profileApplicableLibrary.length, external: 0, internal: 0, both: 0 };
    profileApplicableLibrary.forEach((l) => {
      if (l.audience === 'external') counts.external += 1;
      else if (l.audience === 'internal') counts.internal += 1;
      else if (l.audience === 'both') counts.both += 1;
    });
    return counts;
  }, [profileApplicableLibrary]);

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const filteredLibrary = useMemo(() => {
    return profileApplicableLibrary.filter((l) => {
      if (activeAudience !== 'all' && l.audience !== activeAudience) return false;
      if (activeCategory !== 'all' && l.category !== activeCategory) return false;
      if (adoptionFilter === 'adopted' && !adoptedByKey.has(l.key)) return false;
      if (adoptionFilter === 'not_adopted' && adoptedByKey.has(l.key)) return false;
      if (normalizedQuery) {
        const categoryLabel = POLICY_CATEGORY_META[l.category]?.label.toLowerCase() ?? '';
        const haystack = [
          l.title,
          l.short_description,
          l.why_it_matters ?? '',
          categoryLabel,
          l.key,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [profileApplicableLibrary, activeCategory, activeAudience, adoptionFilter, normalizedQuery, adoptedByKey]);

  // Suggest a matching category when search has zero results — single-word
  // queries like "team" should nudge toward the Team category tab.
  const suggestedCategory = useMemo<PolicyCategory | null>(() => {
    if (!isSearching || filteredLibrary.length > 0) return null;
    const match = (Object.keys(POLICY_CATEGORY_META) as PolicyCategory[]).find((c) =>
      POLICY_CATEGORY_META[c].label.toLowerCase().includes(normalizedQuery),
    );
    return match ?? null;
  }, [isSearching, filteredLibrary.length, normalizedQuery]);

  const categoryOrder = (Object.keys(POLICY_CATEGORY_META) as PolicyCategory[]).sort(
    (a, b) => POLICY_CATEGORY_META[a].order - POLICY_CATEGORY_META[b].order,
  );

  const isLoading = libLoading || adoptedLoading || profileLoading;

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Policies"
        backTo={dashPath('/admin/settings')}
        className="mb-8"
        description={
          hasProfile
            ? 'The source of truth for every policy your business runs on. Configure once, render everywhere — handbooks, client pages, booking, checkout, and manager decisions.'
            : 'Configure once. Render everywhere.'
        }
        actions={
          hasProfile ? (
            <Button variant="outline" size="sm" onClick={() => setSetupOpen(true)} className="font-sans">
              <Settings className="w-4 h-4 mr-2" />
              Update profile
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className={tokens.loading.spinner} />
        </div>
      ) : !hasProfile ? (
        <div className="space-y-8">
          <PageExplainer pageId="policies" />
          <PolicySetupIntro onStart={() => setSetupOpen(true)} libraryCount={library.length} />
        </div>
      ) : (
        (() => {
          // ─── Mode split ─────────────────────────────────────────
          // Setup mode runs until both Core AND Required (filtered
          // by applicability) are 100% adopted. Once both hit 100%,
          // governance mode renders. If a profile change later adds
          // applicable policies, the meter dips and setup returns.
          const coreApplicable = profileApplicableLibrary.filter((l) =>
            isCoreFunctionPolicy(l.key),
          );
          const requiredApplicable = profileApplicableLibrary.filter(
            (l) => l.recommendation === 'required' && !isCoreFunctionPolicy(l.key),
          );
          const coreAdoptedCount = coreApplicable.filter((l) => adoptedByKey.has(l.key)).length;
          const requiredAdoptedCount = requiredApplicable.filter((l) =>
            adoptedByKey.has(l.key),
          ).length;
          const setupComplete =
            coreApplicable.length > 0 &&
            requiredApplicable.length > 0 &&
            coreAdoptedCount === coreApplicable.length &&
            requiredAdoptedCount === requiredApplicable.length;

          // ─── Banners shared across both modes ────────────────────
          const topBannersNode = (
            <>
              {profile?.has_existing_client_policies &&
                adopted.length > 0 &&
                adopted.every((p) => !p.current_version_id) && (
                  <Card className="rounded-xl border-primary/30 bg-gradient-to-br from-primary/5 via-card/80 to-card/80">
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h4 className={cn(tokens.heading.card, 'text-sm')}>
                            Import your existing client policies
                          </h4>
                          <p className="font-sans text-xs text-muted-foreground mt-1 max-w-2xl">
                            You told us you already publish client-facing policies. Open any policy below to paste in your existing language — we&apos;ll seed the variant from there instead of drafting fresh.
                          </p>
                        </div>
                      </div>
                      {(() => {
                        const firstUntouched = adopted.find((p) => !p.current_version_id);
                        if (!firstUntouched) return null;
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-sans shrink-0"
                            onClick={() => {
                              const next = new URLSearchParams(searchParams);
                              next.set('policy', firstUntouched.library_key);
                              setSearchParams(next, { replace: true });
                            }}
                          >
                            Open first policy
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}
              <PolicyConflictBanner
                conflicts={summary.surface_conflicts}
                onJumpToPolicy={(key) => {
                  const next = new URLSearchParams(searchParams);
                  next.set('policy', key);
                  setSearchParams(next, { replace: true });
                }}
              />
            </>
          );

          // ─── Category section (governance only) ──────────────────
          const categorySectionNode = (
            <section className="space-y-4">
              <div className="flex items-end justify-between flex-wrap gap-2">
                <div>
                  <h2 className={cn(tokens.heading.section)}>By category</h2>
                  <p className="font-sans text-sm text-muted-foreground mt-1">
                    Six operational domains. Click any group to filter the Library below.
                  </p>
                </div>
              </div>
              {activeCategory !== 'all' && (
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5">
                    <span className="font-sans text-xs text-muted-foreground">Showing:</span>
                    <span className="font-sans text-xs text-foreground">
                      {POLICY_CATEGORY_META[activeCategory].label}
                    </span>
                    <span className="text-muted-foreground/60">·</span>
                    <button
                      type="button"
                      onClick={() => setActiveCategory('all')}
                      className="font-sans text-xs text-foreground underline-offset-2 hover:underline inline-flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Clear filter
                    </button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {categoryOrder.map((cat) => (
                  <PolicyCategoryCard
                    key={cat}
                    category={cat}
                    adopted={summary.by_category[cat]?.adopted ?? 0}
                    total={summary.by_category[cat]?.total ?? 0}
                    isActive={activeCategory === cat}
                    onClick={() => handleCategoryCardClick(cat)}
                  />
                ))}
              </div>
            </section>
          );

          // ─── Library section (filters + grouped lists) ──────────
          // Used directly in governance mode; mounted under
          // "Show more options" disclosure in setup mode.
          const librarySectionNode = (
            <section ref={librarySectionRef} className="space-y-4">
              <div className="flex items-end justify-between flex-wrap gap-2">
                <div>
                  <h2 className={cn(tokens.heading.section)}>Library</h2>
                  <p className="font-sans text-sm text-muted-foreground mt-1">
                    {isSearching ? (
                      <>
                        Showing {filteredLibrary.length} of {profileApplicableLibrary.length}{' '}
                        {profileApplicableLibrary.length === 1 ? 'policy' : 'policies'} matching{' '}
                        <span className="text-foreground">&ldquo;{query}&rdquo;</span>.
                      </>
                    ) : (
                      <>
                        {profileApplicableLibrary.length} recommended {profileApplicableLibrary.length === 1 ? 'policy' : 'policies'} for your business. Filter by audience first, then narrow by category.
                      </>
                    )}
                  </p>
                </div>
                {profile && (hiddenByProfile.length > 0 || showNonApplicable) && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-non-applicable"
                      checked={showNonApplicable}
                      onCheckedChange={setShowNonApplicable}
                    />
                    <Label htmlFor="show-non-applicable" className="font-sans text-xs text-muted-foreground cursor-pointer">
                      Show non-applicable
                    </Label>
                  </div>
                )}
              </div>

              {hiddenByProfile.length > 0 && !showNonApplicable && (() => {
                const reasonEntries = Object.values(hiddenByReason);
                const total = hiddenByProfile.length;
                const showBreakdown = reasonEntries.length > 1;
                return (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-border/40 bg-muted/30">
                    <p className="font-sans text-xs text-muted-foreground flex-1">
                      Hiding {total} {total === 1 ? 'policy' : 'policies'}
                      {showBreakdown ? (
                        <>
                          :{' '}
                          {reasonEntries.map((r, idx) => (
                            <span key={r.label} className="font-sans text-xs text-foreground/80">
                              {r.count} {r.label}
                              {idx < reasonEntries.length - 1 && (
                                <span className="text-muted-foreground/60"> · </span>
                              )}
                            </span>
                          ))}
                          .
                        </>
                      ) : reasonEntries.length === 1 ? (
                        <> ({reasonEntries[0].label}).</>
                      ) : (
                        <> that don't apply to your business profile.</>
                      )}{' '}
                      <button
                        type="button"
                        onClick={() => setSetupOpen(true)}
                        className="font-sans text-xs text-foreground underline-offset-2 hover:underline"
                      >
                        Edit profile
                      </button>
                    </p>
                  </div>
                );
              })()}

              {/* Search bar + adoption-status facet. */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[260px] max-w-xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search policies — title, description, or topic…"
                    autoCapitalize="none"
                    className="pl-9 pr-9 font-sans text-sm"
                    aria-label="Search policies"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/60">
                  {([
                    { key: 'all', label: 'All' },
                    { key: 'adopted', label: 'Adopted' },
                    { key: 'not_adopted', label: 'Not adopted' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setAdoptionFilter(opt.key)}
                      className={cn(
                        'inline-flex items-center px-3 py-1.5 rounded-md font-sans text-xs transition-colors',
                        adoptionFilter === opt.key
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/60 flex-wrap">
                {([
                  { key: 'all', label: 'All', count: audienceCounts.all },
                  { key: 'external', label: 'Client-facing', count: audienceCounts.external },
                  { key: 'internal', label: 'Internal', count: audienceCounts.internal },
                  { key: 'both', label: 'Both', count: audienceCounts.both },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setActiveAudience(opt.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-sans text-xs transition-colors',
                      activeAudience === opt.key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={cn(
                        'inline-flex items-center justify-center min-w-[1.25rem] px-1.5 h-4 rounded-full text-[10px]',
                        activeAudience === opt.key
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {opt.count}
                    </span>
                  </button>
                ))}
              </div>

              <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as PolicyCategory | 'all')}>
                <TabsList className="flex flex-wrap h-auto bg-muted/50">
                  <TabsTrigger value="all" className="font-sans">All</TabsTrigger>
                  {categoryOrder.map((cat) => (
                    <TabsTrigger key={cat} value={cat} className="font-sans">
                      {POLICY_CATEGORY_META[cat].label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={activeCategory} className="mt-4">
                  {filteredLibrary.length === 0 ? (
                    <div className={tokens.empty.container}>
                      <Library className={tokens.empty.icon} />
                      {isSearching ? (
                        <>
                          <h3 className={tokens.empty.heading}>
                            No policies match &ldquo;{query}&rdquo;
                          </h3>
                          <p className={tokens.empty.description}>
                            Check spelling or clear the search to see the full library.
                            {suggestedCategory && (
                              <>
                                {' '}Or jump to the{' '}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuery('');
                                    setActiveCategory(suggestedCategory);
                                  }}
                                  className="font-sans text-foreground underline-offset-2 hover:underline"
                                >
                                  {POLICY_CATEGORY_META[suggestedCategory].label}
                                </button>{' '}
                                category.
                              </>
                            )}
                          </p>
                          <div className="mt-4 flex items-center justify-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setQuery('')} className="font-sans">
                              <X className="w-3.5 h-3.5 mr-1" />
                              Clear search
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className={tokens.empty.heading}>No policies in this category</h3>
                          <p className={tokens.empty.description}>Try a different filter.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    (() => {
                      const coreEntries = filteredLibrary.filter((e) => isCoreFunctionPolicy(e.key));
                      const requiredEntries = filteredLibrary.filter(
                        (e) => e.recommendation === 'required' && !isCoreFunctionPolicy(e.key),
                      );
                      const otherEntries = filteredLibrary.filter((e) => e.recommendation !== 'required');

                      const coreSorted = [...coreEntries].sort(
                        (a, b) =>
                          CORE_FUNCTION_POLICY_KEYS.indexOf(a.key as CoreFunctionPolicyKey) -
                          CORE_FUNCTION_POLICY_KEYS.indexOf(b.key as CoreFunctionPolicyKey),
                      );
                      const coreVisible = hideAdoptedRequired
                        ? coreSorted.filter((e) => !adoptedByKey.has(e.key))
                        : coreSorted;
                      const coreAdoptedCountInner = coreEntries.filter((e) => adoptedByKey.has(e.key)).length;
                      const coreTotal = coreEntries.length;
                      const corePct = coreTotal > 0 ? Math.round((coreAdoptedCountInner / coreTotal) * 100) : 0;
                      const coreCompleteInner = coreTotal > 0 && coreAdoptedCountInner === coreTotal;

                      const requiredAdoptedCountInner = requiredEntries.filter((e) => adoptedByKey.has(e.key)).length;
                      const requiredTotal = requiredEntries.length;
                      const requiredPct = requiredTotal > 0 ? Math.round((requiredAdoptedCountInner / requiredTotal) * 100) : 0;
                      const isComplete = requiredTotal > 0 && requiredAdoptedCountInner === requiredTotal;
                      const requiredSorted = [...requiredEntries].sort(
                        (a, b) => Number(adoptedByKey.has(a.key)) - Number(adoptedByKey.has(b.key)),
                      );
                      const requiredVisible = hideAdoptedRequired
                        ? requiredSorted.filter((e) => !adoptedByKey.has(e.key))
                        : requiredSorted;

                      const renderRow = (entry: typeof filteredLibrary[number]) => {
                        const isCore = isCoreFunctionPolicy(entry.key);
                        return (
                          <PolicyLibraryRow
                            key={entry.id}
                            entry={entry}
                            adopted={adoptedByKey.get(entry.key)}
                            consumerLabel={
                              isCore ? CORE_FUNCTION_CONSUMERS[entry.key as CoreFunctionPolicyKey] : undefined
                            }
                            showDefaultFallback={isCore}
                            onClick={() => {
                              const next = new URLSearchParams(searchParams);
                              next.set('policy', entry.key);
                              setSearchParams(next, { replace: true });
                            }}
                          />
                        );
                      };

                      const anyAdoptedToggle =
                        coreAdoptedCountInner > 0 || requiredAdoptedCountInner > 0;

                      return (
                        <div className="space-y-6">
                          {coreEntries.length > 0 && (
                            <div className="@container rounded-xl border border-border/60 overflow-hidden bg-card/40">
                              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border/60">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h3 className="font-display text-xs tracking-[0.14em] uppercase text-foreground">
                                    Core functions
                                  </h3>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span
                                      className={cn(
                                        'font-sans text-xs',
                                        coreCompleteInner ? 'text-primary' : 'text-muted-foreground',
                                      )}
                                    >
                                      {coreAdoptedCountInner} of {coreTotal} configured
                                    </span>
                                    <Progress
                                      value={corePct}
                                      className="h-[2px] w-[120px] bg-muted"
                                      indicatorClassName={coreCompleteInner ? 'bg-primary' : 'bg-primary/70'}
                                    />
                                    <span
                                      className={cn(
                                        'font-sans text-xs tabular-nums',
                                        coreCompleteInner ? 'text-primary' : 'text-muted-foreground',
                                      )}
                                    >
                                      {corePct}%
                                    </span>
                                  </div>
                                  {anyAdoptedToggle && (
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        id="hide-adopted-required"
                                        checked={hideAdoptedRequired}
                                        onCheckedChange={setHideAdoptedRequired}
                                      />
                                      <Label
                                        htmlFor="hide-adopted-required"
                                        className="font-sans text-xs text-muted-foreground cursor-pointer"
                                      >
                                        Hide adopted
                                      </Label>
                                    </div>
                                  )}
                                </div>
                                <p className="font-sans text-xs text-muted-foreground mt-1.5">
                                  These power POS and booking. Defaults work out of the box — configure to make them yours.
                                </p>
                              </div>
                              {coreVisible.length > 0 ? (
                                <div className="divide-y divide-border/40">
                                  {coreVisible.map(renderRow)}
                                </div>
                              ) : (
                                <p className="font-sans text-xs text-muted-foreground px-4 py-4">
                                  All core functions configured. Toggle "Hide adopted" off to review them.
                                </p>
                              )}
                            </div>
                          )}
                          {requiredEntries.length > 0 && (
                            <div className="@container rounded-xl border border-border/60 overflow-hidden bg-card/40">
                              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border/60">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h3 className="font-display text-xs tracking-[0.14em] uppercase text-foreground">
                                    Required for governance
                                  </h3>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span
                                      className={cn(
                                        'font-sans text-xs',
                                        isComplete ? 'text-primary' : 'text-muted-foreground',
                                      )}
                                    >
                                      {requiredAdoptedCountInner} of {requiredTotal} adopted
                                    </span>
                                    <Progress
                                      value={requiredPct}
                                      className="h-[2px] w-[120px] bg-muted"
                                      indicatorClassName={isComplete ? 'bg-primary' : 'bg-primary/70'}
                                    />
                                    <span
                                      className={cn(
                                        'font-sans text-xs tabular-nums',
                                        isComplete ? 'text-primary' : 'text-muted-foreground',
                                      )}
                                    >
                                      {requiredPct}%
                                    </span>
                                  </div>
                                </div>
                                <p className="font-sans text-xs text-muted-foreground mt-1.5">
                                  Protect your business. The software runs without these, but your operations and team don't have a written contract.
                                </p>
                              </div>
                              {requiredVisible.length > 0 ? (
                                <div className="divide-y divide-border/40">
                                  {requiredVisible.map(renderRow)}
                                </div>
                              ) : (
                                <p className="font-sans text-xs text-muted-foreground px-4 py-4">
                                  All governance policies adopted. Toggle "Hide adopted" off to review them.
                                </p>
                              )}
                            </div>
                          )}
                          {otherEntries.length > 0 && (
                            <div className="@container rounded-xl border border-border/60 overflow-hidden bg-card/40">
                              <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                                <h3 className="font-display text-xs tracking-[0.14em] uppercase text-muted-foreground">
                                  Recommended &amp; Optional
                                </h3>
                                <span className="inline-flex items-center justify-center min-w-[1.25rem] px-1.5 h-4 rounded-full text-[10px] bg-muted text-muted-foreground">
                                  {otherEntries.length}
                                </span>
                              </div>
                              <div className="divide-y divide-border/40">
                                {otherEntries.map(renderRow)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </TabsContent>
              </Tabs>
            </section>
          );

          const openPolicy = (libraryKey: string) => {
            const next = new URLSearchParams(searchParams);
            next.set('policy', libraryKey);
            setSearchParams(next, { replace: true });
          };

          return (
            <div className="space-y-8">
              <PageExplainer pageId="policies" />
              {setupComplete ? (
                <PoliciesGovernanceMode
                  summary={summary}
                  scopeKey={orgScopeKey}
                  topBanners={topBannersNode}
                  categorySection={categorySectionNode}
                  librarySection={librarySectionNode}
                />
              ) : (
                <PoliciesSetupMode
                  applicableLibrary={profileApplicableLibrary}
                  adoptedByKey={adoptedByKey}
                  onOpenPolicy={openPolicy}
                  topBanners={topBannersNode}
                  moreOptions={
                    <div className="space-y-8">
                      {categorySectionNode}
                      {librarySectionNode}
                    </div>
                  }
                />
              )}
            </div>
          );
        })()
      )}

      <PremiumFloatingPanel open={setupOpen} onOpenChange={setSetupOpen} maxWidth="720px">
        <div className={tokens.drawer.header}>
          <h2 className={tokens.heading.page}>Policy setup</h2>
          <p className={cn(tokens.body.muted, 'mt-1')}>
            Tell us how your business operates. We'll recommend the right policy set.
          </p>
        </div>
        <div className={tokens.drawer.body}>
          <PolicySetupWizard onClose={() => setSetupOpen(false)} />
        </div>
      </PremiumFloatingPanel>

      <PremiumFloatingPanel
        open={!!activeEntry}
        onOpenChange={(open) => !open && closeConfigurator()}
        maxWidth="720px"
      >
        <div className={tokens.drawer.header}>
          <h2 className={cn(tokens.heading.section)}>Configure policy</h2>
          <p className={cn('font-sans text-sm text-muted-foreground mt-1')}>
            Define the structured rules. AI drafting will render these into prose later — it cannot invent rules.
          </p>
        </div>
        <div className={tokens.drawer.body}>
          {activeEntry && (
            <PolicyConfiguratorPanel
              entry={activeEntry}
              alreadyAdopted={adoptedByKey.has(activeEntry.key)}
              onClose={closeConfigurator}
              onEditProfile={() => {
                closeConfigurator();
                setSetupOpen(true);
              }}
            />
          )}
        </div>
      </PremiumFloatingPanel>
    </DashboardLayout>
  );
}
