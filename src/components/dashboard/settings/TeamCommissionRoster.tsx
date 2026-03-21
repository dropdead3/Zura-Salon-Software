import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Users, BarChart3 } from 'lucide-react';
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

interface TeamCommissionRosterProps {
  orgId: string;
  levels: StylistLevel[];
}


export function TeamCommissionRoster({ orgId, levels }: TeamCommissionRosterProps) {
  const navigate = useNavigate();
  const { data: team, isLoading } = useTeamDirectory(undefined, { organizationId: orgId });
  const { data: overrides } = useStylistCommissionOverrides(orgId);
  const bulkAssign = useBulkAssignStylistLevel();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [locationFilter, setLocationFilter] = useState<string>('all');
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

  // Locations
  const locations = useMemo(() => {
    if (!team) return [];
    const locMap = new Map<string, string>();
    team.forEach(m => { if (m.location_id) locMap.set(m.location_id, m.location_id); });
    return Array.from(locMap.keys());
  }, [team]);

  // Filtered team (stylists only)
  const filteredTeam = useMemo(() => {
    if (!team) return [];
    const stylists = team.filter(m => {
      const isAdmin = m.roles?.length === 1 && m.roles[0] === 'admin';
      if (isAdmin && !m.stylist_level) return false;
      return true;
    });
    if (locationFilter === 'all') return stylists;
    return stylists.filter(m => m.location_id === locationFilter);
  }, [team, locationFilter]);

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
                onClick={() => navigate('/dashboard/admin/payroll?tab=commissions')}
              >
                <BarChart3 className="h-3.5 w-3.5 mr-1" />
                View Analytics
              </Button>
              {locations.length > 1 && (
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-[160px] h-9 text-sm">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Column headers */}
          <div className={cn("grid grid-cols-[28px_1fr_140px_70px_70px_90px] gap-2 px-3 py-2 border-b border-border/60", tokens.table.columnHeader)}>
            <div />
            <div>Stylist</div>
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

            return (
              <div
                key={member.user_id}
                className="grid grid-cols-[28px_1fr_140px_70px_70px_90px] gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                onClick={() => setDrilldownUserId(member.user_id)}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(member.user_id)}
                    onCheckedChange={() => toggleSelected(member.user_id)}
                  />
                </div>

                <span className="text-sm font-medium truncate">
                  {member.display_name || member.full_name}
                </span>

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
              <p className="text-sm">No active stylists found.</p>
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
