/**
 * ReputationAdmin — Platform-side console for the Zura Reputation engine.
 *
 * Layout mirrors ColorBarAdmin: left rail navigation + content area.
 * Default tab is Sales Brief — the most common entry path for AEs / CSMs.
 *
 * Memory: mem://architecture/platform-console-pattern
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { SalesBriefTab } from '@/components/platform/reputation/SalesBriefTab';
import { PricingSheetTab } from '@/components/platform/reputation/PricingSheetTab';
import { CohortsTab } from '@/components/platform/reputation/CohortsTab';
import { EntitlementsTab } from '@/components/platform/reputation/EntitlementsTab';
import { BillingHealthTab } from '@/components/platform/reputation/BillingHealthTab';
import { DispatchMonitorTab } from '@/components/platform/reputation/DispatchMonitorTab';
import { KillSwitchesTab } from '@/components/platform/reputation/KillSwitchesTab';
import { AuditLogTab } from '@/components/platform/reputation/AuditLogTab';
import { WebhookHealthTab } from '@/components/platform/reputation/WebhookHealthTab';
import { cn } from '@/lib/utils';
import {
  Megaphone,
  DollarSign,
  BarChart3,
  Building2,
  CreditCard,
  Send,
  History,
  AlertOctagon,
  Webhook,
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
    label: 'Sales',
    items: [
      { value: 'sales-brief', label: 'Sales Brief', icon: Megaphone },
      { value: 'pricing', label: 'Pricing Sheet', icon: DollarSign },
    ],
  },
  {
    label: 'Intelligence',
    items: [{ value: 'cohorts', label: 'Cohorts', icon: BarChart3 }],
  },
  {
    label: 'Operations',
    items: [
      { value: 'entitlements', label: 'Entitlements', icon: Building2 },
      { value: 'billing-health', label: 'Billing Health', icon: CreditCard },
      { value: 'webhook-health', label: 'Webhook Health', icon: Webhook },
      { value: 'dispatch', label: 'Dispatch Monitor', icon: Send },
      { value: 'audit', label: 'Audit Log', icon: History },
    ],
  },
  {
    label: 'Risk',
    items: [{ value: 'kill-switches', label: 'Kill Switches', icon: AlertOctagon }],
  },
];

const panels: Record<string, React.ReactNode> = {
  'sales-brief': <SalesBriefTab />,
  pricing: <PricingSheetTab />,
  cohorts: <CohortsTab />,
  entitlements: <EntitlementsTab />,
  'billing-health': <BillingHealthTab />,
  'webhook-health': <WebhookHealthTab />,
  dispatch: <DispatchMonitorTab />,
  'kill-switches': <KillSwitchesTab />,
  audit: <AuditLogTab />,
};

export default function ReputationAdmin() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab');
    return t && t in panels ? t : 'sales-brief';
  });
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && t in panels) setTab(t);
  }, [searchParams]);

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Zura Reputation"
        description="Sales reference, subscription cohorts, per-org entitlements, billing health, dispatch monitoring, master kill switches, and audit trail."
      />
      <PageExplainer pageId="platform-reputation" />

      <div className="flex gap-6 min-h-[calc(100vh-220px)]">
        <nav className="w-[200px] shrink-0 p-3 space-y-4 self-start sticky top-6">
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
                        : 'text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-border)/0.3)]',
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

        <div className="flex-1 min-w-0">{panels[tab]}</div>
      </div>
    </PlatformPageContainer>
  );
}
