import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn, formatDisplayName } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useRoles, ROLE_CATEGORIES } from '@/hooks/useRoles';
import { useAllUsersWithRoles } from '@/hooks/useUserRoles';
import { useDebounce } from '@/hooks/use-debounce';
import { getRoleIconComponent } from '@/components/dashboard/RoleIconPicker';
import { getRoleBadgeConfig } from '@/lib/roleBadgeConfig';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, EyeOff, Search, FlaskConical, Users, Shield } from 'lucide-react';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useActiveLocations } from '@/hooks/useLocations';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ViewAsPopover() {
  const { user } = useAuth();
  const {
    isViewingAs,
    isViewingAsUser,
    viewAsRole,
    viewAsUser,
    setViewAsRole,
    setViewAsUser,
    clearViewAs,
  } = useViewAs();

  const [open, setOpen] = useState(false);
  const [teamFilter, setTeamFilter] = useState('');
  const debouncedFilter = useDebounce(teamFilter, 200);

  const { data: allRoles = [] } = useRoles();
  const { data: allUsers = [], isLoading: usersLoading } = useAllUsersWithRoles();
  const { data: profile } = useEmployeeProfile();
  const canImpersonate = !!(profile?.is_super_admin || profile?.is_primary_owner);

  // Grouped roles
  const grouped = useMemo(() => {
    const active = allRoles.filter(r => r.is_active);
    return ROLE_CATEGORIES.map(cat => ({
      ...cat,
      roles: active.filter(r => r.category === cat.value).sort((a, b) => a.sort_order - b.sort_order),
    })).filter(g => g.roles.length > 0);
  }, [allRoles]);

  // Filtered team members (exclude self)
  const filteredUsers = useMemo(() => {
    const q = debouncedFilter.toLowerCase();
    return allUsers
      .filter(u => u.user_id !== user?.id)
      .filter(u => {
        if (!q) return true;
        const name = (u.display_name || u.full_name || '').toLowerCase();
        const roles = u.roles.join(' ').toLowerCase();
        return name.includes(q) || roles.includes(q);
      });
  }, [allUsers, user?.id, debouncedFilter]);

  // Defense-in-depth gate: only super admins / account owners may use this surface.
  if (!canImpersonate) return null;

  // Active impersonation — show exit button
  if (isViewingAs || isViewingAsUser) {
    const label = isViewingAsUser && viewAsUser
      ? viewAsUser.full_name
      : viewAsRole
        ? allRoles.find(r => r.name === viewAsRole)?.display_name || viewAsRole
        : 'Unknown';

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 rounded-full px-4 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary"
            onClick={() => clearViewAs()}
          >
            <Eye className="w-4 h-4" />
            <span className="text-xs truncate max-w-[120px]">Exit: {label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Exit &ldquo;View As&rdquo; mode (Esc)</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 rounded-full px-4 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <EyeOff className="w-4 h-4" />
              <span className="text-xs">View As</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">View the dashboard as a team member</TooltipContent>
      </Tooltip>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[28] bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />,
        document.body
      )}

      <PopoverContent
        align="end"
        sideOffset={16}
        className={cn(
          "z-[46] w-[340px] p-0 rounded-xl overflow-hidden",
          "bg-popover/95 backdrop-blur-xl",
          "border border-border/60",
          "shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_hsl(var(--foreground)/0.04)]",
          "flex flex-col"
        )}
        style={{
          maxHeight: 'min(560px, var(--radix-popover-content-available-height, 560px))',
          height: 'min(560px, var(--radix-popover-content-available-height, 560px))',
        }}
      >
        <Tabs defaultValue="team" className="w-full flex flex-col flex-1 min-h-0">
          {/* Header — sticky tabs */}
          <div className="px-3 pt-3 pb-2 shrink-0 border-b border-border/40">
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="roles" className="text-xs py-1.5 gap-1">
                <Shield className="w-3.5 h-3.5" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="team" className="text-xs py-1.5 gap-1">
                <Users className="w-3.5 h-3.5" />
                Team
              </TabsTrigger>
              <TabsTrigger value="test" className="text-xs py-1.5 gap-1">
                <FlaskConical className="w-3.5 h-3.5" />
                Test
              </TabsTrigger>
            </TabsList>
          </div>

          {/* === Roles Tab === */}
          <TabsContent value="roles" className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=active]:flex flex-col">
            <ScrollArea className="flex-1 min-h-0 h-full">
              <div className="p-3 pb-4 space-y-3">
                {grouped.map(group => (
                  <div key={group.value} className="pt-2 first:pt-0">
                    <p className="font-display text-[10px] tracking-[0.12em] uppercase text-muted-foreground/60 mb-1 px-1">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.roles.map(role => {
                        const IconComp = getRoleIconComponent(role.icon);
                        return (
                          <button
                            key={role.id}
                            onClick={() => {
                              setViewAsRole(role.name as AppRole);
                              setOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/70 hover:text-foreground transition-colors duration-150 text-sm"
                          >
                            <IconComp className="w-4 h-4 text-muted-foreground" />
                            <span className="flex-1 text-left font-sans">{role.display_name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {grouped.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No roles configured</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === Team Tab === */}
          <TabsContent value="team" className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=active]:flex flex-col">
            <div className="p-3 pb-2 shrink-0 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search team…"
                  value={teamFilter}
                  onChange={e => setTeamFilter(e.target.value)}
                  autoCapitalize="off"
                  className="h-8 pl-8 text-xs bg-muted/50 border-border/60 rounded-lg"
                />
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0 h-full">
              <div className="p-3 pb-4 space-y-0.5">
                {usersLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Loading team…</p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {teamFilter ? 'No matches found' : 'No team members'}
                  </p>
                ) : (
                  filteredUsers.map(member => {
                    const displayName = formatDisplayName(member.full_name || '', member.display_name);
                    const initials = getInitials(displayName);
                    const primaryBadge = member.roles.length > 0
                      ? getRoleBadgeConfig(member.roles[0])
                      : null;

                    return (
                      <button
                        key={member.user_id}
                        onClick={() => {
                          setViewAsUser({
                            id: member.user_id,
                            full_name: displayName,
                            roles: member.roles,
                          });
                          setOpen(false);
                          setTeamFilter('');
                        }}
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/70 hover:text-foreground transition-colors duration-150"
                      >
                        <Avatar className="h-7 w-7">
                          {member.photo_url && <AvatarImage src={member.photo_url} alt={displayName} />}
                          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm truncate">{displayName}</p>
                          {primaryBadge && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {primaryBadge.label}
                              {member.roles.length > 1 && ` +${member.roles.length - 1}`}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === Test Accounts Tab === */}
          <TabsContent
            value="test"
            className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=active]:flex flex-col items-center justify-center px-6"
          >
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-muted/40">
                <FlaskConical className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-display text-[11px] tracking-[0.12em] uppercase text-foreground mb-1">
                Test Accounts
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Simulate the platform safely without affecting real data. Coming soon.
              </p>
              <Badge variant="outline" className="mt-3 text-[10px] rounded-full">
                Coming Soon
              </Badge>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
