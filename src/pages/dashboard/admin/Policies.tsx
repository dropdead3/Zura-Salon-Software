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
import { usePolicyOrgProfile } from '@/hooks/policy/usePolicyOrgProfile';
import { PolicyHealthStrip } from '@/components/dashboard/policy/PolicyHealthStrip';
import { PolicyCategoryCard } from '@/components/dashboard/policy/PolicyCategoryCard';
import { PolicyLibraryCard } from '@/components/dashboard/policy/PolicyLibraryCard';
import { PolicySetupBanner } from '@/components/dashboard/policy/PolicySetupBanner';
import { PolicySetupWizard } from '@/components/dashboard/policy/PolicySetupWizard';
import { PolicyConfiguratorPanel } from '@/components/dashboard/policy/PolicyConfiguratorPanel';
import { PolicyConflictBanner } from '@/components/dashboard/policy/PolicyConflictBanner';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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

  const audienceCounts = useMemo(() => {
    const counts = { all: library.length, external: 0, internal: 0, both: 0 };
    library.forEach((l) => {
      if (l.audience === 'external') counts.external += 1;
      else if (l.audience === 'internal') counts.internal += 1;
      else if (l.audience === 'both') counts.both += 1;
    });
    return counts;
  }, [library]);

  const filteredLibrary = useMemo(() => {
    return library.filter((l) => {
      if (activeAudience !== 'all' && l.audience !== activeAudience) return false;
      if (activeCategory !== 'all' && l.category !== activeCategory) return false;
      return true;
    });
  }, [library, activeCategory, activeAudience]);

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
                  {library.length} recommended policies. Adopt the ones that fit your operation; structured configuration comes next.
                </p>
              </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredLibrary.map((entry) => (
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
                    ))}
                  </div>
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
