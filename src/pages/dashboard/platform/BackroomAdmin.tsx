import { useState } from 'react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PriceQueueTab } from '@/components/platform/backroom/PriceQueueTab';
import { PriceSourcesTab } from '@/components/platform/backroom/PriceSourcesTab';
import { BackroomEntitlementsTab } from '@/components/platform/backroom/BackroomEntitlementsTab';
import { SupplyLibraryTab } from '@/components/platform/backroom/SupplyLibraryTab';
import { HardwareOrdersTab } from '@/components/platform/backroom/HardwareOrdersTab';
import { BackroomAnalyticsTab } from '@/components/platform/backroom/BackroomAnalyticsTab';
import { BackroomBillingTab } from '@/components/platform/backroom/BackroomBillingTab';
import { CoachPerformanceTab } from '@/components/platform/backroom/CoachPerformanceTab';
import { RefundHistoryTab } from '@/components/platform/backroom/RefundHistoryTab';
import { DockAppTab } from '@/components/platform/backroom/DockAppTab';
import { cn } from '@/lib/utils';
import {
  ClipboardList, Database, Building2, Package, BarChart3,
  CreditCard, Users2, ReceiptText, BoxIcon, Tablet,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Intelligence',
    items: [
      { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Pricing',
    items: [
      { value: 'queue', label: 'Price Queue', icon: ClipboardList },
      { value: 'sources', label: 'Price Sources', icon: Database },
      { value: 'library', label: 'Supply Library', icon: Package },
    ],
  },
  {
    label: 'Operations',
    items: [
      { value: 'entitlements', label: 'App Access', icon: Building2 },
      { value: 'billing', label: 'Billing', icon: CreditCard },
      { value: 'coach-performance', label: 'Coach Performance', icon: Users2 },
      { value: 'refund-history', label: 'Refund History', icon: ReceiptText },
      { value: 'hardware-orders', label: 'Hardware Orders', icon: BoxIcon },
    ],
  },
  {
    label: 'Products',
    items: [
      { value: 'dock-app', label: 'Dock App', icon: Tablet },
    ],
  },
];

const panels: Record<string, React.ReactNode> = {
  analytics: <BackroomAnalyticsTab />,
  queue: <PriceQueueTab />,
  sources: <PriceSourcesTab />,
  entitlements: <BackroomEntitlementsTab />,
  library: <SupplyLibraryTab />,
  billing: <BackroomBillingTab />,
  'coach-performance': <CoachPerformanceTab />,
  'refund-history': <RefundHistoryTab />,
  'hardware-orders': <HardwareOrdersTab />,
  'dock-app': <DockAppTab />,
};

export default function BackroomAdmin() {
  const [tab, setTab] = useState('analytics');

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Zura Backroom"
        description="Wholesale price intelligence, source configuration, organization entitlements, billing health, and platform analytics."
      />

      <div className="flex gap-6 min-h-[calc(100vh-220px)]">
        {/* Left sidebar nav */}
        <nav className="w-[200px] shrink-0 rounded-xl border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)] backdrop-blur-xl p-3 space-y-4 self-start sticky top-6">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <span className="font-display text-[10px] tracking-[0.08em] uppercase text-[hsl(var(--platform-foreground-muted)/0.5)] px-2">
                {group.label}
              </span>
              {group.items.map((item) => {
                const active = tab === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => setTab(item.value)}
                    className={cn(
                      'flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-sm font-sans transition-colors',
                      active
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-border)/0.3)]'
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {panels[tab]}
        </div>
      </div>
    </PlatformPageContainer>
  );
}
