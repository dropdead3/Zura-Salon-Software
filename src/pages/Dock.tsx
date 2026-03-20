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
import { useDockDemoAccess } from '@/hooks/dock/useDockDemoAccess';
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

export default function Dock() {
  const [searchParams] = useSearchParams();
  const demoOrgId = searchParams.get('demo');
  const canAccessDemo = useDockDemoAccess();

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
    setStaff(prev => prev ? { ...prev, locationId } : prev);
  }, []);

  if (!effectiveStaff) {
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
      />
    </DockDemoProvider>
  );
}
