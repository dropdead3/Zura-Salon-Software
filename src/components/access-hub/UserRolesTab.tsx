import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, User, Crown, AlertTriangle, Lock, Users, Award, ChevronDown, ChevronRight, MapPin, Shield } from 'lucide-react';
import { getRoleIconComponent } from '@/components/dashboard/RoleIconPicker';
import { tokens } from '@/lib/design-tokens';
import { ResponsibilityBadges } from './ResponsibilityBadges';
import { AssignResponsibilityDialog } from './AssignResponsibilityDialog';
import { UserRolesFilterBar } from './UserRolesFilterBar';
import { UserRolesTableView, type PinAction, type PinStatusEntry } from './UserRolesTableView';
import { AdminSetPinDialog, type AdminSetPinTarget } from './AdminSetPinDialog';
import { PinActivityPanel } from './PinActivityPanel';
import { useAllUsersWithRoles, useToggleUserRole, ROLE_LABELS } from '@/hooks/useUserRoles';
import { useRoles } from '@/hooks/useRoles';
import { useActiveLocations } from '@/hooks/useLocations';
import { getRoleColorClasses } from '@/components/dashboard/RoleColorPicker';
import { useCanApproveAdmin, useAccountApprovals, useToggleSuperAdmin } from '@/hooks/useAccountApproval';
import { useTeamPinStatus, useAdminSetUserPin } from '@/hooks/useUserPin';
import { RoleHistoryPanel } from '@/components/dashboard/RoleHistoryPanel';
import { cn, formatDisplayName } from '@/lib/utils';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import type { UserWithRoles } from '@/hooks/useUserRoles';

type AppRole = Database['public']['Enums']['app_role'];

// Dynamic color classes based on role color from database
const getRoleBorderBgClasses = (color: string) => {
  const colorMap: Record<string, string> = {
    red: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10',
    purple: 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/10',
    blue: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10',
    green: 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10',
    cyan: 'border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/10',
    orange: 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/10',
    yellow: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/10',
    pink: 'border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/10',
    gray: 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/10',
  };
  return colorMap[color] || colorMap.gray;
};

const getRoleTextClasses = (color: string) => {
  const colorMap: Record<string, string> = {
    red: 'text-red-700 dark:text-red-400',
    purple: 'text-purple-700 dark:text-purple-400',
    blue: 'text-blue-700 dark:text-blue-400',
    green: 'text-green-700 dark:text-green-400',
    cyan: 'text-cyan-700 dark:text-cyan-400',
    orange: 'text-orange-700 dark:text-orange-400',
    yellow: 'text-yellow-700 dark:text-yellow-400',
    pink: 'text-pink-700 dark:text-pink-400',
    gray: 'text-gray-700 dark:text-gray-400',
  };
  return colorMap[color] || colorMap.gray;
};

interface UserRolesTabProps {
  canManage: boolean;
}

const VIEW_MODE_KEY = 'zura-user-roles-view-mode';
const ROLE_OVERVIEW_KEY = 'zura-role-overview-collapsed';

export function UserRolesTab({ canManage }: UserRolesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    return (localStorage.getItem(VIEW_MODE_KEY) as 'card' | 'table') || 'card';
  });
  const [roleOverviewOpen, setRoleOverviewOpen] = useState(() => {
    return localStorage.getItem(ROLE_OVERVIEW_KEY) !== 'true';
  });
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [superAdminConfirm, setSuperAdminConfirm] = useState<{
    userId: string;
    userName: string;
    isSuperAdmin: boolean;
  } | null>(null);
  const [responsibilityDialog, setResponsibilityDialog] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [bulkAction, setBulkAction] = useState<{
    type: 'assign' | 'remove';
    role: string;
  } | null>(null);
  const [pinDialog, setPinDialog] = useState<{ target: AdminSetPinTarget; mode: PinAction } | null>(null);

  const { data: users = [], isLoading } = useAllUsersWithRoles();
  const { data: accounts } = useAccountApprovals();
  const { data: canApproveAdmin } = useCanApproveAdmin();
  const { data: roles = [] } = useRoles();
  const { data: locations = [] } = useActiveLocations();
  const { data: pinTeam = [] } = useTeamPinStatus();
  const toggleRole = useToggleUserRole();
  const toggleSuperAdmin = useToggleSuperAdmin();
  const adminSetPin = useAdminSetUserPin();

  // Auto-switch to table view for large teams
  useEffect(() => {
    if (users.length > 15 && !localStorage.getItem(VIEW_MODE_KEY)) {
      setViewMode('table');
    }
  }, [users.length]);

  // Persist view mode
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  // Persist role overview state
  useEffect(() => {
    localStorage.setItem(ROLE_OVERVIEW_KEY, roleOverviewOpen ? 'false' : 'true');
  }, [roleOverviewOpen]);

  const getAccountInfo = (userId: string) => {
    return accounts?.find(a => a.user_id === userId);
  };

  const pinStatusByUser = useMemo(() => {
    const map = new Map<string, PinStatusEntry>();
    pinTeam.forEach(p => map.set(p.user_id, { user_id: p.user_id, has_pin: p.has_pin, is_primary_owner: p.is_primary_owner }));
    return map;
  }, [pinTeam]);

  const openPinDialog = (userId: string, mode: PinAction) => {
    const pin = pinStatusByUser.get(userId);
    const teamMember = pinTeam.find(p => p.user_id === userId);
    const user = users.find(u => u.user_id === userId);
    if (!pin || !user) return;
    const name = teamMember?.name || formatDisplayName(user.full_name || '', user.display_name);
    setPinDialog({ target: { user_id: userId, name, has_pin: pin.has_pin, is_primary_owner: pin.is_primary_owner }, mode });
  };

  const handleBulkClearPins = async () => {
    const userIds = Array.from(selectedUsers).filter(id => {
      const pin = pinStatusByUser.get(id);
      return pin?.has_pin && !pin.is_primary_owner;
    });
    if (userIds.length === 0) {
      toast.info('No eligible PINs to clear (Account Owner is protected).');
      return;
    }
    try {
      await Promise.all(userIds.map(id => adminSetPin.mutateAsync({ targetUserId: id, pin: null, reason: 'Bulk clear from Roster' })));
      setSelectedUsers(new Set());
      toast.success(`Cleared ${userIds.length} PIN${userIds.length === 1 ? '' : 's'}`);
    } catch (err) {
      console.error('Bulk clear PIN error:', err);
    }
  };

  const locationList = useMemo(() => 
    locations.map(l => ({ id: l.id, name: l.name })),
    [locations]
  );

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          user.full_name?.toLowerCase().includes(query) ||
          user.display_name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Location filter
      if (selectedLocationIds.length > 0) {
        const userLocIds = user.location_ids?.length ? user.location_ids : (user.location_id ? [user.location_id] : []);
        const matchesLocation = userLocIds.some(id => selectedLocationIds.includes(id));
        if (!matchesLocation) return false;
      }

      // Role filter
      if (selectedRoles.length > 0) {
        const accountInfo = getAccountInfo(user.user_id);
        const isSuperAdmin = accountInfo?.is_super_admin;
        const matchesRole = user.roles.some(r => selectedRoles.includes(r)) ||
          (selectedRoles.includes('super_admin') && isSuperAdmin);
        if (!matchesRole) return false;
      }

      // Unassigned filter
      if (showUnassigned) {
        const accountInfo = getAccountInfo(user.user_id);
        if (user.roles.length > 0 || accountInfo?.is_super_admin) return false;
      }

      return true;
    });
  }, [users, searchQuery, selectedLocationIds, selectedRoles, showUnassigned, accounts]);

  // Group by location for multi-location orgs
  const groupedByLocation = useMemo(() => {
    if (locationList.length <= 1) return null; // No grouping for single location

    const groups: Record<string, UserWithRoles[]> = {};
    const unassigned: UserWithRoles[] = [];

    filteredUsers.forEach(user => {
      const userLocIds = user.location_ids?.length ? user.location_ids : (user.location_id ? [user.location_id] : []);
      if (userLocIds.length === 0) {
        unassigned.push(user);
      } else {
        userLocIds.forEach(locId => {
          if (!groups[locId]) groups[locId] = [];
          groups[locId].push(user);
        });
      }
    });

    return { groups, unassigned };
  }, [filteredUsers, locationList]);

  // Role statistics
  const roleStats = useMemo(() => {
    const baseUsers = selectedLocationIds.length > 0 || showUnassigned ? filteredUsers : users;
    const stats: Record<string, number> = {
      total: baseUsers.length,
      super_admin: 0,
    };

    roles.forEach(role => { stats[role.name] = 0; });

    baseUsers.forEach(user => {
      const accountInfo = getAccountInfo(user.user_id);
      if (accountInfo?.is_super_admin) {
        stats.super_admin++;
      } else {
        user.roles.forEach(role => {
          if (stats[role] !== undefined) stats[role]++;
        });
      }
    });

    return stats;
  }, [users, filteredUsers, accounts, roles, selectedLocationIds, showUnassigned]);

  const handleToggleRole = (userId: string, role: string, hasRole: boolean) => {
    toggleRole.mutate({ userId, role: role as AppRole, hasRole });
  };

  const handleToggleSuperAdmin = (userId: string, userName: string, isSuperAdmin: boolean) => {
    setSuperAdminConfirm({ userId, userName, isSuperAdmin });
  };

  const confirmSuperAdminToggle = () => {
    if (superAdminConfirm) {
      toggleSuperAdmin.mutate({ userId: superAdminConfirm.userId, grant: !superAdminConfirm.isSuperAdmin });
      setSuperAdminConfirm(null);
    }
  };

  // Bulk role actions
  const handleBulkRoleAction = async (type: 'assign' | 'remove', roleName: string) => {
    const userIds = Array.from(selectedUsers);
    if (userIds.length === 0) return;

    try {
      await Promise.all(
        userIds.map(userId => {
          const user = users.find(u => u.user_id === userId);
          if (!user) return Promise.resolve();
          const hasRole = user.roles.includes(roleName as AppRole);
          if ((type === 'assign' && hasRole) || (type === 'remove' && !hasRole)) return Promise.resolve();
          return toggleRole.mutateAsync({ userId, role: roleName as AppRole, hasRole: type === 'remove' });
        })
      );
      setSelectedUsers(new Set());
      toast.success(`Bulk ${type === 'assign' ? 'assignment' : 'removal'} complete`);
    } catch (err) {
      console.error('Bulk action error:', err);
    }
  };

  const renderUserCard = (user: UserWithRoles) => {
    const accountInfo = getAccountInfo(user.user_id);
    const isSuperAdmin = accountInfo?.is_super_admin;
    const isPrimaryOwner = accountInfo?.is_primary_owner;
    const isApproved = accountInfo?.is_approved;

    return (
      <Card key={user.user_id} className={cn(!isApproved && "opacity-60")}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={user.photo_url || undefined} alt={user.full_name} />
              <AvatarFallback className="bg-muted">
                {user.full_name?.charAt(0) || <User className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium">
                  {formatDisplayName(user.full_name || '', user.display_name)}
                </h3>
                {isSuperAdmin && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge className={cn(
                        "gap-1 text-xs border",
                        isPrimaryOwner 
                          ? "bg-stone-700/90 text-amber-100 border-amber-400/30 backdrop-blur-sm" 
                          : "bg-gradient-to-r from-amber-200 via-orange-100 to-amber-200 text-amber-900 border-amber-300"
                      )}>
                        <Crown className="w-3 h-3" />
                        {isPrimaryOwner ? 'Account Owner' : 'Super Admin'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isPrimaryOwner ? 'Account owner - cannot be revoked' : 'Can approve admin roles'}
                    </TooltipContent>
                  </Tooltip>
                )}
                {!isApproved && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1 text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    Pending Approval
                  </Badge>
                )}
              </div>
              {user.email && (
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              )}
              
              {/* Current Roles */}
              {(user.roles.length > 0 || isSuperAdmin) && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {isSuperAdmin && (
                    <Badge 
                      variant="outline" 
                      className="text-xs bg-gradient-to-r from-amber-200 via-orange-100 to-amber-200 text-amber-900 border-amber-300 gap-1"
                    >
                      <Crown className="w-3 h-3" />
                      Super Admin
                    </Badge>
                  )}
                  {roles
                    .filter(role => user.roles.includes(role.name as AppRole) && role.name !== 'super_admin')
                    .map(role => {
                      const colorClasses = getRoleColorClasses(role.color);
                      const isAdminStylist = role.name === 'stylist' && user.roles.some((r: string) => ['super_admin', 'admin', 'manager'].includes(r));
                      const badge = (
                        <Badge 
                          key={role.name} 
                          variant="outline" 
                          className={cn("text-xs", colorClasses.bg, colorClasses.text)}
                        >
                          {role.display_name}
                        </Badge>
                      );
                      if (isAdminStylist) {
                        return (
                          <Tooltip key={role.name}>
                            <TooltipTrigger asChild>{badge}</TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[240px] text-xs">
                              This user is an admin who also performs services. Managed via the "I also perform services" toggle in Profile Settings.
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      return badge;
                    })}
                  <ResponsibilityBadges userId={user.user_id} />
                </div>
              )}
              
              {canManage && (
                <Button
                  variant="ghost"
                  size={tokens.button.inline}
                  className="h-7 text-xs gap-1 mt-1"
                  onClick={() => setResponsibilityDialog({ userId: user.user_id, userName: formatDisplayName(user.full_name || '', user.display_name) })}
                >
                  <Award className="h-3 w-3" />
                  Responsibilities
                </Button>
              )}
            </div>
          </div>

          {/* Role Toggles */}
          {canManage && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-x-8 gap-y-3">
              {roles.map(role => {
                const isSuperAdminRole = role.name === 'super_admin';
                
                if (isSuperAdminRole) {
                  if (!isSuperAdmin && !canApproveAdmin) return null;
                  
                  return (
                    <div key={role.name} className="flex items-center gap-2">
                      <label 
                        className={cn(
                          "text-sm font-medium flex items-center gap-1",
                          (isSuperAdmin && !canApproveAdmin) || isPrimaryOwner ? "text-muted-foreground cursor-not-allowed" : "cursor-pointer"
                        )}
                      >
                        <Crown className="w-3 h-3 text-amber-600" />
                        {role.display_name}
                      </label>
                      {isPrimaryOwner && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Lock className="w-3 h-3 text-amber-600" />
                          </TooltipTrigger>
                          <TooltipContent>Account Owner - cannot be revoked</TooltipContent>
                        </Tooltip>
                      )}
                      <Switch
                        checked={isSuperAdmin || false}
                        onCheckedChange={() => handleToggleSuperAdmin(user.user_id, formatDisplayName(user.full_name || '', user.display_name), isSuperAdmin || false)}
                        disabled={toggleSuperAdmin.isPending || !canApproveAdmin || isPrimaryOwner}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-amber-400 data-[state=checked]:to-orange-400"
                      />
                    </div>
                  );
                }
                
                const hasRole = user.roles.includes(role.name as AppRole);
                const isAdminRole = role.name === 'admin';
                const isLockedByPermission = isAdminRole && !canApproveAdmin;
                const isLockedBySuperAdmin = isSuperAdmin;
                const isLocked = isLockedByPermission || isLockedBySuperAdmin;
                
                return (
                  <div key={role.name} className="flex items-center gap-2">
                    <label 
                      className={cn(
                        "text-sm font-medium",
                        isLocked ? "text-muted-foreground cursor-not-allowed" : "cursor-pointer"
                      )}
                    >
                      {role.display_name}
                    </label>
                    {isLocked && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>{isLockedBySuperAdmin ? 'Super Admins have full access' : 'Super Admin required'}</TooltipContent>
                      </Tooltip>
                    )}
                    <Switch
                      checked={isLockedBySuperAdmin ? false : hasRole}
                      onCheckedChange={() => handleToggleRole(user.user_id, role.name, hasRole)}
                      disabled={toggleRole.isPending || isLocked}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Role History */}
          <div className="mt-3">
            <RoleHistoryPanel 
              userId={user.user_id} 
              isOpen={expandedHistory === user.user_id}
              onToggle={() => setExpandedHistory(
                expandedHistory === user.user_id ? null : user.user_id
              )}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLocationGroup = (locationId: string, locationName: string, groupUsers: UserWithRoles[]) => (
    <Collapsible key={locationId} defaultOpen>
      <div className="flex items-center gap-2 mb-2">
        <CollapsibleTrigger className="flex items-center gap-2 group">
          <ChevronDown className="w-4 h-4 text-muted-foreground group-data-[state=closed]:hidden" />
          <ChevronRight className="w-4 h-4 text-muted-foreground group-data-[state=open]:hidden" />
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className={tokens.heading.section}>{locationName}</h3>
        </CollapsibleTrigger>
        <Badge variant="secondary" className="text-xs">{groupUsers.length}</Badge>
      </div>
      <CollapsibleContent>
        {viewMode === 'card' ? (
          <div className="space-y-4 mb-6">
            {groupUsers.map(renderUserCard)}
          </div>
        ) : (
          <div className="mb-6">
            <UserRolesTableView
              users={groupUsers}
              roles={roles}
              canManage={canManage}
              canApproveAdmin={!!canApproveAdmin}
              getAccountInfo={getAccountInfo}
              onToggleRole={handleToggleRole}
              onToggleSuperAdmin={handleToggleSuperAdmin}
              isToggling={toggleRole.isPending}
              isSuperAdminToggling={toggleSuperAdmin.isPending}
              selectedUsers={selectedUsers}
              onSelectionChange={setSelectedUsers}
              locations={locationList}
              onOpenResponsibilities={(userId, userName) => setResponsibilityDialog({ userId, userName })}
              pinStatusByUser={pinStatusByUser}
              onOpenPinDialog={openPinDialog}
            />
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className="space-y-6">
      {/* Role Statistics Overview */}
      <div className="flex flex-wrap gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 min-w-[140px]">
          <CardContent className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-medium text-primary">{roleStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Members</p>
            </div>
          </CardContent>
        </Card>
        
        {roles.map(role => {
          const isSuperAdminRole = role.name === 'super_admin';
          const RoleIcon = getRoleIconComponent(role.icon);
          return (
            <Card 
              key={role.name} 
              className={cn(
                "border min-w-[100px]",
                isSuperAdminRole 
                  ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800"
                  : getRoleBorderBgClasses(role.color)
              )}
            >
              <CardContent className="p-3 text-center">
                <p className={cn(
                  "text-xl font-display font-medium",
                  isSuperAdminRole ? "text-amber-700 dark:text-amber-400" : getRoleTextClasses(role.color)
                )}>
                  {isSuperAdminRole ? roleStats.super_admin : (roleStats[role.name] || 0)}
                </p>
                <p className={cn(
                  "text-xs flex items-center justify-center gap-1",
                  isSuperAdminRole ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                )}>
                  <RoleIcon className="w-3 h-3" />
                  {role.display_name}{!isSuperAdminRole && 's'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Admin Role Warning */}
      {!canApproveAdmin && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Limited Permissions:</strong> Only Super Admins can assign or remove the Admin role. 
            Contact your account owner to request Super Admin status.
          </AlertDescription>
        </Alert>
      )}

      {/* Collapsible Role Legend */}
      <Collapsible open={roleOverviewOpen} onOpenChange={setRoleOverviewOpen}>
        <Card className="bg-muted/20 border-muted/50">
          <CardHeader className="pb-4">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <CardTitle className="text-sm font-display uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Role Overview
              </CardTitle>
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                !roleOverviewOpen && "-rotate-90"
              )} />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-5">
                {roles.map(role => {
                  const colorClasses = getRoleColorClasses(role.color);
                  const isSuperAdminRole = role.name === 'super_admin';
                  const RoleIcon = getRoleIconComponent(role.icon);
                  return (
                    <div key={role.name} className="flex flex-col gap-1.5">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs w-fit whitespace-nowrap px-3 py-1 gap-1.5",
                          isSuperAdminRole 
                            ? "bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 text-amber-800 border-amber-300/60" 
                            : cn(colorClasses.bg, colorClasses.text, "border-current/20")
                        )}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {role.display_name}
                      </Badge>
                      <span className="text-sm text-muted-foreground leading-snug">
                        {role.description || 'No description'}
                        {role.name === 'admin' && !canApproveAdmin && (
                          <span className="text-amber-600 dark:text-amber-400 ml-1">(Super Admin required)</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Filter Bar */}
      <UserRolesFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        locations={locationList}
        selectedLocationIds={selectedLocationIds}
        onLocationChange={setSelectedLocationIds}
        roles={roles}
        selectedRoles={selectedRoles}
        onRolesChange={setSelectedRoles}
        showUnassigned={showUnassigned}
        onUnassignedChange={setShowUnassigned}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showLocationFilter={locationList.length > 1}
      />

      {/* Bulk Actions Bar */}
      {canManage && selectedUsers.size > 0 && viewMode === 'table' && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 flex-wrap">
          <span className="text-sm font-medium">{selectedUsers.size} selected</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {roles.filter(r => r.name !== 'super_admin').map(role => (
              <Button
                key={`assign-${role.name}`}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleBulkRoleAction('assign', role.name)}
                disabled={toggleRole.isPending}
              >
                + {role.display_name}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
              onClick={handleBulkClearPins}
              disabled={adminSetPin.isPending}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear PINs
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setSelectedUsers(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* User List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className={tokens.empty?.container || "p-8 text-center text-muted-foreground"}>
            {showUnassigned ? 'No unassigned users found.' : 'No users found matching your filters.'}
          </CardContent>
        </Card>
      ) : groupedByLocation ? (
        // Location-grouped view
        <div className="space-y-2">
          {locationList.map(loc => {
            const groupUsers = groupedByLocation.groups[loc.id];
            if (!groupUsers?.length) return null;
            return renderLocationGroup(loc.id, loc.name, groupUsers);
          })}
          {groupedByLocation.unassigned.length > 0 && 
            renderLocationGroup('unassigned', 'Unassigned Location', groupedByLocation.unassigned)
          }
        </div>
      ) : viewMode === 'table' ? (
        // Flat table view
        <UserRolesTableView
          users={filteredUsers}
          roles={roles}
          canManage={canManage}
          canApproveAdmin={!!canApproveAdmin}
          getAccountInfo={getAccountInfo}
          onToggleRole={handleToggleRole}
          onToggleSuperAdmin={handleToggleSuperAdmin}
          isToggling={toggleRole.isPending}
          isSuperAdminToggling={toggleSuperAdmin.isPending}
          selectedUsers={selectedUsers}
          onSelectionChange={setSelectedUsers}
          locations={locationList}
          onOpenResponsibilities={(userId, userName) => setResponsibilityDialog({ userId, userName })}
          pinStatusByUser={pinStatusByUser}
          onOpenPinDialog={openPinDialog}
        />
      ) : (
        // Flat card view
        <div className="space-y-4">
          {filteredUsers.map(renderUserCard)}
        </div>
      )}

      {/* Super Admin Confirmation Dialog */}
      <AlertDialog open={!!superAdminConfirm} onOpenChange={() => setSuperAdminConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-600" />
              {superAdminConfirm?.isSuperAdmin ? 'Revoke' : 'Grant'} Super Admin
            </AlertDialogTitle>
            <AlertDialogDescription>
              {superAdminConfirm?.isSuperAdmin ? (
                <>
                  Are you sure you want to <strong>revoke</strong> Super Admin status from{' '}
                  <strong>{superAdminConfirm?.userName}</strong>? They will no longer be able to 
                  assign or remove Admin roles.
                </>
              ) : (
                <>
                  Are you sure you want to <strong>grant</strong> Super Admin status to{' '}
                  <strong>{superAdminConfirm?.userName}</strong>? They will be able to assign and 
                  remove Admin roles for all users.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSuperAdminToggle}
              className={cn(
                superAdminConfirm?.isSuperAdmin 
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              )}
            >
              {superAdminConfirm?.isSuperAdmin ? 'Revoke Access' : 'Grant Access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Responsibility Dialog */}
      {responsibilityDialog && (
        <AssignResponsibilityDialog
          open={!!responsibilityDialog}
          onOpenChange={(open) => !open && setResponsibilityDialog(null)}
          userId={responsibilityDialog.userId}
          userName={responsibilityDialog.userName}
        />
      )}
    </div>
  );
}
