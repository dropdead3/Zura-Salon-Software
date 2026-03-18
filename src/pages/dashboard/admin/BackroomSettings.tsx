import { useState, useCallback, useEffect, useRef } from 'react';
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
  Brain,
  CreditCard,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useBackroomSetupHealth } from '@/hooks/backroom/useBackroomSetupHealth';
import { BackroomDashboardOverview } from '@/components/dashboard/backroom-settings/BackroomDashboardOverview';
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
import { BackroomInsightsSection } from '@/components/dashboard/backroom-settings/BackroomInsightsSection';
import { SupplyIntelligenceDashboard } from '@/components/dashboard/backroom/supply-intelligence/SupplyIntelligenceDashboard';

type BackroomSection =
  | 'overview'
  | 'supply-intelligence'
  | 'insights'
  | 'products'
  | 'services'
  | 'recipes'
  | 'allowances'
  | 'stations'
  | 'inventory'
  | 'permissions'
  | 'alerts'
  | 'formula'
  | 'multi-location'
  | 'compliance';

interface SectionMeta {
  id: BackroomSection;
  label: string;
  icon: typeof LayoutDashboard;
  tooltip: string;
  requires?: BackroomSection[];
  requiresLabel?: string;
}

const sections: SectionMeta[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, tooltip: 'Dashboard showing overall Backroom configuration progress.' },
  { id: 'supply-intelligence', label: 'Supply Intelligence', icon: Brain, tooltip: 'AI-powered supply chain analysis: waste, reorder risk, margin, and usage insights.' },
  { id: 'insights', label: 'Insights', icon: BarChart3, tooltip: 'KPI cards & employee performance analytics for your backroom.' },
  { id: 'products', label: 'Products & Supplies', icon: Package, tooltip: 'Choose which products are tracked at the mixing station.' },
  { id: 'services', label: 'Service Tracking', icon: Wrench, tooltip: 'Link services to the products they consume.', requires: ['products'], requiresLabel: 'Products' },
  { id: 'recipes', label: 'Recipe Baselines', icon: BarChart3, tooltip: 'Expected product quantities per service.', requires: ['products', 'services'], requiresLabel: 'Services' },
  { id: 'allowances', label: 'Allowances & Billing', icon: DollarSign, tooltip: 'Define included amounts and overage billing rules.', requires: ['products', 'services'], requiresLabel: 'Services' },
  { id: 'stations', label: 'Stations & Hardware', icon: Monitor, tooltip: 'Register mixing stations and pair scales.' },
  { id: 'inventory', label: 'Inventory', icon: Package, tooltip: 'Stock monitoring, reorder alerts, and demand forecasting.' },
  { id: 'permissions', label: 'Permissions', icon: Shield, tooltip: 'Control who can do what in Backroom.' },
  { id: 'alerts', label: 'Alerts & Exceptions', icon: Bell, tooltip: 'Automatic alerts for operational issues.' },
  { id: 'formula', label: 'Formula Assistance', icon: Sparkles, tooltip: 'Smart Mix Assist suggestion settings.' },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck, tooltip: 'Color/chemical logging compliance tracking.' },
  { id: 'multi-location', label: 'Multi-Location', icon: Building2, tooltip: 'Compare and copy settings between locations.' },
];

function getSectionStatus(sectionId: BackroomSection, health: ReturnType<typeof useBackroomSetupHealth>['data']): 'done' | 'warning' | 'none' {
  if (!health) return 'none';
  switch (sectionId) {
    case 'products': return health.trackedProducts > 0 ? 'done' : 'none';
    case 'services': return health.trackedServices > 0 ? 'done' : 'none';
    case 'recipes': return health.recipesConfigured > 0 ? 'done' : 'none';
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
  const [activeSection, setActiveSection] = useState<BackroomSection>('overview');
  const { data: health } = useBackroomSetupHealth();
  const { isEntitled, isLoading: entitlementLoading } = useBackroomEntitlement();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
    setActiveSection(section as BackroomSection);
  }, []);

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
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/admin/team-hub')}
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
            <TooltipProvider delayDuration={300}>
              <div className="space-y-0.5 sticky top-24">
                {sections.map((s) => {
                  const Icon = s.icon;
                  const isActive = activeSection === s.id;
                  const status = getSectionStatus(s.id, health);
                  const prereqOk = isPrereqMet(s, health);

                  return (
                    <Tooltip key={s.id}>
                      <TooltipTrigger asChild>
                        <button
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
                          {status === 'done' && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px]">
                        <p className="text-xs font-sans">{s.tooltip}</p>
                        {!prereqOk && s.requiresLabel && (
                          <p className="text-xs text-muted-foreground mt-1">Requires {s.requiresLabel} first</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}

                {/* Subscription link */}
                <div className="mt-4 pt-4 border-t border-border/40">
                  <button
                    onClick={() => navigate('/dashboard/admin/backroom-subscription')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">Subscription</span>
                  </button>
                </div>
              </div>
            </TooltipProvider>
          </nav>

          {/* Mobile section selector */}
          <div className="lg:hidden w-full mb-4">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value as BackroomSection)}
              className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm font-sans text-foreground"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {activeSection === 'overview' && <BackroomDashboardOverview onNavigate={handleNavigate} />}
            {activeSection === 'supply-intelligence' && <SupplyIntelligenceDashboard />}
            {activeSection === 'insights' && <BackroomInsightsSection />}
            {activeSection === 'products' && <BackroomProductCatalogSection onNavigate={handleNavigate} />}
            {activeSection === 'services' && <ServiceTrackingSection onNavigate={handleNavigate} />}
            {activeSection === 'recipes' && <RecipeBaselineSection onNavigate={handleNavigate} />}
            {activeSection === 'allowances' && <AllowancesBillingSection onNavigate={handleNavigate} />}
            {activeSection === 'stations' && <StationsHardwareSection onNavigate={handleNavigate} />}
            {activeSection === 'inventory' && <BackroomInventorySection />}
            {activeSection === 'permissions' && <BackroomPermissionsSection />}
            {activeSection === 'alerts' && <AlertsExceptionsSection />}
            {activeSection === 'formula' && <FormulaAssistanceSection />}
            {activeSection === 'compliance' && <BackroomComplianceSection />}
            {activeSection === 'multi-location' && <MultiLocationSection />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
