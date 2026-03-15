import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building2, Search, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateOrgFeatureFlag, useDeleteOrgFeatureFlag } from '@/hooks/useOrganizationFeatureFlags';
import { toast } from 'sonner';

interface OrgWithBackroom {
  id: string;
  name: string;
  backroom_enabled: boolean;
  override_id: string | null;
  override_reason: string | null;
  subscription_tier: string | null;
  created_at: string | null;
  flag_created_at: string | null;
}

function getPlanTier(reason: string | null): string {
  if (!reason) return 'unknown';
  const r = reason.toLowerCase();
  if (r.includes('unlimited')) return 'unlimited';
  if (r.includes('professional')) return 'professional';
  if (r.includes('starter')) return 'starter';
  if (r.includes('trial')) return 'trial';
  return 'unknown';
}

function getStatusFromReason(reason: string | null, enabled: boolean): { label: string; variant: 'default' | 'warning' | 'error' | 'success' } {
  if (!enabled) return { label: 'Inactive', variant: 'default' };
  const r = (reason || '').toLowerCase();
  if (r.includes('trial')) return { label: 'Trial', variant: 'warning' };
  if (r.includes('cancel')) return { label: 'Cancelled', variant: 'error' };
  return { label: 'Active', variant: 'success' };
}

function planBadge(tier: string) {
  const map: Record<string, 'default' | 'primary' | 'warning' | 'info'> = {
    starter: 'default',
    professional: 'primary',
    unlimited: 'warning',
    trial: 'info',
  };
  return (
    <PlatformBadge variant={map[tier] || 'default'} size="sm">
      {tier === 'unknown' ? '—' : tier}
    </PlatformBadge>
  );
}

export function BackroomEntitlementsTab() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['platform-backroom-entitlements'],
    queryFn: async (): Promise<OrgWithBackroom[]> => {
      const { data: organizations, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name, subscription_tier, created_at')
        .order('name');

      if (orgErr) throw orgErr;

      const { data: flags, error: flagErr } = await supabase
        .from('organization_feature_flags')
        .select('*')
        .eq('flag_key', 'backroom_enabled');

      if (flagErr) throw flagErr;

      const flagMap = new Map(
        (flags || []).map((f: any) => [f.organization_id, f])
      );

      return (organizations || []).map((org: any) => {
        const flag = flagMap.get(org.id) as any;
        return {
          id: org.id,
          name: org.name,
          backroom_enabled: flag ? flag.is_enabled : false,
          override_id: flag?.id || null,
          override_reason: flag?.override_reason || null,
          subscription_tier: org.subscription_tier || null,
          created_at: org.created_at || null,
          flag_created_at: flag?.created_at || null,
        };
      });
    },
  });

  const updateFlag = useUpdateOrgFeatureFlag();
  const deleteFlag = useDeleteOrgFeatureFlag();

  const toggleBackroom = (org: OrgWithBackroom) => {
    if (org.backroom_enabled && org.override_id) {
      deleteFlag.mutate(
        { organizationId: org.id, flagKey: 'backroom_enabled' },
        { onSuccess: () => toast.success(`Backroom disabled for ${org.name}`) }
      );
    } else {
      updateFlag.mutate(
        { organizationId: org.id, flagKey: 'backroom_enabled', isEnabled: true, reason: 'Enabled via Platform Backroom Admin' },
        { onSuccess: () => toast.success(`Backroom enabled for ${org.name}`) }
      );
    }
  };

  const handleBatchEnable = () => {
    const toEnable = orgs.filter((o) => selected.has(o.id) && !o.backroom_enabled);
    toEnable.forEach((org) => {
      updateFlag.mutate({
        organizationId: org.id, flagKey: 'backroom_enabled', isEnabled: true,
        reason: 'Batch enabled via Platform Backroom Admin',
      });
    });
    toast.success(`Enabling backroom for ${toEnable.length} organizations`);
    setSelected(new Set());
  };

  const handleBatchDisable = () => {
    const toDisable = orgs.filter((o) => selected.has(o.id) && o.backroom_enabled && o.override_id);
    toDisable.forEach((org) => {
      deleteFlag.mutate({ organizationId: org.id, flagKey: 'backroom_enabled' });
    });
    toast.success(`Disabling backroom for ${toDisable.length} organizations`);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  const enabledCount = orgs.filter((o) => o.backroom_enabled).length;
  const trialCount = orgs.filter((o) => getPlanTier(o.override_reason) === 'trial').length;

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <PlatformCardTitle>Backroom Entitlements</PlatformCardTitle>
            <PlatformCardDescription>
              {enabledCount} active · {trialCount} trial · {orgs.length} total organizations
            </PlatformCardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <PlatformButton size="sm" onClick={handleBatchEnable}>
                Enable ({selected.size})
              </PlatformButton>
              <PlatformButton size="sm" variant="destructive" onClick={handleBatchDisable}>
                Disable ({selected.size})
              </PlatformButton>
            </>
          )}
          <PlatformInput
            icon={<Search className="w-4 h-4" />}
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
        </div>
      </PlatformCardHeader>
      <PlatformCardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        ) : filtered.length === 0 ? (
          <div className={cn(tokens.empty.container, 'py-16')}>
            <Building2 className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No organizations found</h3>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700/50">
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onCheckedChange={(checked) => {
                      setSelected(checked ? new Set(filtered.map((o) => o.id)) : new Set());
                    }}
                  />
                </TableHead>
                <TableHead className="font-sans text-xs text-slate-400">Organization</TableHead>
                <TableHead className="font-sans text-xs text-slate-400">Status</TableHead>
                <TableHead className="font-sans text-xs text-slate-400">Plan</TableHead>
                <TableHead className="font-sans text-xs text-slate-400">Org Tier</TableHead>
                <TableHead className="font-sans text-xs text-slate-400">Activated</TableHead>
                <TableHead className="font-sans text-xs text-slate-400 text-right pr-4">Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((org) => {
                const status = getStatusFromReason(org.override_reason, org.backroom_enabled);
                const tier = getPlanTier(org.override_reason);
                const isExpanded = expandedOrg === org.id;

                return (
                  <Collapsible key={org.id} asChild open={isExpanded} onOpenChange={() => setExpandedOrg(isExpanded ? null : org.id)}>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer border-slate-700/30 hover:bg-slate-800/30">
                          <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(org.id)}
                              onCheckedChange={() => toggleSelect(org.id)}
                            />
                          </TableCell>
                          <TableCell className="font-sans text-sm font-medium text-slate-200">
                            <div className="flex items-center gap-1.5">
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                              {org.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <PlatformBadge variant={status.variant} size="sm">
                              {status.label}
                            </PlatformBadge>
                          </TableCell>
                          <TableCell>{planBadge(tier)}</TableCell>
                          <TableCell className="font-sans text-xs text-slate-500 capitalize">
                            {org.subscription_tier || '—'}
                          </TableCell>
                          <TableCell className="font-sans text-xs text-slate-500">
                            {org.flag_created_at ? new Date(org.flag_created_at).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={org.backroom_enabled}
                              onCheckedChange={() => toggleBackroom(org)}
                            />
                          </TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-slate-800/20 border-slate-700/20">
                          <TableCell colSpan={7} className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-sans text-xs text-slate-500 block">Org Created</span>
                                <span className="font-sans text-sm text-slate-300">{org.created_at ? new Date(org.created_at).toLocaleDateString() : '—'}</span>
                              </div>
                              <div>
                                <span className="font-sans text-xs text-slate-500 block">Backroom Plan</span>
                                <span className="font-sans text-sm capitalize text-slate-300">{tier === 'unknown' ? 'Not set' : tier}</span>
                              </div>
                              <div>
                                <span className="font-sans text-xs text-slate-500 block">Override Reason</span>
                                <span className="font-sans text-xs text-slate-400">{org.override_reason || '—'}</span>
                              </div>
                              <div>
                                <span className="font-sans text-xs text-slate-500 block">Org Subscription</span>
                                <span className="font-sans text-sm capitalize text-slate-300">{org.subscription_tier || 'Free'}</span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        )}
      </PlatformCardContent>
    </PlatformCard>
  );
}
