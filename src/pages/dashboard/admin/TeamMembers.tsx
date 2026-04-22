import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronRight, Search, Shield, Cog, Users, Loader2, UserPlus, UsersRound, Mail, Key } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganizationUsers, type OrganizationUser } from '@/hooks/useOrganizationUsers';
import { useBusinessCapacity } from '@/hooks/useBusinessCapacity';
import { useAuth } from '@/contexts/AuthContext';
import { UserCapacityBar } from '@/components/dashboard/settings/UserCapacityBar';
import { AddUserSeatsDialog } from '@/components/dashboard/settings/AddUserSeatsDialog';
import { UserRolesTab } from '@/components/access-hub/UserRolesTab';
import { InvitationsTab } from '@/components/access-hub/InvitationsTab';
import { TeamPinManagementTab } from '@/components/access-hub/TeamPinManagementTab';

type TeamView = 'roster' | 'bulk-roles' | 'invitations' | 'pins';
const VALID_VIEWS: TeamView[] = ['roster', 'bulk-roles', 'invitations', 'pins'];

const SECTIONS: { label: string; icon: typeof Shield; roles: string[] }[] = [
  { label: 'Leadership', icon: Shield, roles: ['super_admin', 'admin', 'manager', 'general_manager', 'assistant_manager'] },
  { label: 'Operations', icon: Cog, roles: ['director_of_operations', 'operations_assistant', 'receptionist', 'front_desk'] },
  { label: 'Stylists', icon: Users, roles: ['stylist', 'stylist_assistant'] },
];

const CATEGORIZED_ROLES = SECTIONS.flatMap(s => s.roles);

function roleLabel(role: string) {
  return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function MemberRow({ user, onClick }: { user: OrganizationUser; onClick: () => void }) {
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
  const capacity = useBusinessCapacity();
  const [search, setSearch] = useState('');
  const [seatsDialogOpen, setSeatsDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const isSuperAdmin = roles?.includes('super_admin') || roles?.includes('admin');
  const canManage = isSuperAdmin || isPlatformUser;

  const viewParam = searchParams.get('view') as TeamView | null;
  const view: TeamView = VALID_VIEWS.includes(viewParam as TeamView) ? (viewParam as TeamView) : 'roster';

  const handleViewChange = (next: string) => {
    const v = next as TeamView;
    if (v === 'roster') {
      // Drop the param entirely for the default view
      const params = new URLSearchParams(searchParams);
      params.delete('view');
      setSearchParams(params);
    } else {
      setSearchParams({ view: v });
    }
  };

  const filtered = useMemo(() => {
    if (!members) return [];
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m =>
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.display_name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q),
    );
  }, [members, search]);

  const grouped = useMemo(() => {
    const sections = SECTIONS.map(s => ({
      ...s,
      members: filtered.filter(m => m.roles.some(r => s.roles.includes(r))),
    }));
    const other = filtered.filter(m => !m.roles.some(r => CATEGORIZED_ROLES.includes(r)));
    return { sections, other };
  }, [filtered]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <DashboardPageHeader
          title="TEAM MEMBERS"
          description="One home for every per-person setting — profile, role, schedule, services, compensation, level, coaching, and access."
          backTo={dashPath('/admin/settings')}
          backLabel="Back to Settings"
          actions={
            <div className="flex items-center gap-2">
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
            <TabsTrigger value="bulk-roles" className="gap-2">
              <UsersRound className="h-4 w-4" />
              Bulk Roles
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-2">
              <Mail className="h-4 w-4" />
              Invitations
            </TabsTrigger>
            <TabsTrigger value="pins" className="gap-2">
              <Key className="h-4 w-4" />
              PIN Management
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {view === 'roster' && (
          <>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {isLoading ? (
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
                  return (
                    <div key={section.label} className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                        <SIcon className="h-4 w-4 text-primary" />
                        <h2 className="font-display text-sm uppercase tracking-wider text-foreground">{section.label}</h2>
                        <span className="text-xs text-muted-foreground">({section.members.length})</span>
                      </div>
                      <div className="space-y-2">
                        {section.members.map(m => (
                          <MemberRow
                            key={m.user_id}
                            user={m}
                            onClick={() => navigate(dashPath(`/admin/team-members/${m.user_id}`))}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {grouped.other.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <h2 className="font-display text-sm uppercase tracking-wider text-muted-foreground">Other Roles</h2>
                      <span className="text-xs text-muted-foreground">({grouped.other.length})</span>
                    </div>
                    <div className="space-y-2">
                      {grouped.other.map(m => (
                        <MemberRow
                          key={m.user_id}
                          user={m}
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

        {view === 'bulk-roles' && <UserRolesTab canManage={canManage} />}
        {view === 'invitations' && <InvitationsTab canManage={canManage} />}
        {view === 'pins' && <TeamPinManagementTab canManage={canManage} />}
      </div>

      <AddUserSeatsDialog open={seatsDialogOpen} onOpenChange={setSeatsDialogOpen} capacity={capacity} />
    </DashboardLayout>
  );
}
