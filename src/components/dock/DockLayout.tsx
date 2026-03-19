/**
 * DockLayout — Full-screen mobile layout with bottom tab bar.
 * Applies platform dark theme. No sidebar, no header.
 */

import { DockBottomNav } from './DockBottomNav';
import type { DockTab, DockStaffSession } from '@/pages/Dock';
import { DockScheduleTab } from './schedule/DockScheduleTab';
import { DockActiveTab } from './active/DockActiveTab';
import { DockClientsTab } from './clients/DockClientsTab';
import { DockScaleTab } from './scale/DockScaleTab';
import { DockSettingsTab } from './settings/DockSettingsTab';

interface DockLayoutProps {
  activeTab: DockTab;
  onTabChange: (tab: DockTab) => void;
  staff: DockStaffSession;
  onLogout: () => void;
}

export function DockLayout({ activeTab, onTabChange, staff, onLogout }: DockLayoutProps) {
  return (
    <div className="platform-theme platform-dark fixed inset-0 flex flex-col bg-[hsl(var(--platform-bg))] text-[hsl(var(--platform-foreground))]">
      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'schedule' && <DockScheduleTab staff={staff} />}
        {activeTab === 'active' && <DockActiveTab staff={staff} />}
        {activeTab === 'clients' && <DockClientsTab staff={staff} />}
        {activeTab === 'scale' && <DockScaleTab />}
        {activeTab === 'settings' && <DockSettingsTab staff={staff} onLogout={onLogout} />}
      </div>

      {/* Bottom navigation */}
      <DockBottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
