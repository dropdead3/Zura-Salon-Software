/**
 * DockScheduleTab — Today's appointments for the logged-in staff member.
 * Placeholder for Phase 2 implementation.
 */

import { Calendar } from 'lucide-react';
import type { DockStaffSession } from '@/pages/Dock';

interface DockScheduleTabProps {
  staff: DockStaffSession;
}

export function DockScheduleTab({ staff }: DockScheduleTabProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <Calendar className="w-12 h-12 text-violet-400/60 mb-4" />
      <h2 className="font-display text-lg tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
        Welcome, {staff.displayName}
      </h2>
      <p className="mt-2 text-sm text-[hsl(var(--platform-foreground-muted))]">
        Today's schedule will appear here
      </p>
    </div>
  );
}
