import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRight, Search, Shield, Cog, Users, Loader2, UserPlus, Mail, Key, LayoutGrid, Table as TableIcon, Crown, ClipboardList, Headphones, Phone, Briefcase, MapPin, Archive, AlertCircle, type LucideIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveLocations } from '@/hooks/useLocations';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganizationUsers, type OrganizationUser } from '@/hooks/useOrganizationUsers';
import { useBusinessCapacity } from '@/hooks/useBusinessCapacity';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamPinStatus } from '@/hooks/useUserPin';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { UserCapacityBar } from '@/components/dashboard/settings/UserCapacityBar';
import { AddUserSeatsDialog } from '@/components/dashboard/settings/AddUserSeatsDialog';
import { UserRolesTab } from '@/components/access-hub/UserRolesTab';
import { InvitationsTab } from '@/components/access-hub/InvitationsTab';
import { QuickAssignRoleChip } from '@/components/dashboard/team-members/QuickAssignRoleChip';
import { ArchiveMemberChip } from '@/components/dashboard/team-members/ArchiveMemberChip';

type TeamView = 'roster' | 'invitations' | 'archived';
const VALID_VIEWS: TeamView[] = ['roster', 'invitations', 'archived'];
type RosterMode = 'card' | 'table';
const VIEW_MODE_KEY = 'zura-team-roster-mode';

// Role hierarchy ranks (lower = higher rank, displayed first across sections)
const ROLE_RANK: Record<string, number> = {
  super_admin: 0,
  admin: 1,
  general_manager: 2,
  manager: 3,
  assistant_manager: 4,
  director_of_operations: 10,
  operations_assistant: 11,
  receptionist: 12,
  front_desk: 13,
  stylist: 20,
  stylist_assistant: 21,
};

// Per-role icon for section headers
const ROLE_ICON: Record<string, LucideIcon> = {
  super_admin: Crown,
  admin: Shield,
  general_manager: Briefcase,
  manager: Briefcase,
  assistant_manager: Briefcase,
  director_of_operations: Cog,
  operations_assistant: Cog,
  receptionist: Headphones,
  front_desk: Phone,
  stylist: Users,
  stylist_assistant: UserPlus,
};

function roleLabel(role: string) {
  return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Returns the user's highest-ranked (lowest numeric) role from ROLE_RANK, or null if none match. */
function primaryRoleOf(userRoles: string[]): string | null {
  let best: string | null = null;
  let bestRank = Infinity;
  for (const r of userRoles) {
    const rank = ROLE_RANK[r];
    if (rank !== undefined && rank < bestRank) {
      bestRank = rank;
      best = r;
    }
  }
  return best;
}

function compareByName(a: OrganizationUser, b: OrganizationUser): number {
  const an = (a.display_name || a.full_name || '').toLowerCase();
  const bn = (b.display_name || b.full_name || '').toLowerCase();
  return an.localeCompare(bn);
}

function MemberRow({ user, hasPin, onClick, trailingSlot }: { user: OrganizationUser; hasPin: boolean | undefined; onClick: () => void; trailingSlot?: ReactNode }) {
  const name = user.display_name || user.full_name || 'Unnamed';
  const initials = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const primaryRole = user.roles?.[0];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card/60',
        'hover:bg-foreground/5 hover:border-border transition-colors text-left',
        !user.is_active && 'opacity-60',
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={user.photo_url ?? undefined} alt={name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-sans text-sm font-medium text-foreground truncate">{name}</span>
          {!user.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
          {user.is_super_admin && <Badge variant="outline" className="text-[10px]">Super Admin</Badge>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {primaryRole && (
            <span className="font-sans text-xs text-muted-foreground">{roleLabel(primaryRole)}</span>
          )}
          {user.email && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="font-sans text-xs text-muted-foreground truncate">{user.email}</span>
            </>
          )}
        </div>
      </div>
      {hasPin !== undefined && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'inline-flex items-center justify-center h-7 w-7 rounded-md border shrink-0',
                hasPin
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-muted/40 border-border text-muted-foreground/60',
              )}
              aria-label={hasPin ? 'PIN set' : 'No PIN'}
            >
              <Key className="h-3.5 w-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            {hasPin ? 'Quick-login PIN set' : 'No PIN set — manage in Security'}
          </TooltipContent>
        </Tooltip>
      )}
      {trailingSlot}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export default function TeamMembers() {
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const { roles, isPlatformUser } = useAuth();
  const { data: members, isLoading } = useOrganizationUsers(effectiveOrganization?.id);
  const { data: activeLocations = [] } = useActiveLocations(effectiveOrganization?.id);
  const { data: pinTeam = [] } = useTeamPinStatus();
  const { data: stylistLevels = [] } = useStylistLevels();
  const capacity = useBusinessCapacity();
  const [search, setSearch] = useState('');
  const [seatsDialogOpen, setSeatsDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const isSuperAdmin = roles?.includes('super_admin') || roles?.includes('admin');
  const canManage = isSuperAdmin || isPlatformUser;

  const viewParam = searchParams.get('view');
  const modeParam = searchParams.get('mode');

  // Legacy redirects:
  //   ?view=bulk-roles → ?mode=table (Roster, Table mode)
  //   ?view=pins      → ?mode=table&activity=pins (Roster, Table mode, PIN Activity expanded)
  useEffect(() => {
    if (viewParam === 'bulk-roles') {
      const params = new URLSearchParams(searchParams);
      params.delete('view');
      params.set('mode', 'table');
      setSearchParams(params, { replace: true });
    } else if (viewParam === 'pins') {
      const params = new URLSearchParams(searchParams);
      params.delete('view');
      params.set('mode', 'table');
      params.set('activity', 'pins');
      setSearchParams(params, { replace: true });
    }
  }, [viewParam, searchParams, setSearchParams]);

  const view: TeamView = VALID_VIEWS.includes(viewParam as TeamView) ? (viewParam as TeamView) : 'roster';

  // Auto-default to table for ≥15 members (only when no explicit URL mode)
  const autoMode: RosterMode = (members?.length ?? 0) >= 15 ? 'table' : 'card';
  const persistedMode = (typeof window !== 'undefined' ? (localStorage.getItem(VIEW_MODE_KEY) as RosterMode | null) : null);
  const rosterMode: RosterMode = (modeParam === 'card' || modeParam === 'table')
    ? modeParam
    : (persistedMode ?? autoMode);

  useEffect(() => {
    if (modeParam === 'card' || modeParam === 'table') {
      localStorage.setItem(VIEW_MODE_KEY, modeParam);
    }
  }, [modeParam]);

  const handleViewChange = (next: string) => {
    const v = next as TeamView;
    const params = new URLSearchParams(searchParams);
    params.delete('view');
    params.delete('mode');
    params.delete('activity');
    if (v !== 'roster') params.set('view', v);
    setSearchParams(params);
  };

  const handleRosterModeChange = (next: RosterMode) => {
    const params = new URLSearchParams(searchParams);
    params.delete('view');
    params.set('mode', next);
    setSearchParams(params);
  };

  const pinByUser = useMemo(() => {
    const m = new Map<string, boolean>();
    pinTeam.forEach(p => m.set(p.user_id, p.has_pin));
    return m;
  }, [pinTeam]);

  // Location filter (URL-persisted as ?location=<id>)
  const locationParam = searchParams.get('location') ?? 'all';
  const showLocationFilter = activeLocations.length >= 2;
  const selectedLocation = showLocationFilter ? locationParam : 'all';

  const handleLocationChange = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('location');
    else params.set('location', next);
    setSearchParams(params);
  };

  const filtered = useMemo(() => {
    if (!members) return [];
    const q = search.trim().toLowerCase();
    return members.filter(m => {
      if (q) {
        const matchesSearch =
          (m.full_name || '').toLowerCase().includes(q) ||
          (m.display_name || '').toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (selectedLocation !== 'all') {
        const inPrimary = m.location_id === selectedLocation;
        const inMulti = Array.isArray(m.location_ids) && m.location_ids.includes(selectedLocation);
        if (!inPrimary && !inMulti) return false;
      }
      return true;
    });
  }, [members, search, selectedLocation]);

  /**
   * Group members into one section per role (highest-ranked role wins for multi-role users),
   * preserving ROLE_RANK order. Members not matching any ranked role fall into `other`.
   * Within each section, sort alpha by name.
   */
  const grouped = useMemo(() => {
    const byRole = new Map<string, OrganizationUser[]>();
    const noRoles: OrganizationUser[] = [];
    const otherRoles: OrganizationUser[] = [];
    for (const m of filtered) {
      const primary = primaryRoleOf(m.roles);
      if (primary) {
        const arr = byRole.get(primary) ?? [];
        arr.push(m);
        byRole.set(primary, arr);
      } else if (!m.roles || m.roles.length === 0) {
        noRoles.push(m);
      } else {
        otherRoles.push(m);
      }
    }
    const sections = Object.entries(ROLE_RANK)
      .sort(([, a], [, b]) => a - b)
      .map(([role]) => ({
        role,
        label: roleLabel(role),
        icon: ROLE_ICON[role] ?? Users,
        members: (byRole.get(role) ?? []).slice().sort(compareByName),
      }))
      .filter(s => s.members.length > 0);
    noRoles.sort(compareByName);
    otherRoles.sort(compareByName);
    return { sections, noRoles, otherRoles };
  }, [filtered]);

  /**
   * Most-frequently-assigned non-elevated role across active members.
   * Used by QuickAssignRoleChip to default-select the likely intent
   * (so a single Enter assigns it). Excludes admin/super_admin since
   * those require explicit elevation via separate approval flow.
   * Falls back to `stylist` when no signal exists yet.
   */
  const suggestedRole = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of members ?? []) {
      if (!m.is_active) continue;
      for (const r of m.roles ?? []) {
        if (r === 'admin' || r === 'super_admin') continue;
        counts.set(r, (counts.get(r) ?? 0) + 1);
      }
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [role, count] of counts) {
      if (count > bestCount) {
        best = role;
        bestCount = count;
      }
    }
    return best ?? 'stylist';
  }, [members]);

  /**
   * Build the Stylist section's nested sub-groups by level.
   * Sub-headings follow the org's configured `display_order` from `stylist_levels`.
   * Stylists with no level fall into "Unassigned".
   * (Stylist Assistants are now their own top-level role section, not nested here.)
   * Returns null when the org has no levels configured → caller renders a flat list.
   */
  const stylistSubGroups = useMemo(() => {
    const stylistsSection = grouped.sections.find(s => s.role === 'stylist');
    if (!stylistsSection || stylistsSection.members.length === 0) return null;
    if (stylistLevels.length === 0) return null;

    const byLevelSlug = new Map<string, OrganizationUser[]>();
    const unassigned: OrganizationUser[] = [];
    for (const m of stylistsSection.members) {
      const slug = m.stylist_level;
      if (slug && stylistLevels.some(l => l.slug === slug)) {
        const arr = byLevelSlug.get(slug) ?? [];
        arr.push(m);
        byLevelSlug.set(slug, arr);
      } else {
        unassigned.push(m);
      }
    }

    const levelGroups = stylistLevels
      .map(level => ({
        key: level.slug,
        label: level.label,
        members: (byLevelSlug.get(level.slug) ?? []).slice().sort(compareByName),
      }))
      .filter(g => g.members.length > 0);

    if (unassigned.length > 0) {
      levelGroups.push({
        key: '__unassigned',
        label: 'Unassigned',
        members: unassigned.sort(compareByName),
      });
    }

    return levelGroups;
  }, [grouped.sections, stylistLevels]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <DashboardPageHeader
          title="TEAM MEMBERS"
          description="One home for every per-person setting — profile, role, schedule, services, compensation, level, coaching, and access."
          backTo={dashPath('/admin/settings')}
          backLabel="Back to Settings"
          actions={
            <div className="flex items-center gap-3">
              {(() => {
                // Onboarding completeness: count members with zero roles among active members.
                // Materiality gate: silent when fully onboarded (visibility contract doctrine).
                const activeMembers = (members ?? []).filter(m => m.is_active);
                const missing = activeMembers.filter(m => !m.roles || m.roles.length === 0).length;
                const total = activeMembers.length;
                if (missing === 0 || total === 0) return null;
                const onboarded = total - missing;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('no-roles-section');
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 transition-colors"
                    aria-label={`${missing} members missing roles — jump to section`}
                  >
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="font-display text-xs uppercase tracking-wider text-foreground">
                      {onboarded} of {total} onboarded
                    </span>
                    <span className="text-xs font-sans text-amber-700 dark:text-amber-400">
                      · {missing} missing role{missing === 1 ? '' : 's'}
                    </span>
                  </button>
                );
              })()}
              {isSuperAdmin && !capacity.isLoading && !capacity.users.isUnlimited && (
                <Button variant="outline" size={tokens.button.card as any} onClick={() => setSeatsDialogOpen(true)} className="gap-1.5">
                  <UserPlus className="h-4 w-4" /> Add seats
                </Button>
              )}
            </div>
          }
        />

        {isSuperAdmin && !capacity.isLoading && !capacity.users.isUnlimited && (
          <UserCapacityBar capacity={capacity} onAddSeats={() => setSeatsDialogOpen(true)} />
        )}

        {/* Sub-navigation */}
        <Tabs value={view} onValueChange={handleViewChange}>
          <TabsList>
            <TabsTrigger value="roster" className="gap-2">
              <Users className="h-4 w-4" />
              Roster
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-2">
              <Mail className="h-4 w-4" />
              Invitations
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2">
              <Archive className="h-4 w-4" />
              Archived
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {view === 'roster' && (
          <>
            {/* Card mode: search + categorized list. Table mode: full UserRolesTab (filters, stat tiles, bulk actions, location grouping, PIN column, PIN activity). */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {rosterMode === 'card' ? (
                <div className="flex items-center gap-2 flex-1 min-w-[240px] flex-wrap">
                  <div className="relative max-w-md flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {showLocationFilter && (
                    <Select value={selectedLocation} onValueChange={handleLocationChange}>
                      <SelectTrigger className="h-9 w-auto min-w-[180px]">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {activeLocations.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ) : (
                <div />
              )}

              <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-border bg-muted/40">
                <Button
                  type="button"
                  variant={rosterMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => handleRosterModeChange('card')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </Button>
                <Button
                  type="button"
                  variant={rosterMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => handleRosterModeChange('table')}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  Table
                </Button>
              </div>
            </div>

            {rosterMode === 'table' ? (
              <UserRolesTab canManage={canManage} />
            ) : isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className={tokens.body.muted}>No team members match your search.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {grouped.sections.map(section => {
                  if (section.members.length === 0) return null;
                  const SIcon = section.icon;
                  const isStylists = section.role === 'stylist';
                  const useSubGroups = isStylists && stylistSubGroups && stylistSubGroups.length > 0;
                  return (
                    <div key={section.role} className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                        <SIcon className="h-4 w-4 text-primary" />
                        <h2 className="font-display text-sm uppercase tracking-wider text-foreground">{section.label}</h2>
                        <span className="text-xs text-muted-foreground">({section.members.length})</span>
                      </div>
                      {useSubGroups ? (
                        <div className="space-y-5">
                          {stylistSubGroups!.map(sub => (
                            <div key={sub.key} className="space-y-2 pl-3 border-l border-border/60">
                              <div className="flex items-center gap-2">
                                <h3 className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                                  {sub.label}
                                </h3>
                                <span className="text-[10px] text-muted-foreground/70">({sub.members.length})</span>
                              </div>
                              <div className="space-y-2">
                                {sub.members.map(m => (
                                  <MemberRow
                                    key={m.user_id}
                                    user={m}
                                    hasPin={pinByUser.get(m.user_id)}
                                    onClick={() => navigate(dashPath(`/admin/team-members/${m.user_id}`))}
                                    trailingSlot={canManage && m.is_active && !m.is_super_admin ? <ArchiveMemberChip member={m} /> : undefined}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {section.members.map(m => (
                            <MemberRow
                              key={m.user_id}
                              user={m}
                              hasPin={pinByUser.get(m.user_id)}
                              onClick={() => navigate(dashPath(`/admin/team-members/${m.user_id}`))}
                              trailingSlot={canManage && m.is_active && !m.is_super_admin ? <ArchiveMemberChip member={m} /> : undefined}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {grouped.noRoles.length > 0 && (
                  <div className="space-y-3" id="no-roles-section">
                    <div className="flex items-center gap-2 pb-2 border-b border-amber-500/30">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <h2 className="font-display text-sm uppercase tracking-wider text-foreground">No Roles Assigned</h2>
                      <span className="text-xs text-muted-foreground">({grouped.noRoles.length})</span>
                      <span className="ml-auto text-xs text-muted-foreground font-sans">
                        Action required — assign a role to enable scheduling and access.
                      </span>
                    </div>
                    <div className="space-y-2">
                      {grouped.noRoles.map(m => (
                        <MemberRow
                          key={m.user_id}
                          user={m}
                          hasPin={pinByUser.get(m.user_id)}
                          onClick={() => navigate(dashPath(`/admin/team-members/${m.user_id}`))}
                          trailingSlot={
                            <div className="flex items-center gap-1.5">
                              <QuickAssignRoleChip
                                userId={m.user_id}
                                userName={m.display_name || m.full_name || 'this member'}
                                suggestedRole={suggestedRole}
                              />
                              {canManage && m.is_active && !m.is_super_admin && <ArchiveMemberChip member={m} />}
                            </div>
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
                {grouped.otherRoles.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <h2 className="font-display text-sm uppercase tracking-wider text-muted-foreground">Other Roles</h2>
                      <span className="text-xs text-muted-foreground">({grouped.otherRoles.length})</span>
                    </div>
                    <div className="space-y-2">
                      {grouped.otherRoles.map(m => (
                        <MemberRow
                          key={m.user_id}
                          user={m}
                          hasPin={pinByUser.get(m.user_id)}
                          onClick={() => navigate(dashPath(`/admin/team-members/${m.user_id}`))}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {view === 'invitations' && <InvitationsTab canManage={canManage} />}

        {view === 'archived' && (
          <ArchivedView orgId={effectiveOrganization?.id} onOpen={(uid) => navigate(dashPath(`/admin/team-members/${uid}`))} />
        )}
      </div>

      <AddUserSeatsDialog open={seatsDialogOpen} onOpenChange={setSeatsDialogOpen} capacity={capacity} />
    </DashboardLayout>
  );
}

function ArchivedView({ orgId, onOpen }: { orgId: string | undefined; onOpen: (userId: string) => void }) {
  const { data: archived = [], isLoading } = useOrganizationUsers(orgId, { onlyArchived: true });
  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (archived.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Archive className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className={tokens.body.muted}>No archived team members.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {archived.map((m) => {
        const name = m.display_name || m.full_name || 'Unnamed';
        const initials = name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
        return (
          <button
            key={m.user_id}
            type="button"
            onClick={() => onOpen(m.user_id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card/40',
              'hover:bg-foreground/5 hover:border-border transition-colors text-left',
            )}
          >
            <Avatar className="h-10 w-10 shrink-0 opacity-70">
              <AvatarImage src={m.photo_url ?? undefined} alt={name} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-sans text-sm font-medium text-foreground truncate">{name}</span>
                <Badge variant="outline" className="text-[10px]">Archived</Badge>
                {m.archive_reason && <span className="font-sans text-[11px] text-muted-foreground">· {m.archive_reason}</span>}
              </div>
              {m.email && <p className="font-sans text-xs text-muted-foreground truncate mt-0.5">{m.email}</p>}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
