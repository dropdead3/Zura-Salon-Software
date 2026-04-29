import { useState, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Plus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useRoles } from '@/hooks/useRoles';
import { useToggleUserRole } from '@/hooks/useUserRoles';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface QuickAssignRoleChipProps {
  userId: string;
  userName: string;
  className?: string;
}

/**
 * Inline role-assignment chip for the No Roles Assigned section.
 * Compresses 3 clicks (row → detail → roles tab → assign) down to 1.
 *
 * - Stops click propagation so the parent MemberRow doesn't navigate.
 * - Reuses `useToggleUserRole` so the underlying mutation, RLS errors,
 *   audit trail, and cache invalidation match the full Roles tab.
 */
export function QuickAssignRoleChip({ userId, userName, className }: QuickAssignRoleChipProps) {
  const [open, setOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const { data: roles = [], isLoading } = useRoles();
  const toggleRole = useToggleUserRole();

  const handleStop = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleAssign = async (roleName: string, displayName: string) => {
    setPendingRole(roleName);
    try {
      await toggleRole.mutateAsync({
        userId,
        role: roleName as AppRole,
        hasRole: false,
      });
      toast.success(`Assigned ${displayName} to ${userName}`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to assign role');
    } finally {
      setPendingRole(null);
    }
  };

  return (
    <div onClick={handleStop} className={cn('shrink-0', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Assign role
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-64 p-2"
          onClick={handleStop}
        >
          <div className="px-2 py-1.5 mb-1 border-b border-border/60">
            <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">
              Pick a role
            </p>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : roles.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              No roles configured.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-0.5">
              {roles.map((role) => {
                const isPending = pendingRole === role.name;
                return (
                  <button
                    key={role.id}
                    type="button"
                    disabled={!!pendingRole}
                    onClick={() => handleAssign(role.name, role.display_name)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-left',
                      'hover:bg-muted/60 transition-colors',
                      'disabled:opacity-60 disabled:cursor-not-allowed',
                    )}
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                    ) : (
                      <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-sans text-foreground truncate">
                      {role.display_name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
