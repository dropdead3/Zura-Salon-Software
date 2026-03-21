import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  MoreVertical,
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
  Lock,
  Unlock,
  GripVertical,
  Users,
  Shield,
  Cog,
  Scissors,
  MoreHorizontal,
} from 'lucide-react';
import { useAllRoles, useArchiveRole, useRestoreRole, useDeleteRole, useReorderRoles, useToggleSystemRole, Role, ROLE_CATEGORIES } from '@/hooks/useRoles';
import { getRoleColorClasses } from './RoleColorPicker';
import { getRoleIconComponent } from './RoleIconPicker';
import { CreateRoleDialog } from './CreateRoleDialog';
import { DndContext, closestCenter, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface SortableRoleCardProps {
  role: Role;
  userCount: number;
  isSuperAdmin: boolean;
  onEdit: (role: Role) => void;
  onArchive: (role: Role) => void;
  onRestore: (role: Role) => void;
  onDelete: (role: Role) => void;
  onToggleSystem: (role: Role) => void;
}

function SortableRoleCard({ role, userCount, isSuperAdmin, onEdit, onArchive, onRestore, onDelete, onToggleSystem }: SortableRoleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const IconComponent = getRoleIconComponent(role.icon);
  const colorClasses = getRoleColorClasses(role.color);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-4 bg-card border rounded-lg transition-shadow',
        isDragging && 'shadow-lg ring-2 ring-primary',
        !role.is_active && 'opacity-60'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className={cn('p-2 rounded-lg', colorClasses.bg)}>
        <IconComponent className={cn('h-5 w-5', colorClasses.text)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{role.display_name}</span>
          {role.is_system && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs gap-1 cursor-help">
                    <Lock className="h-3 w-3" />
                    System
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>System roles are protected from deletion and archiving to ensure core application functionality remains intact.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {!role.is_active && (
            <Badge variant="secondary" className="text-xs">
              Archived
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {role.description || 'No description'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" />
          {userCount}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(role)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {isSuperAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onToggleSystem(role)}>
                  {role.is_system ? (
                    <>
                      <Unlock className="h-4 w-4 mr-2" />
                      Remove System Lock
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Mark as System Role
                    </>
                  )}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            {role.is_active ? (
              <DropdownMenuItem
                onClick={() => onArchive(role)}
                disabled={role.is_system}
                className={role.is_system ? 'opacity-50' : ''}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
                {role.is_system && <Lock className="h-3 w-3 ml-auto" />}
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={() => onRestore(role)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(role)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function RoleEditor() {
  const { data: roles, isLoading } = useAllRoles();
  const archiveRole = useArchiveRole();
  const restoreRole = useRestoreRole();
  const deleteRole = useDeleteRole();
  const reorderRoles = useReorderRoles();
  const toggleSystemRole = useToggleSystemRole();
  const { user, roles: userRoles } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null);

  // Check if current user is super admin via their roles
  const isSuperAdmin = userRoles.includes('super_admin');

  // Fetch user counts per role
  const { data: userCounts = {} } = useQuery({
    queryKey: ['role-user-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((row) => {
        counts[row.role] = (counts[row.role] || 0) + 1;
      });
      return counts;
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && roles) {
      const oldIndex = roles.findIndex((r) => r.id === active.id);
      const newIndex = roles.findIndex((r) => r.id === over.id);
      const newOrder = arrayMove(roles, oldIndex, newIndex);
      reorderRoles.mutate(newOrder.map((r) => r.id));
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  const handleArchive = (role: Role) => {
    archiveRole.mutate(role.id);
  };

  const handleRestore = (role: Role) => {
    restoreRole.mutate(role.id);
  };

  const handleDelete = (role: Role) => {
    setDeleteConfirm(role);
  };

  const handleToggleSystem = (role: Role) => {
    toggleSystemRole.mutate({ id: role.id, isSystem: !role.is_system });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteRole.mutate(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingRole(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manage Roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const activeRoles = roles?.filter((r) => r.is_active) || [];
  const archivedRoles = roles?.filter((r) => !r.is_active) || [];

  // Category icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'leadership': return Shield;
      case 'operations': return Cog;
      case 'stylists': return Scissors;
      default: return MoreHorizontal;
    }
  };

  // Group active roles by category
  const groupedActiveRoles = ROLE_CATEGORIES.map(cat => ({
    ...cat,
    roles: activeRoles.filter(r => r.category === cat.value),
  })).filter(group => group.roles.length > 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Manage Roles</CardTitle>
            <CardDescription>
              Create, edit, and organize roles. Drag to reorder. System roles cannot be deleted.
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Role
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Roles grouped by category */}
          {groupedActiveRoles.map(group => {
            const CategoryIcon = getCategoryIcon(group.value);
            return (
              <div key={group.value} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <CategoryIcon className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-display uppercase tracking-wider text-foreground">{group.label}</h4>
                  <span className="text-xs text-muted-foreground">({group.roles.length})</span>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={group.roles.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {group.roles.map((role) => (
                        <SortableRoleCard
                          key={role.id}
                          role={role}
                          userCount={userCounts[role.name] || 0}
                          isSuperAdmin={isSuperAdmin}
                          onEdit={handleEdit}
                          onArchive={handleArchive}
                          onRestore={handleRestore}
                          onDelete={handleDelete}
                          onToggleSystem={handleToggleSystem}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            );
          })}

          {/* Archived Roles */}
          {archivedRoles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Archived Roles</h4>
              <div className="space-y-2">
                {archivedRoles.map((role) => (
                  <SortableRoleCard
                    key={role.id}
                    role={role}
                    userCount={userCounts[role.name] || 0}
                    isSuperAdmin={isSuperAdmin}
                    onEdit={handleEdit}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                    onDelete={handleDelete}
                    onToggleSystem={handleToggleSystem}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateRoleDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editRole={editingRole}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the "{deleteConfirm?.display_name}" role.
              This action cannot be undone. Make sure no users are assigned to this role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
