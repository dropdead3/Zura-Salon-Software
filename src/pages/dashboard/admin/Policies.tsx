import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Loader2, Library, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  usePolicyLibrary,
  useOrgPolicies,
  usePolicyHealthSummary,
  POLICY_CATEGORY_META,
  type PolicyCategory,
} from '@/hooks/policy/usePolicyData';
import { usePolicyOrgProfile, type PolicyOrgProfile } from '@/hooks/policy/usePolicyOrgProfile';
import type { PolicyLibraryEntry } from '@/hooks/policy/usePolicyData';
import { PolicyHealthStrip } from '@/components/dashboard/policy/PolicyHealthStrip';
import { PolicyCategoryCard } from '@/components/dashboard/policy/PolicyCategoryCard';
import { PolicyLibraryCard } from '@/components/dashboard/policy/PolicyLibraryCard';
import { PolicySetupBanner } from '@/components/dashboard/policy/PolicySetupBanner';
import { PolicySetupWizard } from '@/components/dashboard/policy/PolicySetupWizard';
import { PolicyConfiguratorPanel } from '@/components/dashboard/policy/PolicyConfiguratorPanel';
import { PolicyConflictBanner } from '@/components/dashboard/policy/PolicyConflictBanner';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

function isApplicableToProfile(entry: PolicyLibraryEntry, profile: PolicyOrgProfile | null | undefined) {
  if (!profile) return true; // before profile loads / exists, don't pre-hide
  if (entry.requires_extensions && !profile.offers_extensions) return false;
  if (entry.requires_retail && !profile.offers_retail) return false;
  if (entry.requires_packages && !profile.offers_packages) return false;
  return true;
}

export default function Policies() {
  const { data: library = [], isLoading: libLoading } = usePolicyLibrary();
  const { data: adopted = [], isLoading: adoptedLoading } = useOrgPolicies();
  const { data: profile, isLoading: profileLoading } = usePolicyOrgProfile();
  const summary = usePolicyHealthSummary();

  const [activeCategory, setActiveCategory] = useState<PolicyCategory | 'all'>('all');
  const [activeAudience, setActiveAudience] = useState<'all' | 'external' | 'internal' | 'both'>('all');
  const [setupOpen, setSetupOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activePolicyKey = searchParams.get('policy');

  const orgScopeKey = profile?.organization_id ?? 'anon';
  const showAllStorageKey = `policies:show-non-applicable:${orgScopeKey}`;
  const [showNonApplicable, setShowNonApplicable] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(`policies:show-non-applicable:anon`) === '1';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(showAllStorageKey);
    if (stored !== null) setShowNonApplicable(stored === '1');
  }, [showAllStorageKey]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(showAllStorageKey, showNonApplicable ? '1' : '0');
  }, [showAllStorageKey, showNonApplicable]);

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

  const audienceCounts = useMemo(() => {
    const counts = { all: profileApplicableLibrary.length, external: 0, internal: 0, both: 0 };
    profileApplicableLibrary.forEach((l) => {
      if (l.audience === 'external') counts.external += 1;
      else if (l.audience === 'internal') counts.internal += 1;
      else if (l.audience === 'both') counts.both += 1;
    });
    return counts;
  }, [profileApplicableLibrary]);

  const filteredLibrary = useMemo(() => {
    return profileApplicableLibrary.filter((l) => {
      if (activeAudience !== 'all' && l.audience !== activeAudience) return false;
      if (activeCategory !== 'all' && l.category !== activeCategory) return false;
      return true;
    });
  }, [profileApplicableLibrary, activeCategory, activeAudience]);

  const categoryOrder = (Object.keys(POLICY_CATEGORY_META) as PolicyCategory[]).sort(
    (a, b) => POLICY_CATEGORY_META[a].order - POLICY_CATEGORY_META[b].order,
  );

  const isLoading = libLoading || adoptedLoading || profileLoading;

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Policies"
        description="The source of truth for every policy your business runs on. Configure once, render everywhere — handbooks, client pages, booking, checkout, and manager decisions."
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
      ) : (
        <div className="space-y-8">
          <PageExplainer pageId="policies" />
          {!hasProfile && (
            <PolicySetupBanner onStart={() => setSetupOpen(true)} hasProfile={false} libraryCount={library.length} />
          )}
          <PolicyHealthStrip summary={summary} />
          <PolicyConflictBanner
            conflicts={summary.surface_conflicts}
            onJumpToPolicy={(key) => {
              const next = new URLSearchParams(searchParams);
              next.set('policy', key);
              setSearchParams(next, { replace: true });
            }}
          />
          <section className="space-y-4">
            <div className="flex items-end justify-between flex-wrap gap-2">
              <div>
                <h2 className={cn(tokens.heading.section)}>By category</h2>
                <p className="font-sans text-sm text-muted-foreground mt-1">
                  Six operational domains. Click into any group to see what your business needs.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {categoryOrder.map((cat) => (
                <PolicyCategoryCard
                  key={cat}
                  category={cat}
                  adopted={summary.by_category[cat]?.adopted ?? 0}
                  total={summary.by_category[cat]?.total ?? 0}
                  onClick={() => setActiveCategory(cat)}
                />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-end justify-between flex-wrap gap-2">
              <div>
                <h2 className={cn(tokens.heading.section)}>Library</h2>
                <p className="font-sans text-sm text-muted-foreground mt-1">
                  {profileApplicableLibrary.length} recommended {profileApplicableLibrary.length === 1 ? 'policy' : 'policies'} for your business. Filter by audience first, then narrow by category.
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

            {hiddenByProfile.length > 0 && !showNonApplicable && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-border/40 bg-muted/30">
                <p className="font-sans text-xs text-muted-foreground flex-1">
                  Hiding {hiddenByProfile.length}{' '}
                  {hiddenByProfile.length === 1 ? 'policy' : 'policies'} that don't apply to your business profile.{' '}
                  <button
                    type="button"
                    onClick={() => setSetupOpen(true)}
                    className="font-sans text-xs text-foreground underline-offset-2 hover:underline"
                  >
                    Edit profile
                  </button>
                </p>
              </div>
            )}

            {/* Wave 28.11.3 — Audience-first segmented control. The data already
                carries this distinction; we surface it so operators don't apply
                client-facing thinking to handbook-only policies (and vice versa). */}
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
                    <h3 className={tokens.empty.heading}>No policies in this category</h3>
                    <p className={tokens.empty.description}>Try a different filter.</p>
                  </div>
                ) : (
                  (() => {
                    const requiredEntries = filteredLibrary.filter((e) => e.recommendation === 'required');
                    const otherEntries = filteredLibrary.filter((e) => e.recommendation !== 'required');
                    const renderCard = (entry: typeof filteredLibrary[number]) => (
                      <PolicyLibraryCard
                        key={entry.id}
                        entry={entry}
                        adopted={adoptedByKey.get(entry.key)}
                        onClick={() => {
                          const next = new URLSearchParams(searchParams);
                          next.set('policy', entry.key);
                          setSearchParams(next, { replace: true });
                        }}
                      />
                    );
                    return (
                      <div className="space-y-6">
                        {requiredEntries.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                              <h3 className="font-display text-xs tracking-[0.14em] uppercase text-foreground">
                                Required
                              </h3>
                              <span className="inline-flex items-center justify-center min-w-[1.25rem] px-1.5 h-4 rounded-full text-[10px] bg-primary/10 text-primary">
                                {requiredEntries.length}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                              {requiredEntries.map(renderCard)}
                            </div>
                          </div>
                        )}
                        {otherEntries.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                              <h3 className="font-display text-xs tracking-[0.14em] uppercase text-muted-foreground">
                                Recommended &amp; Optional
                              </h3>
                              <span className="inline-flex items-center justify-center min-w-[1.25rem] px-1.5 h-4 rounded-full text-[10px] bg-muted text-muted-foreground">
                                {otherEntries.length}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                              {otherEntries.map(renderCard)}
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
        </div>
      )}

      <Sheet open={setupOpen} onOpenChange={setSetupOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className={cn(tokens.heading.section)}>Policy setup</SheetTitle>
            <SheetDescription className="font-sans">
              Tell us how your business operates. We'll recommend the right policy set.
            </SheetDescription>
          </SheetHeader>
          <PolicySetupWizard onClose={() => setSetupOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={!!activeEntry} onOpenChange={(open) => !open && closeConfigurator()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className={cn(tokens.heading.section)}>Configure policy</SheetTitle>
            <SheetDescription className="font-sans">
              Define the structured rules. AI drafting will render these into prose later — it cannot invent rules.
            </SheetDescription>
          </SheetHeader>
          {activeEntry && (
            <PolicyConfiguratorPanel
              entry={activeEntry}
              alreadyAdopted={adoptedByKey.has(activeEntry.key)}
              onClose={closeConfigurator}
            />
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
