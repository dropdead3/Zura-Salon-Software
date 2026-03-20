/**
 * Zura Dock — Standalone mixing station app.
 * Mobile-first, iPad-optimized. No dashboard layout.
 *
 * Supports `?demo=<organizationId>` to launch a read-only demo
 * scoped to a real organization's services and clients.
 */

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DockLayout } from '@/components/dock/DockLayout';
import { DockPinGate } from '@/components/dock/DockPinGate';
import { DockDemoProvider } from '@/contexts/DockDemoContext';
import { DockDeviceSwitcher } from '@/components/dock/DockDeviceSwitcher';
import { useDockDemoAccess } from '@/hooks/dock/useDockDemoAccess';
import { useDockDevicePreview } from '@/hooks/dock/useDockDevicePreview';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';

export type DockTab = 'schedule' | 'active' | 'clients' | 'scale' | 'settings';

export type DockView =
  | { screen: 'tabs' }
  | { screen: 'appointment-detail'; appointment: DockAppointment };

export interface DockStaffSession {
  userId: string;
  organizationId: string;
  displayName: string;
  avatarUrl?: string | null;
  locationId: string;
}

const DEVICE_DIMENSIONS = {
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
} as const;

export default function Dock() {
  const [searchParams] = useSearchParams();
  const demoOrgId = searchParams.get('demo');
  const canAccessDemo = useDockDemoAccess();
  const { device, setDevice, orientation, setOrientation } = useDockDevicePreview();

  // If ?demo=<orgId> is present and we're in a dev/preview context, auto-boot
  const urlDemoSession = useMemo<DockStaffSession | null>(() => {
    if (!demoOrgId || !canAccessDemo) return null;
    const isGenericPreview = demoOrgId === 'preview';
    return {
      userId: 'dev-bypass-000',
      organizationId: isGenericPreview ? 'demo-org-000' : demoOrgId,
      displayName: isGenericPreview ? 'Preview Mode' : 'Demo Mode',
      avatarUrl: null,
      locationId: '',
    };
  }, [demoOrgId, canAccessDemo]);

  const [staff, setStaff] = useState<DockStaffSession | null>(null);
  const [activeTab, setActiveTab] = useState<DockTab>('schedule');
  const [view, setView] = useState<DockView>({ screen: 'tabs' });
  const [demoLocationId, setDemoLocationId] = useState('');
  const [staffFilter, setStaffFilter] = useState('all');

  const effectiveStaff = urlDemoSession
    ? { ...urlDemoSession, locationId: demoLocationId || urlDemoSession.locationId }
    : staff;

  const handlePinSuccess = useCallback((session: DockStaffSession) => {
    setStaff(session);
    setActiveTab('schedule');
    setView({ screen: 'tabs' });
  }, []);

  const handleLogout = useCallback(() => {
    setStaff(null);
    setActiveTab('schedule');
    setView({ screen: 'tabs' });
  }, []);

  const handleOpenAppointment = useCallback((appointment: DockAppointment) => {
    setView({ screen: 'appointment-detail', appointment });
  }, []);

  const handleBack = useCallback(() => {
    setView({ screen: 'tabs' });
  }, []);

  const handleLocationChange = useCallback((locationId: string) => {
    if (urlDemoSession) {
      setDemoLocationId(locationId);
    } else {
      setStaff(prev => prev ? { ...prev, locationId } : prev);
    }
  }, [urlDemoSession]);

  // PIN gate — wrap in device frame when in demo/preview context
  if (!effectiveStaff) {
    if (canAccessDemo) {
      const isConstrained = device !== 'full';
      const pinContent = (
        <div
          className="relative w-full h-full"
          style={{ position: 'relative' }}
        >
          <DockPinGate onSuccess={handlePinSuccess} />
        </div>
      );

      if (isConstrained) {
        const baseDims = DEVICE_DIMENSIONS[device as 'phone' | 'tablet'];
        const dims = device === 'tablet' && orientation === 'landscape'
          ? { width: baseDims.height, height: baseDims.width }
          : baseDims;
        return (
          <div className="platform-theme platform-dark fixed inset-0 flex items-center justify-center bg-[hsl(0_0%_8%)] bg-[image:radial-gradient(hsl(0_0%_15%)_1px,transparent_1px)] bg-[size:20px_20px]">
            <div className="fixed top-3 right-3 z-50">
              <DockDeviceSwitcher
                device={device}
                onChange={setDevice}
                orientation={orientation}
                onOrientationChange={setOrientation}
              />
            </div>
            <div
              className="relative rounded-[2rem] border border-[hsl(0_0%_20%)] shadow-2xl overflow-hidden transition-all duration-300"
              style={{ width: dims.width, height: dims.height, maxHeight: '95vh', maxWidth: '95vw' }}
            >
              {pinContent}
            </div>
          </div>
        );
      }

      return (
        <div className="platform-theme platform-dark fixed inset-0 flex flex-col">
          <div className="fixed top-3 right-3 z-50">
            <DockDeviceSwitcher
              device={device}
              onChange={setDevice}
              orientation={orientation}
              onOrientationChange={setOrientation}
            />
          </div>
          <DockPinGate onSuccess={handlePinSuccess} />
        </div>
      );
    }

    return <DockPinGate onSuccess={handlePinSuccess} />;
  }

  return (
    <DockDemoProvider staff={effectiveStaff}>
      <DockLayout
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setView({ screen: 'tabs' });
        }}
        staff={effectiveStaff}
        onLogout={handleLogout}
        view={view}
        onOpenAppointment={handleOpenAppointment}
        onBack={handleBack}
        onLocationChange={handleLocationChange}
        staffFilter={staffFilter}
        onStaffFilterChange={setStaffFilter}
      />
    </DockDemoProvider>
  );
}