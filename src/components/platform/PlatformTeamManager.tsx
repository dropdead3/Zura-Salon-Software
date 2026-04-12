import { useState, useMemo } from 'react';
import { usePlatformTeam, useRemovePlatformRole, type PlatformRole } from '@/hooks/usePlatformRoles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlatformTable as Table, PlatformTableBody as TableBody, PlatformTableCell as TableCell, PlatformTableHead as TableHead, PlatformTableHeader as TableHeader, PlatformTableRow as TableRow } from '@/components/platform/ui/PlatformTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { useFormatDate } from '@/hooks/useFormatDate';
import { 
  Crown, 
  Shield, 
  Headphones, 
  Code, 
  MoreHorizontal, 
  Trash2,
  UserPlus,
  Filter,
  Circle
} from 'lucide-react';
import { ZuraLoader } from '@/components/ui/ZuraLoader';
import { InvitePlatformUserDialog } from './InvitePlatformUserDialog';
import { PendingInvitationsSection } from './PendingInvitationsSection';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from './ui/PlatformCard';
import { PlatformButton } from './ui/PlatformButton';
import { PlatformBadge } from './ui/PlatformBadge';
import { OnlineIndicator } from './ui/OnlineIndicator';
import { usePlatformPresenceContext } from '@/contexts/PlatformPresenceContext';

// Role hierarchy order (higher = more senior)
const ROLE_HIERARCHY: PlatformRole[] = [
  'platform_owner',
  'platform_admin',
  'platform_support',
  'platform_developer',
];

const roleConfig: Record<PlatformRole, { label: string; icon: React.ElementType; variant: 'warning' | 'info' | 'success' | 'primary' }> = {
  platform_owner: { label: 'Owner', icon: Crown, variant: 'warning' },
  platform_admin: { label: 'Admin', icon: Shield, variant: 'info' },
  platform_support: { label: 'Support', icon: Headphones, variant: 'success' },
  platform_developer: { label: 'Developer', icon: Code, variant: 'primary' },
};

export function PlatformTeamManager() {
  const { formatDate } = useFormatDate();
  const { user, hasPlatformRole } = useAuth();
  const { data: team, isLoading } = usePlatformTeam();
  const removeMutation = useRemovePlatformRole();
  const { isOnline, onlineCount } = usePlatformPresenceContext();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; role: PlatformRole; name: string } | null>(null);
  const [roleFilter, setRoleFilter] = useState<PlatformRole | 'all'>('all');

  const canManageTeam = hasPlatformRole('platform_owner') || hasPlatformRole('platform_admin');

  // Sort by role hierarchy, then filter
  const filteredAndSortedTeam = useMemo(() => {
    if (!team) return [];
    
    // First sort by role hierarchy
    const sorted = [...team].sort((a, b) => {
      const aIndex = ROLE_HIERARCHY.indexOf(a.role);
      const bIndex = ROLE_HIERARCHY.indexOf(b.role);
      if (aIndex !== bIndex) return aIndex - bIndex;
      // Secondary sort by name
      return (a.full_name || '').localeCompare(b.full_name || '');
    });
    
    // Then filter if a specific role is selected
    if (roleFilter === 'all') return sorted;
    return sorted.filter(member => member.role === roleFilter);
  }, [team, roleFilter]);

  const handleRemoveMember = async () => {
    if (!deleteConfirm) return;

    try {
      await removeMutation.mutateAsync({
        userId: deleteConfirm.userId,
        role: deleteConfirm.role,
      });
      toast({
        title: 'Member removed',
        description: `${deleteConfirm.name} has been removed from the platform team.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove team member.',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const getInitials = (name: string | undefined, email: string | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || '??';
  };

  if (isLoading) {
    return (
      <PlatformCard variant="glass" size="container">
        <PlatformCardContent className="flex items-center justify-center py-12">
          <ZuraLoader size="xl" platformColors />
        </PlatformCardContent>
      </PlatformCard>
    );
  }

  return (
    <div className="space-y-6">
      <PendingInvitationsSection />
      
      <PlatformCard variant="glass" size="container">
        <PlatformCardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <PlatformCardTitle>Platform Team</PlatformCardTitle>
              {onlineCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                  <Circle className="h-2 w-2 fill-emerald-400" />
                  {onlineCount} online
                </span>
              )}
            </div>
            <PlatformCardDescription>
              Manage access for your development and support team
            </PlatformCardDescription>
          </div>
          <div className="flex items-center gap-3">
            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val as PlatformRole | 'all')}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2 text-slate-500" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLE_HIERARCHY.map(role => {
                  const config = roleConfig[role];
                  const Icon = config.icon;
                  return (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {canManageTeam && (
              <PlatformButton onClick={() => setInviteOpen(true)} className="gap-2">
                <UserPlus className="w-4 h-4" />
                Add Team Member
              </PlatformButton>
            )}
          </div>
        </PlatformCardHeader>
        <PlatformCardContent>
          {filteredAndSortedTeam.length > 0 ? (
            <div className="rounded-xl overflow-hidden border border-[hsl(var(--platform-border)/0.5)]">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Member</TableHead>
                     <TableHead>Role</TableHead>
                     <TableHead>Added</TableHead>
                     {canManageTeam && <TableHead className="w-12"></TableHead>}
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTeam.map((member) => {
                    const config = roleConfig[member.role];
                    const Icon = config.icon;
                    const isCurrentUser = member.user_id === user?.id;

                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-8 w-8 bg-[hsl(var(--platform-bg-hover))] border border-[hsl(var(--platform-border))]">
                                <AvatarImage src={member.photo_url || undefined} alt={member.full_name || 'Team member'} />
                                <AvatarFallback className="bg-[hsl(var(--platform-bg-hover))] text-[hsl(var(--platform-foreground-muted))] text-xs">
                                  {getInitials(member.full_name, member.email)}
                                </AvatarFallback>
                              </Avatar>
                              <OnlineIndicator 
                                isOnline={isOnline(member.user_id)} 
                                size="sm" 
                                className="absolute -bottom-0.5 -right-0.5"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm text-[hsl(var(--platform-foreground))]">
                                  {member.full_name || 'Unknown'}
                                  {isCurrentUser && (
                                    <span className="text-[hsl(var(--platform-foreground-subtle))] ml-1">(you)</span>
                                  )}
                                </p>
                                {isOnline(member.user_id) && (
                                  <span className="text-xs text-emerald-400">Online</span>
                                )}
                              </div>
                              <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <PlatformBadge variant={config.variant} className="gap-1">
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </PlatformBadge>
                        </TableCell>
                        <TableCell className="text-[hsl(var(--platform-foreground-subtle))] text-sm">
                          {formatDate(new Date(member.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        {canManageTeam && (
                          <TableCell>
                            {!isCurrentUser && member.role !== 'platform_owner' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <PlatformButton variant="ghost" size="icon-sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </PlatformButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[hsl(var(--platform-bg-elevated))] border-[hsl(var(--platform-border))]">
                                  <DropdownMenuItem
                                    className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                                    onClick={() => setDeleteConfirm({
                                      userId: member.user_id,
                                      role: member.role,
                                      name: member.full_name || member.email || 'this member',
                                    })}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-[hsl(var(--platform-foreground-subtle))]">
              <p>No platform team members yet.</p>
              {canManageTeam && (
                <PlatformButton
                  variant="link"
                  onClick={() => setInviteOpen(true)}
                  className="mt-2 text-violet-400"
                >
                  Add your first team member
                </PlatformButton>
              )}
            </div>
          )}
        </PlatformCardContent>
      </PlatformCard>

      <InvitePlatformUserDialog 
        open={inviteOpen} 
        onOpenChange={setInviteOpen} 
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will revoke platform access for {deleteConfirm?.name}. They will no longer be able to access the Platform Admin Hub.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600 text-white hover:bg-red-500"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
