import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, BarChart3, MapPin } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { getLevelColor } from '@/lib/level-colors';
import { toast } from 'sonner';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import { useAssignStylistLevel, useBulkAssignStylistLevel } from '@/hooks/useAssignStylistLevel';
import { useStylistCommissionOverrides } from '@/hooks/useStylistCommissionOverrides';
import { StylistCommissionDrilldown } from './StylistCommissionDrilldown';
import type { StylistLevel } from '@/hooks/useStylistLevels';
import type { StylistCommissionOverride } from '@/hooks/useStylistCommissionOverrides';
import { differenceInDays } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useActiveLocations } from '@/hooks/useLocations';
import { getRoleBadgeConfig } from '@/lib/roleBadgeConfig';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface TeamCommissionRosterProps {
  orgId: string;
  levels: StylistLevel[];
}


export function TeamCommissionRoster({
  orgId, levels }: TeamCommissionRosterProps) {
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();
  const { data: team, isLoading } = useTeamDirectory(undefined, { organizationId: orgId });
  const { data: overrides } = useStylistCommissionOverrides(orgId);
  const { data: activeLocations = [] } = useActiveLocations();
  const bulkAssign = useBulkAssignStylistLevel();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [hideNonStylists, setHideNonStylists] = useState(false);
  const [drilldownUserId, setDrilldownUserId] = useState<string | null>(null);

  // Maps
  const slugToLevel = useMemo(() => {
    const map = new Map<string, StylistLevel>();
    levels.forEach(l => map.set(l.slug, l));
    return map;
  }, [levels]);

  const overrideByUser = useMemo(() => {
    const map = new Map<string, StylistCommissionOverride>();
    overrides?.forEach(o => map.set(o.user_id, o));
    return map;
  }, [overrides]);

  // Location name lookup
  const locationNameMap = useMemo(() => {
    const map = new Map<string, string>();
    activeLocations.forEach(l => map.set(l.id, l.name));
    return map;
  }, [activeLocations]);

  // Get unique locations from team members
  const teamLocations = useMemo(() => {
    if (!team) return [];
    const locIds = new Set<string>();
    team.forEach(m => {
      if (m.location_id) locIds.add(m.location_id);
      if (m.location_ids && Array.isArray(m.location_ids)) {
        (m.location_ids as string[]).forEach(id => locIds.add(id));
      }
    });
    return Array.from(locIds)
      .map(id => ({ id, name: locationNameMap.get(id) || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [team, locationNameMap]);

  // Helper: get all unique location IDs for a member
  const getMemberLocationIds = (member: { location_id?: string | null; location_ids?: string[] | null }) => {
    const ids = new Set<string>();
    if (member.location_id) ids.add(member.location_id);
    if (member.location_ids && Array.isArray(member.location_ids)) {
      (member.location_ids as string[]).forEach(id => ids.add(id));
    }
    return ids;
  };

  // Filtered team
  const filteredTeam = useMemo(() => {
    if (!team) return [];
    const filtered = team.filter(m => {
      const isAdminOnly = m.roles?.length === 1 && m.roles[0] === 'admin';
      if (isAdminOnly && !m.stylist_level) return false;
      if (hideNonStylists) {
        if (!m.roles?.includes('stylist')) return false;
        if (m.is_booking === false) return false;
      }
      if (locationFilter !== 'all') {
        const memberLocs = getMemberLocationIds(m);
        if (!memberLocs.has(locationFilter)) return false;
      }
      return true;
    });
    // Sort: admins by role level at top, then active stylists, then inactive at bottom
    const ROLE_ORDER: Record<string, number> = { super_admin: 1, admin: 2, manager: 3, receptionist: 4, assistant: 5, stylist: 6 };
    const getTopRole = (roles?: string[] | null) => {
      if (!roles || roles.length === 0) return 99;
      return Math.min(...roles.map(r => ROLE_ORDER[r] ?? 50));
    };
    return filtered.sort((a, b) => {
      const aIsStylistOnly = a.roles?.length === 1 && a.roles[0] === 'stylist';
      const bIsStylistOnly = b.roles?.length === 1 && b.roles[0] === 'stylist';
      // Non-stylist-only (admins/managers) first
      if (aIsStylistOnly !== bIsStylistOnly) return aIsStylistOnly ? 1 : -1;
      // Within non-stylist-only group, sort by role level
      if (!aIsStylistOnly && !bIsStylistOnly) {
        const roleCompare = getTopRole(a.roles) - getTopRole(b.roles);
        if (roleCompare !== 0) return roleCompare;
      }
      // Then active before inactive
      const aActive = a.is_booking !== false;
      const bActive = b.is_booking !== false;
      if (aActive !== bActive) return aActive ? -1 : 1;
      return 0;
    });
  }, [team, locationFilter, hideNonStylists]);

  // Resolve effective rates for a stylist
  const getEffective = (member: { user_id: string; stylist_level?: string | null }) => {
    const override = overrideByUser.get(member.user_id);
    const level = member.stylist_level ? slugToLevel.get(member.stylist_level) : null;

    if (override) {
      return {
        svc: override.service_commission_rate,
        retail: override.retail_commission_rate,
        source: 'override' as const,
        reason: override.reason,
        expiresAt: override.expires_at,
      };
    }

    if (level) {
      return {
        svc: level.service_commission_rate,
        retail: level.retail_commission_rate,
        source: 'level' as const,
        reason: null,
        expiresAt: null,
      };
    }

    return { svc: null, retail: null, source: 'none' as const, reason: null, expiresAt: null };
  };

  const toggleSelected = (userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleBulkAssign = (slug: string) => {
    const userIds = Array.from(selectedIds);
    if (userIds.length === 0) return;
    const level = slugToLevel.get(slug);
    bulkAssign.mutate({ userIds, levelSlug: slug }, {
      onSuccess: () => {
        setSelectedIds(new Set());
        toast.success(`${userIds.length} stylist${userIds.length > 1 ? 's' : ''} → ${level?.label || slug}`);
      },
    });
  };

  const formatExpiresIn = (expiresAt: string) => {
    const days = differenceInDays(new Date(expiresAt), new Date());
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    if (days === 1) return '1d';
    return `${days}d`;
  };

  const formatRate = (rate: number | null) => {
    if (rate == null) return '—';
    return `${Math.round(rate * 100)}%`;
  };

  // Drilldown member
  const drilldownMember = useMemo(() => {
    if (!drilldownUserId || !filteredTeam) return null;
    return filteredTeam.find(m => m.user_id === drilldownUserId) || null;
  }, [drilldownUserId, filteredTeam]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Loading team…</CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Users className={tokens.card.icon} />
              </div>
              <div>
                <CardTitle className={tokens.card.title}>TEAM COMMISSION ROSTER</CardTitle>
                <CardDescription>
                  Manage level assignments and commission rates for your team. Click a stylist for details.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => navigate(dashPath('/admin/payroll?tab=commissions'))}
              >
                <BarChart3 className="h-3.5 w-3.5 mr-1" />
                View Analytics
              </Button>
              {teamLocations.length > 0 && (
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-sm">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {teamLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <Checkbox
                  checked={hideNonStylists}
                  onCheckedChange={(v) => setHideNonStylists(!!v)}
                  className="h-3.5 w-3.5"
                />
                Hide inactive
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Column headers */}
          <div className={cn("grid grid-cols-[28px_1fr_140px_70px_70px_90px] gap-2 px-3 py-2 border-b border-border/60", tokens.table.columnHeader)}>
            <div />
            <div>Team Member</div>
            <div>Level</div>
            <div className="text-right">Svc %</div>
            <div className="text-right">Retail %</div>
            <div className="text-right">Source</div>
          </div>

          {filteredTeam.map((member) => {
            const eff = getEffective(member);
            const level = member.stylist_level ? slugToLevel.get(member.stylist_level) : null;
            const levelIndex = level ? levels.indexOf(level) : -1;
            const color = levelIndex >= 0 ? getLevelColor(levelIndex, levels.length) : null;
            const isStylist = member.roles?.includes('stylist');
            const isNotBooking = member.is_booking === false;
            const isInactive = !isStylist || isNotBooking;
            const isMultiLocation = getMemberLocationIds(member).size > 1;
            
            // Get primary non-stylist role for badge
            const primaryNonStylistRole = !isStylist
              ? (member.roles as AppRole[])?.find(r => ['super_admin', 'admin', 'manager', 'receptionist', 'assistant'].includes(r))
              : null;
            const roleBadge = primaryNonStylistRole ? getRoleBadgeConfig(primaryNonStylistRole) : null;

            return (
              <div
                key={member.user_id}
                className={cn(
                  "grid grid-cols-[28px_1fr_140px_70px_70px_90px] gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group",
                  isInactive && "opacity-50"
                )}
                onClick={() => setDrilldownUserId(member.user_id)}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(member.user_id)}
                    onCheckedChange={() => toggleSelected(member.user_id)}
                  />
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {member.full_name}
                  </span>
                  {roleBadge && (
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 border",
                      roleBadge.colorClasses
                    )}>
                      {roleBadge.label}
                    </span>
                  )}
                  {isMultiLocation && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-accent text-accent-foreground border border-border shrink-0">
                      Multi-Location
                    </span>
                  )}
                  {isStylist && isNotBooking && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                      Not Booking
                    </span>
                  )}
                </div>

                <div>
                  {level ? (
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium truncate max-w-full",
                      color?.bg, color?.text
                    )}>
                      {level.client_label} — {level.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-destructive/10 text-destructive">
                      Unassigned
                    </span>
                  )}
                </div>

                <span className="text-sm text-right tabular-nums">{formatRate(eff.svc)}</span>
                <span className="text-sm text-right tabular-nums">{formatRate(eff.retail)}</span>

                <div className="flex items-center justify-end gap-1">
                  {eff.source === 'override' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary cursor-default">
                          Override
                          {eff.expiresAt && (
                            <span className="text-[9px] opacity-70">{formatExpiresIn(eff.expiresAt)}</span>
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px]">
                        <p className="text-xs">{eff.reason}</p>
                        {eff.expiresAt && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Expires {new Date(eff.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : eff.source === 'level' ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                      Level Default
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted/50 text-muted-foreground/50">
                      No rates
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredTeam.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Users className="w-8 h-8" />
              <p className="text-sm">No team members found.</p>
            </div>
          )}

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border mt-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Select onValueChange={handleBulkAssign}>
                <SelectTrigger className="w-[200px] h-9 text-sm">
                  <SelectValue placeholder="Set Level for Selected" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map(level => (
                    <SelectItem key={level.slug} value={level.slug}>
                      {level.client_label} — {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drilldown */}
      <StylistCommissionDrilldown
        open={!!drilldownUserId}
        onOpenChange={(open) => { if (!open) setDrilldownUserId(null); }}
        member={drilldownMember}
        orgId={orgId}
        levels={levels}
        override={drilldownUserId ? overrideByUser.get(drilldownUserId) ?? null : null}
        
      />
    </TooltipProvider>
  );
}
