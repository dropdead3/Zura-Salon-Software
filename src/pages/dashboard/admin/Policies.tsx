import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function Policies() {
  const navigate = useNavigate();
  const { data: library = [], isLoading: libLoading } = usePolicyLibrary();
  const { data: adopted = [], isLoading: adoptedLoading } = useOrgPolicies();
  const { data: profile, isLoading: profileLoading } = usePolicyOrgProfile();
  const summary = usePolicyHealthSummary();

  const [activeCategory, setActiveCategory] = useState<PolicyCategory | 'all'>('all');
  const [setupOpen, setSetupOpen] = useState(false);

  const hasProfile = !!profile?.setup_completed_at;

  const adoptedByKey = useMemo(() => {
    const map = new Map<string, (typeof adopted)[number]>();
    adopted.forEach((p) => map.set(p.library_key, p));
    return map;
  }, [adopted]);

  const filteredLibrary = useMemo(() => {
    if (activeCategory === 'all') return library;
    return library.filter((l) => l.category === activeCategory);
  }, [library, activeCategory]);

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
          {!hasProfile && (
            <PolicySetupBanner onStart={() => setSetupOpen(true)} hasProfile={false} />
          )}
          <PolicyHealthStrip summary={summary} />

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
                  47 recommended policies. Adopt the ones that fit your operation; structured configuration comes next.
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
                          // Wave 28.4 — open Policy Configurator detail
                          navigate(`/dashboard/admin/policies?policy=${entry.key}`);
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
    </DashboardLayout>
  );
}
