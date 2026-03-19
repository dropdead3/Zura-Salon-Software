/**
 * DockClientsTab — Client search with formula history.
 * Placeholder for Phase 7 implementation.
 */

import { Users } from 'lucide-react';
import type { DockStaffSession } from '@/pages/Dock';

interface DockClientsTabProps {
  staff: DockStaffSession;
}

export function DockClientsTab({ staff: _staff }: DockClientsTabProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <Users className="w-12 h-12 text-violet-400/60 mb-4" />
      <h2 className="font-display text-lg tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
        Clients
      </h2>
      <p className="mt-2 text-sm text-[hsl(var(--platform-foreground-muted))]">
        Client formula history coming soon
      </p>
    </div>
  );
}
