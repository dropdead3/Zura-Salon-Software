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
} from 'lucide-react';
import { BackroomSetupOverview } from '@/components/dashboard/backroom-settings/BackroomSetupOverview';
import { BackroomProductCatalogSection } from '@/components/dashboard/backroom-settings/BackroomProductCatalogSection';
import { ServiceTrackingSection } from '@/components/dashboard/backroom-settings/ServiceTrackingSection';
import { RecipeBaselineSection } from '@/components/dashboard/backroom-settings/RecipeBaselineSection';

type BackroomSection =
  | 'overview'
  | 'products'
  | 'services'
  | 'recipes'
  | 'allowances'
  | 'stations'
  | 'inventory'
  | 'permissions'
  | 'alerts'
  | 'formula'
  | 'multi-location';

const sections: { id: BackroomSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products & Supplies', icon: Package },
  { id: 'services', label: 'Service Tracking', icon: Wrench },
  { id: 'recipes', label: 'Recipe Baselines', icon: BarChart3 },
  { id: 'allowances', label: 'Allowances & Billing', icon: DollarSign },
  { id: 'stations', label: 'Stations & Hardware', icon: Monitor },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'alerts', label: 'Alerts & Exceptions', icon: Bell },
  { id: 'formula', label: 'Formula Assistance', icon: Sparkles },
  { id: 'multi-location', label: 'Multi-Location', icon: Building2 },
];

export default function BackroomSettings() {
  const [activeSection, setActiveSection] = useState<BackroomSection>('overview');

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
            <div className="space-y-0.5 sticky top-24">
              {sections.map((s) => {
                const Icon = s.icon;
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans transition-colors text-left',
                      isActive
                        ? 'bg-muted text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {s.label}
                  </button>
                );
              })}
            </div>
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
            {activeSection === 'overview' && <BackroomSetupOverview onNavigate={setActiveSection} />}
            {activeSection === 'products' && <BackroomProductCatalogSection />}
            {activeSection === 'services' && <ServiceTrackingSection />}
            {activeSection === 'recipes' && <RecipeBaselineSection />}
            {activeSection === 'allowances' && <ComingSoon label="Allowances & Billing" />}
            {activeSection === 'stations' && <ComingSoon label="Stations & Hardware" />}
            {activeSection === 'inventory' && <ComingSoon label="Inventory & Replenishment" />}
            {activeSection === 'permissions' && <ComingSoon label="Permissions" />}
            {activeSection === 'alerts' && <ComingSoon label="Alerts & Exceptions" />}
            {activeSection === 'formula' && <ComingSoon label="Formula Assistance" />}
            {activeSection === 'multi-location' && <ComingSoon label="Multi-Location" />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className={tokens.empty.container}>
      <div className={tokens.empty.heading}>{label}</div>
      <p className={tokens.empty.description}>This section will be available in Phase 2.</p>
    </div>
  );
}
