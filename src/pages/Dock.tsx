/**
 * Zura Dock — Standalone mixing station app.
 * Mobile-first, iPad-optimized. No dashboard layout.
 *
 * Supports `?demo=<organizationId>` to launch a read-only demo
 * scoped to a real organization's services and clients.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DockLayout } from '@/components/dock/DockLayout';
import { DockPinGate } from '@/components/dock/DockPinGate';
import { DockDemoProvider } from '@/contexts/DockDemoContext';
import { DockUnlockTransition } from '@/components/dock/DockUnlockTransition';
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
  const [unlocked, setUnlocked] = useState(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const effectiveStaff = staff
    ? (demoOrgId && canAccessDemo && demoLocationId)
      ? { ...staff, locationId: demoLocationId }
      : staff
    : null;

  const handlePinSuccess = useCallback((session: DockStaffSession) => {
    // In demo mode, override with demo identifiers so DockDemoProvider recognizes it
    if (demoOrgId && canAccessDemo) {
      const isGenericPreview = demoOrgId === 'preview';
      setStaff({
        ...session,
        userId: 'dev-bypass-000',
        organizationId: isGenericPreview ? 'demo-org-000' : demoOrgId,
        displayName: isGenericPreview ? 'Preview Mode' : session.displayName,
      });
    } else {
      setStaff(session);
    }
    setActiveTab('schedule');
    setView({ screen: 'tabs' });

    // Delay unlock to allow transition animation
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => setUnlocked(true), 100);
  }, [demoOrgId, canAccessDemo]);

  const handleLogout = useCallback(() => {
    setStaff(null);
    setUnlocked(false);
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

  const dockLayout = effectiveStaff ? (
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
  ) : null;

  const pinGate = <DockPinGate onSuccess={handlePinSuccess} />;

  // Non-demo, no staff — plain PIN gate (no transition wrapper needed yet)
  if (!effectiveStaff && !canAccessDemo) {
    return pinGate;
  }

  // Demo context — wrap in device frame
  if (canAccessDemo) {
    const isConstrained = device !== 'full';
    const innerContent = (
      <DockUnlockTransition
        unlocked={unlocked && !!effectiveStaff}
        gate={<div className="relative w-full h-full">{pinGate}</div>}
      >
        {dockLayout ?? <div />}
      </DockUnlockTransition>
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
            {innerContent}
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
        {innerContent}
      </div>
    );
  }

  // Non-demo, authenticated — use transition
  return (
    <DockUnlockTransition
      unlocked={unlocked && !!effectiveStaff}
      gate={pinGate}
    >
      {dockLayout ?? <div />}
    </DockUnlockTransition>
  );
}