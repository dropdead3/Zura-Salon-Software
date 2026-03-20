/**
 * DockSettingsTab — Staff profile, station location, and logout.
 */

import { useState } from 'react';
import { LogOut, User, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import type { DockStaffSession } from '@/pages/Dock';
import { useLocations } from '@/hooks/useLocations';
import {
  AlertDialog,
  PlatformAlertDialogContent,
  PlatformAlertDialogTitle,
  PlatformAlertDialogDescription,
  PlatformAlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from '@/components/platform/ui/PlatformDialog';

interface DockSettingsTabProps {
  staff: DockStaffSession;
  onLogout: () => void;
}

export function DockSettingsTab({ staff, onLogout }: DockSettingsTabProps) {
  const { data: locations } = useLocations(staff.organizationId);
  const locationName = locations?.find(l => l.id === staff.locationId)?.name ?? 'Unknown location';

  const handleMoveStation = () => {
    try {
      localStorage.removeItem('dock-organization-id');
      localStorage.removeItem('dock-location-id');
    } catch {}
    toast.success('Station unbound — next login will bind to new location');
    onLogout();
  };

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

      {/* Station Location module */}
      <div className="mt-6 p-4 rounded-2xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[hsl(var(--platform-foreground))]">
              Station Location
            </p>
            <p className="text-xs text-[hsl(var(--platform-foreground-muted))] truncate">
              {locationName}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-[hsl(var(--platform-foreground-muted))] mb-3 leading-relaxed">
          Reassign this device to a different salon location. The station will log out and rebind on next PIN login.
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-[hsl(var(--platform-bg-hover))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-bg-elevated))] transition-colors text-sm">
              Move to Another Location
            </button>
          </AlertDialogTrigger>
          <PlatformAlertDialogContent>
            <AlertDialogHeader>
              <PlatformAlertDialogTitle>Move Zura Dock?</PlatformAlertDialogTitle>
              <PlatformAlertDialogDescription>
                This will unbind this device from <strong className="text-[hsl(var(--platform-foreground))]">{locationName}</strong>. On next PIN login, it will bind to the new staff member's location.
              </PlatformAlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <PlatformAlertDialogCancel>Cancel</PlatformAlertDialogCancel>
              <AlertDialogAction
                onClick={handleMoveStation}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                Move Station
              </AlertDialogAction>
            </AlertDialogFooter>
          </PlatformAlertDialogContent>
        </AlertDialog>
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
