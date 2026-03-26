import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useBackroomEntitlement } from '@/hooks/backroom/useBackroomEntitlement';
import { useBackroomOrgId } from '@/hooks/backroom/useBackroomOrgId';
import { BackroomPaywall } from '@/components/dashboard/backroom-settings/BackroomPaywall';
import { Loader2, ArrowLeft } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import {
  LayoutDashboard,
  Package,
  Wrench,
  DollarSign,
  Monitor,
  BarChart3,
  Shield,
  Bell,
  Sparkles,
  Building2,
  ShieldCheck,
  Lock,
  CreditCard,
  Truck,
  CircleDollarSign,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useBackroomSetupHealth } from '@/hooks/backroom/useBackroomSetupHealth';
import { BackroomDashboardOverview } from '@/components/dashboard/backroom-settings/BackroomDashboardOverview';
import { BackroomSetupBanner } from '@/components/dashboard/backroom-settings/BackroomSetupBanner';
import { useBackroomSetting } from '@/hooks/backroom/useBackroomSettings';
import { BackroomProductCatalogSection } from '@/components/dashboard/backroom-settings/BackroomProductCatalogSection';
import { ServiceTrackingSection } from '@/components/dashboard/backroom-settings/ServiceTrackingSection';
import { RecipeBaselineSection } from '@/components/dashboard/backroom-settings/RecipeBaselineSection';
import { AllowancesBillingSection } from '@/components/dashboard/backroom-settings/AllowancesBillingSection';
import { StationsHardwareSection } from '@/components/dashboard/backroom-settings/StationsHardwareSection';
import { BackroomInventorySection } from '@/components/dashboard/backroom-settings/BackroomInventorySection';
import { BackroomPermissionsSection } from '@/components/dashboard/backroom-settings/BackroomPermissionsSection';
import { AlertsExceptionsSection } from '@/components/dashboard/backroom-settings/AlertsExceptionsSection';
import { FormulaAssistanceSection } from '@/components/dashboard/backroom-settings/FormulaAssistanceSection';
import { MultiLocationSection } from '@/components/dashboard/backroom-settings/MultiLocationSection';
import { BackroomComplianceSection } from '@/components/dashboard/backroom-settings/BackroomComplianceSection';
import { SupplierSettingsSection } from '@/components/dashboard/backroom-settings/SupplierSettingsSection';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PriceRecommendationsContent } from '@/pages/dashboard/admin/PriceRecommendations';


type BackroomSection =
  | 'overview'
  | 'products'
  | 'services'
  | 'formulas'
  | 'allowances'
  | 'stations'
  | 'inventory'
  | 'suppliers'
  | 'permissions'
  | 'alerts'
  | 'formula'
  | 'multi-location'
  | 'compliance'
  | 'price-intelligence';

type SectionGroup = 'operations' | 'configuration' | 'settings';

const GROUP_LABELS: Record<SectionGroup, string> = {
  operations: 'Operations',
  configuration: 'Configuration',
  settings: 'Settings',
};

const GROUP_ORDER: SectionGroup[] = ['operations', 'configuration', 'settings'];

interface SectionMeta {
  id: BackroomSection;
  label: string;
  icon: typeof LayoutDashboard;
  tooltip: string;
  group: SectionGroup;
  requires?: BackroomSection[];
  requiresLabel?: string;
}

const sections: SectionMeta[] = [
  // Operations
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, tooltip: 'Dashboard overview with analytics and AI intelligence.', group: 'operations' },
  { id: 'inventory', label: 'Inventory', icon: Package, tooltip: 'Stock monitoring, reorder alerts, and demand forecasting.', group: 'operations' },
  { id: 'price-intelligence', label: 'Price Intelligence', icon: CircleDollarSign, tooltip: 'Margin analysis and price recommendations.', group: 'operations' },
  { id: 'compliance', label: 'Reweigh Reports', icon: ShieldCheck, tooltip: 'Reweigh tracking and accountability reports.', group: 'operations' },
  // Configuration
  { id: 'products', label: 'Products & Supplies', icon: Package, tooltip: 'Choose which products are tracked at the mixing station.', group: 'configuration' },
  { id: 'suppliers', label: 'Suppliers', icon: Truck, tooltip: 'Manage supplier contacts and product assignments.', requires: ['products'], requiresLabel: 'Products', group: 'configuration' },
  { id: 'services', label: 'Service Tracking', icon: Wrench, tooltip: 'Link services to the products they consume.', requires: ['products'], requiresLabel: 'Products', group: 'configuration' },
  { id: 'formulas', label: 'Formula Baselines', icon: BarChart3, tooltip: 'Expected product quantities per service.', requires: ['products', 'services'], requiresLabel: 'Services', group: 'configuration' },
  { id: 'allowances', label: 'Allowances & Billing', icon: DollarSign, tooltip: 'Define included amounts and overage billing rules.', requires: ['products', 'services'], requiresLabel: 'Services', group: 'configuration' },
  { id: 'formula', label: 'Formula Assistance', icon: Sparkles, tooltip: 'Smart Mix Assist suggestion settings.', group: 'configuration' },
  { id: 'stations', label: 'Stations & Hardware', icon: Monitor, tooltip: 'Register mixing stations and pair scales.', group: 'configuration' },
  // Settings
  { id: 'permissions', label: 'Permissions', icon: Shield, tooltip: 'Control who can do what in Backroom.', group: 'settings' },
  { id: 'alerts', label: 'Alerts & Exceptions', icon: Bell, tooltip: 'Automatic alerts for operational issues.', group: 'settings' },
  { id: 'multi-location', label: 'Multi-Location', icon: Building2, tooltip: 'Compare and copy settings between locations.', group: 'settings' },
];

const sectionsByGroup = GROUP_ORDER.map(group => ({
  group,
  label: GROUP_LABELS[group],
  items: sections.filter(s => s.group === group),
}));

function getSectionStatus(sectionId: BackroomSection, health: ReturnType<typeof useBackroomSetupHealth>['data']): 'done' | 'warning' | 'none' {
  if (!health) return 'none';
  switch (sectionId) {
    case 'products': return health.trackedProducts > 0 ? 'done' : 'none';
    case 'services': return health.trackedServices > 0 ? 'done' : 'none';
    case 'formulas': return health.recipesConfigured > 0 ? 'done' : 'none';
    case 'allowances': return health.allowancePolicies > 0 ? 'done' : 'none';
    case 'stations': return health.stationsConfigured > 0 ? 'done' : 'none';
    case 'alerts': return health.alertRulesConfigured > 0 ? 'done' : 'none';
    default: return 'none';
  }
}

function isPrereqMet(section: SectionMeta, health: ReturnType<typeof useBackroomSetupHealth>['data']): boolean {
  if (!section.requires || !health) return true;
  return section.requires.every(req => getSectionStatus(req, health) === 'done');
}

export default function BackroomSettings() {
  const { dashPath } = useOrgDashboardPath();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = (searchParams.get('section') as BackroomSection) || 'overview';
  const [activeSection, setActiveSection] = useState<BackroomSection>(initialSection);
  const [subTab, setSubTab] = useState<string | undefined>();
  const { data: health } = useBackroomSetupHealth();
  const { isEntitled, isLoading: entitlementLoading } = useBackroomEntitlement();
  const { data: wizardSetting } = useBackroomSetting('setup_wizard_completed');
  const wizardCompleted = !!(wizardSetting?.value as Record<string, unknown>)?.completed;
  const [showWizardFromBanner, setShowWizardFromBanner] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pollingRef = useRef(false);
  const orgId = useBackroomOrgId();

  // Handle Stripe checkout redirect with polling for webhook delay
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (!checkoutStatus) return;

    setSearchParams({}, { replace: true });

    if (checkoutStatus === 'cancelled') {
      toast.info('Checkout was cancelled. No charges were made.');
      return;
    }

    if (checkoutStatus === 'success') {
      if (pollingRef.current) return;
      pollingRef.current = true;

      const pollEntitlement = async () => {
        const MAX_ATTEMPTS = 3;
        const DELAY_MS = 2000;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          if (orgId) {
            const { data } = await supabase
              .from('organization_feature_flags')
              .select('is_enabled')
              .eq('organization_id', orgId)
              .eq('flag_key', 'backroom_enabled')
              .maybeSingle();

            if (data?.is_enabled) {
              queryClient.invalidateQueries({ queryKey: ['backroom-entitlement'] });
              queryClient.invalidateQueries({ queryKey: ['backroom-location-entitlements'] });
              queryClient.invalidateQueries({ queryKey: ['backroom-org-flag'] });
              toast.success('Backroom activated! Your subscription is now active.');
              pollingRef.current = false;
              return;
            }
          }

          if (attempt < MAX_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        }

        queryClient.invalidateQueries({ queryKey: ['backroom-entitlement'] });
        queryClient.invalidateQueries({ queryKey: ['backroom-location-entitlements'] });
        queryClient.invalidateQueries({ queryKey: ['backroom-org-flag'] });
        toast.success('Payment received! Your backroom access is being activated — please refresh in a moment.');
        pollingRef.current = false;
      };

      pollEntitlement();
    }
  }, [searchParams, setSearchParams, queryClient, orgId]);

  const handleNavigate = useCallback((section: string) => {
    if (section.includes(':')) {
      const [sec, tab] = section.split(':');
      setActiveSection(sec as BackroomSection);
      setSubTab(tab);
    } else {
      setActiveSection(section as BackroomSection);
      setSubTab(undefined);
    }
  }, []);

  const bannerHealth = useMemo(() => {
    if (!health) return undefined;
    const stepSections: { label: string; section: BackroomSection }[] = [
      { label: 'Products', section: 'products' },
      { label: 'Services', section: 'services' },
      { label: 'Formulas', section: 'formulas' },
      { label: 'Allowances', section: 'allowances' },
      { label: 'Stations', section: 'stations' },
      { label: 'Alerts', section: 'alerts' },
    ];
    const steps = stepSections.map(s => ({
      label: s.label,
      done: getSectionStatus(s.section, health) === 'done',
      section: s.section,
    }));
    const completed = steps.filter(s => s.done).length;
    return {
      isComplete: completed === steps.length,
      completed,
      total: steps.length,
      steps,
      warnings: health.warnings,
    };
  }, [health]);
  if (entitlementLoading) {
    return (
      <DashboardLayout>
        <DashboardLoader size="md" className="h-[60vh]" />
      </DashboardLayout>
    );
  }

  if (!isEntitled) {
    return (
      <DashboardLayout>
        <BackroomPaywall />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 max-w-[1600px] mx-auto w-full space-y-6">
        {/* Setup Banner — persistent across all sections */}
        <BackroomSetupBanner
          setupHealth={bannerHealth}
          wizardCompleted={wizardCompleted}
          onNavigate={handleNavigate}
          onResumeSetup={() => {
            setActiveSection('overview');
            setShowWizardFromBanner(true);
          }}
        />

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(dashPath('/admin/team-hub'))}
              aria-label="Go back"
              className="mt-1 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className={tokens.heading.page}>Zura Backroom</h1>
              <p className="text-muted-foreground">Operational command center — monitor performance, track inventory, and manage backroom policies.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar nav */}
          <nav className="w-56 shrink-0 hidden lg:block">
              <div className="sticky top-24 space-y-1">
                {sectionsByGroup.map((group, gi) => (
                  <div key={group.group}>
                    {gi > 0 && <div className="mx-3 my-2 h-px bg-border/40" />}
                    <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest font-display text-muted-foreground/60">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((s) => {
                        const Icon = s.icon;
                        const isActive = activeSection === s.id;
                        const status = getSectionStatus(s.id, health);
                        const prereqOk = isPrereqMet(s, health);

                        return (
                              <button
                                key={s.id}
                                onClick={() => setActiveSection(s.id)}
                                className={cn(
                                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans transition-colors text-left',
                                  isActive
                                    ? 'bg-muted text-foreground font-medium'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                                  !prereqOk && !isActive && 'opacity-60'
                                )}
                              >
                                {!prereqOk ? (
                                  <Lock className="w-4 h-4 shrink-0 text-muted-foreground/60" />
                                ) : (
                                  <Icon className="w-4 h-4 shrink-0" />
                                )}
                                <span className="flex-1 truncate">{s.label}</span>
                              </button>
                        );
                      })}
                      {/* Subscription inside Settings group */}
                      {group.group === 'settings' && (
                        <div className="mt-2 pt-2 border-t border-border/40">
                          <button
                            onClick={() => navigate(dashPath('/admin/backroom-subscription'))}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
                          >
                            <CreditCard className="w-4 h-4 shrink-0" />
                            <span className="flex-1 truncate">Subscription</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
          </nav>

          {/* Mobile section selector */}
          <div className="lg:hidden w-full mb-4">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value as BackroomSection)}
              className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm font-sans text-foreground"
            >
              {sectionsByGroup.map((group) => (
                <optgroup key={group.group} label={group.label}>
                  {group.items.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {activeSection === 'overview' && (
              <BackroomDashboardOverview
                onNavigate={handleNavigate}
                initialSubTab={subTab}
                triggerWizard={showWizardFromBanner}
                onWizardTriggered={() => setShowWizardFromBanner(false)}
              />
            )}
            {activeSection === 'products' && <BackroomProductCatalogSection onNavigate={handleNavigate} />}
            {activeSection === 'services' && <ServiceTrackingSection onNavigate={handleNavigate} />}
            {activeSection === 'formulas' && <RecipeBaselineSection onNavigate={handleNavigate} />}
            {activeSection === 'allowances' && <AllowancesBillingSection onNavigate={handleNavigate} />}
            {activeSection === 'stations' && <StationsHardwareSection onNavigate={handleNavigate} />}
            {activeSection === 'inventory' && <BackroomInventorySection initialTab={subTab} />}
            {activeSection === 'suppliers' && <SupplierSettingsSection />}
            {activeSection === 'permissions' && <BackroomPermissionsSection />}
            {activeSection === 'alerts' && <AlertsExceptionsSection />}
            {activeSection === 'formula' && <FormulaAssistanceSection />}
            {activeSection === 'compliance' && <BackroomComplianceSection />}
            {activeSection === 'multi-location' && <MultiLocationSection />}
            {activeSection === 'price-intelligence' && <PriceRecommendationsContent />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
