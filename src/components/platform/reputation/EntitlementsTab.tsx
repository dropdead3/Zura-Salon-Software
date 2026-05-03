/**
 * EntitlementsTab — Cross-org Reputation entitlement table for platform staff.
 * Shows each org's `reputation_enabled` flag alongside its Stripe sub status,
 * grant source, and grace window. Toggling the switch flips the org-scoped
 * feature flag independently of Stripe (used for comping / suspending).
 */
import { useMemo, useState } from 'react';
import {
  PlatformCard, PlatformCardHeader, PlatformCardTitle, PlatformCardContent, PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformSwitch } from '@/components/platform/ui/PlatformSwitch';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import {
  PlatformTable, PlatformTableHeader, PlatformTableBody, PlatformTableRow,
  PlatformTableHead, PlatformTableCell,
} from '@/components/platform/ui/PlatformTable';
import { usePlatformReputationEntitlements } from '@/hooks/reputation/usePlatformReputationEntitlements';
import { useReputationOrgToggle } from '@/hooks/reputation/useReputationOrgToggle';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

function statusVariant(status: string | null): 'default' | 'success' | 'warning' | 'info' {
  switch (status) {
    case 'active': return 'success';
    case 'trialing': return 'info';
    case 'past_due': return 'warning';
    default: return 'default';
  }
}

export function EntitlementsTab() {
  const { data, isLoading } = usePlatformReputationEntitlements();
  const toggle = useReputationOrgToggle();
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((r) => r.organization_name.toLowerCase().includes(q));
  }, [data, search]);

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
        <PlatformCardTitle>Organization Entitlements</PlatformCardTitle>
        <PlatformCardDescription>
          Toggle `reputation_enabled` per organization. Independent of Stripe — use to comp, suspend, or override during sync gaps. Audited.
        </PlatformCardDescription>
      </PlatformCardHeader>
      <PlatformCardContent className="space-y-4">
        <PlatformInput
          placeholder="Search organizations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <PlatformTable>
          <PlatformTableHeader>
            <PlatformTableRow>
              <PlatformTableHead>Organization</PlatformTableHead>
              <PlatformTableHead>Subscription</PlatformTableHead>
              <PlatformTableHead>Source</PlatformTableHead>
              <PlatformTableHead>Grace Until</PlatformTableHead>
              <PlatformTableHead className="text-right">Reputation Enabled</PlatformTableHead>
            </PlatformTableRow>
          </PlatformTableHeader>
          <PlatformTableBody>
            {rows.map((r) => (
              <PlatformTableRow key={r.organization_id}>
                <PlatformTableCell className="font-medium">
                  {r.organization_name}
                </PlatformTableCell>
                <PlatformTableCell>
                  {r.subscription_status
                    ? <PlatformBadge variant={statusVariant(r.subscription_status)}>{r.subscription_status}</PlatformBadge>
                    : <span className="text-[hsl(var(--platform-foreground-subtle))]">—</span>}
                </PlatformTableCell>
                <PlatformTableCell className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  {r.grant_source ?? '—'}
                </PlatformTableCell>
                <PlatformTableCell className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  {r.grace_until ? format(new Date(r.grace_until), 'MMM d, yyyy') : '—'}
                </PlatformTableCell>
                <PlatformTableCell className="text-right">
                  <PlatformSwitch
                    checked={r.reputation_enabled}
                    disabled={toggle.isPending}
                    onCheckedChange={(checked) => {
                      const reason = window.prompt(
                        `Reason for ${checked ? 'enabling' : 'disabling'} Reputation for ${r.organization_name}?`,
                      );
                      if (reason === null) return;
                      toggle.mutate({
                        organizationId: r.organization_id,
                        organizationName: r.organization_name,
                        enabled: checked,
                        reason: reason || (checked ? 'comped via platform admin' : 'suspended via platform admin'),
                      });
                    }}
                  />
                </PlatformTableCell>
              </PlatformTableRow>
            ))}
            {rows.length === 0 && (
              <PlatformTableRow>
                <PlatformTableCell colSpan={5} className="text-center text-[hsl(var(--platform-foreground-subtle))] py-8">
                  No organizations match your search.
                </PlatformTableCell>
              </PlatformTableRow>
            )}
          </PlatformTableBody>
        </PlatformTable>
      </PlatformCardContent>
    </PlatformCard>
  );
}
