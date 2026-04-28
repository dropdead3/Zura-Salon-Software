/**
 * DashboardRoleSwitcher
 *
 * Header pill for users who hold 2+ roles whose dashboards resolve to
 * different *template keys*. Lets them pivot which role's dashboard they
 * see. NOT impersonation — silent personal preference, persisted via
 * `useActiveDashboardRole`.
 *
 * Visibility contract: returns null when the user has no real choice
 * (single role, or all held roles collapse to the same template).
 */
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, Check, ChevronDown } from 'lucide-react';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { useActiveDashboardRole } from '@/hooks/useActiveDashboardRole';
import { templateKeyForRole } from '@/hooks/useDashboardLayout';
import { getRoleBadgeConfig } from '@/lib/roleBadgeConfig';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export function DashboardRoleSwitcher() {
  const heldRoles = useEffectiveRoles() as AppRole[];
  const { activeRole, setActiveRole } = useActiveDashboardRole();

  // Group held roles by template key — only show switcher when >=2 distinct
  // template groups exist. One representative role per group.
  const choices = useMemo(() => {
    const byTemplate = new Map<string, AppRole>();
    for (const r of heldRoles) {
      const key = templateKeyForRole(r);
      if (!byTemplate.has(key)) byTemplate.set(key, r);
      else {
        const cur = byTemplate.get(key)!;
        if (getRoleBadgeConfig(r).order < getRoleBadgeConfig(cur).order) {
          byTemplate.set(key, r);
        }
      }
    }
    return Array.from(byTemplate.values()).sort(
      (a, b) => getRoleBadgeConfig(a).order - getRoleBadgeConfig(b).order,
    );
  }, [heldRoles]);

  if (choices.length < 2) return null;

  const currentRole: AppRole =
    (activeRole && choices.some((r) => templateKeyForRole(r) === templateKeyForRole(activeRole))
      ? activeRole
      : choices[0]) as AppRole;
  const currentLabel = getRoleBadgeConfig(currentRole).label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 rounded-full px-3 gap-1.5 text-xs font-sans text-muted-foreground hover:text-foreground"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span className="capitalize">{currentLabel}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-sans text-[11px] uppercase tracking-wider text-muted-foreground">
          Dashboard view
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {choices.map((role) => {
          const isActive = templateKeyForRole(role) === templateKeyForRole(currentRole);
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => setActiveRole(role)}
              className="font-sans text-sm capitalize"
            >
              <span className="flex-1">{getRoleBadgeConfig(role).label}</span>
              {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
