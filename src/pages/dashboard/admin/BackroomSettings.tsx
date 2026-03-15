import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBackroomSetupHealth } from '@/hooks/backroom/useBackroomSetupHealth';
import { BackroomSetupOverview } from '@/components/dashboard/backroom-settings/BackroomSetupOverview';
import { BackroomProductCatalogSection } from '@/components/dashboard/backroom-settings/BackroomProductCatalogSection';
import { ServiceTrackingSection } from '@/components/dashboard/backroom-settings/ServiceTrackingSection';
import { RecipeBaselineSection } from '@/components/dashboard/backroom-settings/RecipeBaselineSection';
import { AllowancesBillingSection } from '@/components/dashboard/backroom-settings/AllowancesBillingSection';
import { StationsHardwareSection } from '@/components/dashboard/backroom-settings/StationsHardwareSection';
import { InventoryReplenishmentSection } from '@/components/dashboard/backroom-settings/InventoryReplenishmentSection';
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
  /** Section IDs that must have data before this section is useful */
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

/** Map section IDs to health-check keys for completion status */
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

  const handleNavigate = useCallback((section: string) => {
    setActiveSection(section as BackroomSection);
  }, []);

  return (
    <DashboardLayout>
      <div className={tokens.layout.pageContainer}>
        <DashboardPageHeader
          title="Backroom Settings"
          description="Configure products, services, allowances, and operational policies that power Zura Backroom."
          backTo="/dashboard/admin/team-hub"
        />

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
                          {/* Completion dot */}
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
              </div>
            </TooltipProvider>
          </nav>

          {/* Mobile section selector */}
          <div className="lg:hidden w-full mb-4">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value as BackroomSection)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-sans"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {activeSection === 'overview' && <BackroomSetupOverview onNavigate={handleNavigate} />}
            {activeSection === 'supply-intelligence' && <SupplyIntelligenceDashboard />}
            {activeSection === 'insights' && <BackroomInsightsSection />}
            {activeSection === 'products' && <BackroomProductCatalogSection onNavigate={handleNavigate} />}
            {activeSection === 'services' && <ServiceTrackingSection onNavigate={handleNavigate} />}
            {activeSection === 'recipes' && <RecipeBaselineSection onNavigate={handleNavigate} />}
            {activeSection === 'allowances' && <AllowancesBillingSection onNavigate={handleNavigate} />}
            {activeSection === 'stations' && <StationsHardwareSection onNavigate={handleNavigate} />}
            {activeSection === 'inventory' && <InventoryReplenishmentSection />}
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
