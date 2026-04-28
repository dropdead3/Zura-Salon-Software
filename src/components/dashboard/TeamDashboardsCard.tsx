import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Eye, Pencil, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useCustomizeDrawer } from '@/contexts/CustomizeDrawerContext';
import { useCanCustomizeDashboardLayouts } from '@/hooks/useDashboardLayout';
import {
  useTeamDashboardSummary,
  type RoleGroupSummary,
} from '@/hooks/useTeamDashboardSummary';

/**
 * Owner-facing governance card. Promotes role-keyed dashboard layout
 * customization out of the buried Customize menu.
 *
 * Each tile = one *template-key group* (e.g. "Leadership" covers super_admin
 * + admin). "Edit" enters View-As for the group's edit role and opens the
 * Customize drawer in place — owner authors once, mirror writes to every
 * role in the group.
 *
 * Owner-only: returns null for non-primary-owners (matches RLS posture).
 */
export function TeamDashboardsCard() {
  const canCustomize = useCanCustomizeDashboardLayouts();
  const { data: summary = [], isLoading } = useTeamDashboardSummary();
  const { setViewAsRole, viewAsRole, isViewingAs } = useViewAs();
  const { open: openCustomize } = useCustomizeDrawer();

  if (!canCustomize) return null;

  const handleEdit = (group: RoleGroupSummary) => {
    setViewAsRole(group.editRole);
    // Allow ViewAs context to settle, then open the drawer.
    setTimeout(() => openCustomize(), 0);
  };

  return (
    <Card className="relative overflow-hidden p-6 rounded-xl bg-card/80 backdrop-blur-xl border-border">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <LayoutDashboard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-base tracking-wide">Team Dashboards</h2>
            <p className="text-sm text-muted-foreground font-sans mt-0.5">
              Curate what each role group sees when they log in.
            </p>
          </div>
        </div>
        {isViewingAs && (
          <Badge variant="outline" className="gap-1.5 font-sans">
            <Sparkles className="w-3 h-3" />
            Previewing as {viewAsRole?.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-muted/40 animate-pulse" />
            ))
          : summary.map((group) => (
              <RoleGroupTile
                key={group.templateKey}
                group={group}
                isActive={isViewingAs && viewAsRole === group.editRole}
                onPreview={() => setViewAsRole(group.editRole)}
                onEdit={() => handleEdit(group)}
              />
            ))}
      </div>

      {summary.length === 0 && !isLoading && (
        <div className="rounded-xl border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground font-sans">
          No assigned roles in this organization yet. Invite team members to
          curate their dashboards.
        </div>
      )}
    </Card>
  );
}

interface RoleGroupTileProps {
  group: RoleGroupSummary;
  isActive: boolean;
  onPreview: () => void;
  onEdit: () => void;
}

function RoleGroupTile({ group, isActive, onPreview, onEdit }: RoleGroupTileProps) {
  const lastEditedLabel = useMemo(() => {
    if (!group.lastEditedAt) return null;
    try {
      return `Edited ${formatDistanceToNow(new Date(group.lastEditedAt), { addSuffix: true })}`;
    } catch {
      return null;
    }
  }, [group.lastEditedAt]);

  const memberLabel = useMemo(() => {
    if (group.roles.length === 1) return null;
    return group.roles
      .map((r) => r.replace(/_/g, ' '))
      .join(', ');
  }, [group.roles]);

  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex flex-col gap-2 transition-colors',
        isActive
          ? 'border-primary/60 bg-primary/5'
          : 'border-border/50 bg-muted/30 hover:bg-muted/50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-xs tracking-wider uppercase">{group.label}</p>
        {group.hasOverride ? (
          <Badge variant="default" className="text-[10px] font-sans h-5 px-1.5">
            Custom
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-[10px] font-sans h-5 px-1.5 text-muted-foreground"
          >
            Default
          </Badge>
        )}
      </div>

      {memberLabel && (
        <p className="text-[11px] text-muted-foreground font-sans capitalize line-clamp-1">
          {memberLabel}
        </p>
      )}

      <p className="text-[11px] text-muted-foreground font-sans min-h-[14px]">
        {lastEditedLabel ?? (group.hasOverride ? 'Custom layout' : 'Using template')}
      </p>

      <div className="mt-auto flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={onPreview}
          disabled={isActive}
          className="flex-1 h-8 rounded-full font-sans"
        >
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          {isActive ? 'Previewing' : 'Preview'}
        </Button>
        <Button
          size="sm"
          variant="default"
          onClick={onEdit}
          className="flex-1 h-8 rounded-full font-sans"
        >
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Edit
        </Button>
      </div>
    </div>
  );
}
