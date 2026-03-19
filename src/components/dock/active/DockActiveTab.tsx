/**
 * DockActiveTab — Active mixing sessions.
 * Placeholder for Phase 3+ implementation.
 */

import { FlaskConical } from 'lucide-react';
import type { DockStaffSession } from '@/pages/Dock';

interface DockActiveTabProps {
  staff: DockStaffSession;
}

export function DockActiveTab({ staff: _staff }: DockActiveTabProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <FlaskConical className="w-12 h-12 text-violet-400/60 mb-4" />
      <h2 className="font-display text-lg tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
        Active Sessions
      </h2>
      <p className="mt-2 text-sm text-[hsl(var(--platform-foreground-muted))]">
        No active mixing sessions
      </p>
    </div>
  );
}
