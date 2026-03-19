/**
 * DockLayout — Full-screen mobile layout with bottom tab bar.
 * Applies platform dark theme. Supports device preview in demo mode.
 */

import { DockBottomNav } from './DockBottomNav';
import { DockDeviceSwitcher } from './DockDeviceSwitcher';
import { useDockDemo } from '@/contexts/DockDemoContext';
import type { DockTab, DockStaffSession, DockView } from '@/pages/Dock';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { DockScheduleTab } from './schedule/DockScheduleTab';
import { DockActiveTab } from './active/DockActiveTab';
import { DockClientsTab } from './clients/DockClientsTab';
import { DockScaleTab } from './scale/DockScaleTab';
import { DockSettingsTab } from './settings/DockSettingsTab';
import { DockAppointmentDetail } from './appointment/DockAppointmentDetail';

interface DockLayoutProps {
  activeTab: DockTab;
  onTabChange: (tab: DockTab) => void;
  staff: DockStaffSession;
  onLogout: () => void;
  view: DockView;
  onOpenAppointment: (appointment: DockAppointment) => void;
  onBack: () => void;
}

const DEVICE_DIMENSIONS = {
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
} as const;

export function DockLayout({ activeTab, onTabChange, staff, onLogout, view, onOpenAppointment, onBack }: DockLayoutProps) {
  const { isDemoMode, device, setDevice } = useDockDemo();
  const showingDetail = view.screen === 'appointment-detail';
  const isConstrained = isDemoMode && device !== 'full';

  const dockContent = (
    <div
      className="flex flex-col bg-[hsl(var(--platform-bg))] text-[hsl(var(--platform-foreground))]"
      data-dock-device={device}
      style={isConstrained ? { width: '100%', height: '100%' } : undefined}
    >
      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {showingDetail ? (
          <DockAppointmentDetail
            appointment={view.appointment}
            staff={staff}
            onBack={onBack}
          />
        ) : (
          <>
            {activeTab === 'schedule' && <DockScheduleTab staff={staff} onOpenAppointment={onOpenAppointment} />}
            {activeTab === 'active' && <DockActiveTab staff={staff} />}
            {activeTab === 'clients' && <DockClientsTab staff={staff} />}
            {activeTab === 'scale' && <DockScaleTab />}
            {activeTab === 'settings' && <DockSettingsTab staff={staff} onLogout={onLogout} />}
          </>
        )}
      </div>

      {/* Bottom navigation — hidden during detail view */}
      {!showingDetail && (
        <DockBottomNav activeTab={activeTab} onTabChange={onTabChange} />
      )}
    </div>
  );

  if (isConstrained) {
    const dims = DEVICE_DIMENSIONS[device as 'phone' | 'tablet'];
    return (
      <div className="platform-theme platform-dark fixed inset-0 flex items-center justify-center bg-[hsl(0_0%_8%)] bg-[image:radial-gradient(hsl(0_0%_15%)_1px,transparent_1px)] bg-[size:20px_20px]">
        {isDemoMode && <DockDeviceSwitcher device={device} onChange={setDevice} />}
        <div
          className="relative rounded-[2rem] border border-[hsl(0_0%_20%)] shadow-2xl overflow-hidden"
          style={{ width: dims.width, height: dims.height, maxHeight: '95vh' }}
        >
          {dockContent}
        </div>
      </div>
    );
  }

  return (
    <div className="platform-theme platform-dark fixed inset-0 flex flex-col">
      {isDemoMode && <DockDeviceSwitcher device={device} onChange={setDevice} />}
      {dockContent}
    </div>
  );
}
