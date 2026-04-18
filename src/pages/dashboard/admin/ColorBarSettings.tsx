import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useColorBarEntitlement } from '@/hooks/color-bar/useColorBarEntitlement';
import { useColorBarOrgId } from '@/hooks/color-bar/useColorBarOrgId';
import { ColorBarPaywall } from '@/components/dashboard/color-bar-settings/ColorBarPaywall';
import { Loader2, ArrowLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  Coins,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

import { Button } from '@/components/ui/button';
import { useColorBarSetupHealth } from '@/hooks/color-bar/useColorBarSetupHealth';
import { ColorBarDashboardOverview } from '@/components/dashboard/color-bar-settings/ColorBarDashboardOverview';
import { ColorBarInsightsSection } from '@/components/dashboard/color-bar-settings/ColorBarInsightsSection';
import { ColorBarSetupBanner } from '@/components/dashboard/color-bar-settings/ColorBarSetupBanner';
import { useColorBarSetting } from '@/hooks/color-bar/useColorBarSettings';
import { ColorBarProductCatalogSection } from '@/components/dashboard/color-bar-settings/ColorBarProductCatalogSection';
import { ServiceTrackingSection } from '@/components/dashboard/color-bar-settings/ServiceTrackingSection';
import { RecipeBaselineSection } from '@/components/dashboard/color-bar-settings/RecipeBaselineSection';
import { AllowancesBillingSection } from '@/components/dashboard/color-bar-settings/AllowancesBillingSection';
import { StationsHardwareSection } from '@/components/dashboard/color-bar-settings/StationsHardwareSection';
import { ColorBarInventorySection } from '@/components/dashboard/color-bar-settings/ColorBarInventorySection';
import { ColorBarPermissionsSection } from '@/components/dashboard/color-bar-settings/ColorBarPermissionsSection';
import { AlertsExceptionsSection } from '@/components/dashboard/color-bar-settings/AlertsExceptionsSection';
import { FormulaAssistanceSection } from '@/components/dashboard/color-bar-settings/FormulaAssistanceSection';
import { MultiLocationSection } from '@/components/dashboard/color-bar-settings/MultiLocationSection';
import { ColorBarComplianceSection } from '@/components/dashboard/color-bar-settings/ColorBarComplianceSection';
import { SupplierSettingsSection } from '@/components/dashboard/color-bar-settings/SupplierSettingsSection';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PriceRecommendationsContent } from '@/pages/dashboard/admin/PriceRecommendations';
import { ColorBarSavingsSection } from '@/components/dashboard/color-bar-settings/ColorBarSavingsSection';
import { InventoryReconciliationBanner } from '@/components/dashboard/color-bar/InventoryReconciliationBanner';


type ColorBarSection =
  | 'overview'
  | 'analytics'
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
  | 'savings'
  | 'price-intelligence';

type SectionGroup = 'operations' | 'configuration' | 'settings';

const GROUP_LABELS: Record<SectionGroup, string> = {
  operations: 'Operations',
  configuration: 'Configuration',
  settings: 'Settings',
};

const GROUP_ORDER: SectionGroup[] = ['operations', 'configuration', 'settings'];

interface SectionMeta {
  id: ColorBarSection;
  label: string;
  icon: typeof LayoutDashboard;
  tooltip: string;
  group: SectionGroup;
  requires?: ColorBarSection[];
  requiresLabel?: string;
}

const sections: SectionMeta[] = [
  // Operations
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, tooltip: 'Dashboard overview with analytics and AI intelligence.', group: 'operations' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, tooltip: 'Product usage, staff performance, and trend analytics.', group: 'operations' },
  { id: 'inventory', label: 'Inventory', icon: Package, tooltip: 'Stock monitoring, reorder alerts, and demand forecasting.', group: 'operations' },
  { id: 'price-intelligence', label: 'Price Intelligence', icon: CircleDollarSign, tooltip: 'Margin analysis and price recommendations.', group: 'operations' },
  { id: 'compliance', label: 'Compliance Reports', icon: ShieldCheck, tooltip: 'Staff compliance tracking, accountability reports, and 1:1 coaching prep.', group: 'operations' },
  { id: 'savings', label: 'Your Savings', icon: Coins, tooltip: 'See how Zura Color Bar saves you money with transparent ROI calculations.', group: 'operations' },
  // Configuration
  { id: 'products', label: 'Products & Supplies', icon: Package, tooltip: 'Choose which products are tracked at the mixing station.', group: 'configuration' },
  { id: 'suppliers', label: 'Suppliers', icon: Truck, tooltip: 'Manage supplier contacts and product assignments.', requires: ['products'], requiresLabel: 'Products', group: 'configuration' },
  { id: 'services', label: 'Service Tracking', icon: Wrench, tooltip: 'Link services to the products they consume.', requires: ['products'], requiresLabel: 'Products', group: 'configuration' },
  { id: 'formulas', label: 'Formula Baselines', icon: BarChart3, tooltip: 'Expected product quantities per service.', requires: ['products', 'services'], requiresLabel: 'Services', group: 'configuration' },
  { id: 'allowances', label: 'Allowances & Billing', icon: DollarSign, tooltip: 'Define included amounts and overage billing rules.', requires: ['products', 'services'], requiresLabel: 'Services', group: 'configuration' },
  { id: 'formula', label: 'Formula Assistance', icon: Sparkles, tooltip: 'Smart Mix Assist suggestion settings.', group: 'configuration' },
  { id: 'stations', label: 'Stations & Hardware', icon: Monitor, tooltip: 'Register mixing stations and pair scales.', group: 'configuration' },
  // Settings
  { id: 'permissions', label: 'Permissions', icon: Shield, tooltip: 'Control who can do what in Color Bar.', group: 'settings' },
  { id: 'alerts', label: 'Alerts & Exceptions', icon: Bell, tooltip: 'Automatic alerts for operational issues.', group: 'settings' },
  { id: 'multi-location', label: 'Multi-Location', icon: Building2, tooltip: 'Compare and copy settings between locations.', group: 'settings' },
];

const sectionsByGroup = GROUP_ORDER.map(group => ({
  group,
  label: GROUP_LABELS[group],
  items: sections.filter(s => s.group === group),
}));

function getSectionStatus(sectionId: ColorBarSection, health: ReturnType<typeof useColorBarSetupHealth>['data']): 'done' | 'warning' | 'none' {
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

function isPrereqMet(section: SectionMeta, health: ReturnType<typeof useColorBarSetupHealth>['data']): boolean {
  if (!section.requires || !health) return true;
  return section.requires.every(req => getSectionStatus(req, health) === 'done');
}

export default function ColorBarSettings() {
  const { dashPath } = useOrgDashboardPath();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = (searchParams.get('section') as ColorBarSection) || 'overview';
  const [activeSection, setActiveSection] = useState<ColorBarSection>(initialSection);
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('color-bar-nav-collapsed') || 'false'); } catch { return false; }
  });
  const toggleNavCollapsed = useCallback(() => {
    setNavCollapsed((prev: boolean) => {
      const next = !prev;
      localStorage.setItem('color-bar-nav-collapsed', JSON.stringify(next));
      return next;
    });
  }, []);
  const [subTab, setSubTab] = useState<string | undefined>();
  const { data: health } = useColorBarSetupHealth();
  const { isEntitled, isLoading: entitlementLoading } = useColorBarEntitlement();
  const { data: wizardSetting } = useColorBarSetting('setup_wizard_completed');
  const wizardCompleted = !!(wizardSetting?.value as Record<string, unknown>)?.completed;
  const [showWizardFromBanner, setShowWizardFromBanner] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pollingRef = useRef(false);
  const orgId = useColorBarOrgId();

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
              queryClient.invalidateQueries({ queryKey: ['color-bar-entitlement'] });
              queryClient.invalidateQueries({ queryKey: ['color-bar-location-entitlements'] });
              queryClient.invalidateQueries({ queryKey: ['color-bar-org-flag'] });
              toast.success('Color Bar activated! Your subscription is now active.');
              pollingRef.current = false;
              return;
            }
          }

          if (attempt < MAX_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        }

        queryClient.invalidateQueries({ queryKey: ['color-bar-entitlement'] });
        queryClient.invalidateQueries({ queryKey: ['color-bar-location-entitlements'] });
        queryClient.invalidateQueries({ queryKey: ['color-bar-org-flag'] });
        toast.success('Payment received! Your color bar access is being activated — please refresh in a moment.');
        pollingRef.current = false;
      };

      pollEntitlement();
    }
  }, [searchParams, setSearchParams, queryClient, orgId]);

  const handleNavigate = useCallback((section: string) => {
    if (section.includes(':')) {
      const [sec, tab] = section.split(':');
      setActiveSection(sec as ColorBarSection);
      setSubTab(tab);
    } else {
      setActiveSection(section as ColorBarSection);
      setSubTab(undefined);
    }
  }, []);

  const bannerHealth = useMemo(() => {
    if (!health) return undefined;
    const stepSections: { label: string; section: ColorBarSection }[] = [
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
        <DashboardLoader size="md" fullPage />
      </DashboardLayout>
    );
  }

  if (!isEntitled) {
    return (
      <DashboardLayout>
        <ColorBarPaywall />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 max-w-[1600px] mx-auto w-full space-y-6">
        {/* Inventory reconciliation banner — shown when any location requires recount after suspension */}
        <InventoryReconciliationBanner
          onBegin={() => setActiveSection('products')}
        />

        {/* Setup Banner — persistent across all sections */}
        <ColorBarSetupBanner
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
              <h1 className={tokens.heading.page}>Zura Color Bar</h1>
              <p className="text-muted-foreground">Operational command center — monitor performance, track inventory, and manage color bar policies.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar nav */}
          <TooltipProvider delayDuration={200}>
          <nav className={cn(
            'shrink-0 hidden lg:block transition-all duration-200',
            navCollapsed ? 'w-12' : 'w-56'
          )}>
              <div className="sticky top-24 space-y-1">
                {/* Collapse toggle */}
                <div className={cn('flex mb-2', navCollapsed ? 'justify-center' : 'justify-end px-2')}>
                  <button
                    onClick={toggleNavCollapsed}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    aria-label={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}
                  >
                    {navCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                  </button>
                </div>

                {sectionsByGroup.map((group, gi) => (
                  <div key={group.group}>
                    {gi > 0 && <div className={cn('my-2 h-px bg-border/40', navCollapsed ? 'mx-1' : 'mx-3')} />}
                    {!navCollapsed && (
                      <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest font-display text-muted-foreground/60">
                        {group.label}
                      </p>
                    )}
                    <div className="space-y-0.5">
                      {group.items.map((s) => {
                        const Icon = s.icon;
                        const isActive = activeSection === s.id;
                        const prereqOk = isPrereqMet(s, health);
                        const IconToRender = !prereqOk ? Lock : Icon;

                        const btn = (
                          <button
                            key={s.id}
                            onClick={() => setActiveSection(s.id)}
                            className={cn(
                              'w-full flex items-center rounded-lg text-sm font-sans transition-colors text-left',
                              navCollapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-3 py-2',
                              isActive
                                ? 'bg-muted text-foreground font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                              !prereqOk && !isActive && 'opacity-60'
                            )}
                          >
                            <IconToRender className={cn('w-4 h-4 shrink-0', !prereqOk && 'text-muted-foreground/60')} />
                            {!navCollapsed && <span className="flex-1 truncate">{s.label}</span>}
                          </button>
                        );

                        if (navCollapsed) {
                          return (
                            <Tooltip key={s.id}>
                              <TooltipTrigger asChild>{btn}</TooltipTrigger>
                              <TooltipContent side="right" className="text-xs">{s.label}</TooltipContent>
                            </Tooltip>
                          );
                        }
                        return btn;
                      })}
                      {/* Subscription inside Settings group */}
                      {group.group === 'settings' && (
                        <div className={cn(navCollapsed ? 'mt-1 pt-1' : 'mt-2 pt-2 border-t border-border/40')}>
                          {navCollapsed ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => navigate(dashPath('/admin/color-bar-subscription'))}
                                  className="w-full flex items-center justify-center py-2 rounded-lg text-sm font-sans text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                >
                                  <CreditCard className="w-4 h-4 shrink-0" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="text-xs">Subscription</TooltipContent>
                            </Tooltip>
                          ) : (
                            <button
                              onClick={() => navigate(dashPath('/admin/color-bar-subscription'))}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
                            >
                              <CreditCard className="w-4 h-4 shrink-0" />
                              <span className="flex-1 truncate">Subscription</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
          </nav>
          </TooltipProvider>

          {/* Mobile section selector */}
          <div className="lg:hidden w-full mb-4">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value as ColorBarSection)}
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
              <ColorBarDashboardOverview
                onNavigate={handleNavigate}
                initialSubTab={subTab}
                triggerWizard={showWizardFromBanner}
                onWizardTriggered={() => setShowWizardFromBanner(false)}
              />
            )}
            {activeSection === 'analytics' && (
              <ColorBarInsightsSection
                locationId="all"
                datePreset="30d"
                showExtendedAnalytics
                wasteByCategory={{}}
                totalWasteQty={0}
              />
            )}
            {activeSection === 'products' && <ColorBarProductCatalogSection onNavigate={handleNavigate} />}
            {activeSection === 'services' && <ServiceTrackingSection onNavigate={handleNavigate} />}
            {activeSection === 'formulas' && <RecipeBaselineSection onNavigate={handleNavigate} />}
            {activeSection === 'allowances' && <AllowancesBillingSection onNavigate={handleNavigate} />}
            {activeSection === 'stations' && <StationsHardwareSection onNavigate={handleNavigate} />}
            {activeSection === 'inventory' && <ColorBarInventorySection initialTab={subTab} />}
            {activeSection === 'suppliers' && <SupplierSettingsSection />}
            {activeSection === 'permissions' && <ColorBarPermissionsSection />}
            {activeSection === 'alerts' && <AlertsExceptionsSection />}
            {activeSection === 'formula' && <FormulaAssistanceSection />}
            {activeSection === 'compliance' && <ColorBarComplianceSection />}
            {activeSection === 'multi-location' && <MultiLocationSection />}
            {activeSection === 'price-intelligence' && <PriceRecommendationsContent />}
            {activeSection === 'savings' && <ColorBarSavingsSection />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
