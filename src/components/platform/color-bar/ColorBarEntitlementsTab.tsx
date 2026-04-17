import { useState, useMemo } from 'react';
import { AdminActivateDialog } from '@/components/platform/color-bar/AdminActivateDialog';
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
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import { PlatformTable as Table, PlatformTableBody as TableBody, PlatformTableCell as TableCell, PlatformTableHead as TableHead, PlatformTableHeader as TableHeader, PlatformTableRow as TableRow } from '@/components/platform/ui/PlatformTable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building2, Search, Loader2, ChevronDown, ChevronRight, MapPin, Weight, AlertTriangle, ShieldCheck, Undo2, CreditCard, Send } from 'lucide-react';
import { ZuraLoader } from '@/components/ui/ZuraLoader';
import { useBatchPaymentMethods, type PaymentMethodInfo } from '@/hooks/platform/useBatchPaymentMethods';
import { useSendPaymentSetupLink } from '@/hooks/platform/useSendPaymentSetupLink';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  PlatformDialogContent as DialogContent,
  PlatformDialogDescription as DialogDescription,
  DialogFooter,
  DialogHeader,
  PlatformDialogTitle as DialogTitle,
  DialogTrigger,
} from '@/components/platform/ui/PlatformDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateOrgFeatureFlag, useDeleteOrgFeatureFlag } from '@/hooks/useOrganizationFeatureFlags';
import {
  useUpsertLocationEntitlement,
  useDeleteLocationEntitlement,
  useBulkSuspendLocationEntitlements,
  useBulkReactivateLocationEntitlements,
  type ColorBarLocationEntitlement,
} from '@/hooks/color-bar/useColorBarLocationEntitlements';
import { ReactivationConfirmDialog } from '@/components/platform/color-bar/ReactivationConfirmDialog';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/format';

interface OrgWithColorBar {
  id: string;
  name: string;
  backroom_enabled: boolean;
  override_id: string | null;
  override_reason: string | null;
  subscription_tier: string | null;
  created_at: string | null;
  flag_created_at: string | null;
  stripe_customer_id: string | null;
  last_setup_link_sent_at: string | null;
}

interface OrgLocation {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
    active: { label: 'Active', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'error' },
    suspended: { label: 'Suspended', variant: 'error' },
    refunded: { label: 'Refunded', variant: 'info' },
  };
  const cfg = map[status] ?? { label: status, variant: 'default' as const };
  return (
    <PlatformBadge variant={cfg.variant as any} size="sm">
      {cfg.label}
    </PlatformBadge>
  );
}


export function ColorBarEntitlementsTab() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [showBackfillDialog, setShowBackfillDialog] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all orgs with their color bar flag
  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['platform-color-bar-entitlements'],
    queryFn: async (): Promise<OrgWithColorBar[]> => {
      const { data: organizations, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name, subscription_tier, created_at, stripe_customer_id, last_setup_link_sent_at')
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
          stripe_customer_id: org.stripe_customer_id || null,
          last_setup_link_sent_at: org.last_setup_link_sent_at || null,
        };
      });
    },
  });

  // Fetch locations for the expanded org
  const { data: orgLocations = [], isLoading: locsLoading } = useQuery({
    queryKey: ['platform-org-locations', expandedOrg],
    queryFn: async (): Promise<OrgLocation[]> => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, city, is_active')
        .eq('organization_id', expandedOrg!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as OrgLocation[];
    },
    enabled: !!expandedOrg,
  });

  // Fetch location entitlements for the expanded org
  const { data: locEntitlements = [], isLoading: entsLoading } = useQuery({
    queryKey: ['color-bar-location-entitlements', expandedOrg],
    queryFn: async (): Promise<ColorBarLocationEntitlement[]> => {
      const { data, error } = await supabase
        .from('backroom_location_entitlements')
        .select('*')
        .eq('organization_id', expandedOrg!);

      if (error) throw error;
      return (data ?? []) as unknown as ColorBarLocationEntitlement[];
    },
    enabled: !!expandedOrg,
  });

  const entitlementMap = new Map(locEntitlements.map((e) => [e.location_id, e]));

  // Batch-fetch payment methods for orgs with stripe_customer_id
  const stripeMappings = orgs
    .filter((o) => !!o.stripe_customer_id)
    .map((o) => ({ orgId: o.id, stripeCustomerId: o.stripe_customer_id! }));
  const { paymentMethods, isLoading: pmLoading } = useBatchPaymentMethods(stripeMappings);

  const updateFlag = useUpdateOrgFeatureFlag();
  const deleteFlag = useDeleteOrgFeatureFlag();
  const upsertLocEnt = useUpsertLocationEntitlement();
  const deleteLocEnt = useDeleteLocationEntitlement();
  const sendSetupLink = useSendPaymentSetupLink();


  const toggleColorBar = (org: OrgWithColorBar) => {
    if (org.backroom_enabled && org.override_id) {
      deleteFlag.mutate(
        { organizationId: org.id, flagKey: 'backroom_enabled' },
        { onSuccess: () => toast.success(`Color Bar disabled for ${org.name}`) }
      );
    } else {
      updateFlag.mutate(
        {
          organizationId: org.id,
          flagKey: 'backroom_enabled',
          isEnabled: true,
          reason: 'Enabled via Platform Color Bar Admin',
        },
        {
          onSuccess: async () => {
            try {
              // Fetch all active locations for this org
              const { data: locs } = await supabase
                .from('locations')
                .select('id')
                .eq('organization_id', org.id)
                .eq('is_active', true);

              if (locs && locs.length > 0) {
                // Upsert active entitlements for all locations
                    await supabase
                      .from('backroom_location_entitlements')
                      .upsert(
                        locs.map((l) => ({
                          organization_id: org.id,
                          location_id: l.id,
                          plan_tier: 'standard',
                          scale_count: 0,
                          status: 'active',
                          billing_interval: 'monthly',
                          activated_at: new Date().toISOString(),
                        })),
                        { onConflict: 'organization_id,location_id' }
                      );

                queryClient.invalidateQueries({ queryKey: ['platform-color-bar-entitlements'] });
                toast.success(`Color Bar enabled for ${org.name} — all locations activated`);
              } else {
                toast.success(`Color Bar enabled for ${org.name}`);
              }
            } catch {
              // Org flag was set successfully; location entitlements failed silently
              queryClient.invalidateQueries({ queryKey: ['platform-color-bar-entitlements'] });
              toast.success(`Color Bar enabled for ${org.name}`);
            }
          },
        }
      );
    }
  };

  const toggleLocationEntitlement = (orgId: string, locationId: string) => {
    const existing = entitlementMap.get(locationId);
    if (existing && existing.status === 'active') {
      deleteLocEnt.mutate(
        { organization_id: orgId, location_id: locationId },
        { onSuccess: () => toast.success('Location entitlement removed') }
      );
    } else {
      upsertLocEnt.mutate(
        { organization_id: orgId, location_id: locationId, status: 'active' },
        { onSuccess: () => toast.success('Location entitlement activated') }
      );
    }
  };

  const handleBatchEnable = () => {
    const toEnable = orgs.filter((o) => selected.has(o.id) && !o.backroom_enabled);
    toEnable.forEach((org) => {
      updateFlag.mutate({
        organizationId: org.id,
        flagKey: 'backroom_enabled',
        isEnabled: true,
        reason: 'Batch enabled via Platform Color Bar Admin',
      });
    });
    toast.success(`Enabling color bar for ${toEnable.length} organizations`);
    setSelected(new Set());
  };

  const handleBatchDisable = () => {
    const toDisable = orgs.filter(
      (o) => selected.has(o.id) && o.backroom_enabled && o.override_id
    );
    toDisable.forEach((org) => {
      deleteFlag.mutate({ organizationId: org.id, flagKey: 'backroom_enabled' });
    });
    toast.success(`Disabling color bar for ${toDisable.length} organizations`);
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

  // Detect orphaned orgs (color bar enabled but no location entitlements)
  const orphanedOrgs = orgs.filter((o) => {
    if (!o.backroom_enabled) return false;
    // We only know entitlements for the expanded org — check all in a simpler way
    return true; // Will be refined when we have all entitlements
  });

  // For backfill: fetch all location entitlements counts
  const { data: allEntitlementCounts = [] } = useQuery({
    queryKey: ['platform-color-bar-all-entitlement-counts'],
    queryFn: async () => {
      const enabledOrgIds = orgs.filter((o) => o.backroom_enabled).map((o) => o.id);
      if (enabledOrgIds.length === 0) return [];
      const { data } = await supabase
        .from('backroom_location_entitlements')
        .select('organization_id')
        .in('organization_id', enabledOrgIds);
      return data || [];
    },
    enabled: orgs.length > 0,
  });

  const orgsWithEntitlements = new Set(allEntitlementCounts.map((e: any) => e.organization_id));
  const orphanCount = orgs.filter((o) => o.backroom_enabled && !orgsWithEntitlements.has(o.id)).length;

  const handleBackfillAll = async () => {
    setBackfilling(true);
    try {
      const orphans = orgs.filter((o) => o.backroom_enabled && !orgsWithEntitlements.has(o.id));
      for (const org of orphans) {
        // Get all active locations for this org
        const { data: locs } = await supabase
          .from('locations')
          .select('id')
          .eq('organization_id', org.id)
          .eq('is_active', true);

        for (const loc of locs || []) {
          await supabase
            .from('backroom_location_entitlements')
            .upsert(
              {
                organization_id: org.id,
                location_id: loc.id,
                plan_tier: 'standard',
                scale_count: 0,
                status: 'active',
                activated_at: new Date().toISOString(),
              } as any,
              { onConflict: 'organization_id,location_id' }
            );
        }
      }
      toast.success(`Backfilled entitlements for ${orphans.length} organizations`);
      queryClient.invalidateQueries({ queryKey: ['platform-color-bar-all-entitlement-counts'] });
      queryClient.invalidateQueries({ queryKey: ['platform-color-bar-entitlements'] });
    } catch (err: any) {
      toast.error('Backfill failed: ' + err.message);
    } finally {
      setBackfilling(false);
      setShowBackfillDialog(false);
    }
  };

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <PlatformCardTitle>Color Bar App Access</PlatformCardTitle>
            <PlatformCardDescription>
              {enabledCount} active orgs · {orgs.length} total · Per-location activation
            </PlatformCardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {orphanCount > 0 && (
            <Dialog open={showBackfillDialog} onOpenChange={setShowBackfillDialog}>
              <DialogTrigger asChild>
                <PlatformButton size="sm" variant="outline">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Backfill ({orphanCount})
                </PlatformButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Backfill Location Entitlements</DialogTitle>
                  <DialogDescription>
                    {orphanCount} organization{orphanCount > 1 ? 's have' : ' has'} Color Bar enabled but no per-location
                    entitlements. This will create a Starter entitlement for every active location in these orgs.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <PlatformButton variant="outline" onClick={() => setShowBackfillDialog(false)}>
                    Cancel
                  </PlatformButton>
                  <PlatformButton onClick={handleBackfillAll} loading={backfilling}>
                    Backfill All
                  </PlatformButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
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
        {orgsLoading ? (
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
                <TableHead className="font-sans text-xs text-slate-400">Locations</TableHead>
                <TableHead className="font-sans text-xs text-slate-400">Org Tier</TableHead>
                <TableHead className="font-sans text-xs text-slate-400">Payment</TableHead>
                <TableHead className="font-sans text-xs text-slate-400">Activated</TableHead>
                <TableHead className="font-sans text-xs text-slate-400 text-right pr-4">Master Switch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((org) => {
                const isExpanded = expandedOrg === org.id;

                return (
                  <Collapsible
                    key={org.id}
                    asChild
                    open={isExpanded}
                    onOpenChange={() => setExpandedOrg(isExpanded ? null : org.id)}
                  >
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
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                              )}
                              {org.name}
                            </div>
                          </TableCell>
                          <TableCell className="font-sans text-xs text-slate-400">
                            {org.backroom_enabled ? (
                              <span className="text-slate-300">Expand to manage</span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </TableCell>
                          <TableCell className="font-sans text-xs text-slate-500 capitalize">
                            {org.subscription_tier || '—'}
                          </TableCell>
                          <TableCell className="font-sans text-xs">
                            {(() => {
                              if (!org.stripe_customer_id) return <span className="text-slate-600">—</span>;
                              const pm = paymentMethods.get(org.id);
                              if (pmLoading) return <Loader2 className="w-3 h-3 animate-spin text-slate-500" />;
                              if (!pm) {
                                const lastSent = org.last_setup_link_sent_at ? new Date(org.last_setup_link_sent_at) : null;
                                const cooldownActive = lastSent ? (Date.now() - lastSent.getTime()) < 60 * 60 * 1000 : false;
                                const timeAgo = lastSent ? formatRelativeTime(lastSent) : null;

                                return (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-slate-500 border-b border-dashed border-slate-600 cursor-help">No card</span>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="w-56 p-3">
                                        <p className="text-xs text-muted-foreground mb-2">No payment method on file</p>
                                        {timeAgo && (
                                          <p className="text-xs text-muted-foreground/70 mb-2">Link sent {timeAgo}</p>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            sendSetupLink.mutate(org.id);
                                          }}
                                          disabled={sendSetupLink.isPending || cooldownActive}
                                          className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50"
                                        >
                                          {sendSetupLink.isPending ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Send className="w-3 h-3" />
                                          )}
                                          {cooldownActive ? 'Cooldown active' : 'Send Setup Link'}
                                        </button>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              }
                              return (
                                <span className="text-slate-300 flex items-center gap-1">
                                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="capitalize">{pm.brand}</span>
                                  <span className="text-slate-500">····{pm.last4}</span>
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="font-sans text-xs text-slate-500">
                            {org.flag_created_at
                              ? new Date(org.flag_created_at).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={org.backroom_enabled}
                              onCheckedChange={() => toggleColorBar(org)}
                            />
                          </TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-slate-800/20 border-slate-700/20">
                          <TableCell colSpan={8} className="p-0">
                            <LocationEntitlementPanel
                              orgId={org.id}
                              orgName={org.name}
                              orgEnabled={org.backroom_enabled}
                              hasStripeCustomer={!!org.stripe_customer_id}
                              locations={orgLocations}
                              entitlementMap={entitlementMap}
                              isLoading={locsLoading || entsLoading}
                              onToggle={toggleLocationEntitlement}
                              onUpdateEntitlement={(locId, updates) =>
                                upsertLocEnt.mutate({
                                  organization_id: org.id,
                                  location_id: locId,
                                  ...updates,
                                })
                              }
                            />
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

// ── Sub-panel: per-location entitlements inside expanded org row ──

interface LocationPanelProps {
  orgId: string;
  orgName: string;
  orgEnabled: boolean;
  hasStripeCustomer: boolean;
  locations: OrgLocation[];
  entitlementMap: Map<string, ColorBarLocationEntitlement>;
  isLoading: boolean;
  onToggle: (orgId: string, locationId: string) => void;
  onUpdateEntitlement: (
    locationId: string,
    updates: { plan_tier?: string; scale_count?: number; status?: string }
  ) => void;
}

function LocationEntitlementPanel({
  orgId,
  orgName,
  orgEnabled,
  hasStripeCustomer,
  locations,
  entitlementMap,
  isLoading,
  onToggle,
  onUpdateEntitlement,
}: LocationPanelProps) {
  const [refundTarget, setRefundTarget] = useState<{ locId: string; locName: string } | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const refundQueryClient = useQueryClient();
  if (!orgEnabled) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="font-sans text-sm text-slate-500">
          Enable the organization master switch to manage per-location entitlements.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ZuraLoader size="xl" platformColors />
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="font-sans text-sm text-slate-500">
          No locations found for this organization.
        </p>
      </div>
    );
  }

  const activeLocCount = locations.filter(
    (l) => {
      const ent = entitlementMap.get(l.id);
      return ent && ent.status === 'active';
    }
  ).length;

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-violet-400" />
          <span className="font-sans text-sm text-slate-300">
            {activeLocCount} of {locations.length} locations active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PlatformButton
            size="sm"
            variant="ghost"
            onClick={() => {
              locations.forEach((loc) => {
                const ent = entitlementMap.get(loc.id);
                if (!ent || ent.status === 'cancelled' || ent.status === 'suspended') {
                  onToggle(orgId, loc.id);
                }
              });
            }}
          >
            Enable All
          </PlatformButton>
          {hasStripeCustomer && (
            <PlatformButton
              size="sm"
              variant="default"
              onClick={() => setShowActivateDialog(true)}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Activate & Charge
            </PlatformButton>
          )}
        </div>
      </div>

      {/* Location rows */}
      <div className="rounded-lg border border-slate-700/40 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/40 bg-slate-800/40">
              <th className="font-sans text-xs text-slate-400 text-left px-4 py-2">Location</th>
              <th className="font-sans text-xs text-slate-400 text-left px-4 py-2">Status</th>
              <th className="font-sans text-xs text-slate-400 text-left px-4 py-2">Refund</th>
              <th className="font-sans text-xs text-slate-400 text-left px-4 py-2">Scales</th>
              <th className="font-sans text-xs text-slate-400 text-left px-4 py-2">Subscription</th>
              <th className="font-sans text-xs text-slate-400 text-right px-4 py-2">Access</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => {
              const ent = entitlementMap.get(loc.id);
              const isActive = ent && ent.status === 'active';

              return (
                <tr
                  key={loc.id}
                  className="border-b border-slate-700/20 last:border-b-0 hover:bg-slate-800/20"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <div>
                        <span className="font-sans text-sm text-slate-200">{loc.name}</span>
                        {loc.city && (
                          <span className="font-sans text-xs text-slate-500 ml-2">
                            {loc.city.split(',')[0]?.trim()}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {ent ? statusBadge(ent.status) : (
                      <PlatformBadge variant="default" size="sm">Inactive</PlatformBadge>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {ent?.status === 'refunded' && ent.refunded_at ? (
                      <div className="flex flex-col gap-0.5">
                        <PlatformBadge variant="info" size="sm">
                          <Undo2 className="w-3 h-3 mr-1" />
                          Refunded
                        </PlatformBadge>
                        <span className="font-sans text-[10px] text-slate-500">
                          {new Date(ent.refunded_at).toLocaleDateString()}
                        </span>
                      </div>
                    ) : isActive && ent?.refund_eligible_until ? (
                      new Date(ent.refund_eligible_until) > new Date() ? (
                        <div className="flex items-center gap-1.5">
                          <PlatformBadge variant="success" size="sm">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            {(() => {
                              const days = Math.ceil((new Date(ent.refund_eligible_until!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                              return `${days}d left`;
                            })()}
                          </PlatformBadge>
                          <PlatformButton
                            size="sm"
                            variant="destructive"
                            className="h-6 text-[10px] px-2"
                            onClick={() => setRefundTarget({ locId: loc.id, locName: loc.name })}
                          >
                            <Undo2 className="w-3 h-3" />
                            Refund
                          </PlatformButton>
                        </div>
                      ) : (
                        <PlatformBadge variant="default" size="sm">Closed</PlatformBadge>
                      )
                    ) : ent?.prior_refund_count && ent.prior_refund_count > 0 ? (
                      <PlatformBadge variant="default" size="sm">
                        Previously refunded
                      </PlatformBadge>
                    ) : (
                      <span className="font-sans text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {isActive && ent ? (
                      <div className="flex items-center gap-1.5">
                        <Weight className="w-3.5 h-3.5 text-slate-500" />
                        <Select
                          value={String(ent.scale_count)}
                          onValueChange={(val) =>
                            onUpdateEntitlement(loc.id, {
                              scale_count: parseInt(val, 10),
                              status: ent.status,
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-[70px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 1, 2, 3, 4, 5].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className="font-sans text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {ent?.stripe_subscription_id && (
                      <span className="font-sans text-[10px] text-slate-500 font-mono truncate max-w-[100px] block">
                        {ent.stripe_subscription_id.slice(0, 16)}…
                      </span>
                    )}
                    {!isActive && !ent?.stripe_subscription_id && (
                      <span className="font-sans text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Switch
                      checked={!!isActive}
                      onCheckedChange={() => onToggle(orgId, loc.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Admin Activate Dialog */}
      <AdminActivateDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
        orgId={orgId}
        orgName={orgName}
        hasStripeCustomer={hasStripeCustomer}
        locations={locations.map((l) => ({ id: l.id, name: l.name, city: l.city }))}
      />

      {/* Refund Confirmation Dialog */}
      <Dialog open={!!refundTarget} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                This will <strong>immediately revoke</strong> Color Bar access for{' '}
                <strong>{refundTarget?.locName}</strong>, cancel the Stripe subscription, and issue a
                full refund for the most recent payment.
              </p>
              <p className="text-amber-400 font-medium">
                ⚠ If this location re-subscribes in the future, it will <em>not</em> be eligible for
                another refund.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <PlatformButton variant="outline" onClick={() => setRefundTarget(null)} disabled={refunding}>
              Cancel
            </PlatformButton>
            <PlatformButton
              variant="destructive"
              loading={refunding}
              onClick={async () => {
                if (!refundTarget) return;
                setRefunding(true);
                try {
                  const { data, error } = await supabase.functions.invoke('process-backroom-refund', {
                    body: { organization_id: orgId, location_id: refundTarget.locId },
                  });
                  if (error) throw error;
                  if (data?.error) throw new Error(data.error);
                  toast.success(data.message || 'Refund processed successfully');
                  refundQueryClient.invalidateQueries({ queryKey: ['color-bar-location-entitlements', orgId] });
                  refundQueryClient.invalidateQueries({ queryKey: ['platform-color-bar-entitlements'] });
                  refundQueryClient.invalidateQueries({ queryKey: ['platform-color-bar-all-entitlement-counts'] });
                } catch (err: any) {
                  toast.error('Refund failed: ' + (err.message || 'Unknown error'));
                } finally {
                  setRefunding(false);
                  setRefundTarget(null);
                }
              }}
            >
              <Undo2 className="w-4 h-4" />
              Confirm Refund
            </PlatformButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
