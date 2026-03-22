/**
 * DockLayout — Full-screen mobile layout with bottom tab bar.
 * Applies platform dark theme. Supports device preview in demo mode.
 */

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { DockBottomNav } from './DockBottomNav';
import { DockDeviceSwitcher } from './DockDeviceSwitcher';
import { DockDemoBadge } from './DockDemoBadge';
import { useDockDemo } from '@/contexts/DockDemoContext';
import type { DockTab, DockStaffSession, DockView } from '@/pages/Dock';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { DockScheduleTab } from './schedule/DockScheduleTab';
import { DockActiveTab } from './active/DockActiveTab';
import { DockClientsTab } from './clients/DockClientsTab';
import { DockScaleTab } from './scale/DockScaleTab';
import { DockSettingsTab } from './settings/DockSettingsTab';
import { DockAppointmentDetail } from './appointment/DockAppointmentDetail';
import { DockClientQuickView } from './appointment/DockClientQuickView';
import { useDockCompleteAppointment } from '@/hooks/dock/useDockCompleteAppointment';
import { useDockLockGesture } from '@/hooks/dock/useDockLockGesture';

interface DockLayoutProps {
  activeTab: DockTab;
  onTabChange: (tab: DockTab) => void;
  staff: DockStaffSession;
  onLogout: () => void;
  view: DockView;
  onOpenAppointment: (appointment: DockAppointment) => void;
  onBack: () => void;
  onLocationChange?: (locationId: string) => void;
  staffFilter?: string;
  onStaffFilterChange?: (staffId: string) => void;
}

const DEVICE_DIMENSIONS = {
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
} as const;

export function DockLayout({ activeTab, onTabChange, staff, onLogout, view, onOpenAppointment, onBack, onLocationChange, staffFilter, onStaffFilterChange }: DockLayoutProps) {
  const { isDemoMode, device, setDevice, orientation, setOrientation } = useDockDemo();
  const showingDetail = view.screen === 'appointment-detail';
  const isConstrained = device !== 'full';

  const completeAppointment = useDockCompleteAppointment();
  const [clientViewAppt, setClientViewAppt] = useState<DockAppointment | null>(null);

  const { containerRef, progress: lockProgress } = useDockLockGesture({
    onLock: onLogout,
    enabled: !showingDetail,
  });

  const handleComplete = (appointment: DockAppointment) => {
    completeAppointment.mutate({
      appointmentId: appointment.id,
      organizationId: staff.organizationId,
      source: appointment.source,
    });
  };

  const dockContent = (
    <div
      ref={containerRef}
      className="relative h-full flex flex-col bg-[hsl(var(--platform-bg))] text-[hsl(var(--platform-foreground))]"
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
            {activeTab === 'schedule' && (
              <DockScheduleTab
                staff={staff}
                onOpenAppointment={onOpenAppointment}
                onCompleteAppointment={handleComplete}
                onViewClient={(appt) => setClientViewAppt(appt)}
                locationId={staff.locationId}
                staffFilter={staffFilter}
              />
            )}
            {activeTab === 'active' && <DockActiveTab staff={staff} />}
            {activeTab === 'clients' && <DockClientsTab staff={staff} />}
            {activeTab === 'scale' && <DockScaleTab />}
            {activeTab === 'settings' && <DockSettingsTab staff={staff} onLogout={onLogout} />}
          </>
        )}
      </div>

      {/* Bottom navigation — hidden during detail view */}
      {!showingDetail && (
        <>
          <div className="absolute bottom-0 inset-x-0 z-30">
            <DockBottomNav activeTab={activeTab} onTabChange={onTabChange} onLockStation={onLogout} />
          </div>
          <div className="absolute bottom-0 inset-x-0 z-20 h-32 bg-gradient-to-t from-[hsl(var(--platform-bg))] to-transparent pointer-events-none" />
        </>
      )}

      {/* Client quick view sheet */}
      <DockClientQuickView
        open={!!clientViewAppt}
        onClose={() => setClientViewAppt(null)}
        phorestClientId={clientViewAppt?.phorest_client_id}
        clientId={clientViewAppt?.client_id}
        clientName={clientViewAppt?.client_name}
      />

      {/* Lock gesture affordance — bottom-right corner */}
      {!showingDetail && (
        <div
          className="absolute bottom-24 right-4 pointer-events-none transition-all duration-150"
          style={{
            opacity: lockProgress > 0 ? 0.15 + lockProgress * 0.6 : 0.12,
            transform: `scale(${0.8 + lockProgress * 0.4})`,
          }}
        >
          <Lock className="w-4 h-4 text-[hsl(var(--platform-foreground))]" />
        </div>
      )}
    </div>
  );

  if (isConstrained) {
    const baseDims = DEVICE_DIMENSIONS[device as 'phone' | 'tablet'];
    const dims = device === 'tablet' && orientation === 'landscape'
      ? { width: baseDims.height, height: baseDims.width }
      : baseDims;
    return (
      <div className="platform-theme platform-dark fixed inset-0 flex items-center justify-center bg-[hsl(0_0%_8%)] bg-[image:radial-gradient(hsl(0_0%_15%)_1px,transparent_1px)] bg-[size:20px_20px]">
        <DockDemoBadge />
        <DockDeviceSwitcher device={device} onChange={setDevice} orientation={orientation} onOrientationChange={setOrientation} locationId={staff.locationId} onLocationChange={onLocationChange} organizationId={staff.organizationId} staffFilter={staffFilter} onStaffFilterChange={onStaffFilterChange} />
        <div
          className="relative rounded-[2rem] border border-[hsl(0_0%_20%)] shadow-2xl overflow-hidden transition-all duration-300"
          style={{ width: dims.width, height: dims.height, maxHeight: '95vh', maxWidth: '95vw' }}
        >
          {dockContent}
        </div>
      </div>
    );
  }

  return (
    <div className="platform-theme platform-dark fixed inset-0 flex flex-col">
      <DockDemoBadge />
      <DockDeviceSwitcher device={device} onChange={setDevice} orientation={orientation} onOrientationChange={setOrientation} locationId={staff.locationId} onLocationChange={onLocationChange} organizationId={staff.organizationId} staffFilter={staffFilter} onStaffFilterChange={onStaffFilterChange} />
      {dockContent}
    </div>
  );
}