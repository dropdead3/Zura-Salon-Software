import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { User, Crown, Lock, ChevronDown, ChevronRight, Award, Key, Pencil, Plus, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { tokens } from '@/lib/design-tokens';
import { getRoleColorClasses } from '@/components/dashboard/RoleColorPicker';
import { getRoleIconComponent } from '@/components/dashboard/RoleIconPicker';
import { ResponsibilityBadges } from './ResponsibilityBadges';
import { cn } from '@/lib/utils';
import type { UserWithRoles } from '@/hooks/useUserRoles';
import type { Database } from '@/integrations/supabase/types';

export interface PinStatusEntry {
  user_id: string;
  has_pin: boolean;
  is_primary_owner?: boolean;
}

export type PinAction = 'set' | 'clear';

type AppRole = Database['public']['Enums']['app_role'];

interface RoleOption {
  name: string;
  display_name: string;
  color: string;
  icon: string;
}

interface LocationInfo {
  id: string;
  name: string;
}

interface AccountInfo {
  is_super_admin?: boolean;
  is_primary_owner?: boolean;
  is_approved?: boolean;
  admin_approved_by?: string | null;
}

interface UserRolesTableViewProps {
  users: UserWithRoles[];
  roles: RoleOption[];
  canManage: boolean;
  canApproveAdmin: boolean;
  getAccountInfo: (userId: string) => AccountInfo | undefined;
  onToggleRole: (userId: string, role: string, hasRole: boolean) => void;
  onToggleSuperAdmin: (userId: string, userName: string, isSuperAdmin: boolean) => void;
  isToggling: boolean;
  isSuperAdminToggling: boolean;
  selectedUsers: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  locations: LocationInfo[];
  onOpenResponsibilities: (userId: string, userName: string) => void;
  /** PIN status by user_id; if undefined, the PIN column is hidden. */
  pinStatusByUser?: Map<string, PinStatusEntry>;
  /** Open the shared AdminSetPinDialog for a given user + mode. */
  onOpenPinDialog?: (userId: string, mode: PinAction) => void;
}

export function UserRolesTableView({
  users,
  roles,
  canManage,
  canApproveAdmin,
  getAccountInfo,
  onToggleRole,
  onToggleSuperAdmin,
  isToggling,
  isSuperAdminToggling,
  selectedUsers,
  onSelectionChange,
  locations,
  onOpenResponsibilities,
}: UserRolesTableViewProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const locationMap = new Map(locations.map(l => [l.id, l.name]));

  const getUserLocationNames = (user: UserWithRoles): string => {
    const locIds = user.location_ids?.length ? user.location_ids : (user.location_id ? [user.location_id] : []);
    if (locIds.length === 0) return '—';
    return locIds.map(id => locationMap.get(id) || 'Unknown').join(', ');
  };

  const allSelected = users.length > 0 && selectedUsers.size === users.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(users.map(u => u.user_id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const next = new Set(selectedUsers);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    onSelectionChange(next);
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card/80 backdrop-blur-xl">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            {canManage && (
              <TableHead className="w-[40px]">
                <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
              </TableHead>
            )}
            <TableHead className={tokens.table?.columnHeader || 'font-sans text-sm font-medium'}>Name</TableHead>
            <TableHead className={tokens.table?.columnHeader || 'font-sans text-sm font-medium'}>Email</TableHead>
            {locations.length > 1 && (
              <TableHead className={tokens.table?.columnHeader || 'font-sans text-sm font-medium'}>Location</TableHead>
            )}
            <TableHead className={tokens.table?.columnHeader || 'font-sans text-sm font-medium'}>Roles</TableHead>
            {canManage && (
              <TableHead className={cn(tokens.table?.columnHeader || 'font-sans text-sm font-medium', 'w-[80px]')}>Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => {
            const accountInfo = getAccountInfo(user.user_id);
            const isSuperAdmin = accountInfo?.is_super_admin;
            const isPrimaryOwner = accountInfo?.is_primary_owner;
            const isExpanded = expandedRow === user.user_id;

            return (
              <Collapsible key={user.user_id} open={isExpanded} onOpenChange={() => setExpandedRow(isExpanded ? null : user.user_id)} asChild>
                <>
                  <TableRow className={cn(
                    selectedUsers.has(user.user_id) && 'bg-primary/5',
                    !accountInfo?.is_approved && 'opacity-60'
                  )}>
                    {canManage && (
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.has(user.user_id)}
                          onCheckedChange={() => handleSelectUser(user.user_id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.photo_url || undefined} alt={user.full_name} />
                          <AvatarFallback className="bg-muted text-xs">
                            {user.full_name?.charAt(0) || <User className="w-3.5 h-3.5" />}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{user.display_name || user.full_name}</span>
                        {isSuperAdmin && (
                          <Badge className={cn(
                            "gap-0.5 text-[10px] px-1.5 py-0.5 border",
                            isPrimaryOwner
                              ? "bg-stone-700/90 text-amber-100 border-amber-400/30"
                              : "bg-gradient-to-r from-amber-200 via-orange-100 to-amber-200 text-amber-900 border-amber-300"
                          )}>
                            <Crown className="w-2.5 h-2.5" />
                            {isPrimaryOwner ? 'Account Owner' : 'Super Admin'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email || '—'}</TableCell>
                    {locations.length > 1 && (
                      <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{getUserLocationNames(user)}</TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {roles
                          .filter(role => user.roles.includes(role.name as AppRole) && role.name !== 'super_admin')
                          .map(role => {
                            const colorClasses = getRoleColorClasses(role.color);
                            const isAdminStylist = role.name === 'stylist' && user.roles.some((r: string) => ['super_admin', 'admin', 'manager'].includes(r));
                            const badge = (
                              <Badge
                                key={role.name}
                                variant="outline"
                                className={cn("text-[10px] px-1.5 py-0 gap-1", colorClasses.bg, colorClasses.text)}
                              >
                                {(() => { const RoleIcon = getRoleIconComponent(role.icon); return <RoleIcon className="w-3 h-3" />; })()}
                                {role.display_name}
                              </Badge>
                            );
                            if (isAdminStylist) {
                              return (
                                <Tooltip key={role.name}>
                                  <TooltipTrigger asChild>{badge}</TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[240px] text-xs">
                                    This user is an admin who also performs services. This role is managed via the "I also perform services" toggle in Profile Settings.
                                  </TooltipContent>
                                </Tooltip>
                              );
                            }
                            return badge;
                          })}
                        {user.roles.length === 0 && !isSuperAdmin && (
                          <span className="text-xs text-muted-foreground italic">No roles</span>
                        )}
                        <ResponsibilityBadges userId={user.user_id} />
                      </div>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </Button>
                          </CollapsibleTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onOpenResponsibilities(user.user_id, user.display_name || user.full_name)}
                          >
                            <Award className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {canManage && (
                    <CollapsibleContent asChild>
                      <tr>
                        <td colSpan={99} className="p-0">
                          <div className="px-6 py-3 bg-muted/20 border-t border-border/30 flex flex-wrap gap-x-6 gap-y-2">
                            {roles.map(role => {
                              const isSuperAdminRole = role.name === 'super_admin';

                              if (isSuperAdminRole) {
                                if (!canApproveAdmin) return null;
                                return (
                                  <div key={role.name} className="flex items-center gap-2">
                                    <label className="text-sm font-medium flex items-center gap-1 cursor-pointer">
                                      <Crown className="w-3 h-3 text-amber-600" />
                                      {role.display_name}
                                    </label>
                                    {isPrimaryOwner && (
                                      <Tooltip>
                                        <TooltipTrigger><Lock className="w-3 h-3 text-amber-600" /></TooltipTrigger>
                                        <TooltipContent>Account Owner - cannot be revoked</TooltipContent>
                                      </Tooltip>
                                    )}
                                    <Switch
                                      checked={isSuperAdmin || false}
                                      onCheckedChange={() => onToggleSuperAdmin(user.user_id, user.display_name || user.full_name, isSuperAdmin || false)}
                                      disabled={isSuperAdminToggling || !canApproveAdmin || isPrimaryOwner}
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
                                  <label className={cn(
                                    "text-sm font-medium flex items-center gap-1",
                                    isLocked ? "text-muted-foreground cursor-not-allowed" : "cursor-pointer"
                                  )}>
                                    {(() => { const RoleIcon = getRoleIconComponent(role.icon); return <RoleIcon className="w-3 h-3" />; })()}
                                    {role.display_name}
                                  </label>
                                  {isLocked && (
                                    <Tooltip>
                                      <TooltipTrigger><Lock className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                                      <TooltipContent>{isLockedBySuperAdmin ? 'Super Admins have full access' : 'Super Admin required'}</TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Switch
                                    checked={isLockedBySuperAdmin ? false : hasRole}
                                    onCheckedChange={() => onToggleRole(user.user_id, role.name, hasRole)}
                                    disabled={isToggling || isLocked}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    </CollapsibleContent>
                  )}
                </>
              </Collapsible>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
