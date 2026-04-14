import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import {
  Users, Shield, Loader2, Mail, Cog, Rocket, Plug,
  GraduationCap, Layers, GripVertical, Pencil, X, Save, RotateCcw,
  Building2, MapPin, Armchair, MessageSquare, Sparkles, FileCheck,
  Gift, Trophy, TabletSmartphone, Scissors, ShoppingBag, Wallet, CreditCard,
  Upload,
} from 'lucide-react';
import { MessageSquareHeart } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useBillingAccess } from '@/hooks/useBillingAccess';
import { useSettingsLayout, useUpdateSettingsLayout, DEFAULT_ORDER, SECTION_GROUPS } from '@/hooks/useSettingsLayout';
import { cn } from '@/lib/utils';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

import { useToast } from '@/hooks/use-toast';
import type { SettingsCategory } from '@/components/dashboard/settings/SettingsCategoryDetail';

// Lazy-load heavy sub-views
const SettingsCategoryDetail = lazy(() =>
  import('@/components/dashboard/settings/SettingsCategoryDetail').then(m => ({ default: m.SettingsCategoryDetail }))
);
const SettingsDndWrapper = lazy(() =>
  import('@/components/dashboard/settings/SettingsDndWrapper').then(m => ({ default: m.SettingsDndWrapper }))
);

// Static card (no DnD) for the default grid view
function StaticCard({ category, onClick }: {
  category: { id: string; label: string; description: string; icon: React.ComponentType<{ className?: string }> };
  onClick: () => void;
}) {
  const Icon = category.icon;
  return (
    <div className="group relative">
      <Card
        className="transition-all relative h-[140px] cursor-pointer group hover:border-primary/30 hover:shadow-md"
        onClick={onClick}
      >
        <MetricInfoTooltip description={category.description} className="absolute top-3 right-3 w-4 h-4" />
        <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
          <div className={tokens.card.iconBox}>
            <Icon className={tokens.card.icon} />
          </div>
          <span className={tokens.card.title}>{category.label}</span>
        </div>
      </Card>
    </div>
  );
}

const categoriesMap: Record<string, { id: string; label: string; description: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  'my-profile': { id: 'my-profile', label: 'My Profile', description: 'Manage your profile photo, bio, specialties, and professional details visible to clients and teammates.', icon: Users },
  'business': { id: 'business', label: 'Business', description: 'Configure your business name, logo, address, EIN, and other organization-level identity details.', icon: Building2 },
  'email': { id: 'email', label: 'Email', description: 'Customize email templates, merge variables, sender signatures, and default communication settings.', icon: Mail },
  'users': { id: 'users', label: 'Users', description: 'Add, remove, and manage team members. Assign roles and control access levels across the organization.', icon: Users },
  'onboarding': { id: 'onboarding', label: 'Onboarding', description: 'Define onboarding task lists, handbooks, and role-specific configuration for new team members.', icon: Rocket },
  'leaderboard': { id: 'leaderboard', label: 'Leaderboard', description: 'Set scoring weights for KPIs, configure achievement badges, and customize how team performance is ranked.', icon: Trophy },
  'integrations': { id: 'integrations', label: 'Integrations', description: 'Connect and manage third-party services such as POS systems, payment processors, and marketing platforms.', icon: Plug },
  'system': { id: 'system', label: 'System', description: 'Control appearance themes, notification preferences, security settings, and global platform behavior.', icon: Cog },
  'program': { id: 'program', label: 'Program Editor', description: 'Build and edit Client Engine courses, modules, and learning paths for structured team development.', icon: GraduationCap },
  'levels': { id: 'levels', label: 'Stylist Levels', description: 'Define experience tiers, associate pricing multipliers, and set promotion criteria for stylists.', icon: Layers },
  'access-hub': { id: 'access-hub', label: 'Roles & Controls Hub', description: 'Configure which modules, pages, and features are visible to each role. Manage granular permissions.', icon: Shield },
  'locations': { id: 'locations', label: 'Locations', description: 'Manage salon addresses, operating hours, holiday schedules, and location-specific settings.', icon: MapPin },
  'dayrate': { id: 'dayrate', label: 'Day Rate', description: 'Configure chair rental pricing, day-rate agreements, and independent contractor billing terms.', icon: Armchair },
  'sms': { id: 'sms', label: 'Text Messages', description: 'Create and manage SMS templates, automated text sequences, and messaging rules for client communication.', icon: MessageSquare },
  'service-flows': { id: 'service-flows', label: 'Service Flows', description: 'Design automated email and text sequences triggered by specific services, appointments, or client actions.', icon: Sparkles },
  'forms': { id: 'forms', label: 'Forms', description: 'Create and manage client-facing agreements, consultation forms, waivers, and intake documents.', icon: FileCheck },
  'loyalty': { id: 'loyalty', label: 'Client Rewards', description: 'Configure loyalty point earning rules, reward tiers, gift card settings, and client incentive programs.', icon: Gift },
  'feedback': { id: 'feedback', label: 'Feedback Settings', description: 'Set review request thresholds, configure platform review links, and manage client feedback collection.', icon: MessageSquareHeart },
  'team-rewards': { id: 'team-rewards', label: 'Staff Rewards', description: 'Manage the internal staff points economy, define reward catalog items, and set earning rules for team incentives.', icon: Gift },
  'kiosk': { id: 'kiosk', label: 'Kiosks', description: 'Set up check-in kiosks, self-service booking terminals, and configure device-specific display settings.', icon: TabletSmartphone },
  'services': { id: 'services', label: 'Services', description: 'Manage service categories, individual services, durations, and pricing across all locations.', icon: Scissors },
  'retail-products': { id: 'retail-products', label: 'Retail Products', description: 'Manage product brands, categories, inventory levels, pricing, and retail display configurations.', icon: ShoppingBag },
  'account-billing': { id: 'account-billing', label: 'Account & Billing', description: 'View and manage your subscription plan, payment methods, invoices, and billing history.', icon: Wallet },
  'data-import': { id: 'data-import', label: 'Data Import', description: 'Migrate data from other salon software or import from CSV files.', icon: Upload },
  'zura-config': { id: 'zura-config', label: 'Zura Configuration', description: 'Customize AI personality, knowledge base, role rules, and behavioral guardrails.', icon: Sparkles },
  'terminals': { id: 'terminals', label: 'Point Of Sale', description: 'Configure your Point Of Sale hardware fleet, purchase readers, monitor connectivity, and preview checkout display.', icon: CreditCard },
};

export default function Settings() {
  const { dashPath } = useOrgDashboardPath();
  const { roles } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialCategory = (() => {
    const param = searchParams.get('category');
    if (param === 'schedule') return 'services' as SettingsCategory;
    if (param === 'website') return null;
    if (param && param in categoriesMap) return param as SettingsCategory;
    // Legacy compat: ?tab=terminals or zura_pay return/refresh params
    if (searchParams.get('tab') === 'terminals' || searchParams.has('zura_pay_return') || searchParams.has('zura_pay_refresh')) {
      return 'terminals' as SettingsCategory;
    }
    return null;
  })();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(initialCategory);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const { data: layoutPrefs } = useSettingsLayout();
  const updateLayout = useUpdateSettingsLayout();
  const [localOrder, setLocalOrder] = useState<string[]>(DEFAULT_ORDER);
  const [hasChanges, setHasChanges] = useState(false);

  const isSuperAdmin = roles?.includes('super_admin') || roles?.includes('admin');
  const { canViewBilling } = useBillingAccess();

  useEffect(() => {
    if (location.state?.navTimestamp) setActiveCategory(null);
  }, [location.state?.navTimestamp]);

  useEffect(() => {
    if (layoutPrefs) setLocalOrder(layoutPrefs.order);
  }, [layoutPrefs]);

  const handleCategoryClick = (id: string) => {
    if (id === 'my-profile') navigate(dashPath('/profile'));
    else if (id === 'business') setActiveCategory('business' as SettingsCategory);
    else if (id === 'access-hub') navigate(dashPath('/admin/access-hub'));
    else if (id === 'data-import') navigate(dashPath('/admin/data-import'));
    else if (id === 'zura-config') navigate(dashPath('/admin/zura-config'));
    else setActiveCategory(id as SettingsCategory);
  };

  const handleSaveLayout = () => {
    updateLayout.mutate(
      { order: localOrder, iconColors: {} },
      {
        onSuccess: () => {
          toast({ title: 'Layout saved', description: 'Your settings layout has been saved.' });
          setIsEditMode(false);
          setHasChanges(false);
        },
        onError: () => {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to save layout.' });
        },
      }
    );
  };

  const handleResetLayout = () => { setLocalOrder(DEFAULT_ORDER); setHasChanges(true); };
  const handleCancelEdit = () => {
    if (layoutPrefs) setLocalOrder(layoutPrefs.order);
    setIsEditMode(false);
    setHasChanges(false);
  };

  // Delegate to lazy detail view when a category is selected
  if (activeCategory) {
    return (
      <Suspense fallback={<DashboardLayout><div className="p-6 lg:p-8"><DashboardLoader size="lg" className="h-64" /></div></DashboardLayout>}>
        <SettingsCategoryDetail
          activeCategory={activeCategory}
          categoryLabel={categoriesMap[activeCategory]?.label ?? ''}
          categoryDescription={categoriesMap[activeCategory]?.description ?? ''}
          onBack={() => {
            setActiveCategory(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('category');
            window.history.replaceState({}, '', url.pathname + url.search);
          }}
        />
      </Suspense>
    );
  }

  // ---- Main settings card grid (renders immediately) ----
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl mb-2">SETTINGS</h1>
            <p className="text-muted-foreground font-sans">Manage system configuration, users, and communications.</p>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Button variant="outline" size={tokens.button.card} onClick={handleResetLayout} className="gap-1.5">
                  <RotateCcw className="w-4 h-4" /> Reset
                </Button>
                <Button variant="outline" size={tokens.button.card} onClick={handleCancelEdit} className="gap-1.5">
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button size={tokens.button.card} onClick={handleSaveLayout} disabled={!hasChanges || updateLayout.isPending} className="gap-1.5">
                  {updateLayout.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Layout
                </Button>
              </>
            ) : (
              <Button variant="outline" size={tokens.button.card} onClick={() => setIsEditMode(true)} className="gap-1.5">
                <Pencil className="w-4 h-4" /> Edit Layout
              </Button>
            )}
          </div>
        </div>

        {isEditMode && (
          <div className="mb-4 p-3 bg-muted/50 border rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
            <GripVertical className="w-4 h-4" />
            <span>Drag cards to reorder.</span>
          </div>
        )}

        {isEditMode ? (
          <Suspense fallback={<DashboardLoader size="md" className="h-64" />}>
            <SettingsDndWrapper
              localOrder={localOrder}
              onReorder={(newOrder) => { setLocalOrder(newOrder); setHasChanges(true); }}
              categoriesMap={categoriesMap}
              isSuperAdmin={!!isSuperAdmin}
              canViewBilling={canViewBilling}
              onCategoryClick={handleCategoryClick}
            />
          </Suspense>
        ) : (
          <div className="space-y-8">
            {SECTION_GROUPS.map((section) => {
              const sectionCategoryIds = section.categories.filter(id =>
                localOrder.includes(id) && categoriesMap[id] && (id !== 'feedback' || isSuperAdmin) && (id !== 'account-billing' || canViewBilling)
              );
              sectionCategoryIds.sort((a, b) => localOrder.indexOf(a) - localOrder.indexOf(b));
              if (sectionCategoryIds.length === 0) return null;

              return (
                <div key={section.id} className="space-y-4">
                  <h2 className="font-display text-xs uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-2">
                    {section.label}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sectionCategoryIds.map(categoryId => {
                      const category = categoriesMap[categoryId];
                      if (!category) return null;
                      return (
                        <StaticCard
                          key={category.id}
                          category={category}
                          onClick={() => handleCategoryClick(category.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        
      </div>
    </DashboardLayout>
  );
}
