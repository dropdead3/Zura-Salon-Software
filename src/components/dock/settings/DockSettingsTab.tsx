/**
 * DockSettingsTab — Staff profile and logout.
 * Placeholder for Phase 7 implementation.
 */

import { LogOut, User } from 'lucide-react';
import type { DockStaffSession } from '@/pages/Dock';

interface DockSettingsTabProps {
  staff: DockStaffSession;
  onLogout: () => void;
}

export function DockSettingsTab({ staff, onLogout }: DockSettingsTabProps) {
  return (
    <div className="flex flex-col h-full px-6 py-8">
      {/* Staff profile card */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)]">
        <div className="w-12 h-12 rounded-full bg-violet-600/20 flex items-center justify-center">
          {staff.avatarUrl ? (
            <img src={staff.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-violet-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[hsl(var(--platform-foreground))] truncate">
            {staff.displayName}
          </p>
          <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">
            Mixing Station
          </p>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Logout button */}
      <button
        onClick={onLogout}
        className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span className="text-sm font-medium">Lock Station</span>
      </button>
    </div>
  );
}
