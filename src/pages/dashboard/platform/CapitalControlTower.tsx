import { useState } from 'react';
import { Landmark, Building2, TrendingUp, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import {
  PlatformTable,
  PlatformTableHeader,
  PlatformTableBody,
  PlatformTableRow,
  PlatformTableHead,
  PlatformTableCell,
} from '@/components/platform/ui/PlatformTable';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { Switch } from '@/components/ui/switch';
import { useUpdateOrgFeatureFlag } from '@/hooks/useOrganizationFeatureFlags';
import { toast } from 'sonner';

interface OrgWithCapital {
  id: string;
  name: string;
  slug: string;
  capital_enabled: boolean;
}

function useOrganizationsWithCapital() {
  return useQuery({
    queryKey: ['platform-capital-orgs'],
    queryFn: async (): Promise<OrgWithCapital[]> => {
      // Get all orgs
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name');

      if (orgsError) throw orgsError;

      // Get capital_enabled overrides
      const { data: flags, error: flagsError } = await supabase
        .from('organization_feature_flags')
        .select('organization_id, is_enabled')
        .eq('flag_key', 'capital_enabled');

      if (flagsError) throw flagsError;

      const flagMap = new Map(
        (flags || []).map((f) => [f.organization_id, f.is_enabled])
      );

      return (orgs || []).map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug || '',
        capital_enabled: flagMap.get(org.id) ?? false,
      }));
    },
  });
}

export default function CapitalControlTower() {
  const { data: orgs, isLoading } = useOrganizationsWithCapital();
  const updateFlag = useUpdateOrgFeatureFlag();
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const handleToggle = (orgId: string, orgName: string, currentValue: boolean) => {
    updateFlag.mutate(
      {
        organizationId: orgId,
        flagKey: 'capital_enabled',
        isEnabled: !currentValue,
        reason: `Toggled by platform admin via Capital Control Tower`,
      },
      {
        onSuccess: () => {
          toast.success(
            `Zura Capital ${!currentValue ? 'enabled' : 'disabled'} for ${orgName}`
          );
        },
        onError: () => {
          toast.error(`Failed to update Capital access for ${orgName}`);
        },
      }
    );
  };

  const enabledCount = orgs?.filter((o) => o.capital_enabled).length ?? 0;
  const totalCount = orgs?.length ?? 0;

  const filtered = orgs?.filter((o) => {
    if (filter === 'enabled') return o.capital_enabled;
    if (filter === 'disabled') return !o.capital_enabled;
    return true;
  });

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Zura Capital Control Tower"
        description="Manage Capital access and monitor rollout across the platform"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PlatformCard variant="glass">
          <PlatformCardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Landmark className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  Capital Enabled
                </p>
                <p className="text-2xl font-medium text-[hsl(var(--platform-foreground))]">
                  {isLoading ? '—' : enabledCount}
                </p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>

        <PlatformCard variant="glass">
          <PlatformCardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-500/10">
                <Building2 className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  Total Organizations
                </p>
                <p className="text-2xl font-medium text-[hsl(var(--platform-foreground))]">
                  {isLoading ? '—' : totalCount}
                </p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>

        <PlatformCard variant="glass">
          <PlatformCardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <TrendingUp className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                  Rollout Coverage
                </p>
                <p className="text-2xl font-medium text-[hsl(var(--platform-foreground))]">
                  {isLoading
                    ? '—'
                    : totalCount > 0
                      ? `${Math.round((enabledCount / totalCount) * 100)}%`
                      : '0%'}
                </p>
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>
      </div>

      {/* Organization Access Table */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <PlatformCardTitle className="text-lg">
                Organization Access
              </PlatformCardTitle>
              <PlatformCardDescription>
                Toggle Capital on or off for each organization. Default is off
                for all new accounts.
              </PlatformCardDescription>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-[hsl(var(--platform-bg-hover))] p-1">
              {(['all', 'enabled', 'disabled'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-[hsl(var(--platform-bg-card))] text-[hsl(var(--platform-foreground))]'
                      : 'text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'enabled' ? 'Enabled' : 'Disabled'}
                </button>
              ))}
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--platform-foreground-muted))]" />
            </div>
          ) : (
            <PlatformTable>
              <PlatformTableHeader>
                <PlatformTableRow>
                  <PlatformTableHead>Organization</PlatformTableHead>
                  <PlatformTableHead>Slug</PlatformTableHead>
                  <PlatformTableHead>Status</PlatformTableHead>
                  <PlatformTableHead className="text-right">
                    Access
                  </PlatformTableHead>
                </PlatformTableRow>
              </PlatformTableHeader>
              <PlatformTableBody>
                {filtered?.map((org) => (
                  <PlatformTableRow key={org.id}>
                    <PlatformTableCell className="font-medium">
                      {org.name}
                    </PlatformTableCell>
                    <PlatformTableCell>
                      <span className="text-[hsl(var(--platform-foreground-muted))]">
                        {org.slug || '—'}
                      </span>
                    </PlatformTableCell>
                    <PlatformTableCell>
                      <PlatformBadge
                        variant={org.capital_enabled ? 'success' : 'default'}
                      >
                        {org.capital_enabled ? 'Active' : 'Inactive'}
                      </PlatformBadge>
                    </PlatformTableCell>
                    <PlatformTableCell className="text-right">
                      <Switch
                        checked={org.capital_enabled}
                        onCheckedChange={() =>
                          handleToggle(org.id, org.name, org.capital_enabled)
                        }
                        disabled={updateFlag.isPending}
                        className="data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-slate-600"
                      />
                    </PlatformTableCell>
                  </PlatformTableRow>
                ))}
                {filtered?.length === 0 && (
                  <PlatformTableRow>
                    <PlatformTableCell
                      colSpan={4}
                      className="text-center py-8 text-[hsl(var(--platform-foreground-muted))]"
                    >
                      No organizations match this filter.
                    </PlatformTableCell>
                  </PlatformTableRow>
                )}
              </PlatformTableBody>
            </PlatformTable>
          )}
        </PlatformCardContent>
      </PlatformCard>
    </PlatformPageContainer>
  );
}
