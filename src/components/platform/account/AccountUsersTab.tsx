import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlatformInput as Input } from '@/components/platform/ui/PlatformInput';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  PlatformAlertDialogCancel as AlertDialogCancel,
  PlatformAlertDialogContent as AlertDialogContent,
  PlatformAlertDialogDescription as AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  PlatformAlertDialogTitle as AlertDialogTitle,
} from '@/components/platform/ui/PlatformDialog';
import { 
  Users, 
  Search, 
  Shield, 
  Crown,
  Mail,
  Phone,
  MoreVertical,
  UserX,
  UserCheck,
  Trash2,
} from 'lucide-react';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  useOrganizationUsers, 
  useRemoveOrganizationUser, 
  useToggleUserActive,
  type OrganizationUser,
} from '@/hooks/useOrganizationUsers';
import { ROLE_LABELS } from '@/hooks/useUserRoles';
import { InviteOrgUserDialog } from './InviteOrgUserDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface AccountUsersTabProps {
  organizationId: string;
  organizationName: string;
}

const roleColors: Record<AppRole, string> = {
  super_admin: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  admin: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  manager: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  stylist: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  receptionist: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  assistant: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  stylist_assistant: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  admin_assistant: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  operations_assistant: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  booth_renter: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
  bookkeeper: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  inventory_manager: 'bg-teal-600/20 text-teal-400 border-teal-600/30',
};

export function AccountUsersTab({ organizationId, organizationName }: AccountUsersTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<OrganizationUser | null>(null);
  
  const { data: users = [], isLoading } = useOrganizationUsers(organizationId);
  const removeUser = useRemoveOrganizationUser(organizationId);
  const toggleActive = useToggleUserActive(organizationId);

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.display_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const activeUsers = filteredUsers.filter(u => u.is_active !== false);
  const inactiveUsers = filteredUsers.filter(u => u.is_active === false);

  const handleRemoveUser = () => {
    if (userToRemove) {
      removeUser.mutate(userToRemove.user_id);
      setUserToRemove(null);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <PlatformCard variant="glass" size="container">
        <PlatformCardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <PlatformCardTitle>Team Members</PlatformCardTitle>
            <PlatformBadge variant="default">{users.length} users</PlatformBadge>
          </div>
          <PlatformButton size="sm" onClick={() => setInviteDialogOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Invite User
          </PlatformButton>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500"
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full bg-slate-800" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">
                {searchQuery ? 'No users match your search' : 'No users in this organization'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Users */}
              {activeUsers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                    Active ({activeUsers.length})
                  </h4>
                  {activeUsers.map(user => (
                    <UserCard 
                      key={user.user_id} 
                      user={user} 
                      onRemove={() => setUserToRemove(user)}
                      onToggleActive={() => toggleActive.mutate({ userId: user.user_id, isActive: false })}
                      isUpdating={toggleActive.isPending}
                    />
                  ))}
                </div>
              )}

              {/* Inactive Users */}
              {inactiveUsers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                    Inactive ({inactiveUsers.length})
                  </h4>
                  {inactiveUsers.map(user => (
                    <UserCard 
                      key={user.user_id} 
                      user={user} 
                      onRemove={() => setUserToRemove(user)}
                      onToggleActive={() => toggleActive.mutate({ userId: user.user_id, isActive: true })}
                      isUpdating={toggleActive.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </PlatformCardContent>
      </PlatformCard>

      <InviteOrgUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        organizationId={organizationId}
        organizationName={organizationName}
      />

      {/* Remove User Confirmation */}
      <AlertDialog open={!!userToRemove} onOpenChange={(open) => !open && setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="text-white font-medium">{userToRemove?.full_name}</span> from this organization? They will lose access to all organization resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface UserCardProps {
  user: OrganizationUser;
  onRemove: () => void;
  onToggleActive: () => void;
  isUpdating: boolean;
}

function UserCard({ user, onRemove, onToggleActive, isUpdating }: UserCardProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-lg border transition-colors",
      user.is_active !== false 
        ? "bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50" 
        : "bg-slate-900/50 border-slate-800/50 opacity-75"
    )}>
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12 border-2 border-slate-700">
          <AvatarImage src={user.photo_url || undefined} />
          <AvatarFallback className="bg-violet-500/20 text-violet-300">
            {getInitials(user.display_name || user.full_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">
              {user.display_name || user.full_name}
            </span>
            {user.is_super_admin && (
              <span title="Super Admin">
                <Crown className="h-4 w-4 text-amber-400" />
              </span>
            )}
            {user.is_active === false && (
              <PlatformBadge variant="default" className="text-xs">Inactive</PlatformBadge>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-sm text-slate-400">
            {user.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </span>
            )}
            {user.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {user.phone}
              </span>
            )}
          </div>
          
          {/* Roles */}
          {user.roles.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              {user.roles.map(role => (
                <span
                  key={role}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-full border",
                    roleColors[role]
                  )}
                >
                  {ROLE_LABELS[role]}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <PlatformButton variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </PlatformButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
          <DropdownMenuItem 
            onClick={onToggleActive}
            disabled={isUpdating}
            className="text-slate-300 hover:text-white focus:text-white"
          >
            {user.is_active !== false ? (
              <>
                <UserX className="h-4 w-4 mr-2" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Activate
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem 
            onClick={onRemove}
            className="text-red-400 hover:text-red-300 focus:text-red-300"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove from Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
