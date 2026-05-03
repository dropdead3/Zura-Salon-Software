/**
 * AuditLogTab — Read-only audit feed of every platform-side Reputation
 * intervention. Sourced from `reputation_admin_actions`. Used to satisfy
 * compliance / "who flipped what" queries.
 */
import {
  PlatformCard, PlatformCardHeader, PlatformCardTitle, PlatformCardContent, PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import {
  PlatformTable, PlatformTableHeader, PlatformTableBody, PlatformTableRow,
  PlatformTableHead, PlatformTableCell,
} from '@/components/platform/ui/PlatformTable';
import { usePlatformReputationAdminActions } from '@/hooks/reputation/usePlatformReputationEntitlements';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function AuditLogTab() {
  const { data, isLoading } = usePlatformReputationAdminActions(100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <PlatformCard>
      <PlatformCardHeader>
        <PlatformCardTitle>Admin Action Audit</PlatformCardTitle>
        <PlatformCardDescription>
          Every kill-switch flip and per-org Reputation toggle. Most recent first. Read-only.
        </PlatformCardDescription>
      </PlatformCardHeader>
      <PlatformCardContent>
        <PlatformTable>
          <PlatformTableHeader>
            <PlatformTableRow>
              <PlatformTableHead>When</PlatformTableHead>
              <PlatformTableHead>Action</PlatformTableHead>
              <PlatformTableHead>Target Org</PlatformTableHead>
              <PlatformTableHead>Reason</PlatformTableHead>
            </PlatformTableRow>
          </PlatformTableHeader>
          <PlatformTableBody>
            {(data ?? []).map((row) => (
              <PlatformTableRow key={row.id}>
                <PlatformTableCell className="text-sm text-[hsl(var(--platform-foreground-muted))] whitespace-nowrap">
                  {format(new Date(row.created_at), 'MMM d, h:mm a')}
                </PlatformTableCell>
                <PlatformTableCell className="font-mono text-xs">
                  {row.action_type}
                </PlatformTableCell>
                <PlatformTableCell className="text-sm">
                  {(row.metadata as any)?.organization_name ?? row.target_organization_id?.slice(0, 8) ?? '—'}
                </PlatformTableCell>
                <PlatformTableCell className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  {row.reason ?? '—'}
                </PlatformTableCell>
              </PlatformTableRow>
            ))}
            {(!data || data.length === 0) && (
              <PlatformTableRow>
                <PlatformTableCell colSpan={4} className="text-center py-8 text-[hsl(var(--platform-foreground-subtle))]">
                  No platform-side Reputation actions recorded yet.
                </PlatformTableCell>
              </PlatformTableRow>
            )}
          </PlatformTableBody>
        </PlatformTable>
      </PlatformCardContent>
    </PlatformCard>
  );
}
