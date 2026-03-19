/**
 * Zura Dock — Standalone mixing station app.
 * Mobile-first, iPad-optimized. No dashboard layout.
 */

import { useState, useCallback } from 'react';
import { DockLayout } from '@/components/dock/DockLayout';
import { DockPinGate } from '@/components/dock/DockPinGate';

export type DockTab = 'schedule' | 'active' | 'clients' | 'scale' | 'settings';

export interface DockStaffSession {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}

export default function Dock() {
  const [staff, setStaff] = useState<DockStaffSession | null>(null);
  const [activeTab, setActiveTab] = useState<DockTab>('schedule');

  const handlePinSuccess = useCallback((session: DockStaffSession) => {
    setStaff(session);
    setActiveTab('schedule');
  }, []);

  const handleLogout = useCallback(() => {
    setStaff(null);
    setActiveTab('schedule');
  }, []);

  if (!staff) {
    return <DockPinGate onSuccess={handlePinSuccess} />;
  }

  return (
    <DockLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      staff={staff}
      onLogout={handleLogout}
    />
  );
}
