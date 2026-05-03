/**
 * ReputationAdmin — Platform-side console for the Zura Reputation engine.
 * Mirrors the ColorBarAdmin layout (left nav + content area).
 *
 * Tabs:
 *   - Cohorts        → subscription lifecycle distribution
 *   - Entitlements   → per-org reputation_enabled toggle (comp/suspend)
 *   - Kill Switches  → master dispatch / manual / webhook overrides
 *   - Audit Log      → every platform-side intervention
 */
import { useState } from 'react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { CohortsTab } from '@/components/platform/reputation/CohortsTab';
import { EntitlementsTab } from '@/components/platform/reputation/EntitlementsTab';
import { KillSwitchesTab } from '@/components/platform/reputation/KillSwitchesTab';
import { AuditLogTab } from '@/components/platform/reputation/AuditLogTab';
import { cn } from '@/lib/utils';
import { BarChart3, Building2, AlertOctagon, History, type LucideIcon } from 'lucide-react';

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
      { value: 'cohorts', label: 'Cohorts', icon: BarChart3 },
    ],
  },
  {
    label: 'Operations',
    items: [
      { value: 'entitlements', label: 'Entitlements', icon: Building2 },
      { value: 'audit', label: 'Audit Log', icon: History },
    ],
  },
  {
    label: 'Risk',
    items: [
      { value: 'kill-switches', label: 'Kill Switches', icon: AlertOctagon },
    ],
  },
];

const panels: Record<string, React.ReactNode> = {
  cohorts: <CohortsTab />,
  entitlements: <EntitlementsTab />,
  'kill-switches': <KillSwitchesTab />,
  audit: <AuditLogTab />,
};

export default function ReputationAdmin() {
  const [tab, setTab] = useState('cohorts');

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Zura Reputation"
        description="Subscription cohorts, per-org entitlements, master kill switches, and platform-side intervention audit."
      />

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
