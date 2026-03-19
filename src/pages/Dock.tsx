/**
 * Zura Dock — Standalone mixing station app.
 * Mobile-first, iPad-optimized. No dashboard layout.
 */

import { useState, useCallback } from 'react';
import { DockLayout } from '@/components/dock/DockLayout';
import { DockPinGate } from '@/components/dock/DockPinGate';
import { DockDemoProvider } from '@/contexts/DockDemoContext';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';

export type DockTab = 'schedule' | 'active' | 'clients' | 'scale' | 'settings';

export type DockView =
  | { screen: 'tabs' }
  | { screen: 'appointment-detail'; appointment: DockAppointment };

export interface DockStaffSession {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}

export default function Dock() {
  const [staff, setStaff] = useState<DockStaffSession | null>(null);
  const [activeTab, setActiveTab] = useState<DockTab>('schedule');
  const [view, setView] = useState<DockView>({ screen: 'tabs' });

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

  if (!staff) {
    return <DockPinGate onSuccess={handlePinSuccess} />;
  }

  return (
    <DockDemoProvider staff={staff}>
      <DockLayout
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setView({ screen: 'tabs' });
        }}
        staff={staff}
        onLogout={handleLogout}
        view={view}
        onOpenAppointment={handleOpenAppointment}
        onBack={handleBack}
      />
    </DockDemoProvider>
  );
}
